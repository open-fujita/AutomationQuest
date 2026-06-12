---
index: "[[INDEX]]"
tags: [type/design]
created: 2026-06-12
---

# design.md — 第2弾 DAS 緑ロボット編 設計書

> 親 INDEX: [[INDEX]]

---

## 設計方針

緑ロボット（DAS）は青ロボットと実行モデルが根本的に異なる（「前方移動のみ」「ガードチョイス並行監視」「For Each スコープ＋相対セレクタ」）。そのため、既存の `robot.ts` / `simulator.ts` を改変せず、**DAS 専用の型ファイル・シミュレータ・バリデータを並列に新規作成**する方針を採る。既存の M1〜M5 は一切触らず、`mission.ts` への追加は optional フィールドのみとする。UI は緑ロボット専用コンポーネント群（`src/components/das/`）を新規作成し、`App.tsx` で `mission.robotType === 'das'` の分岐で切り替える。シミュレータは tick 駆動・純粋関数・シード乱数で決定的に動作させ、テスト容易性を最優先とする。

---

## アーキテクチャ判断

### 検討した選択肢 A: tick エンジンの実装方式

| 案 | メリット | デメリット |
|---|---|---|
| **案 A-1: 離散イベントキュー** | 任意タイミングのイベント（通知出現など）を精密に表現できる。実機 DAS に近い非同期感覚 | 実装複雑度が高い（優先度キュー・イベントハンドラ管理）。テストが難しく決定性の保証が面倒 |
| **案 A-2: 固定刻み tick カウンタ（採用）** | 純粋関数で書ける（`tick → state`）。シードを渡すだけで決定的。テストが「tick=N の時に状態 S を期待する」と書けて単純 | 現実の時間軸とずれる（教育ゲームでは許容範囲内） |

**採用: 案 A-2（固定刻み tick カウンタ）**
教育ゲームとしての核心は「ガード待ち（N tick 後に要素出現）」を可視化することであり、時間軸の精密さより決定性・テスト容易性が優先。シード乱数でボタン有効化遅延・通知出現タイミング・リスト件数・列順をすべて tick で記述し、`MockApp` を構成時にスナップショット生成する。

### 検討した選択肢 B: 緑ロボットのワークフロー描画方式

| 案 | メリット | デメリット |
|---|---|---|
| **案 B-1: @xyflow/react 流用（縦向き）** | 既存 RobotView と同じライブラリ。エッジ描画・ズームが既製品 | @xyflow/react は横方向前提の設計。縦ツリー＋ネストしたガード枝を表現するには layout 計算が複雑になる。実機 DS の「縦ツリー感」が薄い |
| **案 B-2: 純 DOM ツリー描画（採用）** | `<ul>/<li>` のネスト構造で実機 DS の縦ツリーを直感的に再現。インデントとアイコンで階層を表現しやすい。追加依存なし | エッジ（矢印）の SVG 描画は手作り。しかし教育目的では接続線よりもステップの「ネスト感」が重要 |

**採用: 案 B-2（純 DOM ツリー描画）**
実機 DS のロボットビューは左→右フローチャートではなく「縦に並んだ折りたたみ可能なツリー」。@xyflow/react を無理に縦にするより `div` ネストで表現したほうが実機に近く、ガードチョイスの枝・For Each の子ステップをインデントで表せる。接続矢印の代わりに縦線（`border-l`）でつなぐ。

### 検討した選択肢 C: DasRobot の型構造

| 案 | メリット | デメリット |
|---|---|---|
| **案 C-1: 既存 Robot 型を拡張** | 型が 1 本に統一。共用コンポーネントを使いやすい | 青ロボと緑ロボの実行モデルが根本的に違うため、union 型が巨大化して型安全性が低下。既存コードへの影響リスク |
| **案 C-2: DasRobot を独立型として新規定義（採用）** | 緑ロボ固有の概念（Guard、DasFinder、ForEach スコープ）を自然に表現できる。既存 Robot 型を完全に汚染しない | 型が 2 系統になる。共用できる型（Variable, TypeDef）は再利用するが、重複を許容 |

**採用: 案 C-2（DasRobot 独立型）**
緑ロボの `DasStep` はツリー（子ステップを内包）であり、青ロボの `RobotStep` フラット配列とは構造が異なる。独立型として定義することで型安全性と設計明確性を確保する。

---

## 変更コンポーネント

### 新規作成

```
src/model/dasRobot.ts         — DasStep ツリー型・DasAction・Guard（7種）・DasFinder・DasRobot
src/model/mockApp.ts          — MockApp（ウィンドウ/ウィジェット要素ツリー + tick タイムライン）
src/engine/dasSimulator.ts    — runDasRobot() ガード並行監視・For Each スコープ・tick 駆動実行エンジン
src/engine/dasValidator.ts    — DAS 専用チェックビルダー群
src/engine/dasStepStatus.ts   — DasStep 設定不備判定（黄色警告相当）
src/store/dasRobotStore.ts    — 緑ロボット用 Zustand ストア（dasRobot 状態・選択・実行）
src/components/das/DasWorkflowView.tsx  — 縦ツリーワークフロー描画
src/components/das/RecorderView.tsx     — 模擬レコーダービュー（疑似 Windows アプリ画面 + 要素ツリー + 右クリックメニュー）
src/components/das/DasPropertiesPane.tsx — ガードチョイス一覧・ファインダー設定・タイムアウト編集
src/components/das/DasPalette.tsx        — 緑ロボット用ステップパレット
src/components/das/DasStatusView.tsx     — 実行ログ表示（ガード待機ビジュアル付き）
src/components/das/MockAppView.tsx       — 疑似 Windows アプリ描画コンポーネント（タイトルバー付き）
src/data/missions/d1.ts〜d5.ts          — D1〜D5 ミッション定義
```

### 変更

- `src/model/mission.ts` — optional フィールド 4 つを追加（後述）
- `src/data/missions/index.ts` — D1〜D5 を `MISSIONS` 配列に追加（M1〜M5 は順序変更なし）
- `src/app/App.tsx` — `mission.robotType === 'das'` 分岐を追加し、緑ロボット用レイアウトを描画
- `src/data/glossary.ts` — 緑ロボット関連用語を追加（das-spec-notes §6 候補リスト準拠）

### 削除

なし（既存コードは一切削除しない）。

---

## データ構造変更

### src/model/mission.ts への後方互換追加

既存の `Mission` インターフェースに以下の optional フィールドを追加する。既存 M1〜M5 はこれらフィールドを持たないため型エラーは発生しない。

```typescript
export interface Mission {
  // ... 既存フィールドは不変 ...

  /** 'ds'=青ロボット（既定） / 'das'=緑ロボット */
  robotType?: 'ds' | 'das'

  /** 緑ロボット用: 模擬デスクトップアプリ定義（tick タイムライン付き） */
  mockApp?: MockApp

  /** 緑ロボット用: 初期 DasRobot 状態を作るシード関数 */
  dasSeed?: (robot: DasRobot) => void

  /** 緑ロボット用: 受け入れ条件（DasCheckCtx を使う） */
  dasChecks?: DasMissionCheck[]

  /** 緑ロボット用: 推奨ステップ構成（UI のガイド表示に使う） */
  dasSuggested?: DasSuggestedConfig
}
```

### src/model/dasRobot.ts — DasRobot 型

```typescript
// ---- DasFinder ------------------------------------------------

/** ファインダー4階層の種別 */
export type DasFinderKind = 'device' | 'application' | 'component' | 'image'

/** 緑ロボットのファインダー（CSS 風セレクタ＋再利用指定） */
export interface DasFinder {
  kind: DasFinderKind
  /** コンポーネントセレクタ（CSS 風: 'button[name="OK"]' 等） */
  selector: string
  /**
   * 再利用方式:
   *  'none'   = 独立（コピー＆ペーストに相当）
   *  'prev'   = 「(直前の)ファインダーを参照」
   *  'named'  = 名前付きファインダー（aliasName を使う）
   */
  reuse: 'none' | 'prev' | 'named'
  /** reuse='named' のときのエイリアス名 */
  aliasName?: string
  /** スコープファインダー名（For Each の "elementFinder の起点" を指す名前） */
  scopeRef?: string
}

// ---- Guard（ガード7種）--------------------------------------

export type GuardType =
  | 'timeout'              // 時間経過（Timeout）既定 60 秒
  | 'locationFound'        // 該当するロケーション（Location Found）
  | 'locationNotFound'     // 該当しないロケーション（Location Not Found）
  | 'locationRemoved'      // 取り除かれたロケーション（Location Removed）
  | 'applicationFound'     // 該当するアプリケーション（Application Found）
  | 'applicationNotFound'  // 該当しないアプリケーション（Application Not Found）
  | 'treeStoppedChanging'  // ツリーの変更停止（Tree Stopped Changing）

export interface Guard {
  /** ガード種別（公式用語準拠） */
  type: GuardType
  /** Location/Application 系はファインダー必須 */
  finder?: DasFinder
  /**
   * 時間経過（timeout）の秒数（既定 60）
   * ツリーの変更停止（treeStoppedChanging）はミリ秒
   */
  seconds?: number
  ms?: number
  /** このガードが成立したときに実行する子ステップ列 */
  steps: DasStep[]
}

// ---- DasAction（DAS ステップアクション）--------------------

export type DasAction =
  | { type: 'OpenWindow'; windowTitle: string; appName: string }
  | { type: 'Click'; finder: DasFinder; clickCount?: 1 | 2; button?: 'left' | 'right' | 'middle' }
  | { type: 'ExtractValue'; finder: DasFinder; toVariable: string; attribute: string }
  | { type: 'EnterText'; finder: DasFinder; text: string; fromVariable?: string; fromAttribute?: string }
  | { type: 'GuardedChoice'; guards: Guard[] }
  | {
      type: 'ForEach'
      /** スコープファインダー（For Each の起点ノード。一意の名前必須） */
      scopeFinder: DasFinder
      scopeFinderName: string
      /** エレメントファインダー（scopeRef + 相対セレクタ。例: '> DIV'） */
      elementFinder: DasFinder
      body: DasStep[]
    }
  | { type: 'Loop'; body: DasStep[] }
  | { type: 'Break' }
  | { type: 'Continue' }
  | {
      type: 'Condition'
      /** 分岐リスト。最初に true の分岐のみ実行 */
      branches: { condition: string; steps: DasStep[] }[]
    }
  | { type: 'Group'; name: string; steps: DasStep[] }

export type DasActionType = DasAction['type']

// ---- DasStep（緑ロボットの 1 ステップ）---------------------

export interface DasStep {
  id: string
  name: string
  action: DasAction
  enabled: boolean
}

// ---- DasRobot（緑ロボット全体）----------------------------

export interface DasRobot {
  name: string
  /** トップレベルのステップ列（子ステップは action 内にネスト） */
  steps: DasStep[]
  /** 変数（青ロボットと同形式を再利用） */
  variables: Variable[]
  /** タイプ（青ロボットと同形式を再利用） */
  types: TypeDef[]
}

// ---- ヘルパー定数 -------------------------------------------

export const DAS_ACTION_LABELS: Record<DasActionType, string> = {
  OpenWindow: 'ウィンドウを開く',
  Click: 'クリック',
  ExtractValue: '値を抽出',
  EnterText: 'テキストを入力',
  GuardedChoice: 'ガードチョイス',
  ForEach: 'For Each（要素の繰り返し）',
  Loop: 'Loop（繰り返し）',
  Break: 'Break（ループ終了）',
  Continue: 'Continue（次の反復へ）',
  Condition: '条件',
  Group: 'グループ',
}

export const GUARD_TYPE_LABELS: Record<GuardType, string> = {
  timeout: '時間経過（Timeout）',
  locationFound: '該当するロケーション（Location Found）',
  locationNotFound: '該当しないロケーション（Location Not Found）',
  locationRemoved: '取り除かれたロケーション（Location Removed）',
  applicationFound: '該当するアプリケーション（Application Found）',
  applicationNotFound: '該当しないアプリケーション（Application Not Found）',
  treeStoppedChanging: 'ツリーの変更停止（Tree Stopped Changing）',
}

/** 安定 ID 生成（Math.random を使わない） */
let _dasIdCounter = 0
export function nextDasStepId(): string {
  _dasIdCounter += 1
  return `das-step-${_dasIdCounter}`
}

export function createEmptyDasRobot(name: string): DasRobot {
  return { name, steps: [], variables: [], types: [] }
}
```

### src/model/mockApp.ts — MockApp 型

```typescript
// ---- ウィジェット要素ツリー ----------------------------------

export type WidgetType =
  | 'window'
  | 'button'
  | 'label'
  | 'textfield'
  | 'listitem'
  | 'table'
  | 'tablerow'
  | 'tablecell'
  | 'checkbox'
  | 'notification'  // 通知ウィンドウ（D3 用）

export interface AppWidget {
  id: string
  type: WidgetType
  /** CSS 風セレクタで参照される属性 */
  attrs: Record<string, string>
  /** 表示テキスト */
  text?: string
  children: AppWidget[]
  /** 可視かどうか（ガードの「見つかる/見つからない」判定に使う） */
  visible: boolean
  /** クリック可能か（D2: ボタン有効化遅延で `enabled: 'false'` → `'true'` に変化） */
  enabled?: boolean
}

// ---- tick タイムライン --------------------------------------

/**
 * 特定 tick に発生するアプリ状態変化イベント。
 * これにより、シード乱数で決定的なタイムラインを生成できる。
 */
export type AppEvent =
  | { tick: number; type: 'enableWidget'; widgetId: string }         // ボタン有効化（D2）
  | { tick: number; type: 'showWidget'; widgetId: string }           // 要素を表示（D3 通知出現）
  | { tick: number; type: 'hideWidget'; widgetId: string }           // 要素を非表示
  | { tick: number; type: 'addListItem'; parentId: string; widget: AppWidget } // リスト項目追加（D4）
  | { tick: number; type: 'shuffleColumns'; tableId: string; order: string[] } // 列順変動（D5）

// ---- MockApp ------------------------------------------------

export interface MockApp {
  id: string
  /** 疑似 Windows アプリのタイトルバー文字列 */
  windowTitle: string
  /** 最初のウィジェットツリー（tick=0 の初期状態） */
  widgets: AppWidget[]
  /** tick ごとのイベント列（昇順） */
  timeline: AppEvent[]
  /**
   * 指定 tick の状態スナップショットを返す純粋関数。
   * シミュレータが各 tick で呼び出す。
   */
  // 実装は mockApp.ts 内のヘルパー関数として提供（型定義は不要）
}

// ---- シード乱数 (LCG) ----------------------------------------
// Math.random を使わず、シード付き疑似乱数生成で決定的タイムラインを生成する。

export interface SeededRng {
  next(): number  // 0.0〜1.0 の float
  nextInt(max: number): number  // 0〜max-1 の整数
}

export function createSeededRng(seed: number): SeededRng

/**
 * MockApp のウィジェット状態を指定 tick に進めて返す（純粋関数）。
 * タイムラインのイベントを tick ≤ currentTick の範囲で順に適用する。
 */
export function applyTimeline(app: MockApp, currentTick: number): AppWidget[]

/**
 * widgetId を CSS 風セレクタで検索する（純粋関数）。
 * セレクタは 'button[name="OK"]' / '> DIV' / 'notification' 等。
 * @returns 一致した AppWidget | undefined
 */
export function findWidget(
  widgets: AppWidget[],
  selector: string,
  scopeWidget?: AppWidget
): AppWidget | undefined
```

### src/engine/dasSimulator.ts — DAS 実行エンジン

```typescript
export interface DasSimOptions {
  /** シミュレーション最大 tick（既定 120） */
  maxTick?: number
  /** Timeout ガードの既定秒数（既定 60 秒 = 60 tick） */
  defaultTimeoutTick?: number
  /** D2 の「固定秒待ち失敗体験」のためのシミュレーション加速シード */
  seed?: number
}

export interface DasSimLogEntry {
  stepId: string
  stepName: string
  status: 'ok' | 'skip' | 'error' | 'guard-waiting' | 'guard-matched'
  /** ガード待機/成立の可視化文字列（例: '⏳待機(3tick)→✓applicationFound 成立'） */
  message: string
  tick?: number
}

export interface DasSimResult {
  ran: boolean
  /** 変数名 → 抽出レコード列 */
  data: Record<string, SimRecord[]>
  log: DasSimLogEntry[]
  errors: string[]
  /** 消費した総 tick 数 */
  totalTick: number
  /** 各ガードチョイスの結果（どのガードが成立したか） */
  guardResults: { stepId: string; winnerGuardType: GuardType; tick: number }[]
}

export const EMPTY_DAS_SIM: DasSimResult

/**
 * 緑ロボットを模擬アプリに対して実行する（純粋関数）。
 *
 * 実行モデル:
 *   - 前方移動のみ（バックトラックなし）
 *   - ガードチョイス: 並行監視 → 最初成立ガードの枝を排他実行
 *   - For Each: スコープファインダーで起点を特定 → 相対セレクタで各子を反復
 *   - Loop/Break/Continue: 内部フラグで制御
 */
export function runDasRobot(
  robot: DasRobot,
  app: MockApp,
  opts?: DasSimOptions,
): DasSimResult
```

**ガードチョイス実行アルゴリズム（内部実装の指針）**

`GuardedChoice` ステップを実行するとき:
1. `currentTick` から始め、各 tick で全ガードの成立条件を評価（並行監視）
2. 最初に成立したガードの枝 `steps` を実行し、残りのガードは評価対象外（排他実行）
3. `timeout` ガードは `currentTick + guard.seconds * 1` tick で成立
4. `locationFound` は `findWidget(widgets, guard.finder.selector)` が `undefined` でないとき成立
5. `applicationFound` は `applyTimeline(app, tick)` の root window が可視かつタイトルが一致するとき成立
6. `treeStoppedChanging` は直前 `ms` ミリ秒（tick 換算）ウィジェットツリーが変化しないとき成立
7. ガードを評価した tick 数を `DasSimLogEntry` に記録（⏳待機(N tick)→✓成立 の文字列で教育的可視化）

**For Each 実行アルゴリズム（内部実装の指針）**

1. `scopeFinder` で起点ウィジェットを特定（scope として保持）
2. `elementFinder.selector` を相対セレクタとして `scope` の子孫から検索
3. 見つかった各ウィジェットを反復: `body` ステップを実行（body 内のファインダーは scope を基点とした相対参照）
4. 反復中のウィジェット参照を `DasSimLogEntry` に記録

### src/engine/dasValidator.ts — DAS チェックビルダー

```typescript
export interface DasMissionCheckCtx {
  robot: DasRobot
  sim: DasSimResult
}

export interface DasMissionCheck {
  id: string
  label: string
  test: (ctx: DasMissionCheckCtx) => boolean
  failHint: string
}

export function validateDasMission(
  ctx: DasMissionCheckCtx,
  checks: DasMissionCheck[],
): ValidationResult  // 既存 ValidationResult 型を再利用

// ---- チェックビルダー群 ----------------------------------------

/** 指定 DasAction 種別のステップが（ネスト含め）存在する */
export function requireDasAction(
  type: DasActionType,
  label: string,
  failHint: string,
): DasMissionCheck

/** ガードチョイスが存在し、指定ガード種別の枝を持つ */
export function requireGuardOfType(
  guardType: GuardType,
  label: string,
  failHint: string,
): DasMissionCheck

/** Location Found ガードが存在する（D2 の「状態待ち」体験確認） */
export function requireLocationFoundGuard(
  label: string,
  failHint: string,
): DasMissionCheck

/** Application Found ガードが存在する（D3 の「不意の来客」確認） */
export function requireApplicationFoundGuard(
  label: string,
  failHint: string,
): DasMissionCheck

/**
 * Timeout ガード単独構成を禁止する（D2 の「固定秒待ちは脆い」体験後の確認）。
 * ガードチョイスが timeout のみで組まれている場合 false を返す。
 */
export function forbidTimeoutOnly(
  label: string,
  failHint: string,
): DasMissionCheck

/** For Each ステップが存在し、scopeFinder が設定されている（D4） */
export function requireForEachScope(
  label: string,
  failHint: string,
): DasMissionCheck

/** For Each の elementFinder が相対セレクタ形式（'> ' で始まる）を使っている（D4） */
export function requireRelativeSelector(
  label: string,
  failHint: string,
): DasMissionCheck

/**
 * ExtractValue ステップが属性ベースのセレクタ（'[' を含む）を使っている（D5）。
 * 座標固定（selector に 'x=' / 'y=' を含む）の場合は false。
 */
export function requireSelectorMatch(
  label: string,
  failHint: string,
): DasMissionCheck

/** 実行結果として、指定変数に min 件以上のレコードが取れている */
export function requireDasExtractCount(
  variable: string,
  min: number,
  label: string,
  failHint: string,
): DasMissionCheck

/** 実行ログに 'guard-matched' エントリが指定 guardType で存在する（ガードが実際に成立した） */
export function requireGuardMatched(
  guardType: GuardType,
  label: string,
  failHint: string,
): DasMissionCheck

/** 実行時にエラーが無い */
export function requireDasNoErrors(label: string, failHint: string): DasMissionCheck

/** OpenWindow ステップが指定 windowTitle で設定されている（D1） */
export function requireOpenWindow(
  windowTitle: string,
  label: string,
  failHint: string,
): DasMissionCheck
```

### src/store/dasRobotStore.ts — Zustand ストア（API 確定）

```typescript
interface DasRobotState {
  robot: DasRobot
  selectedStepId: string | null
  /** 選択中ステップへのパス（ネスト対応: ['das-step-1', 'guard-0-step-2'] 等） */
  selectedPath: string[]
  sim: DasSimResult

  /** ミッション切り替え時にロボットを初期化（dasSeed 適用） */
  loadMission: (mission: Mission) => void

  /** トップレベルにステップを追加 */
  addStep: (action: DasAction) => string

  /** 選択ステップの更新（action 部分更新） */
  updateStep: (id: string, patch: Partial<DasAction>) => void

  /** ガードチョイスのガードを追加（GuardedChoice ステップに対して） */
  addGuard: (stepId: string, guard: Guard) => void

  /** ガードチョイスのガードを削除 */
  removeGuard: (stepId: string, guardIndex: number) => void

  /** ガードの timeout 秒数を更新 */
  updateGuardTimeout: (stepId: string, guardIndex: number, seconds: number) => void

  /** For Each の body にステップを追加 */
  addForEachBodyStep: (forEachStepId: string, action: DasAction) => string

  /** ステップ削除（トップレベルのみ。ネスト内は別途） */
  removeStep: (id: string) => void

  /** ステップ選択 */
  selectStep: (id: string | null) => void

  /** 実行結果をセット */
  setSim: (sim: DasSimResult) => void
  resetSim: () => void
}

export const useDasRobotStore: () => DasRobotState  // Zustand create の返り値
```

---

## コンポーネント設計

### src/components/das/DasWorkflowView.tsx

- **役割**: 緑ロボットの縦ワークフローツリーを描画。実機 DS のロボットビュー（縦）を再現。
- **描画方針**: 純 DOM ツリー（`div` + `border-l` の縦線）。`DasStep` を再帰的に描画。
- **現在ステップ**: シミュレーション実行中/実行後に `sim.log` の最後の stepId に `border-green-400` を当てる。
- **ガードチョイス**: ガード枝をインデント + 括弧アイコン（`[ ガード名 ]`）で表示。成立した枝は緑ハイライト。
- **For Each**: body ステップを `↻` アイコン + インデントで表示。

### src/components/das/RecorderView.tsx

- **役割**: 疑似 Windows アプリ画面（MockApp の widgets をレンダリング）＋ 要素ツリータブ＋ 右クリックメニュー。
- **2タブ構成**:
  - 「アプリ画面」タブ: `MockAppView` を呼び出す
  - 「要素ツリー」タブ: `AppWidget` の階層をツリー表示（属性・セレクタを表示）
- **右クリックメニュー**: 要素を右クリック → 「クリック」「値を抽出」「For Each ループ」等を挿入（ファインダーのセレクタを自動生成して `dasRobotStore.addStep` を呼ぶ）。

### src/components/das/MockAppView.tsx

- **役割**: タイトルバー付き疑似 Windows アプリを描画。
- **描画**: `applyTimeline(app, currentTick)` で現在のウィジェット状態を取得してレンダリング。
- **タイトルバー**: `div.bg-[#0078d7]`（Windows 10 風）+ タイトル文字列 + 最小化/最大化/閉じるボタン（ダミー）。
- **ウィジェット種別ごとのスタイル**: `button`（disabled 状態に対応）/ `textfield`（読み取り専用）/ `listitem` / `notification`（黄色い帯、D3 用）。

### src/components/das/DasPropertiesPane.tsx

- **役割**: 選択中 DasStep のプロパティ編集。
- **ガードチョイス選択時**: ガード一覧テーブル（種別・ファインダー・タイムアウト）+ 緑の「＋ガードを追加」ボタン + タイムアウト秒数編集 input。
- **For Each 選択時**: スコープファインダーのセレクタ文字列 input + エレメントファインダーの相対セレクタ input。
- **ファインダー表示**: CSS 風セレクタを `font-mono` で表示し、実機感を出す。

### src/components/das/DasPalette.tsx

- **役割**: 緑ロボット用ステップパレット（クリックで `addStep` を呼ぶ）。
- **表示するステップ**: OpenWindow / Click / ExtractValue / EnterText / GuardedChoice / ForEach / Loop / Condition / Group / Break。

### App.tsx の変更

```typescript
// 追加: 緑ロボット専用レイアウト
import DasWorkspaceLayout from '../components/das/DasWorkspaceLayout'

// 既存の isGraph 判定の後に追加:
const isDas = mission.robotType === 'das'

if (isDas) {
  return <DasWorkspaceLayout mission={mission} />
}
// 以降は既存の青ロボット UI（変更なし）
```

`src/components/das/DasWorkspaceLayout.tsx` を追加し、緑ロボット用の全体レイアウト（DasPalette / DasWorkflowView / RecorderView / DasPropertiesPane / DasStatusView）を 1 コンポーネントにまとめる。これにより既存 App.tsx の青ロボット部分への影響を最小化する。

---

## D1〜D5 ミッション定義の設計

### D1「はじめての緑ロボット」

- **MockApp**: 「在庫管理システム v2.1」。ウィジェット: ウィンドウ > ラベル「品目コード」+ テキストフィールド（値: 'ITEM-0042'）+ ボタン「検索」+ ラベル「在庫数」+ テキストフィールド（値: '128'）。
- **timeline**: なし（静的）。
- **教育ポイント**: `OpenWindow` → `Click`（検索ボタン）→ `ExtractValue`（在庫数）の基本3ステップ。
- **dasChecks**: `requireOpenWindow` + `requireDasAction('Click')` + `requireDasAction('ExtractValue')` + `requireDasNoErrors`。

### D2「待ち方を覚える」

- **MockApp**: 「申請フォーム」。ボタン「送信」は tick=0 で `enabled: false`、`timeline` の `enableWidget` イベントで tick が変化すると有効化（シードで遅延量を決定）。
- **体験フロー**: まず Timeout のみで実行 → 遅い日のシードで失敗体験 → LocationFound + Timeout の 2 本構成で成功。
- **dasChecks**: `requireGuardOfType('locationFound')` + `forbidTimeoutOnly` + `requireGuardMatched('locationFound')` + `requireDasNoErrors`。
- **「固定秒待ち失敗」の実現**: Mission の `dasSeed` で `opts.seed` を設定し、シミュレータが遅延シードを参照してボタン有効化を遅くする。D2 は 2 段階プレイ（失敗体験用シード → 成功体験）を `dasSuggested` で誘導。

### D3「不意の来客」

- **MockApp**: 「作業進捗ダッシュボード」。通知ウィンドウ（`type: 'notification'`、title='お知らせ'）が `timeline` の `showWidget` で tick=15 前後（シード乱数）に出現。
- **体験フロー**: ApplicationFound ガードなしで実行 → 通知が出た tick で ExtractValue が失敗体験 → ApplicationFound ガードで通知を閉じる枝を追加 → 成功。
- **dasChecks**: `requireApplicationFoundGuard` + `requireGuardMatched('applicationFound')` + `requireDasNoErrors`。

### D4「動くリストを数える」

- **MockApp**: 「仕入れ一覧」。`timeline` の `addListItem` で tick ごとにリスト項目が追加（シードで件数 5〜10 件に変動）。
- **体験フロー**: For Each なし → 1 件しか取れない失敗 → ForEach + スコープファインダー + 相対セレクタ → 全件取得成功。
- **dasChecks**: `requireForEachScope` + `requireRelativeSelector` + `requireDasExtractCount('品目', 3)` + `requireDasNoErrors`。

### D5「要素を見失わない」

- **MockApp**: 「売上レポート」。テーブル列順が `timeline` の `shuffleColumns` で変動（シードで ['商品名','金額','日付'] が ['日付','商品名','金額'] 等にシャッフル）。
- **体験フロー**: 座標固定セレクタ → 列変動で誤値取得失敗 → CSS 風属性セレクタ → 正値取得成功。
- **dasChecks**: `requireSelectorMatch` + `requireDasNoErrors`。
- **座標固定の模擬**: `DasFinder.selector` に `'[x="120"][y="48"]'` 形式を座標固定として扱い、`forbidCoordinateSelector`（別名 `requireSelectorMatch` の逆）で判定。

---

## 影響範囲分析

| 領域 | 影響内容 | リスク |
|---|---|---|
| `src/model/mission.ts` | optional フィールド 4 つ追加（robotType / mockApp / dasSeed / dasChecks） | Low（optional のため既存コンパイル不変） |
| `src/app/App.tsx` | `isDas` 分岐追加（~10 行）。既存ロジックは else 側に移動なし | Low |
| `src/data/missions/index.ts` | D1〜D5 を配列に追加。MISSIONS の順序は M1〜M5 が先 | Low |
| `src/data/glossary.ts` | 緑ロボ用語追加（追記のみ） | Low |
| 既存 M1〜M5 の動作 | 変更なし（robot.ts / simulator.ts / validator.ts は一切改変しない） | Low |
| 既存ユニットテスト | M1〜M5 のテストは変更なし | Low |
| `src/engine/dasSimulator.ts`（新規） | For Each のネスト深度・ガード tick 消費の上限管理が必要（暴走防止） | Med |
| `src/components/das/`（新規） | 新規 UI コンポーネント群。既存 DS コンポーネントと完全独立 | Med |
| `src/store/dasRobotStore.ts`（新規） | ネスト構造の immutable 更新（DasStep の深い部分を更新する際の不変参照維持） | Med |
| `src/model/mockApp.ts`（新規） | `applyTimeline` の pure function 設計。副作用を持たないこと | Low（テストで保証） |

---

## 非機能観点

### パフォーマンス影響

- `applyTimeline` は毎 tick 呼ばれるが、最大 120 tick・イベント最大 20 件程度なので計算量は無視できる。
- `DasWorkflowView` は再帰 render。D1〜D5 の最大ネスト深度は 3（ForEach > GuardedChoice > body step）であり、仮想化は不要。
- `RecorderView` の要素ツリーは最大 30 ウィジェット程度。`React.memo` を適用して不要な再描画を抑制する。

### セキュリティ影響

- 外部通信なし（実機 DAS に接続しない）。XSS リスクは教育用ゲーム内に閉じており、外部入力は MockApp の静的データのみ。
- シード乱数は LCG（線形合同法）で十分（セキュリティ用途ではない）。

### 後方互換性

- `Mission` 型への追加は optional のみ。`M1〜M5` の型チェックは `npm run typecheck` で確認義務。
- `MISSIONS` 配列への追加は追記のみ（M1〜M5 のインデックスが変化しないよう D1〜D5 を末尾に追加）。
- `DasRobot` は `Robot` のサブタイプではなく独立型。型 guard（`mission.robotType === 'das'`）で分岐。

### テスト戦略

- `src/engine/dasSimulator.ts` のユニットテスト（Vitest）:
  - `seed=1` で D2 シナリオの「固定秒待ち失敗」を再現するテスト
  - `seed=2` で D2 シナリオの「LocationFound 成功」を再現するテスト
  - `seed=3` で D3 の「通知あり/なし」両シナリオを 1 テストファイルに
  - D4: スコープ+相対セレクタで全件取得できることをシード固定で確認
  - D5: 列シャッフル後に座標固定が失敗し、属性セレクタが成功することを確認
- `src/engine/dasValidator.ts` のユニットテスト: 各チェックビルダーの true/false を網羅
- M1〜M5 のリグレッションテスト: 変更ファイルに依存しないため既存テストをそのまま流す（追加変更なし）

---

## docs/ への波及

現プロジェクトは `docs/` 未整備（requirements.md の Out of Scope に明記）。今回の設計変更で `docs/` 更新は不要。

- [ ] `docs/functional-design.md` — 未作成のため対象外
- [ ] `docs/architecture.md` — 未作成のため対象外
- [ ] `docs/repository-structure.md` — 未作成のため対象外

---

## 確定した公開 API 一覧

### 型名

| 型名 | ファイル | 概要 |
|---|---|---|
| `DasStep` | `src/model/dasRobot.ts` | 緑ロボットの 1 ステップ（action をネスト） |
| `DasAction` | `src/model/dasRobot.ts` | 緑ロボットのアクション union（11 variant） |
| `DasActionType` | `src/model/dasRobot.ts` | `DasAction['type']` の文字列 union |
| `Guard` | `src/model/dasRobot.ts` | ガード1本（type + finder? + seconds? + steps[]） |
| `GuardType` | `src/model/dasRobot.ts` | ガード7種の文字列 union |
| `DasFinder` | `src/model/dasRobot.ts` | CSS 風セレクタ + 再利用指定 |
| `DasRobot` | `src/model/dasRobot.ts` | 緑ロボット全体 |
| `MockApp` | `src/model/mockApp.ts` | 模擬デスクトップアプリ + tick タイムライン |
| `AppWidget` | `src/model/mockApp.ts` | ウィジェット要素ツリーの 1 ノード |
| `AppEvent` | `src/model/mockApp.ts` | tick イベント union（5 variant） |
| `SeededRng` | `src/model/mockApp.ts` | シード乱数インターフェース |
| `DasSimResult` | `src/engine/dasSimulator.ts` | DAS シミュレーション実行結果 |
| `DasSimLogEntry` | `src/engine/dasSimulator.ts` | 実行ログ 1 エントリ（guard-waiting/guard-matched を含む） |
| `DasSimOptions` | `src/engine/dasSimulator.ts` | runDasRobot のオプション |
| `DasMissionCheck` | `src/engine/dasValidator.ts` | DAS 受け入れ条件 1 件 |
| `DasMissionCheckCtx` | `src/engine/dasValidator.ts` | バリデータに渡すコンテキスト |
| `DasSuggestedConfig` | `src/model/dasRobot.ts` | 推奨構成（UI ガイド用） |

### 関数名（エクスポート）

| 関数名 | ファイル | 役割 |
|---|---|---|
| `createSeededRng(seed)` | `src/model/mockApp.ts` | LCG シード乱数生成器を返す |
| `applyTimeline(app, tick)` | `src/model/mockApp.ts` | tick 時点のウィジェット状態を返す（純粋関数） |
| `findWidget(widgets, selector, scope?)` | `src/model/mockApp.ts` | CSS 風セレクタでウィジェットを検索（純粋関数） |
| `nextDasStepId()` | `src/model/dasRobot.ts` | 安定 ID 生成（Math.random なし） |
| `createEmptyDasRobot(name)` | `src/model/dasRobot.ts` | 空の DasRobot を生成 |
| `runDasRobot(robot, app, opts?)` | `src/engine/dasSimulator.ts` | 緑ロボット実行（純粋関数） |
| `validateDasMission(ctx, checks)` | `src/engine/dasValidator.ts` | DAS バリデーション実行 |
| `requireDasAction(type, label, failHint)` | `src/engine/dasValidator.ts` | DAS アクション存在チェック |
| `requireGuardOfType(guardType, ...)` | `src/engine/dasValidator.ts` | 指定ガード種別の存在チェック |
| `requireLocationFoundGuard(...)` | `src/engine/dasValidator.ts` | Location Found ガードチェック（D2） |
| `requireApplicationFoundGuard(...)` | `src/engine/dasValidator.ts` | Application Found ガードチェック（D3） |
| `forbidTimeoutOnly(...)` | `src/engine/dasValidator.ts` | Timeout 単独禁止チェック（D2） |
| `requireForEachScope(...)` | `src/engine/dasValidator.ts` | For Each スコープ設定確認（D4） |
| `requireRelativeSelector(...)` | `src/engine/dasValidator.ts` | 相対セレクタ確認（D4） |
| `requireSelectorMatch(...)` | `src/engine/dasValidator.ts` | 属性セレクタ確認（D5） |
| `requireDasExtractCount(var, min, ...)` | `src/engine/dasValidator.ts` | 抽出件数チェック |
| `requireGuardMatched(guardType, ...)` | `src/engine/dasValidator.ts` | ガード実際成立確認 |
| `requireDasNoErrors(...)` | `src/engine/dasValidator.ts` | エラーなし確認 |
| `requireOpenWindow(title, ...)` | `src/engine/dasValidator.ts` | OpenWindow ステップ確認（D1） |

### ストアアクション（dasRobotStore）

| アクション名 | 引数 | 役割 |
|---|---|---|
| `loadMission(mission)` | `Mission` | ミッション切り替え・DasRobot 初期化 |
| `addStep(action)` | `DasAction` | トップレベルにステップ追加、生成 ID を返す |
| `updateStep(id, patch)` | `string, Partial<DasAction>` | ステップの action を部分更新 |
| `addGuard(stepId, guard)` | `string, Guard` | GuardedChoice にガードを追加 |
| `removeGuard(stepId, idx)` | `string, number` | ガードを削除 |
| `updateGuardTimeout(stepId, idx, sec)` | `string, number, number` | タイムアウト秒数更新 |
| `addForEachBodyStep(forEachStepId, action)` | `string, DasAction` | For Each の body にステップ追加 |
| `removeStep(id)` | `string` | トップレベルステップ削除 |
| `selectStep(id)` | `string \| null` | ステップ選択 |
| `setSim(sim)` | `DasSimResult` | 実行結果をセット |
| `resetSim()` | — | 実行結果をリセット |

---

## 未確定事項

藤田さんへの確認が必要な未確定事項はない。以下は実装フェーズで Engineer が判断できる範囲:

1. **D2 の「固定秒待ち失敗」をシードで制御するか UI スイッチで切り替えるか**: 設計として「シード制御」を採用し確定（`DasSimOptions.seed` で遅延量を決定）。UI スイッチは学習フローを複雑にするため不採用。Mission の `dasSeed` 関数内でシードを固定する。
2. **RecorderView の右クリックメニュー再現範囲**: 「クリック / 値を抽出 / For Each」の 3 つで D1〜D5 をカバーできることを確認。実機の「ループ > すべての兄弟」サブメニューは D4 の For Each 追加時に簡略再現（サブメニューを省きシングルクリックで挿入）。
3. **`DasWorkspaceLayout` の縦分割比率**: `DasWorkflowView` と `RecorderView` を上下 50:50 として実装後に調整可（Tailwind のクラスで即変更可能）。
4. **D3 の通知ウィンドウをどう閉じるか**: 「Application Found ガード成立 → 枝内に Click ステップ（通知の閉じるボタン）」として設計。Close ボタンのセレクタは `'button[name="閉じる"]'` 固定で MockApp に定義する。

---
