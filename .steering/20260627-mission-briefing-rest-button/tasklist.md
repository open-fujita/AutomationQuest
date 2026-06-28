---
index: "[[INDEX]]"
---

# tasklist.md

> 親 INDEX: [[INDEX]]

## 概要

MissionBriefing モーダルに「休憩する」ボタンを追加。変更ファイルは 4 つ（MissionBriefing.tsx + 呼び出し元 3 箇所）。frontend 単独タスク。

### 完了条件
- `npm run typecheck` exit 0（`onRest` 必須プロップの配線漏れ検出）
- `npm test` 253 passed 維持
- Reviewer の review.md が APPROVE

## ロール別タスク分解

### frontend 担当

- [ ] T1: `MissionBriefing.tsx` の Props に `onRest: () => void` を追加 -- 依存: なし / 想定工数: 1 分
- [ ] T2: `MissionBriefing.tsx` のフッター `justify-end` → `justify-between` + 「← 休憩する」ボタン追加 -- 依存: T1 / 想定工数: 2 分
- [ ] T3: `App.tsx` の MissionBriefing 呼び出しに `onRest={goHome}` 追加 -- 依存: T1 / 想定工数: 1 分
- [ ] T4: `DasWorkspaceLayout.tsx` の MissionBriefing 呼び出しに `onRest={goHome}` 追加 -- 依存: T1 / 想定工数: 1 分
- [ ] T5: `SetupWorkspace.tsx` の MissionBriefing 呼び出しに `onRest={goHome}` 追加 -- 依存: T1 / 想定工数: 1 分

### tester 担当（参謀長がシェル実行）

- [ ] T6: `npm run typecheck` 実行 → exit 0 確認 -- 依存: T1-T5 全完了
- [ ] T7: `npm test` 実行 → 253 passed 確認 -- 依存: T1-T5 全完了

## 並列実行可能なタスク群

| グループ | 含まれるタスク | 並列実行可 |
|---|---|---|
| 1 (Props 基盤) | T1 | 単独先行 |
| 2 (実装) | T2, T3, T4, T5 | T1 完了後、並列 OK |
| 3 (検証) | T6, T7 | T2-T5 完了後、並列 OK |

## ロール選定理由

- **frontend**: React コンポーネントの Props 拡張 + JSX 変更のみ
- **backend / data / security / devops / mobile / docs**: 起動不要（スコープ外）

## リスクと注意点

- `glossary.ts` の未コミット変更には触れない
- `BrowserView.tsx` の先のサブメニュー修正を回帰させない
- コミット/プッシュは藤田さんの明示指示があるまで行わない
