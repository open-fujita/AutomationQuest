---
index: "[[INDEX]]"
---

# review.md

> 親 INDEX: [[INDEX]]

## 判定: APPROVE（条件付き）

typecheck / test の実行はシェルツール未割当のため実行できず。コードレビュー（静的整合性検証）は全項目 PASS。参謀長にシェル実行を委ねる。

## 変更サマリ

| 変更箇所 | 行番号 | 内容 | 検証 |
|---|---|---|---|
| `MenuItem` 型 submenu バリアント | 33 | `action?: () => void` 追加 | 実読確認 OK |
| `MenuItemRenderer` submenu ヘッダ | 507 | `onClick={item.action}` 追加 | 実読確認 OK |
| `loopMenuForTable()` 内 submenu | 261 | `action: doForEach` 追加 | 実読確認 OK |
| `buildTableCellMenu()` 内 submenu | 362 | `action: doForEach` 追加 | 実読確認 OK |
| `buildRowMenu()` 内 submenu | 416 | `action: doForEach` 追加 | 実読確認 OK |

## コードレビュー チェックリスト

### 型安全性
- [x] `action` は optional (`action?: () => void`) で後方互換
- [x] 既存の submenu 定義（`action` 無し）は型エラーにならない
- [x] `onClick={undefined}` は React で無害（handler 未付与と同義）

### イベント伝播
- [x] submenu ヘッダ `onClick` -> 外側 `div.relative`（handler なし）-> メニューコンテナ（`e.stopPropagation()`）-> ドキュメントレベル `closeMenu` には到達しない
- [x] `doForEach` 内で `setMenu(null)` を呼ぶためメニューは閉じる
- [x] ホバー展開（`onMouseEnter`/`onMouseLeave`）は影響なし

### design.md 整合性
- [x] 案 A（submenu に optional action 追加）を忠実に実装
- [x] 変更箇所 5 点が design.md の表と一致
- [x] 影響範囲外（OfficeMapHome, Modal, glossary.ts 等）に変更なし

### スコープ遵守
- [x] 変更ファイルは `src/components/ds/BrowserView.tsx` のみ
- [x] `src/data/glossary.ts` は未変更（BrowserView.tsx に glossary への参照もなし）
- [x] コミット/プッシュは未実行

### 受け入れ条件
- [ ] AC1: `npm run typecheck` exit 0 -- **未実行（シェルツール未割当）**
- [ ] AC2: `npm test` 253 passed -- **未実行（シェルツール未割当）**
- [x] AC3: コード上、submenu ヘッダクリック -> `doForEach` -> `addAction('ForEach', { targetId: ROW_TARGET })` の動線が確立（手動確認: 藤田さん側）
- [x] AC4: `onMouseEnter`/`onMouseLeave` は変更なし、ホバー展開維持

## 未実行項目

`npm run typecheck` および `npm test` の実行が必要。このセッションにシェル実行ツールが割り当てられていないため、参謀長に実行を委ねる。

型変更は `action?: () => void`（optional 追加のみ）であり、既存コードの型互換性を崩す変更ではないため、typecheck は高い確度で pass すると判断する。テストも BrowserView の内部 MenuItem 型に依存するテストは無いため、253 maintained の見込み。

---

## Follow-up: 抽出サブメニュー クリック無反応修正のレビュー (2026-06-27)

### 判定: APPROVE（条件付き）

コードレビュー全項目 PASS。typecheck / test の実行は参謀長に委ねる。

### 変更サマリ（Before / After）

| 変更箇所 | 行番号 | Before | After | 検証 |
|---|---|---|---|---|
| `MenuItemRenderer` submenu ヘッダ onClick | 507 | `onClick={item.action}` | `onClick={() => { if (item.action) item.action(); else setSubOpen(true); }}` | 実読確認 OK |

1 箇所のみの変更。先の修正（型拡張 / 3 箇所の action 追加）は維持。

### コードレビュー チェックリスト

#### 分岐ロジックの正確性
- [x] `item.action` が truthy（テーブル行繰り返し = `doForEach`）→ `item.action()` 実行 → メニュー閉じ
- [x] `item.action` が falsy（抽出、テキスト、ループ等 = `undefined`）→ `setSubOpen(true)` → 子メニュー展開
- [x] アロー関数でラップしているため、`item.action` の評価は呼び出し時（遅延評価）→ 安全

#### 回帰なし確認
- [x] 先の修正（型 line 33 / `action: doForEach` line 261, 362, 416）は全て維持されている（Grep 確認済み）
- [x] `onMouseEnter`/`onMouseLeave` は変更なし（ホバー展開維持）
- [x] `buildSingleMenu` の submenu 構造（抽出 → テキスト → extractTextChildren）は変更なし

#### toggle vs 常時 open の設計判断
- [x] `setSubOpen(true)` を採用。根拠が design.md Follow-up に明記されている
- [x] ホバーとクリックの競合回避（toggle だとホバーで開いた後クリックで閉じる問題）

#### イベント伝播
- [x] アロー関数 `() => { ... }` 内で `item.action()` または `setSubOpen(true)` を呼ぶ。React の合成イベント経由
- [x] `item.action()` 内で `setMenu(null)` が呼ばれればメニュー閉じ。`setSubOpen(true)` の場合はメニューは閉じない（子展開のみ）→ 正しい

#### スコープ遵守
- [x] 変更ファイルは `src/components/ds/BrowserView.tsx` のみ（1 箇所）
- [x] `glossary.ts` 未変更
- [x] コミット/プッシュ未実行

### Follow-up 受け入れ条件

- [x] AC5: コード上、「抽出」(action なし) クリック → `setSubOpen(true)` → 子「テキスト」が表示される動線確立
- [x] AC6: コード上、「テキスト」(action なし) クリック → `setSubOpen(true)` → 子 extractTextChildren が表示される動線確立
- [x] AC7: コード上、extractTextChildren 内の action クリック → `doExtractText(el.id, varName, attrName)` → 抽出アクション追加（手動確認: 藤田さん側）
- [x] AC8: コード上、「テーブル行繰り返し」(action = doForEach) クリック → `if (item.action) item.action()` → `doForEach()` → ForEach 追加（回帰なし）
- [ ] AC9: `npm run typecheck` exit 0 -- **参謀長がシェル実行**
- [ ] AC10: `npm test` 253 passed -- **参謀長がシェル実行**

---

## Follow-up 2: 3 階層目サブメニュー非表示修正のレビュー (2026-06-27)

### 判定: APPROVE（条件付き）

コードレビュー全項目 PASS。typecheck / test の実行は参謀長に委ねる。

### 変更サマリ（Before / After）

| 変更箇所 | 行番号 | Before | After | 検証 |
|---|---|---|---|---|
| `MenuItemRenderer` submenu 子パネル className | 514 | `overflow-hidden` | `overflow-visible` | 実読確認 OK |

1 語のみの変更。先の全修正（型拡張 / onClick 分岐 / 3 箇所 action 追加）は維持。

### コードレビュー チェックリスト

#### overflow 変更の正当性
- [x] ルートメニュー（line 721）は既に `overflow-visible` + `rounded-md` で運用。同じパターンを submenu 子パネルに適用
- [x] `overflow-visible` により `absolute` + `left-full`/`right-full` の孫パネルがクリップされなくなる
- [x] `rounded-md` は維持。角丸は border に適用され overflow 設定と独立
- [x] `border`, `shadow-xl`, `bg-das-panel` 等の他スタイルに影響なし

#### 全メニュー種別への影響
- [x] 単一要素メニュー: 抽出 → テキスト → 変数リスト が 3 階層全て表示される
- [x] テーブルセルメニュー: 抽出/ループ の深い階層が表示される
- [x] テーブル全体/行メニュー: 同上
- [x] thead 列メニュー: 同上
- [x] 視覚的破綻の兆候なし（ルートメニューと同じパターン）

#### 回帰なし確認
- [x] onClick 分岐ロジック（line 507）変更なし
- [x] 型拡張（line 33）変更なし
- [x] 3 箇所の `action: doForEach`（line 261, 362, 416）変更なし
- [x] `onMouseEnter`/`onMouseLeave` 変更なし

#### スコープ遵守
- [x] 変更ファイルは `src/components/ds/BrowserView.tsx` のみ（1 箇所、1 語）
- [x] `glossary.ts` 未変更
- [x] コミット/プッシュ未実行

### Follow-up 2 受け入れ条件

- [x] AC11: コード上、submenu 子パネルが `overflow-visible` となり、孫パネル（`absolute` + `left-full`/`right-full`）がクリップされなくなる（手動確認: 藤田さん側）
- [x] AC12: extractTextChildren 内の action（お知らせ.見出し）クリック → `doExtractText` → 抽出ステップ追加の動線に変更なし
- [x] AC13: テーブル行繰り返しの action 分岐（`if (item.action) item.action()`）に変更なし → ForEach 追加の回帰なし
- [ ] AC14: `npm run typecheck` exit 0 -- **参謀長がシェル実行**
- [ ] AC15: `npm test` 253 passed -- **参謀長がシェル実行**
