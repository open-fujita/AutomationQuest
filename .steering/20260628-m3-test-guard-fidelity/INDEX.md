---
tags: [type/steering-index]
created: 2026-06-28
task: M3 値判定の行ガード忠実化（エンジン意味論変更）
---

# INDEX: 20260628-m3-test-guard-fidelity

## 概要
M3「条件で仕分ける」の値判定（TestValue）をエンジン忠実化。現在の「全行抽出→後からフィルタ」を、実機 DS に近い「ループ内行ガード（条件に合わない行はスキップ）」に変更する。M6（二段絞り込み）にも影響。

## 成果物

### 開発
- [[requirements]] -- 現状分析・影響範囲・要件
- [[design]] -- 2案比較・エンジン設計・M4/M6影響・UI変更要否・テスト方針
- [[tasklist]] -- 13タスク（backend/data/frontend/tester）
- [[review]] -- コードレビュー・回帰検証
