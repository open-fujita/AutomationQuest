---
tags: [type/steering-index]
created: 2026-06-27
task: テーブル行繰り返しサブメニュー クリック無反応バグ修正
---

# INDEX: 20260627-fix-table-loop-submenu

## 概要
BrowserView.tsx のテーブル行繰り返しサブメニューがクリックしても反応しないバグを修正する。M6 STEP4 の進行ブロッカー。

## 成果物

### 開発
- [[requirements]] -- バグの症状・根本原因・修正要件の整理
- [[design]] -- 修正アプローチ（案 A 採用 / 案 B 棄却）と影響範囲分析
- [[tasklist]] -- frontend 単独タスク 5 点 + 検証 2 点
- [[review]] -- typecheck / test / コードレビュー結果
