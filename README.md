# 自動化推進室クエスト — Design Studio 研修ラボ

BizRobo! **Design Studio (DS)** の使い方を、ゲームを進めるうちに自然と習得できる Web 学習シミュレーター。
プレイヤーは「自動化推進室」の新人として、各部署から寄せられる相談を**観察 → 見立て（繰り返し/変動/条件/例外を見抜く）→ DS でロボット実装 → 実行 & 効果測定**のサイクルで解決していく。BizRobo の正規用語が UI に自然に登場する。

**第1弾（青ロボット編 M1〜M5）**: 静的 HTML ページを対象とした Basic Engine Robot の基本操作（ロボット / ステップ / アクションステップ / タイプ / 変数 / 抽出 / 要素の繰り返し / トライ-キャッチ / スニペット 等）。

**第2弾（緑ロボット編 D1〜D5）**: Desktop Automation（DAS）による Windows アプリ自動化を学ぶ。
緑ロボット（Robot / Desktop Automation）は「前方移動のみ」の実行モデルで動き、ガードチョイス（複数ガードを並行監視して最初に成立した枝を排他実行）、For Each ループ（スコープファインダー＋相対セレクタ）、CSS 風ファインダーによる要素特定が中核概念。模擬デスクトップアプリ（タイトルバー付き疑似 Windows アプリ）を tick 駆動のシミュレーターで動かし、「固定秒待ちは壊れる」「列順が変わっても属性セレクタは生き残る」をブラウザ内で体験できる。

対象は **Design Studio のみ**（MC / RoboServer は対象外）。

## 技術スタック
- React 18 + TypeScript + Vite 6
- React Flow (@xyflow/react) — 青ロボットのロボットビュー（左→右フローチャート）
- Tailwind CSS — DS 風スタイリング
- Zustand — ロボットモデル / ゲーム進捗（進捗は localStorage 永続化）
- Vitest — ユニットテスト（エンジン・シミュレータ・バリデータ）
- バックエンド無し（純クライアント）

> 緑ロボット（DAS）の縦ワークフロービューは React Flow を使わず純 DOM ツリー（`div` + Tailwind の `border-l`）で実装する。実機 Design Studio のロボットビューが「縦に並んだ折りたたみ可能なツリー」であることに合わせた設計判断。

## 必要環境
- **Node.js 18 以上（推奨: 20 または 22 LTS）** と npm。
  - Vite 6 が Node 18+ を必須とします。Node が古いと `npm run dev` で
    `SyntaxError: Unexpected reserved word`（vite.js のトップレベル await）や
    `ExperimentalWarning: The ESM module loader is experimental` が出ます。
  - 確認: `node -v` → 18 未満なら https://nodejs.org の LTS をインストールしてください
    （複数バージョンを切替える場合は nvm-windows が便利）。

## セットアップ
```bash
node -v             # まず 18 以上であることを確認
npm install
npm run dev        # 開発サーバ（http://localhost:5173）
npm run build      # 本番ビルド（tsc -b && vite build）
npm run typecheck  # 型チェック（tsc -b）
npm test           # エンジン検証テスト（vitest）
```

### Node を上げられない環境で動かす場合
このアプリは純クライアント（静的）です。**Node 18+ のマシンで `npm run build`** すると
`dist/` に静的ファイルが出力されるので、その `dist/` を任意の Web サーバー
（例: `npx serve dist`、IIS、Nginx 等）で配信すれば、実行側に Node は不要です。

## 収録ミッション

### 第1弾 — 青ロボット編（Basic Engine Robot, M1〜M5）

青ロボットは静的 HTML ページを対象とし、ブラウザビューとロボットビュー（左→右フローチャート）で操作する。

- **M1 はじめての自動化** — 新規ロボット → ページを読み込む → 単一抽出 → 実行 → 効果測定
- **M2 一覧をまるごと** — タイプ/変数 → 要素の繰り返しで全件抽出 → 台帳の重複を発見する気づき
- **M3** — ページ送り（複数ページにまたがる繰り返し）
- **M4** — 条件分岐（値によって処理を切り替える）
- **M5** — トライ-キャッチ / スニペット（エラー耐性と部品化）

### 第2弾 — 緑ロボット編（Desktop Automation, D1〜D5）

緑ロボット（DAS）は Windows アプリを対象とし、縦ワークフロービューとレコーダービューで操作する。
模擬デスクトップアプリは tick 駆動（シード乱数で決定的）で動き、ボタン有効化遅延・通知出現・リスト件数変動・列順変動を再現する。

- **D1 はじめての緑ロボット** — ウィンドウを開く → レコーダービューで要素を確認 → クリック → 値を抽出
- **D2 待ち方を覚える** — 固定秒待ち（時間経過のみ）の脆さを体験 → Location Found ガードで状態同期 → Timeout をフォールバックとして追加する 2 本構成
- **D3 不意の来客** — ランダムに出現する通知ウィンドウを Application Found ガードで捌く
- **D4 動くリストを数える** — For Each ループ＋スコープファインダー＋相対セレクタで動的リストを全件反復
- **D5 要素を見失わない** — 列順変動するテーブルで「座標固定セレクタは失敗・CSS 風属性セレクタは生き残る」を体験

### 拡張方法

`src/data/missions/` にミッション定義ファイルを追加し、`src/data/missions/index.ts` の `MISSIONS` 配列に追記するだけで増える**データ駆動構造**。
青ロボット用は既存の `Mission` 型フィールドを使用。緑ロボット用は `Mission.robotType = 'das'` を指定し、`mockApp` / `dasChecks` / `dasSuggested` 等の optional フィールドを追加する。

## ディレクトリ
設計経緯と公開 API は `.steering/20260612-das-green-robot/` を参照（design.md に型定義・関数シグネチャを記載）。
