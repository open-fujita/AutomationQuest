---
tags: [type/steering-index]
created: 2026-06-27
task: ホームMAP フレームフィット（見切れ解消）
---

# INDEX: 20260627-office-map-fit

## 概要
12部署化で縦に伸びたホームMAP（OfficeMapHome）をフレーム内に収める。傾き緩和 + バウンディングボックスフィット + スケール調整。

## 成果物

### 開発
- [[requirements]] -- 見切れ症状と修正要件
- [[design]] -- 3段階修正アプローチ（A: 傾き緩和, B: bbox フィット, C: スケール）
- [[tasklist]] -- frontend タスク分解
- [[review]] -- コードレビュー結果
