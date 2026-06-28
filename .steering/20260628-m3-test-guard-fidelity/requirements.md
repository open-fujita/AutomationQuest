---
index: "[[INDEX]]"
---

# requirements.md

> 親 INDEX: [[INDEX]]

## 概要

M3「条件で仕分ける」の値判定（TestValue）が実機 BizRobo DS の正しいイディオムと食い違っている。「抽出 → 最後に値判定」ではなく、実機同様の「ループ内で値判定を行ガードとして使い、条件に合わない行はスキップ」に変更する。

## 現状の問題

### エンジン（simulator.ts）
- `TestValue` は runLinear (line 156-173) / runGraph (line 295-305) とも「data[toVariable] のコレクション全体を後からフィルタ」する実装
- 配置位置（ループ内/外、抽出の前/後）に依存せず、常に全行抽出後に絞る
- このため「抽出してから条件」という、実機と逆順の構成が許容されてしまっている

### runLinear と runGraph の非対称性
- **runLinear**: ForEach で `loopActive=true` を設定するだけで、行単位のイテレーションをしない。ExtractText が `loopActive` を見て全行一括読み取り。TestValue は後から一括フィルタ
- **runGraph**: ForEach が行単位でイテレートし、各行ごとに本体を実行する（line 354-358）。ただし TestValue は依然として一括フィルタ

### ミッションデータ（m3.ts）
- goals は「ループ＋抽出 → その後 値判定」順を示唆
- checks は `requireForEach` / `requireExtractCount(2)` / `requireTestValue('未対応')` / `requireMaxRecordCountEquals(4)` で、**ステップ間の順序は強制していない**

### 影響範囲（実読で確認済み）
- **M4**: TestValue を**使用していない**（グラフの分岐/ループ/保存のみ）。影響なし
- **M6**: TestValue を**2 回使用**（`requireTestValue('未承認')` + `requireTestValue('高額')`、二段重ね）。M3 と同じ「抽出→フィルタ」パターン。同様に修正が必要
- **TestValue 参照ファイル**: 11 ファイル（simulator.ts / robot.ts / robotStore.ts / PropertiesPane.tsx / Palette.tsx / StepNode.tsx / stepStatus.ts / validator.ts / engine.test.ts / m3.ts / m6.ts）

## 要件

### 機能要件
1. ループ内の TestValue が「現在行」を条件評価し、不一致ならその行の残りをスキップ（結果に格納しない）する行ガードとして動作すること
2. ループ外の TestValue は既存の一括フィルタ挙動を維持すること（後方互換）
3. M3 の goals/checks/hints を「ループ → 値判定(ガード) → 抽出」の順序で再構成すること
4. M6 も同様に再構成すること（二段重ね → 二段ガード）
5. runLinear / runGraph 両方で行ガードが動作すること

### 非機能要件
- 既存テスト 253 の pass 維持（テスト内容の修正は許容、テスト数の減少は不可）
- `npm run typecheck` exit 0

## 設計フェーズで詰める論点
1. 値判定が「何を」テストするか（DOM セル vs 抽出済み変数属性）
2. runLinear の行単位イテレーション化の設計
3. UI 変更の要否と範囲
4. M4/M6 への互換戦略
5. テスト方針

## スコープ
- simulator.ts / robot.ts のエンジン変更
- m3.ts / m6.ts のミッションデータ変更
- validator.ts の順序チェック追加（任意）
- BrowserView.tsx / PropertiesPane.tsx の UI 変更（案による）
- engine.test.ts のテスト修正/追加

## 制約
- glossary.ts 不可触
- 先の全修正（BrowserView サブメニュー / MissionBriefing / m1/m5 データ / OfficeMapHome フィット）に触れない
- **設計フェーズのみ。コード変更は参謀長レビュー後**
