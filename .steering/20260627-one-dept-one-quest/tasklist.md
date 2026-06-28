---
index: "[[INDEX]]"
---

# tasklist.md

> 親 INDEX: [[INDEX]]

## 概要

ミッションデータの `client` を変更し、1部署1クエストを実現する。変更ファイルは 2 つ（m1.ts / m5.ts）。data 担当タスク。

### 完了条件
- 全 12 ミッションの `client.dept` が一意
- `npm run typecheck` exit 0
- `npm test` 253 passed 維持

## ロール別タスク分解

### data 担当（frontend がデータ変更を兼務）

- [ ] T1: `m1.ts` の `client` を `{ name: '及川 広報部', dept: '広報部' }` に変更 -- 依存: なし / 想定工数: 1 分
- [ ] T2: `m5.ts` の `client` を `{ name: '岡田 業務システム課', dept: '業務システム課' }` に変更 -- 依存: なし / 想定工数: 1 分

### tester 担当（参謀長がシェル実行 + Reviewer が grep 突合）

- [ ] T3: 全 12 ミッションの `client.dept` を grep で一覧し一意性を確認 -- 依存: T1, T2
- [ ] T4: `npm run typecheck` 実行 → exit 0 確認 -- 依存: T1, T2
- [ ] T5: `npm test` 実行 → 253 passed 確認 -- 依存: T1, T2

## 並列実行可能なタスク群

| グループ | 含まれるタスク | 並列実行可 |
|---|---|---|
| 1 (実装) | T1, T2 | 並列 OK（別ファイル） |
| 2 (検証) | T3, T4, T5 | T1-T2 完了後、並列 OK |

## ロール選定理由

- **data（frontend 兼務）**: ミッションデータの `client` オブジェクト変更のみ。DB スキーマ変更やマイグレーションは不要（静的 TypeScript データ）
- **backend / security / devops / mobile / docs**: 起動不要

## リスクと注意点

- `glossary.ts` 不可触
- briefing / reveal 本文は変更しない（スコープ拡大回避）
- コミット/プッシュは藤田さん指示待ち
