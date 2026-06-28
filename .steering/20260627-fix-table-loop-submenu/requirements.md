---
index: "[[INDEX]]"
---

# requirements.md

> 親 INDEX: [[INDEX]]

## 概要

BrowserView.tsx のテーブル行繰り返しサブメニューをクリックしても反応しないバグを修正する。M6 の STEP4「テーブル行繰り返しで各行をループ」が進められない致命的な進行ブロッカー。

## 背景

- M6「二段で絞り込む」（commit `63634af`）追加後、STEP4 でテーブル行繰り返しを実行する必要がある
- 右クリックメニュー「ループ > テーブル行繰り返し」は `kind: 'submenu'` で定義されており、ヘッダクリックでアクションが発火しない
- 3 階層目（「最初の行を含める」「最初の行を除外」）はホバー展開でしか到達できず、ユーザビリティが低い

## 根本原因

1. `MenuItem` 型の submenu バリアント（line 33）に `action` フィールドが無い
2. `MenuItemRenderer` の submenu ヘッダ `<div>`（line 504）に `onClick` が無い（`onMouseEnter`/`onMouseLeave` のみ）
3. 「テーブル行繰り返し」の submenu 定義 3 箇所（line 258-276 / 358-365 / 411-418）に既定アクションが設定されていない

## 要件

### 機能要件

- テーブル行繰り返しサブメニューのヘッダをクリックすると `doForEach`（`addAction('ForEach', { targetId: ROW_TARGET })`）が実行されること
- 既存のホバー展開（子メニュー表示）は維持すること
- `action` を持たないサブメニュー（「抽出」「ループ」等）のクリックは無害（何も起きない）であること

### 非機能要件

- 型安全性: `action` は optional（`action?: () => void`）で既存コードに影響しない
- テスト: 既存 253 テスト全て pass 維持
- 型チェック: `npm run typecheck` exit 0 維持

## 受け入れ条件

- [ ] AC1: `npm run typecheck` が exit 0
- [ ] AC2: `npm test` が 253 passed 維持
- [ ] AC3: 「テーブル行繰り返し」ヘッダクリックで ForEach アクションが追加される（手動確認: 藤田さん側）
- [ ] AC4: 既存のサブメニューホバー展開が維持される（手動確認: 藤田さん側）

## スコープ

- 対象: `src/components/ds/BrowserView.tsx` のみ
- 対象外: OfficeMapHome 等のデザイン刷新領域、`src/data/glossary.ts`（既存 WIP）

## 制約

- `src/data/glossary.ts` の未コミット変更には触れない
- ブランチ `feature/office-map-home` 上で作業。コミット/プッシュは藤田さんの明示指示があるまで行わない

---

## Follow-up: 抽出サブメニュー クリック無反応 (2026-06-27)

### 症状

M1 STEP2「お知らせ見出しを 変数 お知らせ.見出し に抽出する」で、見出し右クリック →「抽出 → テキスト」の「テキスト」をクリックしても無反応。子（抽出先変数リスト）はホバーでしか開かない。3 階層目（お知らせ.見出し）に到達できず M1 STEP2 が進められない。

### 根本原因

先の修正で `MenuItemRenderer` の submenu ヘッダに `onClick={item.action}` を付与したが、「抽出」「テキスト」等の submenu は `action` を持たない。`onClick={undefined}` となりクリック無反応。子メニューはホバー（`onMouseEnter`）でしか展開されない。

### 要件

- `action` を持たないサブメニューのヘッダクリックで、子サブメニューを開くこと
- `action` を持つサブメニュー（テーブル行繰り返し）のクリック動作は回帰させないこと
- ホバー展開は維持すること
- 変数選択（お知らせ.見出し のクリック）は M1 の学習要点なので残す（テキストクリックで即抽出はしない）

### 受け入れ条件

- [ ] AC5: 「抽出」クリック → 「テキスト」が表示される
- [ ] AC6: 「テキスト」クリック → 変数リスト（「お知らせ.見出し」等）が表示される
- [ ] AC7: 変数クリック → 抽出アクション追加（M1 STEP2 合格）
- [ ] AC8: 「テーブル行繰り返し」ヘッダクリック → 従来通り ForEach が入る（回帰なし）
- [ ] AC9: `npm run typecheck` exit 0
- [ ] AC10: `npm test` 253 passed 維持

---

## Follow-up 2: 3 階層目サブメニュー非表示 (2026-06-27)

### 症状

M1 STEP2 で「抽出 → テキスト」をクリックすると「テキスト」はハイライトされる（`setSubOpen(true)` は効いている）が、その子「お知らせ.見出し」（3 階層目）が**表示されない**。

### 根本原因

`MenuItemRenderer` の submenu 子パネル（line 513-514）の className に `overflow-hidden` が含まれている。「テキスト」の子パネルは `absolute` + `left-full`/`right-full` で親パネル外にはみ出す配置だが、親パネルの `overflow-hidden` によってクリップされ見えなくなっている。ルートメニューコンテナ（line 721）は `overflow-visible` であるため 1→2 階層目は表示されるが、2→3 階層目以降は submenu 子パネル内でクリップされる。

### 要件

- submenu 子パネルの `overflow-hidden` を `overflow-visible` に変更し、全ネスト階層の孫パネルが表示されること
- `rounded-md` は維持すること（パネルの角丸は残す）
- 先の修正（型拡張、onClick 分岐ロジック、3 箇所の action: doForEach）を回帰させないこと

### 受け入れ条件

- [ ] AC11: 「抽出」click → 「テキスト」表示 → 「テキスト」click → 「お知らせ.見出し」（+ 新しいシンプル/コンプレックス...）が**表示される**
- [ ] AC12: 「お知らせ.見出し」click で抽出ステップが入る（M1 STEP2 合格）
- [ ] AC13: M6 テーブル行繰り返しクリックで ForEach が入る（回帰なし）
- [ ] AC14: `npm run typecheck` exit 0
- [ ] AC15: `npm test` 253 passed 維持
