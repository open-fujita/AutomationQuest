---
index: "[[INDEX]]"
---

# tasklist.md

> 親 INDEX: [[INDEX]]

## 概要

BrowserView.tsx のテーブル行繰り返しサブメニュー クリック無反応バグを修正する。対象ファイルは 1 つ（BrowserView.tsx）、変更箇所は 5 点。frontend 単独タスク。

### 完了条件
- `npm run typecheck` exit 0
- `npm test` 253 passed 維持
- Reviewer の review.md が APPROVE

## ロール別タスク分解

### frontend 担当

- [ ] T1: `MenuItem` 型の submenu バリアントに `action?: () => void` を追加（line 33） -- 依存: なし / 想定工数: 1 分
- [ ] T2: `MenuItemRenderer` の submenu ヘッダ `<div>` に `onClick={item.action}` を付与（line 504） -- 依存: T1（型が先） / 想定工数: 1 分
- [ ] T3: `loopMenuForTable()` 内の「テーブル行繰り返し」submenu 定義に `action: doForEach` 追加（line 258-276） -- 依存: T1 / 想定工数: 1 分
- [ ] T4: `buildTableCellMenu()` 内の「テーブル行繰り返し」submenu 定義に `action: doForEach` 追加（line 358-365） -- 依存: T1 / 想定工数: 1 分
- [ ] T5: `buildRowMenu()` 内の「テーブル行繰り返し」submenu 定義に `action: doForEach` 追加（line 411-418） -- 依存: T1 / 想定工数: 1 分

### tester 担当（Reviewer が兼務）

- [ ] T6: `npm run typecheck` 実行 → exit 0 確認 -- 依存: T1-T5 全完了
- [ ] T7: `npm test` 実行 → 253 passed 確認 -- 依存: T1-T5 全完了

## 並列実行可能なタスク群

| グループ | 含まれるタスク | 並列実行可 |
|---|---|---|
| 1 (型基盤) | T1 | 単独先行 |
| 2 (実装) | T2, T3, T4, T5 | T1 完了後、並列 OK |
| 3 (検証) | T6, T7 | T2-T5 完了後、並列 OK |

## ロール選定理由

- **frontend**: BrowserView.tsx は React UI コンポーネント。型定義・JSX・イベントハンドラの変更のみで、API / DB / インフラ / セキュリティへの影響なし
- **backend / data / security / devops / mobile / docs**: 起動不要（スコープ外）
- **tester**: 既存テスト 253 の pass 確認のみ。新規テスト追加は不要（UI イベントハンドラの追加は既存テストカバレッジで検証済み）。Reviewer が typecheck / test 実行を兼務

## リスクと注意点

- `glossary.ts` の未コミット変更には絶対に触れない
- コミット/プッシュは藤田さんの明示指示があるまで行わない

---

## Follow-up: 抽出サブメニュー クリック無反応修正

### frontend 担当

- [ ] T8: `MenuItemRenderer` の submenu ヘッダ onClick を分岐ロジックに変更（line 507）-- 依存: なし / 想定工数: 1 分

### tester 担当（参謀長がシェル実行）

- [ ] T9: `npm run typecheck` 実行 → exit 0 確認 -- 依存: T8
- [ ] T10: `npm test` 実行 → 253 passed 確認 -- 依存: T8

### 回帰確認（手動・藤田さん側）

- [ ] T11: テーブル行繰り返しクリックで従来通り ForEach が入ること（action あり経路）
- [ ] T12: 「抽出」クリック → 「テキスト」が開く → 「お知らせ.見出し」が開く → クリックで抽出追加（M1 STEP2 合格）

---

## Follow-up 2: 3 階層目サブメニュー非表示修正

### frontend 担当

- [ ] T13: `MenuItemRenderer` の submenu 子パネル className で `overflow-hidden` → `overflow-visible` に変更（line 514）-- 依存: なし / 想定工数: 1 分

### tester 担当（参謀長がシェル実行）

- [ ] T14: `npm run typecheck` 実行 → exit 0 確認 -- 依存: T13
- [ ] T15: `npm test` 実行 → 253 passed 確認 -- 依存: T13

### 回帰確認（手動・藤田さん側）

- [ ] T16: 抽出 click → テキスト表示 → テキスト click → お知らせ.見出し 表示 → click で抽出ステップ追加（M1 STEP2 合格）
- [ ] T17: テーブル行繰り返しクリックで ForEach が入ること（M6 回帰なし）
