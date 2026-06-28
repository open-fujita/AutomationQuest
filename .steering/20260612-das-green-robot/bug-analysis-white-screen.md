---
tags: [type/bug-analysis]
created: 2026-06-13
index: "[[INDEX]]"
bug-id: white-screen
severity: high
status: 再現不能（render 経路で再現せず）/ 真因は未確定
---

# bug-analysis-white-screen.md

> 親 INDEX: [[INDEX]]

## バグ概要

- **報告された症状**: 「実行ボタンを押すと画面が真っ白になります」
- **報告環境**: BizRobo! 学習ゲーム（`C:/Devs/RPA/ds_master`）、ブランチ `feature/das-green-robot`（HEAD `39ed37b`）
- **重大度**: high（操作不能・データ消失感）。ただし後述のとおり**現 HEAD のレンダリング経路では再現できなかった**。
- **影響範囲（推定）**: 緑ロボット編（D1〜D5）/ 青ロボット編（M1〜M5）の「実行」後フェーズ。

## 結論（先出し）

**現 HEAD（`39ed37b`）の描画経路では、緑（D1〜D5）・青（M1〜M5）いずれの実行後状態でも「真っ白（描画クラッシュ）」を再現できなかった。** 一時再現テスト 7 ケース（SSR `renderToString`）はすべてグリーン。`tsc -b` / `vite build` / 既存 129 テストもすべて成功。

したがって本報告は **「render 経路では再現不能」** を第一級の成果として報告する。曖昧な対症修正は行わない（Debugger 原則）。一方で調査中に **真因候補となりうる 2 つの実在欠陥** と、**未検証の最有力仮説（エフェクト時クラッシュ）** を特定したので、Dev Lead に切り分け継続を申し送る。

## 再現手順（試行した手順）

### 環境
- Node 18+ / vitest 2.1.9（環境は既定の `node`。jsdom/happy-dom は未導入、依存追加禁止のため SSR で代替）
- `react-dom/server` の `renderToString` で「描画中の未捕捉例外＝白画面」を検出

### データ・手順（緑 D4 を主対象に実機操作を最小再現）
1. `dasRobotStore.loadMission(D4)`（dasSeed 適用）
2. UI 挿入相当: トップに `Windows` → `ForEach`（scope=`table[name="仕入れ一覧"]` / element=`> listitem`）、`insertTarget=forEachBody` に切替えて body に `ExtractValue` を追加
3. `runDasRobot(robot, D4.mockApp)` 実行 → `setSim(result)`
4. `DasWorkflowView` / `DasStatePane` / `DasWorkspaceLayout`（result フェーズ含む）/ `RecorderView`（`currentTick=totalTick`・ForEach 選択中）を `renderToString` し throw を捕捉
5. 青は `App` 全体を M1〜M5 各々で実行後 `phase=result` を強制して `renderToString`
6. 緑 D1〜D5 も `phase=result` を強制して `DasWorkspaceLayout` を `renderToString`

### 再現率
- **0%（再現せず）**。一時テストファイル `src/__repro__/white-screen.repro.test.tsx`（7 ケース）すべてグリーン。

```
Test Files  1 passed (1)
     Tests  7 passed (7)
```

## 検証した仮説

| # | 仮説 | 成立条件 | 検証方法 | 結果 |
|---|---|---|---|---|
| A | ループのフロー描画簡素化（StepCard / DasWorkflowView / GuardLane）で `undefined` アクセスや不正 JSX が混入し描画 throw | ForEach/Loop 系カード描画時に throw | D4（ForEach+body）を組んで SSR 描画 | **不成立**（クラッシュせず。構造は純粋 JSX のみ） |
| B | 健康診断統合（result フェーズで `diagnose()` 実行 + `ResultPanel` + `mission.reveal(sim)`）が DasSim の形状不一致で throw | result フェーズ描画時に throw | 全 10 ミッションで `phase=result` 強制描画 | **不成立**（reveal は全て `?? []`・optional chain で防御済み。`diagnose` は try 不要なほど純粋・null 安全） |
| C | `DasWorkspaceLayout.tsx:124` の `sim as unknown as SimResult` キャストにより `ResultPanel` が DasSim にない `sim.returned` 等へアクセスし throw | `ResultPanel` 描画時に `sim.returned` 等を参照 | コード精査 + result フェーズ描画 | **不成立**（`ResultPanel` は `sim` を `mission.reveal(sim)` に渡すのみ。緑の reveal は `returned` を参照しない） |
| D | 実行後 `currentTick=totalTick` で `RecorderView` の render 内 IIFE（`applyTimeline`/`findWidget`/`findWidgetPath`）が高 tick・ForEach 選択時に throw | 高 tick かつ ForEach 選択時に throw | `RecorderView` を `currentTick=sim.totalTick`・ForEach 選択で SSR 描画 | **不成立**（`applyTimeline`/`findWidget` は完全に純粋・防御的。HTML が正常生成され `仕入れ` を含む） |
| E | `index.css` のライトテーマ化で不正な CSS/PostCSS → ビルド失敗で白画面 | ビルド時に PostCSS error | `vite build` 実行 | **不成立**（ビルド成功・CSS 51.89kB 生成） |
| F | 型不整合（DasSim を SimResult にキャスト等）で実行時 throw | tsc でエラー or 実行時型不整合 | `tsc -b` 実行 | **不成立**（型エラー 0、終了コード 0） |
| G（未検証・最有力） | エフェクト時クラッシュ。`onRun → setSim → validation.pass → useEffect で phase=result → 再描画` の**エフェクト経路**で throw。SSR はエフェクトを走らせないため取りこぼす | `useEffect`/`useLayoutEffect` 内 or イベントハンドラ内で throw | jsdom 無しのため最小 DOM シム + `react-dom/client` を試行 → **シム不足の偽陽性**で切り分け不能 | **未検証**（環境制約で確定できず。下記「未確定事項」へ） |

## 根本原因（Root Cause）

**未確定。** 現 HEAD の render 経路では throw を再現できなかったため、表層原因の特定に至っていない。以下は確度の階層:

- **表層原因（候補）**: 「実行」後の再描画フェーズ（result への遷移 or 高 tick の RecorderView）で何らかの未捕捉例外が出てツリーが落ちる、というのが症状からの逆算。ただし SSR では throw せず。
- **中間原因（候補）**: SSR が走らせない**エフェクト（`useEffect`/`useLayoutEffect`）またはイベントハンドラ**でのみ発生する例外（仮説 G）。`RecorderView` の `useLayoutEffect`（`getBoundingClientRect`）等が候補だが、これらはコンテキストメニュー表示時のみで「実行」では発火しない。
- **根本原因（5 Whys 未完）**: render が安全である以上、(1) ブラウザ固有のエフェクト経路、(2) 報告環境のキャッシュ/古いビルド、(3) 報告者の操作が当方の最小再現と異なる、のいずれかに収束する。**1 文では言えない＝掘り切れていない**ことを明記する。

## 調査中に発見した実在欠陥（白画面の直接原因ではないが要修正）

### 欠陥1: 動的 Tailwind クラスがビルド CSS に出力されない（フロー線の Y 整列崩れ）

- **箇所**: `src/components/das/DasWorkflowView.tsx:78`
  ```ts
  const lineMt = `mt-[${FLOW_Y_OFFSET}px]`   // → "mt-[7px]"
  ```
- **問題**: Tailwind JIT はソース中に**静的文字列として現れるクラス名のみ**を生成する。テンプレートリテラルで実行時合成した `mt-[7px]` はスキャンされず、**ビルド CSS に `mt-[7px]` が一切含まれない**（`grep -c 'mt-\[7px\]' dist/assets/*.css` → `0`）。
- **影響**: 横フローの ○/接続線の固定 Y 整列（`FLOW_Y_OFFSET=7px`）が効かず、**フロー線が一直線に揃わない**見た目崩れ。`GuardLane.tsx` は静的 `mt-[7px]` を使うが、それでも CSS に出ていない（content glob か purge の確認も要）。
- **重大度**: 中（cosmetic）。**白画面とは無関係**。
- **最小 diff 案**: 動的合成をやめてインラインスタイルに統一する。
  ```ts
  // before
  const lineMt = `mt-[${FLOW_Y_OFFSET}px]`
  <div className={`${lineStyle} ${lineMt}`}>
  // after（StepCard 側と同じ手法に統一）
  <div className={lineStyle} style={{ marginTop: `${FLOW_Y_OFFSET}px` }}>
  ```
  併せて `GuardLane.tsx:249,262` の `mt-[7px]` も `style={{ marginTop: '7px' }}` に統一推奨。
- **担当**: frontend

### 欠陥2: `<tbody>` 直下に `listitem`（`<div>`）が入る不正 DOM ネスト（D4）

- **箇所**: `src/components/das/MockAppView.tsx`（`table` ケース 202-224 / `listitem` ケース 182-200）と `src/data/missions/d4.ts`（table の children が `tablerow` ではなく `listitem`）
- **問題**: `MockAppView` の `table` は children を `<tbody>` 内にそのまま map する。D4 では table の子が **`listitem`**（→ `<div role="listitem">`）であり、`<tbody><div>…</div></tbody>` という**不正な DOM ネスト**になる。
- **影響**: React 18 は warning を出すが throw はしない（白画面ではない）。ただしブラウザの DOM 正規化やレイアウト崩れの温床。
- **重大度**: 低〜中。**白画面とは断定できない**（React は throw しない）。
- **最小 diff 案（いずれか）**:
  - (a) D4 の table を使わず `listitem` を直接コンテナ（`type: 'table'` ではなく汎用 div 系）に入れる、または
  - (b) `MockAppView` の `table` ケースで `listitem` 子を `<tbody>` でなく通常コンテナで描く分岐を追加。
- **担当**: frontend または data（mockApp 構造の判断を含むため Dev Lead 振り分け）

## 影響範囲

- 欠陥1: 緑ロボット編の**全ワークフロー描画**（D1〜D5 のフロー線整列）。
- 欠陥2: **D4 のみ**（table×listitem の組み合わせ）。他ミッションの table は tablerow を使うため影響薄。
- 白画面（真因未確定）: 仮説 G が当たれば緑・青の**実行後フェーズ全般**に影響しうる。

## 修正提案（白画面そのものへの対応方針）

render で再現しない以上、**まず切り分けを完了させてから修正**する。対症修正（適当に try/catch を足す等）は禁止。推奨順:

- **案A（推奨）**: ブラウザでの**実機再現＋スタックトレース採取**を最優先。`feature/das-green-robot` を `npm run dev` で起動し、D4（または報告ミッション）を実機操作 →「実行」→ DevTools Console のエラー全文（赤スタック）を採取。**これが真因確定の最短路**。あわせて Console の「Hydration / nesting」warning も記録（欠陥2 の確認）。
- **案B（保険・恒久対策）**: アプリ最上位に **React Error Boundary** を導入し、白画面ではなくエラー画面＋リロード導線を出す。白画面（無情報）から脱却し、以後の障害でスタックを画面表示できる。`main.tsx` / `App.tsx` に最小実装。
  - メリット: 再発時の調査コストが激減。デメリット: 真因そのものは隠蔽しうる（案A と併用前提）。
- **推奨**: **案A で真因確定 → 確定後にピンポイント修正、並行して案B を恒久対策として実装**。

## 修正担当の振り分け（Dev Lead への提案）

| 項目 | 担当ロール | 内容 |
|---|---|---|
| 白画面の実機再現＋スタック採取 | **debugger 再依頼** or 藤田さん（ブラウザ操作） | DevTools Console の赤スタック全文。これ無しでは真因確定不可 |
| Error Boundary 導入（案B） | **frontend** | `main.tsx`/`App.tsx` に最上位 ErrorBoundary。白画面→エラー画面化 |
| 欠陥1（動的 Tailwind → inline style） | **frontend** | DasWorkflowView/GuardLane の `mt-[7px]` を `style` に統一 |
| 欠陥2（tbody×listitem ネスト） | **frontend / data** | D4 mockApp 構造 or MockAppView の table 分岐 |
| 回帰テスト本実装 | **tester** | 一時 `white-screen.repro.test.tsx`（SSR）を正式回帰テスト化。jsdom 導入可否は要判断（依存追加は藤田さん承認） |

## 再発防止

- **テスト追加（tester へ依頼）**: 一時再現テスト `src/__repro__/white-screen.repro.test.tsx` を回帰テストとして昇格。SSR では取りこぼす**エフェクト経路**を確実に検出するため、**jsdom 環境の導入**を検討（`vitest --environment jsdom`。依存追加につき藤田さん承認が前提）。
- **設計見直し（Architect へ申し送り）**: `DasSimResult` を `SimResult` に `as unknown as` でキャストして共有 `ResultPanel` に渡す設計（`DasWorkspaceLayout.tsx:124`）は型安全性を放棄している。`ResultPanel` の `sim` を `SimResult | DasSimResult` のユニオン or 専用 props に分離する設計を推奨。
- **規約更新（development-guidelines.md 候補）**: **「Tailwind の任意値クラス（`mt-[Npx]` 等）をテンプレートリテラルで動的合成しない。動的な数値はインライン `style` を使う」** を明文化。今回の欠陥1 の再発防止。
- **恒久対策**: 最上位 Error Boundary を標準化（白画面の構造的排除）。

## 添付・痕跡

- 一時再現テスト: `C:/Devs/RPA/ds_master/src/__repro__/white-screen.repro.test.tsx`（7 ケース・全グリーン。修正後の回帰テストとして残置）
- 検証コマンド痕跡: `npx vitest run`（129 passed）/ `tsc -b`（exit 0）/ `vite build`（built OK）/ `grep -c 'mt-\[7px\]' dist/assets/*.css`（0）
