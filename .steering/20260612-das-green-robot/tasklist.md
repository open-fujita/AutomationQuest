---
index: "[[INDEX]]"
tags: [type/tasklist]
created: 2026-06-12
---

# tasklist.md — 第2弾 DAS 緑ロボット編 タスク分解

> 親 INDEX: [[INDEX]]

## 概要

requirements.md（D1〜D5 緑ロボット相談の追加）と design.md（DAS 専用型・tick 駆動シミュレータ・純 DOM ツリー UI・チェックビルダー群の設計）に基づき、実装タスクを 4 ワーカー（backend / frontend(UI) / frontend(ミッション) / docs）にロール別に分解する。

**完了条件**: `npm run typecheck && npm run build && npm run test` が 0 エラー。D1〜D5 が相談票→見立て→ワークフロー→実行→判定の標準フローでプレイ可能。M1〜M5 のリグレッションなし。Reviewer の review.md が APPROVE。

---

## ロール別タスク分解

### backend 担当（基盤層）

対象ファイル（所有権）:
- `src/model/dasRobot.ts`（新規）
- `src/model/mockApp.ts`（新規）
- `src/model/mission.ts`（既存、optional フィールド追加のみ）
- `src/engine/dasSimulator.ts`（新規）
- `src/engine/dasValidator.ts`（新規）
- `src/engine/dasStepStatus.ts`（新規）
- `src/engine/das.engine.test.ts`（新規）

---

- [ ] **T1: DasRobot 型定義** — `src/model/dasRobot.ts` を新規作成
  - 担当: backend
  - 対象ファイル: `src/model/dasRobot.ts`
  - 完了条件:
    - design.md §DasRobot 型のとおり DasFinder / GuardType / Guard / DasAction（11 variant）/ DasStep / DasRobot / DasSuggestedConfig を export
    - DAS_ACTION_LABELS / GUARD_TYPE_LABELS の定数を export（公式用語準拠、das-spec-notes §3.4）
    - nextDasStepId() / createEmptyDasRobot() ヘルパーを export
    - `npm run typecheck` パス
  - 依存: なし

- [ ] **T2: MockApp 型・ヘルパー関数** — `src/model/mockApp.ts` を新規作成
  - 担当: backend
  - 対象ファイル: `src/model/mockApp.ts`
  - 完了条件:
    - WidgetType / AppWidget / AppEvent（5 variant）/ MockApp / SeededRng を export
    - createSeededRng(seed): LCG 方式で Math.random を一切使わないシード乱数
    - applyTimeline(app, tick): 純粋関数。tick 以下のイベントを順に適用し AppWidget[] を返す
    - findWidget(widgets, selector, scope?): CSS 風セレクタで AppWidget を検索。`button[name="OK"]` / `> DIV` / `:nth-child(n)` / 属性前方一致 `^=` 後方 `$=` 部分 `*=` を最低限サポート
    - `npm run typecheck` パス
  - 依存: なし（T1 と並列可）

- [ ] **T3: Mission 型の後方互換拡張** — `src/model/mission.ts` に optional フィールド追加
  - 担当: backend
  - 対象ファイル: `src/model/mission.ts`
  - 完了条件:
    - robotType? / mockApp? / dasSeed? / dasChecks? / dasSuggested? の 5 フィールドを追加（design.md 準拠）
    - import { MockApp } from './mockApp' / import { DasRobot, DasSuggestedConfig } from './dasRobot' を追加
    - DasMissionCheck 型は dasValidator.ts からの import で参照
    - 既存 M1〜M5 のミッション定義が型エラーなくコンパイルされる
    - `npm run typecheck` パス
  - 依存: T1, T2（型参照のため）

- [ ] **T4: DAS シミュレータ** — `src/engine/dasSimulator.ts` を新規作成
  - 担当: backend
  - 対象ファイル: `src/engine/dasSimulator.ts`
  - 完了条件:
    - DasSimOptions / DasSimLogEntry / DasSimResult / EMPTY_DAS_SIM を export
    - runDasRobot(robot, app, opts?) を純粋関数として export
    - **ガードチョイス意味論**: 各 tick で全ガードを並行評価→最初成立のガードの枝のみ排他実行→他ガードは評価対象外。Timeout 既定 60 秒（= 60 tick）
    - **For Each 意味論**: scopeFinder で起点特定→elementFinder の相対セレクタで子孫検索→各ウィジェットに body を実行
    - **前方移動のみ**（バックトラックなし）
    - ループ/ガード暴走防止（maxTick 既定 120）
    - ガード待機/成立を DasSimLogEntry に記録（`guard-waiting` / `guard-matched` ステータス）
    - guardResults 配列に成立ガードの type と tick を記録
    - `npm run typecheck` パス
  - 依存: T1, T2（DasRobot / MockApp 型を使用）

- [ ] **T5: DAS バリデータ** — `src/engine/dasValidator.ts` を新規作成
  - 担当: backend
  - 対象ファイル: `src/engine/dasValidator.ts`
  - 完了条件:
    - DasMissionCheckCtx / DasMissionCheck を export
    - validateDasMission(ctx, checks) を export（既存 ValidationResult 型を再利用）
    - チェックビルダー群を全て export（design.md §dasValidator.ts の 12 関数: requireDasAction / requireGuardOfType / requireLocationFoundGuard / requireApplicationFoundGuard / forbidTimeoutOnly / requireForEachScope / requireRelativeSelector / requireSelectorMatch / requireDasExtractCount / requireGuardMatched / requireDasNoErrors / requireOpenWindow）
    - ネスト構造（GuardedChoice の枝内 / ForEach の body 内）を再帰的に検索
    - `npm run typecheck` パス
  - 依存: T1, T4（DasRobot / DasSimResult 型を使用）

- [ ] **T6: DAS ステップ不備判定** — `src/engine/dasStepStatus.ts` を新規作成
  - 担当: backend
  - 対象ファイル: `src/engine/dasStepStatus.ts`
  - 完了条件:
    - dasStepIssue(step: DasStep): string | null を export
    - 各 DasAction 種別ごとの未設定項目を検出（既存 stepStatus.ts の設計思想を踏襲）
    - 例: Click で finder.selector が空 → 'クリック対象が未設定です' / GuardedChoice で guards が空 → 'ガードが未設定です' / ForEach で scopeFinder が空 → 'スコープファインダーが未設定です'
    - `npm run typecheck` パス
  - 依存: T1（DasStep 型を使用）

- [ ] **T7: DAS エンジンユニットテスト** — `src/engine/das.engine.test.ts` を新規作成
  - 担当: backend
  - 対象ファイル: `src/engine/das.engine.test.ts`
  - 完了条件:
    - Vitest で以下のテストケースを網羅:
      1. createSeededRng の決定性（同一 seed → 同一列）
      2. applyTimeline の純粋性（同じ引数 → 同じ結果。副作用なし）
      3. findWidget の CSS 風セレクタ検索（属性完全一致・前方一致・部分一致・子セレクタ・nth-child）
      4. D2 シナリオ: seed=1 で Timeout のみ → 失敗 / seed=1 で LocationFound + Timeout → 成功
      5. D3 シナリオ: seed で通知あり → ApplicationFound なしで失敗 / ApplicationFound ありで成功
      6. D4 シナリオ: ForEach + スコープ + 相対セレクタで全件取得 / ForEach なしで 1 件のみ
      7. D5 シナリオ: 列シャッフル後に座標固定で失敗 / 属性セレクタで成功
      8. バリデータの各チェックビルダーの true/false 境界テスト
      9. dasStepIssue の各ステップ種別の不備検出テスト
    - `npm run test` パス（既存テストを含む全テスト）
  - 依存: T1, T2, T3, T4, T5, T6（全基盤が揃ってからテスト）

---

### frontend 担当 — UI（UI 層）

対象ファイル（所有権）:
- `src/store/dasRobotStore.ts`（新規）
- `src/components/das/DasWorkspaceLayout.tsx`（新規）
- `src/components/das/DasWorkflowView.tsx`（新規）
- `src/components/das/RecorderView.tsx`（新規）
- `src/components/das/MockAppView.tsx`（新規）
- `src/components/das/DasPropertiesPane.tsx`（新規）
- `src/components/das/DasPalette.tsx`（新規）
- `src/components/das/DasStatusView.tsx`（新規）
- `src/app/App.tsx`（既存、isDas 分岐追加のみ）
- `src/components/game/HomeScreen.tsx`（既存、D シリーズグループ表示追加）
- `src/components/ds/Toolbar.tsx`（既存、緑ロボ実行ボタン対応のみ）

---

- [ ] **T8: DasRobotStore** — `src/store/dasRobotStore.ts` を新規作成
  - 担当: frontend
  - 対象ファイル: `src/store/dasRobotStore.ts`
  - 完了条件:
    - design.md §dasRobotStore.ts の全アクションを実装（loadMission / addStep / updateStep / addGuard / removeGuard / updateGuardTimeout / addForEachBodyStep / removeStep / selectStep / setSim / resetSim）
    - DasStep のネスト構造を immutable に更新するヘルパー（再帰的 ID 検索で深い部分を更新）
    - selectedPath（ネスト対応のパス配列）を管理
    - loadMission で mission.dasSeed を適用して DasRobot を初期化
    - Zustand create で型安全に実装
    - `npm run typecheck` パス
  - 依存: T1, T2（DasRobot / MockApp 型を import）

- [ ] **T9: MockAppView** — `src/components/das/MockAppView.tsx` を新規作成
  - 担当: frontend
  - 対象ファイル: `src/components/das/MockAppView.tsx`
  - 完了条件:
    - タイトルバー付き疑似 Windows アプリを描画（`div.bg-[#0078d7]` + タイトル + ダミー最小化/最大化/閉じるボタン）
    - applyTimeline(app, currentTick) で現在のウィジェット状態を取得してレンダリング
    - ウィジェット種別ごとのスタイル: button（disabled 状態対応）/ textfield / label / listitem / notification（黄色帯、D3 用）/ table・tablerow・tablecell / checkbox
    - AppWidget の visible/enabled 状態を反映
    - `npm run typecheck` パス
  - 依存: T2（MockApp / AppWidget / applyTimeline を import）

- [ ] **T10: DasWorkflowView** — `src/components/das/DasWorkflowView.tsx` を新規作成
  - 担当: frontend
  - 対象ファイル: `src/components/das/DasWorkflowView.tsx`
  - 完了条件:
    - 純 DOM ツリー（div + border-l の縦線）で DasStep を再帰的に描画
    - ガードチョイス: ガード枝をインデント + `[ ガード名 ]` で表示。成立した枝は緑ハイライト（sim.guardResults 参照）
    - For Each: body ステップを `↻` アイコン + インデントで表示
    - Condition / Group / Loop のネスト描画
    - 選択中ステップに border-blue-400、実行済み最終ステップに border-green-400
    - ステップクリックで dasRobotStore.selectStep を呼ぶ
    - `npm run typecheck` パス
  - 依存: T1, T8（DasStep 型、dasRobotStore を import）

- [ ] **T11: RecorderView** — `src/components/das/RecorderView.tsx` を新規作成
  - 担当: frontend
  - 対象ファイル: `src/components/das/RecorderView.tsx`
  - 完了条件:
    - 2 タブ構成: 「アプリ画面」タブ（MockAppView を呼び出し）/ 「要素ツリー」タブ（AppWidget 階層をツリー表示、属性・セレクタ表示付き）
    - 右クリックメニュー: 要素を右クリック → 「クリック」「値を抽出」「For Each ループ」を挿入（ファインダーのセレクタを自動生成して dasRobotStore.addStep を呼ぶ）
    - 下部にマウス座標（ウィンドウ左上基準）表示
    - `npm run typecheck` パス
  - 依存: T2, T8, T9（MockApp / dasRobotStore / MockAppView）

- [ ] **T12: DasPropertiesPane** — `src/components/das/DasPropertiesPane.tsx` を新規作成
  - 担当: frontend
  - 対象ファイル: `src/components/das/DasPropertiesPane.tsx`
  - 完了条件:
    - 選択中 DasStep のプロパティ編集 UI
    - ガードチョイス: ガード一覧テーブル + 緑の「＋ガードを追加」ボタン + ガード種別ドロップダウン（7 種、GUARD_TYPE_LABELS 使用）+ タイムアウト秒数 input
    - For Each: スコープファインダーのセレクタ input + エレメントファインダーの相対セレクタ input
    - Click / ExtractValue / EnterText: ファインダーセレクタ input（font-mono 表示）+ 各固有プロパティ
    - OpenWindow: windowTitle / appName input
    - dasStepIssue(step) を呼んで警告表示
    - `npm run typecheck` パス
  - 依存: T1, T6, T8（DasRobot 型 / dasStepIssue / dasRobotStore）

- [ ] **T13: DasPalette** — `src/components/das/DasPalette.tsx` を新規作成
  - 担当: frontend
  - 対象ファイル: `src/components/das/DasPalette.tsx`
  - 完了条件:
    - 緑ロボット用ステップパレット: OpenWindow / Click / ExtractValue / EnterText / GuardedChoice / ForEach / Loop / Condition / Group / Break の 10 種をボタン表示
    - DAS_ACTION_LABELS の日本語ラベルを使用
    - クリックで dasRobotStore.addStep を呼ぶ
    - `npm run typecheck` パス
  - 依存: T1, T8（DAS_ACTION_LABELS / dasRobotStore）

- [ ] **T14: DasStatusView** — `src/components/das/DasStatusView.tsx` を新規作成
  - 担当: frontend
  - 対象ファイル: `src/components/das/DasStatusView.tsx`
  - 完了条件:
    - DasSimResult.log を表示する実行ログビュー
    - guard-waiting / guard-matched エントリをアイコン付きで可視化（待機中は黄色、成立は緑）
    - エラーエントリは赤表示
    - `npm run typecheck` パス
  - 依存: T4, T8（DasSimLogEntry / dasRobotStore）

- [ ] **T15: DasWorkspaceLayout** — `src/components/das/DasWorkspaceLayout.tsx` を新規作成
  - 担当: frontend
  - 対象ファイル: `src/components/das/DasWorkspaceLayout.tsx`
  - 完了条件:
    - 緑ロボット用の全体レイアウトを 1 コンポーネントにまとめる
    - 左: DasPalette / 中央上: DasWorkflowView / 中央下: RecorderView / 右上: DasPropertiesPane / 右下: (将来用リザーブまたは空) / 下: DasStatusView
    - MissionBar / MissionBriefing / DeductionPanel / ResultPanel はゲーム共通コンポーネントを再利用
    - runDasRobot の実行ボタンハンドラ（dasSimulator.runDasRobot を呼び dasRobotStore.setSim にセット）
    - validateDasMission で受け入れ条件判定（mission.dasChecks を使用）
    - `npm run typecheck` パス
  - 依存: T4, T5, T8, T9, T10, T11, T12, T13, T14（全 DAS UI コンポーネント + エンジン）

- [ ] **T16: App.tsx の DAS 分岐追加**
  - 担当: frontend
  - 対象ファイル: `src/app/App.tsx`
  - 完了条件:
    - `mission.robotType === 'das'` のとき DasWorkspaceLayout を描画する分岐を追加（約 10 行）
    - 既存の青ロボット UI（else 側）は一切変更しない
    - DasWorkspaceLayout の import を追加
    - `npm run typecheck` パス
  - 依存: T3, T15（Mission 型拡張 + DasWorkspaceLayout）

- [ ] **T17: HomeScreen の D シリーズグループ表示**
  - 担当: frontend
  - 対象ファイル: `src/components/game/HomeScreen.tsx`
  - 完了条件:
    - 相談一覧を「青ロボット編（M1〜M5）」「緑ロボット編（D1〜D5）」の 2 グループに表示
    - mission.robotType で分岐（undefined / 'ds' = 青、'das' = 緑）
    - グループ見出しに青/緑のアイコンまたはカラーバーで視覚区別
    - 解放条件: D1 は M5 クリア後に解放（または独立）。D2 は D1 クリア後に解放。以降直列
    - `npm run typecheck` パス
  - 依存: T3（Mission 型に robotType が追加されていること）

- [ ] **T18: Toolbar の緑ロボ実行対応**
  - 担当: frontend
  - 対象ファイル: `src/components/ds/Toolbar.tsx`
  - 完了条件:
    - 緑ロボット時の実行ボタンが DasWorkspaceLayout の onRun を呼ぶように連携（Props 経由またはストア経由）
    - 既存の青ロボット時の onRun は変更なし
    - Toolbar から直接 dasSimulator を呼ぶのではなく、親コンポーネントの callback を使う
    - `npm run typecheck` パス
  - 依存: T15, T16（DasWorkspaceLayout が Toolbar に callback を渡す構造）

---

### frontend 担当 — ミッション（ミッションデータ層）

対象ファイル（所有権）:
- `src/data/missions/d1.ts`（新規）
- `src/data/missions/d2.ts`（新規）
- `src/data/missions/d3.ts`（新規）
- `src/data/missions/d4.ts`（新規）
- `src/data/missions/d5.ts`（新規）
- `src/data/missions/index.ts`（既存、D1〜D5 追加）
- `src/data/glossary.ts`（既存、緑ロボ用語追加）

---

- [ ] **T19: D1 ミッション定義**「はじめての緑ロボット」
  - 担当: frontend（ミッション）
  - 対象ファイル: `src/data/missions/d1.ts`
  - 完了条件:
    - Mission 型準拠。id='d1', robotType='das'
    - MockApp: 「在庫管理システム v2.1」（ウィンドウ > ラベル「品目コード」+ テキストフィールド 'ITEM-0042' + ボタン「検索」+ ラベル「在庫数」+ テキストフィールド '128'）
    - timeline: なし（静的）
    - deductions: 緑ロボの基本操作に関する見立てクイズ（2〜3 問）
    - dasChecks: requireOpenWindow + requireDasAction('Click') + requireDasAction('ExtractValue') + requireDasNoErrors
    - reveal: 抽出した在庫数を表示する関数
    - glossary: ['greenRobot', 'recorderView', 'dasClick', 'dasExtract']
    - `npm run typecheck` パス
  - 依存: T1, T2, T3, T5（DasRobot / MockApp / Mission 型拡張 / チェックビルダー）

- [ ] **T20: D2 ミッション定義**「待ち方を覚える」
  - 担当: frontend（ミッション）
  - 対象ファイル: `src/data/missions/d2.ts`
  - 完了条件:
    - MockApp: 「申請フォーム」。ボタン「送信」tick=0 で enabled:false、timeline の enableWidget で有効化（シード乱数で遅延量決定）
    - deductions: 固定秒待ちの脆さ → 状態待ちの優位性に関する見立てクイズ
    - dasChecks: requireGuardOfType('locationFound') + forbidTimeoutOnly + requireGuardMatched('locationFound') + requireDasNoErrors
    - dasSuggested: 2 段階プレイ誘導（失敗体験シード → 成功体験）
    - reveal: ガード成立メッセージ表示
    - glossary: ['guard', 'guardedChoice', 'timeout', 'locationFound']
    - `npm run typecheck` パス
  - 依存: T1, T2, T3, T5

- [ ] **T21: D3 ミッション定義**「不意の来客」
  - 担当: frontend（ミッション）
  - 対象ファイル: `src/data/missions/d3.ts`
  - 完了条件:
    - MockApp: 「作業進捗ダッシュボード」。通知ウィンドウ（type:'notification', title='お知らせ'）が timeline の showWidget で tick=15 前後（シード乱数）に出現
    - deductions: 不測の割り込み処理に関する見立てクイズ
    - dasChecks: requireApplicationFoundGuard + requireGuardMatched('applicationFound') + requireDasNoErrors
    - 通知の閉じるボタン: `button[name="閉じる"]` 固定（design.md §未確定事項 確定済み）
    - reveal: 通知処理成功メッセージ
    - glossary: ['applicationFound', 'applicationNotFound', 'notification']
    - `npm run typecheck` パス
  - 依存: T1, T2, T3, T5

- [ ] **T22: D4 ミッション定義**「動くリストを数える」
  - 担当: frontend（ミッション）
  - 対象ファイル: `src/data/missions/d4.ts`
  - 完了条件:
    - MockApp: 「仕入れ一覧」。timeline の addListItem で tick ごとにリスト項目追加（シードで 5〜10 件に変動）
    - deductions: For Each とスコープの役割に関する見立てクイズ
    - dasChecks: requireForEachScope + requireRelativeSelector + requireDasExtractCount('品目', 3) + requireDasNoErrors
    - reveal: 全件取得結果表示
    - glossary: ['dasForEach', 'scopeFinder', 'relativeSelector']
    - `npm run typecheck` パス
  - 依存: T1, T2, T3, T5

- [ ] **T23: D5 ミッション定義**「要素を見失わない」
  - 担当: frontend（ミッション）
  - 対象ファイル: `src/data/missions/d5.ts`
  - 完了条件:
    - MockApp: 「売上レポート」。テーブル列順が timeline の shuffleColumns で変動（シードで列順シャッフル）
    - deductions: 座標固定 vs CSS 風セレクタの耐久性に関する見立てクイズ
    - dasChecks: requireSelectorMatch + requireDasNoErrors
    - 座標固定の模擬: `[x="120"][y="48"]` 形式を座標固定として扱う
    - reveal: セレクタの耐久性比較メッセージ
    - glossary: ['componentFinder', 'cssSelector', 'finder4layers']
    - `npm run typecheck` パス
  - 依存: T1, T2, T3, T5

- [ ] **T24: missions/index.ts に D1〜D5 を登録**
  - 担当: frontend（ミッション）
  - 対象ファイル: `src/data/missions/index.ts`
  - 完了条件:
    - D1〜D5 を import し MISSIONS 配列末尾に追加（M1〜M5 のインデックスを変更しない）
    - `npm run typecheck` パス
  - 依存: T19, T20, T21, T22, T23（全 D ミッション定義完成後）

- [ ] **T25: glossary.ts に緑ロボット用語追加**
  - 担当: frontend（ミッション）
  - 対象ファイル: `src/data/glossary.ts`
  - 完了条件:
    - das-spec-notes §6 候補リスト準拠の用語を追加（追記のみ）:
      - greenRobot: 緑ロボット（Robot / Desktop Automation）
      - das: DAS（Desktop Automation サービス）
      - recorderView: レコーダービュー
      - guard: ガード
      - guardedChoice: ガードチョイス
      - timeout: 時間経過（Timeout）
      - locationFound: 該当するロケーション（Location Found）
      - applicationFound: 該当するアプリケーション（Application Found）
      - applicationNotFound: 該当しないアプリケーション（Application Not Found）
      - treeStoppedChanging: ツリーの変更停止（Tree Stopped Changing）
      - dasForEach: For Each（要素の繰り返し）[DAS 版]
      - scopeFinder: スコープファインダー
      - relativeSelector: 相対セレクタ
      - componentFinder: コンポーネントファインダー
      - cssSelector: CSS 風セレクタ
      - finder4layers: ファインダー（4 階層）
      - notification: 通知（ウィンドウ）
      - dasClick: クリック [DAS 版]
      - dasExtract: 値を抽出 [DAS 版]
    - 既存の青ロボット用語を変更しない
    - D1〜D5 の glossary 配列のキーが全て存在する
    - `npm run typecheck` パス
  - 依存: なし（D1〜D5 と並列可だが、全キーが揃うことの検証は T24 後）

---

### docs 担当

対象ファイル（所有権）:
- `README.md`（既存、更新）

---

- [ ] **T26: README.md 更新**
  - 担当: docs
  - 対象ファイル: `README.md`
  - 完了条件:
    - 第2弾（緑ロボット編 D1〜D5）の追加を概要セクションに記載
    - D1〜D5 の相談タイトルと教育ポイントを簡潔に列挙
    - 新規ファイル構成（`src/model/dasRobot.ts` / `src/model/mockApp.ts` / `src/engine/dasSimulator.ts` / `src/engine/dasValidator.ts` / `src/components/das/`）を「リポジトリ構成」等に追記
    - 既存の M1〜M5 に関する記述を変更しない
  - 依存: なし（他タスクと並列可）

---

## 並列実行可能なタスク群

| グループ | 含まれるタスク | 並列実行条件 |
|---|---|---|
| **G1: 基盤型定義** | T1 (dasRobot.ts), T2 (mockApp.ts) | 同時着手 OK（相互依存なし） |
| **G2: 基盤エンジン** | T3 (mission.ts 拡張), T4 (dasSimulator.ts), T5 (dasValidator.ts), T6 (dasStepStatus.ts) | T1+T2 完了後。T3/T4/T5/T6 は相互に依存するため直列推奨（T3→T4→T5→T6 の順、T6 は T4/T5 と並列可） |
| **G3: ストア** | T8 (dasRobotStore.ts) | T1+T2 完了後。G2 と並列 OK |
| **G4: 基盤テスト** | T7 (das.engine.test.ts) | G2 全完了後（T1〜T6 完了） |
| **G5: UI コンポーネント** | T9 (MockAppView), T10 (DasWorkflowView), T11 (RecorderView), T12 (DasPropertiesPane), T13 (DasPalette), T14 (DasStatusView) | T8 完了後（ストア依存）。T9〜T14 は相互独立のため並列 OK |
| **G6: UI 統合** | T15 (DasWorkspaceLayout), T16 (App.tsx), T17 (HomeScreen), T18 (Toolbar) | G5 全完了後。T15→T16→T17/T18（T17/T18 は並列可） |
| **G7: ミッションデータ** | T19 (d1), T20 (d2), T21 (d3), T22 (d4), T23 (d5), T25 (glossary) | G2 完了後（チェックビルダーを使用）。T19〜T23 + T25 は相互独立のため並列 OK |
| **G8: ミッション統合** | T24 (index.ts) | G7 全完了後 |
| **G9: docs** | T26 (README.md) | 他タスクと完全並列 OK |

### 推奨実行順序（クリティカルパス）

```
G1 (T1, T2)             G9 (T26)
   ↓                      ↓ (並列)
G2 (T3→T4→T5, T6)  +  G3 (T8)
   ↓                      ↓
G4 (T7)               G5 (T9〜T14 並列)
                          ↓
                       G6 (T15→T16→T17/T18)
G2 完了 ↓
G7 (T19〜T23, T25 並列)
   ↓
G8 (T24)
```

最速パス: G1 → G2+G3 並列 → G4+G5+G7 並列 → G6+G8 → 完了

---

## 完了条件

- [ ] D1〜D5 が相談票→見立て→ワークフロー組み立て→実行→判定の標準フローでプレイ可能
- [ ] M1〜M5 の挙動・見立て・判定結果が第2弾追加前と変わらない（リグレッションなし）
- [ ] `npm run typecheck` エラー 0 件
- [ ] `npm run build` エラー 0 件
- [ ] `npm run test` 全テストパス（既存 + 新規 das.engine.test.ts）
- [ ] ガードチョイスの意味論（並行監視・最初成立・排他実行・Timeout 既定 60 秒）がシミュレータで正しくモデル化されている
- [ ] For Each のスコープファインダー＋相対セレクタがシミュレータで正しく動作する
- [ ] UI 文言が公式日本語用語（das-spec-notes §3.4 準拠）を使用している
- [ ] 新規 npm 依存が追加されていない
- [ ] Reviewer の review.md が APPROVE

---

## リスクと注意点

1. **findWidget の CSS セレクタパーサー実装**: 完全な CSS セレクタエンジンは不要だが、`button[name="OK"]` / `> DIV` / `:nth-child(n)` / `^=` / `$=` / `*=` の最低限サポートは必須。実装が複雑になりすぎたら、D1〜D5 で実際に使うパターンのみを優先し、汎用パーサーは避ける。

2. **ネスト構造の immutable 更新（dasRobotStore）**: DasStep は action 内に子ステップを内包するため、深いネストの更新が必要。再帰的な ID 検索ヘルパーを先に作り、全アクションで共用する。

3. **型の循環参照リスク**: `mission.ts` が `dasValidator.ts` の `DasMissionCheck` を参照し、`dasValidator.ts` が `dasRobot.ts` を参照する。`DasMissionCheck` 型を `dasValidator.ts` ではなく `dasRobot.ts` 内に定義することで循環を回避できるか、T3 着手時に検討。代替策: `DasMissionCheck` のインターフェースを `mission.ts` 内に直接定義する。

4. **ミッションデータ（T19〜T23）と UI（T9〜T18）の所有権分離**: ミッション定義は MockApp のウィジェットツリーを含むため、MockAppView の描画スタイルとの整合が必要。ミッション担当が MockApp を先に作り、UI 担当がそれを描画する分担を維持すること。

5. **既存テストのリグレッション**: T3 の mission.ts 変更後、既存テストが壊れていないことを即座に確認する。`npm run test` を T3 完了時点で実行。
