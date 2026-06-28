---
index: "[[INDEX]]"
---

# tasklist.md

> 親 INDEX: [[INDEX]]

## 概要

OfficeMapHome.tsx の座標系・レイアウトを修正し、12部署がフレーム内に収まるようにする。frontend 単独タスク。

### 完了条件
- 全描画要素がフレーム内に収まる（目視は藤田さん）
- バウンディングボックス算出が全要素を含む（Reviewer がコードで突合）
- `npm run typecheck` exit 0 / `npm test` 253 passed

## ロール別タスク分解

### frontend 担当

- [ ] T1: 定数の整理（CANVAS_W/H 除去、Z_BASE/Z_STEP/ROW_GAP/FIT_PAD/SCALE 追加） -- 依存: なし
- [ ] T2: ROWS_Y 配列を rowY() 関数に置換、buildDepts 内の z/y 算出を新定数化 -- 依存: T1
- [ ] T3: computeFit() 関数を新設（バウンディングボックス算出） -- 依存: なし
- [ ] T4: コンポーネント内で fit 値を算出 -- 依存: T2, T3
- [ ] T5: scene() SVG を fitW/fitH + g translate に修正 -- 依存: T4
- [ ] T6: deptCard() の left/top に dx/dy 加算 -- 依存: T4
- [ ] T7: マスコットの left/top に dx/dy 加算 -- 依存: T4
- [ ] T8: キャンバス wrapper を fitW/fitH に修正 -- 依存: T4

### tester 担当（参謀長がシェル実行）

- [ ] T9: `npm run typecheck` → exit 0
- [ ] T10: `npm test` → 253 passed

## 並列実行可能なタスク群

| グループ | タスク | 並列可 |
|---|---|---|
| 1 (基盤) | T1, T3 | 並列 OK |
| 2 (データ層) | T2 | T1 完了後 |
| 3 (描画層) | T4, T5, T6, T7, T8 | T2, T3 完了後、並列 OK |
| 4 (検証) | T9, T10 | T5-T8 完了後 |
