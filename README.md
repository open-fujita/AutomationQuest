# 自動化推進室クエスト — Design Studio 研修ラボ

BizRobo! **Design Studio (DS)** の使い方を、ゲームを進めるうちに自然と習得できる Web 学習シミュレーター。
プレイヤーは「自動化推進室」の新人として、各部署から寄せられる相談を**観察 → 見立て（繰り返し/変動/条件/例外を見抜く）→ DS でロボット実装 → 実行 & 効果測定**のサイクルで解決していく。BizRobo の正規用語（ロボット / ステップ / アクションステップ / タイプ / 変数 / 抽出 / 要素の繰り返し / トライ-キャッチ / スニペット 等）が UI に自然に登場する。

対象は **Design Studio のみ**（MC / RoboServer は対象外）。

## 技術スタック
- React 18 + TypeScript + Vite 6
- React Flow (@xyflow/react) — ロボットビュー（ステップ連結フロー）
- Tailwind CSS — DS 風スタイリング
- Zustand — ロボットモデル / ゲーム進捗（進捗は localStorage 永続化）
- バックエンド無し（純クライアント）

## セットアップ
```bash
npm install
npm run dev        # 開発サーバ（http://localhost:5173）
npm run build      # 本番ビルド（tsc -b && vite build）
npm run typecheck  # 型チェック（tsc --noEmit）
npm test           # エンジン検証テスト（vitest）
```

## 収録ミッション（縦切り初版）
- **相談 #1 はじめての自動化** — 新規ロボット → ページを読み込む → 単一抽出 → 実行 → 効果測定
- **相談 #2 一覧をまるごと** — タイプ/変数 → 要素の繰り返しで全件抽出 → 台帳の重複を発見する気づき

M3〜M7（ページ送り / 条件分岐 / トライ-キャッチ / スニペット / 総合相談＋健康度スコア）は
`src/data/missions/` にミッション定義ファイルを追加するだけで拡張できるデータ駆動構造。

## ディレクトリ
詳細は `docs/repository-structure.md`、設計経緯は `.steering/20260607-ds-learning-game/` を参照。
