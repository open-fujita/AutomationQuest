---
index: "[[INDEX]]"
---

# design.md

> 親 INDEX: [[INDEX]]

## 実装アプローチ

引継書推奨案（既定 action 付与）を採用する。最小変更・安全・後方互換の 3 点で優位。

### 案 A（採用）: submenu に optional action を追加

1. **型拡張**: `MenuItem` の submenu バリアントに `action?: () => void` を追加
2. **レンダラー修正**: `MenuItemRenderer` の submenu ヘッダ `<div>` に `onClick={item.action}` を付与
3. **データ修正**: 3 箇所の「テーブル行繰り返し」submenu 定義に `action: doForEach` を追加

**利点**:
- 3 箇所の修正で完結（型 1 + レンダラー 1 + データ 3）
- `action` が `undefined` の既存サブメニューには影響なし（`onClick={undefined}` は React で無害）
- ホバー展開は維持される（`onMouseEnter`/`onMouseLeave` はそのまま）

### 案 B（棄却）: テーブル行繰り返しを `kind:'action'` に変更して子メニュー廃止

- 本モックでは「含める」「除外」が同一処理のため子メニューは冗長ではある
- ただし将来的に含める/除外で異なる処理を実装する可能性がある（実機 DS の挙動に合わせる場合）
- UI 構造の変更はスコープを超える

### 案 A 採用理由

案 B は UI 構造を変更し、将来の拡張性を損なう可能性がある。案 A は型の拡張のみで既存構造を維持しつつバグを解消できるため、最小・安全・後方互換の観点で採用。

## 変更コンポーネント

| ファイル | 変更箇所 | 変更内容 |
|---|---|---|
| `BrowserView.tsx` line 33 | `MenuItem` 型 submenu バリアント | `action?: () => void` 追加 |
| `BrowserView.tsx` line 504 | `MenuItemRenderer` submenu ヘッダ `<div>` | `onClick={item.action}` 追加 |
| `BrowserView.tsx` line 258-276 | `loopMenuForTable()` 内の submenu 定義 | `action: doForEach` 追加 |
| `BrowserView.tsx` line 358-365 | `buildTableCellMenu()` 内の submenu 定義 | `action: doForEach` 追加 |
| `BrowserView.tsx` line 411-418 | `buildRowMenu()` 内の submenu 定義 | `action: doForEach` 追加 |

## 影響範囲分析

### 直接影響

- `MenuItem` 型を参照する全てのコード → `action` は optional なので既存コードに影響なし
- `MenuItemRenderer` コンポーネント → submenu ヘッダにクリックハンドラ追加のみ

### イベント伝播の安全性

- submenu ヘッダの `onClick` → 外側 `div.relative`（handler なし）→ メニューコンテナ（`e.stopPropagation()`）→ ドキュメントレベルの `closeMenu` には到達しない
- `doForEach` 内で `setMenu(null)` を呼ぶため、メニューは action 実行後に閉じる
- `action` が `undefined` の場合、`onClick={undefined}` は React で handler が付与されないため無害

### 影響なし

- 他のコンポーネント（OfficeMapHome, Modal 等）
- テストコード（既存テストは MenuItem 型の内部構造に依存しない）
- `glossary.ts`（未コミット WIP、一切触れない）

## データ構造変更

```typescript
// Before
type MenuItem =
  | { kind: 'action'; label: string; action: () => void; disabled?: boolean }
  | { kind: 'submenu'; label: string; children: MenuItem[] }
  | { kind: 'separator' }

// After
type MenuItem =
  | { kind: 'action'; label: string; action: () => void; disabled?: boolean }
  | { kind: 'submenu'; label: string; children: MenuItem[]; action?: () => void }
  | { kind: 'separator' }
```

---

## Follow-up: 抽出サブメニュー クリック無反応の修正設計 (2026-06-27)

### 問題分析

先の修正で submenu ヘッダに `onClick={item.action}` を追加したが、これは `action` が存在する submenu（テーブル行繰り返し）のみ有効。`action` を持たない submenu（抽出、テキスト、ループ等）では `onClick={undefined}` となりクリック無反応。M1 の 3 階層メニュー（抽出 → テキスト → お知らせ.見出し）が操作不能。

### 修正アプローチ

#### 案 C（採用）: onClick で action 有無を分岐し、無ければ子を開く

`MenuItemRenderer` の submenu ヘッダ onClick を以下に変更:

```typescript
onClick={() => { if (item.action) item.action(); else setSubOpen(true); }}
```

- `item.action` あり → アクション実行（テーブル行繰り返しの doForEach 等）
- `item.action` なし → 子メニューを開く（`setSubOpen(true)`）

#### toggle vs 常時 open の選択（Architect 判断）

| 方式 | 動作 | 学習ゲームでの適性 |
|---|---|---|
| toggle (`setSubOpen(o => !o)`) | クリックで開閉交互 | ホバーで開いた後にクリックすると閉じてしまい混乱。`onMouseEnter` との競合 |
| 常時 open (`setSubOpen(true)`) | クリックで常に開く | ユーザーの意図は「子を見たい」なので直感的。メニュー閉じは `onMouseLeave` か action の `setMenu(null)` で担保 |

**常時 open を採用**。根拠:

1. ユーザーがホバーで子を開いた状態でヘッダクリック → toggle だと閉じてしまい混乱
2. `onMouseEnter` で `setSubOpen(true)` を設定した直後に toggle で `false` にすると不安定
3. 学習ゲームでは「子メニューを見る」操作の成功率を最大化すべき
4. 閉じる手段は `onMouseLeave`（ホバー離脱）と action 実行時の `setMenu(null)` で十分

### 変更箇所（1 箇所のみ）

| ファイル | 行番号 | Before | After |
|---|---|---|---|
| `BrowserView.tsx` | 507 | `onClick={item.action}` | `onClick={() => { if (item.action) item.action(); else setSubOpen(true); }}` |

先の修正（型拡張 line 33 / 3 箇所の `action: doForEach` line 261, 362, 416）は全て維持。回帰なし。

### 影響範囲

- **action ありの submenu**（テーブル行繰り返し）: `if (item.action)` が真 → `item.action()` = `doForEach()` 呼び出し。先の修正と同一動作
- **action なしの submenu**（抽出、テキスト、ループ等）: `else` 分岐 → `setSubOpen(true)` → 子メニューが開く（新しい動作）
- **ホバー展開**: `onMouseEnter`/`onMouseLeave` は変更なし

---

## Follow-up 2: 3 階層目サブメニュー非表示の修正設計 (2026-06-27)

### 問題分析

Follow-up 1 で submenu ヘッダクリックで `setSubOpen(true)` が効くようになったが、3 階層目の子パネルが視覚的に表示されない。原因は `MenuItemRenderer` の submenu 子パネル（line 514）の `overflow-hidden` が孫パネル（`absolute` + `left-full`/`right-full` で親外配置）をクリップしていること。

### CSS overflow の階層分析

```
ルートメニュー (line 721)
  overflow-visible ← 子パネルがはみ出し可 OK
  └ submenu 子パネル (line 514)  ← 修正対象
      overflow-hidden ← 孫パネルをクリップ NG
      └ 孫パネル (同 line 514 の再帰呼出)
          absolute + left-full ← 親パネル外に配置
          → overflow-hidden でクリップされて不可視
```

### 修正アプローチ

#### 案 D（採用）: `overflow-hidden` → `overflow-visible` に変更

line 514 の `overflow-hidden` を `overflow-visible` に 1 語変更。

**影響範囲の確認**:

| メニュー種別 | submenu ネスト | `overflow-visible` の影響 |
|---|---|---|
| 単一要素（見出し等）| 抽出 → テキスト → 変数リスト（3 階層） | 3 階層目が表示されるようになる（修正効果） |
| テーブルセル | 抽出 → テキスト → 変数リスト / ループ → テーブル行繰り返し → 含める/除外 | 同上 |
| テーブル全体 | ループ → テーブル行繰り返し → 含める/除外 | 同上 |
| テーブル行 | 抽出 → テキスト → 変数リスト / ループ → テーブル行繰り返し → 含める/除外 | 同上 |
| thead 列 | 抽出 → テキスト → 変数リスト | 同上 |

全メニュー種別で同じ `MenuItemRenderer` を共有。`overflow-visible` 化はどのメニューでも孫パネル以降の表示を可能にする。視覚的破綻なし。

**`rounded-md` との共存**: ルートメニュー（line 721）が既に `overflow-visible` + `rounded-md` で運用されており、問題が無いことが実証済み。パネル本体の角丸は border に適用され、overflow 設定と独立。ホバー背景色が角でわずかにはみ出す程度は許容範囲。

### 変更箇所（1 箇所のみ）

| ファイル | 行番号 | Before | After |
|---|---|---|---|
| `BrowserView.tsx` | 514 | `overflow-hidden` | `overflow-visible` |

先の全修正（型拡張 line 33 / onClick 分岐 line 507 / action: doForEach line 261, 362, 416）は維持。回帰なし。
