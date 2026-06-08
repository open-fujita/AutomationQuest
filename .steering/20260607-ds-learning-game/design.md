---
index: "[[INDEX]]"
---

# design — DS 学習シミュレーションゲーム

> 親 INDEX: [[INDEX]]

## アーキテクチャ全体
純クライアント SPA。状態は Zustand 2 ストア、ミッションはデータ駆動、判定はエンジン 2 種。

```
UI（React + Tailwind + React Flow）
  ├ DS 画面: MyProjectsPane / Palette / RobotView(+StepNode) / BrowserView / DataStatePane / StepView / StatusView / Toolbar
  └ ゲーム層: MissionBriefing / DeductionPanel / MissionBar / ResultPanel / ProgressMap / Glossary
状態（Zustand）
  ├ robotStore … 現在のロボット（steps/variables/types）・選択・実行結果（非永続）
  └ gameStore  … 進捗/推理回答/解禁用語（localStorage 永続）
エンジン
  ├ simulator.runRobot(robot, site) → 抽出データ + 実行ログ
  └ validator.validateMission({robot,sim}, checks) → 受け入れ条件の合否 + ヒント
データ
  └ missions/*.ts（依頼・推理・サイト定義・seed・checks・reveal）, glossary.ts
```

## ロボットモデル（model/robot.ts）
DS / Kapow を踏襲。`Robot { name, steps[], variables[], types[] }`。
- `RobotStep { id, kind, name, stepClass, action?, enabled }`。kind = start/action/loop/test/try/end。
- `StepAction` ユニオン: LoadPage / ExtractText / Click / EnterText / ForEach / TestValue。
- `TypeDef`（simple/complex + attributes）、`Variable`（typeName 参照）。
- `stepClass`（ActionStep / LoopStep / TestStep / EndStep 等）は bizrobo-analyzer の SCHEMA.md に準拠。

## シミュレータの教育的核（engine/simulator.ts）
ステップを順に解釈。`loaded` と `loopActive` を持つ。
- **ForEach 内で列を抽出 → 全行**、**ループ外で列を抽出 → 先頭 1 件のみ**。
  これにより「ループが無いと 1 件しか取れない」を体験させる（M2 の学習の肝）。
- 単一要素抽出は 1 レコード。未読込/変数未定義/対象不明はエラーとしてステータスビューに出す。

## バリデータ（engine/validator.ts）
宣言的 check ビルダー（requireLoadPageUrl / requireExtractInto / requireForEach / requireType /
requireVariable / requireRecordCount / requireAttributesFilled / requireNoErrors …）を
ミッションが組み合わせる。`validateMission` は全 check を評価し、最初の未達ヒントを返す。

## 模擬サイト（model/site.ts）
`MockSite { url, title, intro, singles[], table? }`。
- 単一要素 targetId = element.id、テーブル列 targetId = `col:<key>`、行コンテナ = `row`(ROW_TARGET)。
- ブラウザビューが要素を右クリック → 操作（抽出/クリック/要素の繰り返し）を割り当て、対応ステップを生成。

## 画面遷移（フェーズ）
`briefing → deduction → build → result`（gameStore.phase）。
build 中に［実行］→ runRobot → 受け入れ条件を全達成すると自動で result へ。result から次ミッションへ。

## トレードオフ・代替案
- **フロー表現**: 代替 A=自作 SVG キャンバス / 採用=React Flow。React Flow はノード/エッジ/ズーム/選択が揃い実装コストが低い。
  スライスではフローは「ステップ順から自動生成（左→右）」とし、ユーザーによる自由配線は無効化（学習の単純化）。
- **ループ表現**: 代替 A=ループをグループ(入れ子)で表現 / 採用=「ForEach 以降の抽出に作用する」線形モデル。
  実 Kapow の For Each はブランチ後続に作用するため意味的にも妥当で、スライスの実装/理解が単純。
- **状態管理**: 代替 A=useReducer + Context / 採用=Zustand。永続化(persist)とセレクタ購読が簡潔。
- **画像**: 透過 PNG を狙ったが gpt-image-2 は透過非対応 → 単色背景で生成し、UI 側は円形マスク + 失敗時アバターにフォールバック。

## 拡張ポイント（M3〜M7）
- ミッションは `data/missions/*.ts` 追加 + `missions/index.ts` 登録のみ。
- 新ステップ種別は StepAction ユニオン + simulator の case + StepView の編集 UI を足す。
- 健康度スコア（model/health.ts、6 軸・A〜D）は M7 で判定ロジックを実装。
