---
tags: [type/steering-index]
created: 2026-06-12
task: 第2弾 DAS（緑ロボット）編の追加
---

# INDEX: 20260612-das-green-robot

## 概要
学習ゲーム「自動化推進室クエスト」に第2弾＝緑ロボット（Robot / Desktop Automation）編（相談 D1〜D5）を追加する。
ブランチ: `feature/das-green-robot`。

## 成果物

### リサーチ
- [[das-spec-notes]] — 青/緑ロボットの STEP・フロー制御仕様の網羅ノート（公式 docshield 典拠＋Qiita 課題対応表）

### 開発
- [[requirements]] — 要件定義（PM）
- [[design]] — 実装設計（Architect）: DAS 専用モデル型・tick 駆動シミュレータ・チェックビルダー・UI コンポーネント構成の公開 API を確定。2026-06-13 追補: 健康なロボットの10か条 統合設計（診断エンジン・リファレンスモーダル・ResultPanel 統合）
- [[tasklist]] — タスク分解（Dev Lead）
- [[review]] — 受け入れ条件チェック（Reviewer）

### ミッションデータ（frontend 担当）
- `src/data/missions/d1.ts` — D1「はじめての緑ロボット」: 在庫管理システム（静的）。ウィンドウを開く→クリック→値を抽出の基本 3 ステップ
- `src/data/missions/d2.ts` — D2「待ち方を覚える」: 送信ボタンが N tick 後に有効化。Location Found ガードで状態待ちを体験
- `src/data/missions/d3.ts` — D3「不意の来客」: ランダム tick で通知ウィンドウ出現。Application Found ガードで対処
- `src/data/missions/d4.ts` — D4「動くリストを数える」: 件数がシードで変動する仕入れ一覧。For Each＋スコープ＋相対セレクタで全件集計
- `src/data/missions/d5.ts` — D5「要素を見失わない」: 起動ごとに列順シャッフル。属性セレクタ vs 座標固定の耐久性比較
- `src/data/missions/index.ts` — MISSIONS 配列に D1〜D5 を追加
- `src/data/glossary.ts` — 緑ロボット用語 20 語を追加（greenRobot / guard / guardedChoice / locationFound 等）
