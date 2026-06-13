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

## 2026.1 忠実化リワーク設計（2026-06-12 追補）

藤田さんの差し戻し指摘 6 点を解消するための追補設計。実機スクリーンショット（DS_2.png）と公式 2026.1 ドキュメント・UI 画像（GuardedChoiceLocation.png, add_guard2.png）に基づく。

### 設計方針

旧実装は「縦ツリー＋右プロパティペイン」だが、実機は「横方向フローの中にステップカードが並び、カードを展開するとインラインでフォームが出る」構造。この差は UI の根本的な描画方式の違いであり、DasWorkflowView を全面書き換えする。一方、model 層（dasRobot.ts）と engine 層（dasSimulator.ts, dasValidator.ts）は型の内部 id・シミュレーション意味論を維持し、ラベル体系とフィールド構造を 2026.1 に合わせる形で改修する。DasPropertiesPane は廃止し、その機能はステップカードのインライン展開フォームに吸収する。右パネルは「状態（変数）パネル」に役割変更する。

---

### アーキテクチャ判断（リワーク固有）

#### 検討した選択肢 R-A: ワークフロー描画の方式

| 案 | メリット | デメリット |
|---|---|---|
| **案 R-A-1: 既存 DasWorkflowView を段階的に横化** | 差分が小さい。既存の StepRow / NestedContent を横配置に調整 | 縦ツリー前提のインデント計算・border-l 構造と、横フロー＋SVG接続線は根本的に異なり、段階的変換は中途半端になる。ガードチョイスのレーン構造が作れない |
| **案 R-A-2: DasWorkflowView を全面書き換え（採用）** | 実機準拠の横フロー（flexbox 横並び＋○ フローポイント＋青接続線＋カード折りたたみ/展開）を一から設計できる。ガードチョイスのレーン構造を正確に再現可能 | 旧 DasWorkflowView は完全に破棄。コード量が大きいが、旧実装のバグ（構造ズレ）を引きずらない |

**採用: 案 R-A-2（全面書き換え）**。理由: 縦ツリーと横フローは描画方式が根本的に異なり、段階的変換は工数が同等かそれ以上になる割に品質が出ない。横フロー＋インライン展開カードの実機構造を一から組むほうが、結果的にシンプルで実機忠実度が高い。

#### 検討した選択肢 R-B: ステップ編集の場所

| 案 | メリット | デメリット |
|---|---|---|
| **案 R-B-1: 右ペイン（DasPropertiesPane）を維持** | 既存コードの改修量が小さい | 実機と構造が違う。実機はカード内インライン展開であり右ペインではない。差し戻し指摘の根幹 |
| **案 R-B-2: カード内インライン展開フォーム（採用）** | 実機忠実。カード折りたたみ時はアイコン＋名前＋▼、展開時はカード内にフォームがインライン表示される | DasPropertiesPane のフォーム部品を StepCard コンポーネント内に移動する必要がある。ただし FinderDisplay / GuardRow 等のサブコンポーネントはそのまま再利用可能 |

**採用: 案 R-B-2（カード内インライン展開）**。理由: 差し戻しの根本原因が「右ペイン編集 vs カード内編集」の構造差であり、ここを変えないと差し戻しが解消しない。

---

### 変更コンポーネント（リワーク対象）

#### 変更（大規模書き換え）

- `src/components/das/DasWorkflowView.tsx` — **全面書き換え**。縦ツリー → 横方向フロー。詳細は後述の「横フロー描画仕様」参照
- `src/components/das/DasWorkspaceLayout.tsx` — レイアウト変更: 下=RecorderView、右=状態（変数）パネル。DasPropertiesPane の import を除去し DasStatePane に差し替え
- `src/components/das/DasPalette.tsx` — 10 項目のフラットリスト → 2026.1 カタログ（12 カテゴリ）のカテゴリ折りたたみ表示。ミッション未使用ステップは disabled
- `src/model/dasRobot.ts` — DasAction union の `OpenWindow` を `Browser` / `Windows` に分割、DasFinder のフィールド拡張、DAS_STEP_CATALOG 定数追加、DAS_ACTION_LABELS 更新

#### 変更（中規模）

- `src/components/das/DasPropertiesPane.tsx` — **廃止**（ファイル自体は削除しない。export default を `DasStatePane` に rename して「状態（変数）パネル」に役割変更）。フォーム部品（FinderDisplay / GuardRow / GuardedChoiceProps / ForEachProps / ClickProps / ExtractValueProps / OpenWindowProps / mapStepById 等）は `src/components/das/StepCardForms.tsx` に抽出して DasWorkflowView 内のカード展開で使う
- `src/engine/dasSimulator.ts` — `OpenWindow` → `Browser` / `Windows` 分岐追加。execOpenWindow を execBrowser / execWindows に分割
- `src/engine/dasValidator.ts` — `requireOpenWindow` を `requireBrowser` に rename（windowTitle 判定ロジックは同等）。DasActionType の変更に追従
- `src/engine/dasStepStatus.ts` — `OpenWindow` case を `Browser` / `Windows` に分割
- `src/store/dasRobotStore.ts` — DasAction 変更に追従
- `src/data/missions/d1.ts` — `OpenWindow` → `Browser` に変更
- `src/engine/das.engine.test.ts` — `OpenWindow` → `Browser` に変更。横フロー UI のテストは Vitest DOM テスト不要（ビジュアルレビューで確認）

#### 新規作成

- `src/components/das/StepCard.tsx` — 折りたたみ⇔展開可能なステップカード。折りたたみ時: アイコン＋名前＋▼。展開時: ヘッダ（アイコン＋タイトル＋^＋?）＋インラインフォーム。⚠ バッジ、選択時緑枠
- `src/components/das/StepCardForms.tsx` — DasPropertiesPane から抽出したフォーム部品群（FinderForm / GuardedChoiceForm / ForEachForm / BrowserForm / WindowsForm / ClickForm / ExtractValueForm / EnterTextForm / ThrowForm / ReturnForm）
- `src/components/das/FlowPoint.tsx` — ○ フローポイント（SVG circle、青接続線の始点/終点）
- `src/components/das/GuardLane.tsx` — ガードチョイスカード内のガードレーン（ガード種別ドロップダウン＋インライン設定 → 青線 → ○ → 枝ステップカード → ○）。レーン間の破線＋緑⊕
- `src/components/das/FinderForm.tsx` — 2026.1 準拠のコンポーネントファインダーフォーム（エイリアス / ベース ファインダー / デバイス / アプリケーション / コンポーネント / テキスト一致(Regex)）
- `src/components/das/DasStatePane.tsx` — 右パネル: 変数一覧と現在値の表示（旧 DasPropertiesPane の空きスペースに相当）
- `src/components/das/DasStepCatalog.ts` — `DAS_STEP_CATALOG` 定数定義（pure data、コンポーネントではない）

#### 削除

- なし（DasPropertiesPane.tsx はファイルを残し export を DasStatePane に変更。物理削除はしない）

---

### モデル変更の詳細

#### DasAction union の変更（dasRobot.ts）

`OpenWindow` を廃止し、2026.1 の「ブラウザ」と「Windows」に分離する。内部 type 文字列を安定 ID として使う方針は維持。

```typescript
// 廃止:
// | { type: 'OpenWindow'; windowTitle: string; appName: string }

// 新規 2 つ:
| {
    type: 'Browser'
    /** ブラウザ種別（ゲームでは 'Chromium' 固定） */
    browser: 'Chromium'
    /** アクション: ページ読込 / ページ生成 / ダウンロードを待機 */
    browserAction: 'pageLoad' | 'pageCreate' | 'waitDownload'
    applicationName: string
    url: string
    timeout?: number
  }
| {
    type: 'Windows'
    /** デバイス */
    device: string
    /** アクション（ゲームでは '実行' 固定） */
    windowsAction: 'execute'
    /** 実行可能ファイルパス or プロセス名 */
    executable: string
    /** 作業ディレクトリ */
    workingDir?: string
    /** 引数 */
    args?: string
    /** 最大化を開始 */
    startMaximized?: boolean
  }

// 追加:
| { type: 'Return' }
| { type: 'Throw'; exception: string }
| { type: 'Assign'; variable: string; expression: string }
| { type: 'TryCatch'; trySteps: DasStep[]; catches: { exception: string; steps: DasStep[] }[]; finallySteps: DasStep[] }
| { type: 'WhileLoop'; condition: string; body: DasStep[] }
```

**注意**: `Return` / `Throw` / `Assign` / `TryCatch` / `WhileLoop` はカタログ表示のために type を追加するが、シミュレータの実行実装は D1-D5 で必要な `Throw`（ガードチョイス枝内で使用）と `Return` のみ。他は disabled ステップとして UI 表示のみ。

#### DasActionType の拡張

```typescript
export type DasActionType = DasAction['type']
// 結果: 'Browser' | 'Windows' | 'Click' | 'ExtractValue' | 'EnterText' |
//       'GuardedChoice' | 'ForEach' | 'Loop' | 'Break' | 'Continue' |
//       'Condition' | 'Group' | 'Return' | 'Throw' | 'Assign' | 'TryCatch' | 'WhileLoop'
```

#### DAS_ACTION_LABELS の更新

```typescript
export const DAS_ACTION_LABELS: Record<DasActionType, string> = {
  Browser: 'ブラウザ',
  Windows: 'Windows',
  Click: 'クリック',
  ExtractValue: '値を抽出',
  EnterText: 'テキストを入力',
  GuardedChoice: 'ガード チョイス',  // ※公式は半角スペース入り
  ForEach: '要素の繰り返し',          // ※2026.1 正式名
  Loop: 'ループ',
  Break: 'ブレイク',
  Continue: 'コンテニュー',
  Condition: '条件',
  Group: 'グループ',
  Return: 'リターン',
  Throw: 'スロー',
  Assign: '割り当て',
  TryCatch: 'トライ-キャッチ',
  WhileLoop: '条件付きループ',
}
```

#### DasFinder の拡張（2026.1 コンポーネントファインダーフォーム準拠）

```typescript
export interface DasFinder {
  kind: DasFinderKind
  selector: string
  reuse: 'none' | 'prev' | 'named'
  aliasName?: string
  scopeRef?: string

  // ---- 2026.1 追加フィールド ----
  /** エイリアス（ファインダーの表示名） */
  alias?: string
  /** ベース ファインダー（'デバイスを再利用' 等） */
  baseFinder?: string
  /** デバイス（'local' 等） */
  device?: string
  /** アプリケーション（'cef' 等） */
  application?: string
  /** テキスト一致 (Regex) チェックボックス */
  textMatch?: boolean
  textMatchRegex?: string
}
```

既存コードで `DasFinder` を使っている箇所は `alias` / `baseFinder` / `device` / `application` / `textMatch` がすべて optional なので型エラーは発生しない。FinderForm で表示・編集し、シミュレータは引き続き `selector` をメインの検索キーとして使う（教育ゲームとして、追加フィールドはフォーム表示のみで実行時影響なし）。

#### DAS_STEP_CATALOG 定数（新規: dasRobot.ts に追加）

§5.5 B の全カタログをカテゴリ付きで定義する。

```typescript
export interface DasStepCatalogEntry {
  /** DasActionType（実装済みステップの type。未実装は null） */
  actionType: DasActionType | null
  /** カタログ上の表示名（2026.1 正式名） */
  label: string
  /** ゲーム内で実装済みか（false = disabled 表示） */
  implemented: boolean
}

export interface DasStepCategory {
  name: string
  entries: DasStepCatalogEntry[]
}

export const DAS_STEP_CATALOG: DasStepCategory[] = [
  {
    name: '割り当てと変換',
    entries: [
      { actionType: 'Assign', label: '割り当て', implemented: false },
      { actionType: null, label: '値の変換', implemented: false },
    ],
  },
  {
    name: '条件と制御',
    entries: [
      { actionType: 'Condition', label: '条件', implemented: true },
      { actionType: 'TryCatch', label: 'トライ-キャッチ', implemented: false },
      { actionType: 'Throw', label: 'スロー', implemented: true },
      { actionType: 'GuardedChoice', label: 'ガード チョイス', implemented: true },
      { actionType: 'Group', label: 'グループ', implemented: true },
      { actionType: 'Return', label: 'リターン', implemented: true },
    ],
  },
  {
    name: 'ループ',
    entries: [
      { actionType: 'Loop', label: 'ループ', implemented: true },
      { actionType: 'WhileLoop', label: '条件付きループ', implemented: false },
      { actionType: 'ForEach', label: '要素の繰り返し', implemented: true },
      { actionType: null, label: 'データベース照会', implemented: false },
      { actionType: null, label: '電子メールごとに', implemented: false },
      { actionType: null, label: 'ディレクトリの反復', implemented: false },
      { actionType: null, label: 'JSON ループ', implemented: false },
      { actionType: 'Break', label: 'ブレイク', implemented: true },
      { actionType: 'Continue', label: 'コンテニュー', implemented: true },
    ],
  },
  {
    name: 'アプリケーション',
    entries: [
      { actionType: 'Browser', label: 'ブラウザ', implemented: true },
      { actionType: 'Windows', label: 'Windows', implemented: true },
      { actionType: null, label: 'Excel', implemented: false },
      { actionType: null, label: 'ターミナル', implemented: false },
      { actionType: null, label: 'ツリー モード', implemented: false },
      { actionType: null, label: 'Document Transformation', implemented: false },
      { actionType: null, label: 'PDF', implemented: false },
      { actionType: null, label: '電子メール', implemented: false },
    ],
  },
  {
    name: 'データベース',
    entries: [
      { actionType: null, label: 'データベース照会', implemented: false },
      { actionType: null, label: 'データベース データ登録', implemented: false },
      { actionType: null, label: 'データベース データ抽出', implemented: false },
      { actionType: null, label: 'データベースから削除', implemented: false },
      { actionType: null, label: 'キーの計算', implemented: false },
      { actionType: null, label: 'SQL 実行', implemented: false },
    ],
  },
  {
    name: 'ファイル システム',
    entries: [
      { actionType: null, label: 'ファイルの読み込み', implemented: false },
      { actionType: null, label: 'ファイル出力', implemented: false },
      { actionType: null, label: 'ファイル システム アクション', implemented: false },
    ],
  },
  {
    name: 'JSON',
    entries: [
      { actionType: null, label: 'JSON オブジェクトを検索', implemented: false },
      { actionType: null, label: 'JSON ループ', implemented: false },
      { actionType: null, label: 'JSON を更新', implemented: false },
      { actionType: null, label: 'JSON の検索', implemented: false },
      { actionType: null, label: 'JSON 配列を並び替える', implemented: false },
    ],
  },
  {
    name: '出力値',
    entries: [
      { actionType: null, label: '出力値', implemented: false },
      { actionType: null, label: 'ファイル出力', implemented: false },
      { actionType: null, label: 'ログ出力', implemented: false },
    ],
  },
  {
    name: '統合',
    entries: [
      { actionType: null, label: 'TotalAgility', implemented: false },
      { actionType: null, label: 'クラウド AI', implemented: false },
      { actionType: null, label: 'カスタム アクション', implemented: false },
    ],
  },
  {
    name: 'リモート デバイス',
    entries: [
      { actionType: null, label: 'デバイスに接続', implemented: false },
      { actionType: null, label: 'デバイスからの切断', implemented: false },
      { actionType: null, label: 'リモート デバイス アクション', implemented: false },
      { actionType: null, label: 'RDP ログイン', implemented: false },
      { actionType: null, label: 'トリガー チョイス', implemented: false },
      { actionType: null, label: '通知', implemented: false },
      { actionType: null, label: 'クリップボードから抽出', implemented: false },
      { actionType: null, label: 'クリップボードへ割り当て', implemented: false },
    ],
  },
  {
    name: '抽出',
    entries: [
      { actionType: null, label: 'ツリーを XML として抽出', implemented: false },
      { actionType: null, label: '画像抽出', implemented: false },
      { actionType: null, label: '画像からテキスト抽出', implemented: false },
      { actionType: 'ExtractValue', label: '値を抽出', implemented: true },
    ],
  },
  {
    name: 'マウスとキーボード',
    entries: [
      { actionType: null, label: 'キープレス', implemented: false },
      { actionType: 'EnterText', label: 'テキストを入力', implemented: true },
      { actionType: null, label: 'マウス プレス', implemented: false },
      { actionType: null, label: 'マウス移動', implemented: false },
      { actionType: null, label: 'スクロール', implemented: false },
      { actionType: 'Click', label: 'クリック', implemented: true },
    ],
  },
  {
    name: 'その他',
    entries: [
      { actionType: null, label: 'ツリーの凍結', implemented: false },
      { actionType: null, label: 'REST Web サービス呼出', implemented: false },
      { actionType: null, label: 'シークレットの検索', implemented: false },
      { actionType: null, label: 'ロボットの呼び出し', implemented: false },
    ],
  },
]
```

---

### 横フロー描画仕様（DasWorkflowView 全面書き換え）

#### 基本構造

```
○―――[ StepCard ]―――○―――[ StepCard ]―――○―――[ StepCard ]―――○
```

- `○` = FlowPoint（div: `w-3 h-3 rounded-full border-2 border-blue-500 bg-white`）
- `―――` = 接続線（div: `h-0.5 w-6 bg-blue-500` or SVG line）
- `[ StepCard ]` = 折りたたみ可能なカード

横並びは `display: flex; flex-direction: row; align-items: flex-start; gap: 0;` で実現。overflow-x: auto でキャンバスをスクロール可能にする。

#### StepCard の 2 状態

**折りたたみ時:**
```
┌─────────────────────┐
│ 🖐 ガード チョイス ▼ │  ← アイコン＋名前＋展開ボタン(▼)
└─────────────────────┘
```
- min-width: 120px, 背景 bg-white, border border-gray-300, rounded
- ⚠ バッジ: 設定不備時にカード右上に `absolute` で黄色 ⚠
- 選択中: `ring-2 ring-green-500`（緑枠）
- 現在ステップ（実行後）: `ring-2 ring-green-400 bg-green-50`

**展開時:**
```
┌──────────────────────────────────┐
│ 🖐 ガード チョイス         ^ ? │  ← ヘッダ: アイコン＋タイトル＋折りたたみ(^)＋ヘルプ(?)
├──────────────────────────────────┤
│  [インライン設定フォーム]        │  ← StepCardForms から該当フォームを描画
│  ...                             │
└──────────────────────────────────┘
```
- max-width: 400px（展開時は横幅が広がる）
- フォーム部品は DasPropertiesPane から移植した StepCardForms を使う

#### ガードチョイスカードの特殊構造（実機 UI 画像準拠）

GuardedChoiceLocation.png と add_guard2.png に忠実に従う:

```
┌────────────────────────────────────────────────────────────────┐
│ 🖐 ガード チョイス                                     ^ ?   │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────┐                          │
│ │ [ロケーション...  ▼]             │                          │
│ │  コンポーネント  ^ (?)           │                          │
│ │  エイリアス: [          ]        │         ○───[ 枝StepCard ]───○
│ │  ベース ファインダー             │ ───○──→│                       │
│ │  [デバイスを再利用▼]             │         ○───[ 枝StepCard ]───○
│ │  デバイス: [local   ▼]           │
│ │  アプリケーション: [cef ]        │
│ │  コンポーネント: [IMG[der_r...]  │
│ │  □テキスト一致 (Regex)           │
│ └──────────────────────────────────┘
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄ ⊕ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  ← 破線＋緑⊕（ガード追加）
│ ┌──────────────────────────────────┐
│ │ [秒が経過した...  ▼]             │         ○───[❗ スロー TimeOutError]───○
│ │  秒: [60                ]        │ ───○──→│   例外: [TimeOutError    ]    │
│ └──────────────────────────────────┘         ○──────────────────────────────○
└────────────────────────────────────────────────────────────────┘
```

- 各ガードレーンは縦に積む（`flex-direction: column` で親カード内に配置）
- レーン = ガード種別ドロップダウン（表示: 「ロケーション...」「秒が経過した...」形式）＋ インライン設定フォーム
- レーンの右端から青線 → ○ → そのガード枝の後続ステップカード列 → ○
- レーン間に破線（`border-dashed border-green-500`）＋緑の⊕ボタン（`onClick` でガード追加）

#### ガード種別ドロップダウンの表示文字列

実機 UI 画像では「ロケーション...」「秒が経過した...」形式で表示されている。

```typescript
export const GUARD_TYPE_DROPDOWN_LABELS: Record<GuardType, string> = {
  timeout: '秒が経過した...',
  locationFound: 'ロケーション...',
  locationNotFound: 'ロケーション（不在）...',
  locationRemoved: 'ロケーション（除去）...',
  applicationFound: 'アプリケーション...',
  applicationNotFound: 'アプリケーション（不在）...',
  treeStoppedChanging: 'ツリーの変更停止...',
}
```

#### For Each カードの構造

```
┌──────────────────────────────────┐
│ ↻ 要素の繰り返し          ^ ?  │
├──────────────────────────────────┤
│ スコープ ファインダー:           │
│  [FinderForm]                    │
│ 要素ファインダー:                │
│  [FinderForm]                    │
├──────────────────────────────────┤
│ body: ○―[StepCard]―○―[StepCard]―○│  ← 内部に横フロー（再帰）
└──────────────────────────────────┘
```

---

### レイアウト変更（DasWorkspaceLayout）

#### 現行レイアウト（誤り）

```
┌──────┬──────────────────────┬──────────┐
│ 左   │ 中央上: ワークフロー  │ 右上:    │
│ プロ │                       │ プロパティ│
│ ジェ ├──────────────────────│ ペイン    │
│ クト │ 中央下: レコーダー    ├──────────┤
│ +パレ│ ビュー                │ 右下:    │
│ ット │                       │ ステータス│
└──────┴──────────────────────┴──────────┘
```

#### 修正後レイアウト（実機準拠）

```
┌──────┬────────────────────────────────────────────────────┬──────────┐
│ 左   │ 中央上: タブバー（デザイン | デバッグ + ファイルタブ）│          │
│ プロ ├────────────────────────────────────────────────────┤ 右:      │
│ ジェ │ 中央:                                               │ 状態     │
│ クト │ ワークフローキャンバス                              │ （変数）  │
│ +パレ│ （横フロー: ○―[Card]―○―[Card]―○）                 │ パネル    │
│ ット │ overflow-x: auto でスクロール                       │          │
│（カタ├────────────────────────────────────────────────────┤ + tick   │
│ ログ│ 下: レコーダービュー                               │ スライダ │
│ 表示│ （模擬アプリ画面 | 要素ツリー）                     │ + ログ   │
│ ）   │                                                     │          │
└──────┴────────────────────────────────────────────────────┴──────────┘
```

変更点:
1. 右パネル: DasPropertiesPane → DasStatePane（変数一覧＋tick スライダ＋実行ログ）
2. 中央の上下分割: ワークフローキャンバス（上、flex-1）+ レコーダービュー（下、h-[280px] 固定高）
3. 左パネル: DasPalette をカタログ表示に変更（カテゴリ折りたたみ）

---

### パレット（DasPalette）の変更

現行の 10 項目フラットリストを、`DAS_STEP_CATALOG` を使ったカテゴリ付き表示に変更する。

- 各カテゴリは `<details>` / `<summary>` で折りたたみ表示
- `implemented: true` のステップ: 通常表示、クリックで `addStep` 実行
- `implemented: false` のステップ: `opacity-50 cursor-not-allowed`、ツールチップ「この研修ラボでは未対応」
- `actionType: null` のステップ: 同上（actionType が null のため addStep は呼ばない）

---

### FinderForm（2026.1 コンポーネントファインダーフォーム）

GuardedChoiceLocation.png に表示されているフォーム項目を忠実に再現する。

```typescript
// FinderForm の props
interface FinderFormProps {
  finder: DasFinder
  onChange: (finder: DasFinder) => void
  /** 折りたたみ可能にするか（ガードレーン内では展開固定） */
  collapsible?: boolean
}
```

フォーム項目（上から順）:
1. **エイリアス** — text input (`finder.alias`)
2. **ベース ファインダー** — select (`finder.baseFinder`): 「デバイスを再利用」「(なし)」
3. **デバイス** — select (`finder.device`): 「local」固定（ゲーム内）
4. **アプリケーション** — text input (`finder.application`): 「cef」等
5. **コンポーネント** — text input, font-mono (`finder.selector`): CSS セレクタ
6. **テキスト一致 (Regex)** — checkbox + text input (`finder.textMatch`, `finder.textMatchRegex`)

シミュレータは引き続き `finder.selector` のみを使って検索する。他のフィールドは UI 表示用（実機の見た目に寄せるため）。

---

### 影響範囲分析（リワーク）

| 領域 | 影響内容 | リスク |
|---|---|---|
| `DasWorkflowView.tsx` | 全面書き換え（縦ツリー → 横フロー＋カード展開） | **High**: 最大の変更。レイアウト崩れ・ガードレーン構造の CSS 調整に工数がかかる可能性 |
| `DasWorkspaceLayout.tsx` | レイアウト 3 ペイン構成変更 | Med: flexbox の配置変更のみだが、レイアウト比率の調整が必要 |
| `DasPalette.tsx` | カタログ表示に変更 | Med: DAS_STEP_CATALOG を走査して描画。disabled 表示の実装 |
| `DasPropertiesPane.tsx` | 役割変更（→ DasStatePane）。フォーム部品を StepCardForms に移動 | Med: ファイル分割。フォーム部品のインターフェースは同じ |
| `dasRobot.ts` | DasAction union 変更（OpenWindow → Browser/Windows + 5 型追加）、DasFinder 拡張、DAS_STEP_CATALOG 追加 | **High**: 型変更が engine / store / data / components 全体に波及 |
| `dasSimulator.ts` | execOpenWindow → execBrowser / execWindows。Return / Throw の簡易実装追加 | Med: ロジック変更量は中程度。既存ガード/ForEach/Loop ロジックは不変 |
| `dasValidator.ts` | requireOpenWindow → requireBrowser。型追従 | Low: rename と型変更のみ |
| `dasStepStatus.ts` | OpenWindow case → Browser / Windows case | Low |
| `dasRobotStore.ts` | DasAction 型変更に追従 | Low: getDefaultStepName の対応追加のみ |
| `d1.ts` | OpenWindow → Browser に変更 | Low: 1 箇所の type 変更 |
| `das.engine.test.ts` | OpenWindow → Browser に変更。requireOpenWindow → requireBrowser | Med: テスト修正量は多いがパターンは単純 |
| 既存 M1-M5 / simulator.ts / validator.ts | **変更なし** | Low |

---

### 非機能観点（リワーク追加分）

#### パフォーマンス
- 横フローのカード数は D1-D5 で最大 10 枚程度。仮想化は不要。`React.memo` を StepCard / FlowPoint に適用する
- DAS_STEP_CATALOG は静的データ（70 エントリ程度）。パレット描画は軽量

#### 後方互換性
- `DasAction` union の `OpenWindow` 廃止は破壊的変更だが、影響範囲は DAS 系コード内に閉じる（M1-M5 は `DasAction` を一切参照しない）
- `DasFinder` の追加フィールドはすべて optional。既存のテストコードで `defaultFinder('...')` としている箇所は変更不要

#### テスト戦略
- `das.engine.test.ts` の `OpenWindow` テストを `Browser` に書き換え
- `requireOpenWindow` → `requireBrowser` のテスト修正
- 横フロー UI のビジュアルテストは手動確認（Vitest DOM テストは費用対効果が低い）
- ガードレーン構造の CSS は手動目視 + スクリーンショット比較

---

### 確定した公開 API（リワーク追加分）

#### 新規型

| 型名 | ファイル | 概要 |
|---|---|---|
| `DasStepCatalogEntry` | `dasRobot.ts` | カタログ 1 エントリ（actionType / label / implemented） |
| `DasStepCategory` | `dasRobot.ts` | カタログ 1 カテゴリ（name / entries[]） |

#### 新規定数

| 定数名 | ファイル | 概要 |
|---|---|---|
| `DAS_STEP_CATALOG` | `dasRobot.ts` | 2026.1 全カタログ（12 カテゴリ、約 70 エントリ） |
| `GUARD_TYPE_DROPDOWN_LABELS` | `dasRobot.ts` | ガード種別ドロップダウンの表示文字列（「ロケーション...」形式） |

#### 変更された型

| 型名 | 変更内容 |
|---|---|
| `DasAction` | `OpenWindow` 廃止 → `Browser` / `Windows` / `Return` / `Throw` / `Assign` / `TryCatch` / `WhileLoop` 追加 |
| `DasActionType` | 同上（union 拡張） |
| `DasFinder` | `alias` / `baseFinder` / `device` / `application` / `textMatch` / `textMatchRegex` 追加（すべて optional） |

#### 変更された関数

| 関数名 | 変更内容 |
|---|---|
| `requireOpenWindow` → `requireBrowser` | rename + `windowTitle` → `applicationName` 判定 |
| `runDasRobot` 内部 | `execOpenWindow` → `execBrowser` / `execWindows` に分割。`execThrow` / `execReturn` 追加 |

#### 新規コンポーネント

| コンポーネント | ファイル | 概要 |
|---|---|---|
| `StepCard` | `StepCard.tsx` | 折りたたみ⇔展開ステップカード |
| `StepCardForms` | `StepCardForms.tsx` | フォーム部品群（旧 DasPropertiesPane から移植） |
| `FlowPoint` | `FlowPoint.tsx` | ○ フローポイント + 青接続線 |
| `GuardLane` | `GuardLane.tsx` | ガードチョイスのレーン構造 |
| `FinderForm` | `FinderForm.tsx` | 2026.1 準拠コンポーネントファインダーフォーム |
| `DasStatePane` | `DasStatePane.tsx` | 変数一覧パネル（旧 DasPropertiesPane の代替） |

---

### docs/ への波及

前回設計と同じく `docs/` 未整備のため更新不要。

---

### 未確定事項

藤田さんへの確認が必要な未確定事項はない。以下は実装フェーズで判断できる範囲:

1. **ガードレーン内の枝ステップカードの横幅上限**: 実機画像から推定して max-width: 280px を既定とし、実装後に調整可
2. **カード展開時のアニメーション**: 実機には瞬時展開。ゲームでも transition なし（教育目的で即応性優先）
3. **FlowPoint の描画**: SVG circle vs div+rounded-full のどちらでも可。div が軽量なので div を既定とする

---

## 健康なロボットの10か条 統合設計（2026-06-13 追補）

### 設計方針

プレイヤーが「健康なロボット」を自然に意識できるよう、2 つの接触面を設ける: (A) ミッションクリア時に表示される「ロボット健康診断」（構造解析による自動判定）、(B) いつでも参照できる「健康なロボットの10か条」リファレンスモーダル。10 か条の定義データを `src/data/healthRules.ts` に一元管理し、診断エンジン `src/engine/healthCheck.ts` は Robot（青）と DasRobot（緑）の両モデルに対応する純粋関数として実装する。既存の `src/model/health.ts`（旧 6 軸スコア）は本設計で**置換**する（後述の判断理由参照）。既存の ResultPanel・Toolbar・HomeScreen への変更は最小限に留め、新規コンポーネントに診断表示を閉じ込める。

---

### アーキテクチャ判断

#### 検討した選択肢 H-A: 旧 health.ts（6 軸スコア）の扱い

| 案 | メリット | デメリット |
|---|---|---|
| **案 H-A-1: 共存（6 軸スコアと 10 か条を並列に持つ）** | 既存コードを一切変更しない。将来 6 軸スコアを復活させたいとき即使える | 2 つの「健康度」概念が並立し、プレイヤーにとって混乱する。health.ts は現在どこからも import されておらず死コードのまま残る。型名が被りやすい（`HealthScore` vs `HealthFinding`） |
| **案 H-A-2: 置換（health.ts を 10 か条のデータ型ファイルに書き換え）（採用）** | 「健康なロボット」の概念が 10 か条に一本化されプレイヤーに明快。dead code を解消。将来 6 軸が必要になれば git 履歴から復旧可能 | health.ts の既存コードを全削除して書き換える。ただし現在参照箇所ゼロのため影響なし |

**採用: 案 H-A-2（置換）**。理由: `src/model/health.ts` は `Grep` で確認した結果、プロジェクト内のどのファイルからも import されていない（型定義のみで判定ロジック未実装、コメントに「M7 で拡張」とあるが M7 は存在しない）。死コードを残すより、10 か条のデータ型ファイルとして再利用するほうが、ファイル名の意味的一貫性（`health.ts` = ロボットの健康）と dead code 削減の両方を達成する。6 軸スコアのコードは git 履歴で保全されるため不可逆リスクは無い。

#### 検討した選択肢 H-B: 診断結果の表示場所

| 案 | メリット | デメリット |
|---|---|---|
| **案 H-B-1: ResultPanel 内にインライン表示** | ResultPanel 1 ファイルの変更で完結。モーダル追加なし | ResultPanel がすでに「効果測定」「気づき」「用語」で縦に長い。診断セクションを追加するとスクロール量が増え、クリアの達成感が薄れる |
| **案 H-B-2: ResultPanel 内に折りたたみセクションとして表示（採用）** | クリア直後は折りたたみ表示（ヘッダ + サマリ 1 行のみ）で達成感を邪魔しない。展開するとフォーカス条 + 検出結果の全容が見える | ResultPanel に HealthDiagnosis サブコンポーネントを挿入する変更が必要。ただし ResultPanel の既存構造は維持 |

**採用: 案 H-B-2（折りたたみセクション）**。理由: 教材であっても、クリア直後の「やった！」感は阻害したくない。診断は「もっと知りたい人が開く」位置づけにし、折りたたみの初期状態は**展開**（教育目的で見せたいため）とするが、ユーザーが閉じることも可能にする。フォーカス条を上位に強調し、前向きなトーンでアドバイスを表示する。

---

### 変更コンポーネント

#### 新規作成

- `src/data/healthRules.ts` — 10 か条の定義データ（id / 番号 / タイトル / 短い解説 / 出典 URL）+ ミッション別フォーカス条マッピング
- `src/engine/healthCheck.ts` — `diagnose()` 関数: Robot | DasRobot とミッション情報を受け取り、構造解析で該当条を判定して `HealthFinding[]` を返す純粋関数
- `src/components/game/HealthDiagnosis.tsx` — ResultPanel 内に埋め込む「ロボット健康診断」折りたたみセクション
- `src/components/game/HealthRulesPanel.tsx` — 10 か条リファレンスモーダル（Toolbar・HomeScreen から開ける）

#### 変更

- `src/model/health.ts` — **全面書き換え**: 旧 6 軸スコアの型をすべて削除し、`HealthRule` / `HealthFinding` / `HealthStatus` の型定義ファイルに置換
- `src/model/mission.ts` — optional フィールド `healthFocus?: number[]` を `Mission` に追加（フォーカスする条の番号配列）
- `src/data/missions/m1.ts〜m5.ts` — 各ミッションに `healthFocus` を追加（後述の割当案参照）
- `src/data/missions/d1.ts〜d5.ts` — 各ミッションに `healthFocus` を追加（後述の割当案参照）
- `src/components/game/ResultPanel.tsx` — `HealthDiagnosis` コンポーネントを「気づき・成果」セクションの後に挿入。props に `robot | dasRobot` と `mission` を追加
- `src/components/ds/Toolbar.tsx` — 「10 か条」ボタンを追加（`onOpenHealthRules` callback 追加）
- `src/components/game/HomeScreen.tsx` — 相談ボード上部に「10 か条を見る」ボタンを追加
- `src/app/App.tsx` — `showHealthRules` state と `HealthRulesPanel` モーダルの描画を追加
- `src/components/das/DasWorkspaceLayout.tsx` — 同上（DAS 側のレイアウトにも `HealthRulesPanel` モーダルの描画を追加）

#### 削除

- なし（health.ts は物理削除せず内容を書き換え。旧コードは git 履歴で保全）

---

### データ構造変更

#### src/model/health.ts（全面書き換え）

```typescript
// ============================================================
// ロボット健康度 — 「健康なロボットのための10か条」に基づく診断型
// （旧 6 軸スコアを置換。旧コードは git 履歴で保全）
// ============================================================

/** 診断結果のステータス */
export type HealthStatus = 'good' | 'improve'

/** 1 つの条に対する診断結果 */
export interface HealthFinding {
  /** 条の ID（'rule-1' 〜 'rule-10'） */
  ruleId: string
  /** 条の番号（1〜10） */
  ruleNumber: number
  /** 判定結果 */
  status: HealthStatus
  /** プレイヤー向けメッセージ（前向きなトーン） */
  message: string
}

/** 10 か条の 1 つ（定義データ側で使う） */
export interface HealthRule {
  /** 条の ID（'rule-1' 〜 'rule-10'） */
  id: string
  /** 条の番号（1〜10） */
  number: number
  /** タイトル（例: 「ロボットのサイズはコンパクトに保つこと」） */
  title: string
  /** 短い解説（PDF の括弧内を自分の言葉で簡潔に） */
  description: string
  /** 自動診断可能か */
  diagnosable: boolean
}
```

#### src/data/healthRules.ts（新規）

```typescript
import type { HealthRule } from '../model/health'

/** 出典 URL（リファレンスパネルに表示） */
export const HEALTH_RULES_SOURCE_URL =
  'https://rpa-technologies.com/catalog/10RulesOfHealthyRobots.pdf'

export const HEALTH_RULES_SOURCE_LABEL =
  'RPA Technologies【入門】V1.0.0 2020.02.20「健康なロボットのための10か条」'

/** 10 か条の定義（全条） */
export const HEALTH_RULES: HealthRule[] = [
  {
    id: 'rule-1',
    number: 1,
    title: 'ロボットのサイズはコンパクトに保つこと',
    description:
      'ステップ数は 100〜200 以内を目安に。開いたとき全体が見渡せる範囲にまとめましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-2',
    number: 2,
    title: '単一の処理に集中すること',
    description:
      '1 つのロボットには 1 つの役割だけ。処理を単純に分解して順次組み合わせれば、エラー時の影響も小さくなります。',
    diagnosable: false,
  },
  {
    id: 'rule-3',
    number: 3,
    title: 'ロボットのフローに業務処理の骨格が明確に表れていること',
    description:
      '初見でも業務内容がわかるステップ名を付け、処理の塊をグループ化しましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-4',
    number: 4,
    title: '補助処理と本処理を明確に区別すること',
    description:
      '前処理と本処理を分けて配置し、エラーの原因がデータかプロセスか判別しやすくしましょう。',
    diagnosable: false,
  },
  {
    id: 'rule-5',
    number: 5,
    title: '同一・類似の処理を複数存在させないこと',
    description:
      '繰り返す手続きは Snippet 化し、繰り返し使う値は変数で一元管理しましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-6',
    number: 6,
    title: '用途や内容ごとにデータを整理整頓すること',
    description:
      '入力・出力・一時データを Type で整理。手順を作る前にデータの棚卸しをしましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-7',
    number: 7,
    title: '処理内容の見通しをよくするための案内・コメントを適所に設置すること',
    description:
      'Group で区切りを示し、業務内容を示すコメントを残しましょう。簡易業務マニュアルにもなります。',
    diagnosable: false,
  },
  {
    id: 'rule-8',
    number: 8,
    title: 'ロボット実行時の処理経路がトレースできるように適度にログ出力を設定すること',
    description:
      'Write Log でパンくずを残し、データのキー情報をログに記録しましょう。',
    diagnosable: true,  // 緑ロボのみ: ログ出力ステップの有無で加点
  },
  {
    id: 'rule-9',
    number: 9,
    title: '例外処理はログと通知を重視し、自動回復は最低限とすること',
    description:
      '例外を確実にとらえてログ・通知を出し、自動回復ロジックは極力含めないようにしましょう。',
    diagnosable: true,
  },
  {
    id: 'rule-10',
    number: 10,
    title: '環境変数値はロボット内に組み込まず、外部情報の読み込みで切り替えること',
    description:
      'ファイルパスや URL、アカウント情報は外部設定で管理。直書きするとテストの品質担保が無効になります。',
    diagnosable: true,
  },
]

/**
 * ミッション ID → フォーカスする条番号のマッピング。
 * Mission 型の healthFocus フィールドに設定する値の一元管理。
 * 各ミッションの定義ファイル（m1.ts 等）で直接 healthFocus: [6] と書いてもよいが、
 * 割当ロジックを見渡しやすくするためここに集約する。
 */
export const MISSION_HEALTH_FOCUS: Record<string, number[]> = {
  // ---- 青ロボット（M1〜M5）----
  m1: [1, 3],     // M1: ステップ数コンパクト＋ステップ名を付けよう
  m2: [6],        // M2: Type 整理（複合型を定義してデータを整理）
  m3: [3, 5],     // M3: 業務の骨格＋条件分岐による重複排除
  m4: [1],        // M4: 全件取得でもコンパクトに
  m5: [10],       // M5: 入力変数を使い直書き禁止

  // ---- 緑ロボット（D1〜D5）----
  d1: [1, 3],     // D1: 基本 3 ステップで全体俯瞰＋名前付け
  d2: [9],        // D2: ガード＋Timeout による例外系の設計
  d3: [9],        // D3: 不測の割り込み＝例外として捉える
  d4: [5, 6],     // D4: For Each で重複排除＋データ整理
  d5: [10],       // D5: セレクタ＝環境依存値を外部化する思考
}
```

#### src/model/mission.ts への追加

```typescript
export interface Mission {
  // ... 既存フィールドは不変 ...

  /** 健康なロボットの10か条: このミッションでフォーカスする条の番号（1〜10） */
  healthFocus?: number[]
}
```

#### スキーマ変更 / マイグレーション

- localStorage 変更なし（`healthFocus` はミッション定義側の静的データであり、プレイヤー進捗ストアには影響しない）
- 「体験済み」バッジの導出は `completedMissions` (既存) × `MISSION_HEALTH_FOCUS` のランタイム計算で行い、gameStore に新フィールドを追加しない

---

### 診断エンジン: src/engine/healthCheck.ts

#### 公開 API

```typescript
import type { Robot } from '../model/robot'
import type { DasRobot } from '../model/dasRobot'
import type { Mission } from '../model/mission'
import type { HealthFinding } from '../model/health'

/**
 * プレイヤーが組んだロボットを構造解析し、該当する条を判定する。
 * 純粋関数。Robot（青）と DasRobot（緑）の両方を受け取れる。
 *
 * @param robot  - プレイヤーが組んだロボット（青 or 緑）
 * @param mission - 現在のミッション（robotType と healthFocus を参照）
 * @returns HealthFinding[] - 判定対象の条ごとの結果（フォーカス条 + 検出された条）
 */
export function diagnose(
  robot: Robot | DasRobot,
  mission: Mission,
): HealthFinding[]
```

#### 判定ロジック（条ごと）

青ロボット（`mission.robotType !== 'das'`）の場合:

| 条 | 判定方法 | good 条件 | improve 条件 | メッセージ例 |
|---|---|---|---|---|
| **第1条** | `robot.steps.length` を計測 | ≤ 12 ステップ（教材規模の閾値） | > 12 ステップ | good: 「コンパクトにまとまっていますね！」 / improve: 「ステップ数が多くなっています。分割を検討しましょう」 |
| **第3条** | 全ステップの `name` を検査。`isAnonymous(step)` が true のステップ数を計測 | 無名ステップ 0 件 | 無名ステップ 1 件以上 | good: 「すべてのステップに名前が付いています！」 / improve: 「"(名前がありません)" のステップがあります。初見でも業務がわかる名前を付けましょう」 |
| **第5条** | 同一 `action.type` + 同一主要設定（LoadPage: 同一 URL / ExtractText: 同一 targetId / Click: 同一 targetId）のステップペアを検出 | 重複ペア 0 | 重複ペア 1 以上 | good: 「同じ処理の重複はありません！」 / improve: 「似た処理が複数あります。繰り返しや変数で一本化できないか検討しましょう」 |
| **第6条** | `robot.types.length > 0` かつ `robot.variables.length > 0`（タイプと変数を定義してデータ整理しているか） | types ≥ 1 かつ variables ≥ 1 | types = 0 または variables = 0 | good: 「タイプと変数でデータが整理されています！」 / improve: 「データの入れ物（タイプ・変数）を定義して整理しましょう」 |
| **第10条** | M5 のような入力変数ミッション: `robot.variables.some(v => v.role === 'input')` かつ、action 内に `fromVariable` を使っている EnterText が存在する | 入力変数あり + 変数参照あり | 入力変数があるのに text に直書き | good: 「入力変数を活用して環境値を外部化しています！」 / improve: 「URL やパスワードが直書きされています。入力変数を使って外部から渡しましょう」 |

緑ロボット（`mission.robotType === 'das'`）の場合:

| 条 | 判定方法 | good 条件 | improve 条件 | メッセージ例 |
|---|---|---|---|---|
| **第1条** | `flattenDasSteps(robot.steps).length` で全ステップ数（ネスト含む再帰カウント）を計測 | ≤ 12 | > 12 | （青と同じトーン） |
| **第3条** | `dasIsAnonymous(step)` が true のステップ数を計測（DAS_ANON_STEP_NAME との比較） | 無名 0 件 | 無名 1 件以上 | （青と同じトーン） |
| **第5条** | 同一 `action.type` + 同一 `finder.selector` のステップペアを検出（ネスト含む再帰） | 重複 0 | 重複 1 以上 | （青と同じトーン） |
| **第6条** | `robot.types.length > 0` かつ `robot.variables.length > 0` | 同上 | 同上 | （青と同じトーン） |
| **第8条** | ログ出力ステップ（DAS カタログの「ログ出力」= 未実装だが、将来を見据え `action.type === 'Group'` で名前に「ログ」を含むグループの有無）で加点式判定。**現実装では判定対象外**（DAS にログ出力ステップが未実装のため、diagnose は第 8 条を返さない） | — | — | — |
| **第9条** | ガードチョイスに `timeout` ガードがあるか / `Throw` ステップがあるか で判定。ガードチョイスがあるのに timeout 無し → improve | timeout あり or Throw あり | ガードチョイスあり & timeout 無し & Throw 無し | good: 「タイムアウトで例外をしっかり捕捉しています！」 / improve: 「ガードチョイスに時間経過（Timeout）がありません。例外として捉えましょう」 |
| **第10条** | D 系で変数を扱うミッション（D5 等）: EnterText の `fromVariable` 使用 or ExtractValue の `toVariable` 使用で入出力変数を活用しているか。固定値直書き（URL 等）の検出 | 変数参照あり | 固定値直書き | （青と同じトーン） |

**判定対象の条の決定**: `diagnose()` は以下の条のみ `HealthFinding` を返す:
1. `mission.healthFocus` に含まれる条（フォーカス条、最優先で表示）
2. 上記以外で、自動判定が可能（`diagnosable: true`）かつ判定の前提条件が成立する条（例: 第 9 条はガードチョイスが存在する場合のみ判定対象）

判定不能な条（第 2/4/7/8 条、および前提条件が成立しない条）は `HealthFinding` に含めない。リファレンスパネルには 10 条すべて表示する。

---

### ResultPanel への「ロボット健康診断」セクション

#### HealthDiagnosis コンポーネント（src/components/game/HealthDiagnosis.tsx）

```typescript
interface HealthDiagnosisProps {
  findings: HealthFinding[]
  /** フォーカスする条の番号（Mission.healthFocus） */
  focusRules: number[]
}
```

**表示構成**:

```
┌──────────────────────────────────────────────┐
│ 🩺 ロボット健康診断                    [▼/▲] │  ← 折りたたみヘッダ
├──────────────────────────────────────────────┤
│                                              │
│ 【今回のフォーカス】                         │
│ ○ 第1条: ロボットのサイズはコンパクトに...    │  ← フォーカス条（強調表示）
│   → コンパクトにまとまっていますね！          │     bg-green-500/10 or bg-amber-500/10
│                                              │
│ ○ 第3条: ロボットのフローに業務処理の...      │
│   → すべてのステップに名前が付いています！    │
│                                              │
│ 【その他の検出結果】                         │  ← フォーカス以外で検出された条
│ ○ 第6条: 用途や内容ごとにデータを...          │
│   → タイプと変数でデータが整理されています！  │
│                                              │
└──────────────────────────────────────────────┘
```

- `○` は `status === 'good'` なら緑（`text-green-400`）、`status === 'improve'` なら黄（`text-amber-400`）
- フォーカス条は `border-l-2 border-ds-accent` で左線強調
- 診断結果が空（判定対象条が無い）の場合はセクション自体を非表示
- 初期状態は展開（`useState(true)`）。ユーザーが折りたたみ可能

#### ResultPanel への挿入位置

ResultPanel の既存構造:
1. クリアヘッダ
2. 効果測定（手作業 → ロボット）
3. 気づき・成果（reveal）
4. **ここに HealthDiagnosis を挿入**
5. 解禁された用語
6. 次の相談ボタン

#### ResultPanel の props 変更

```typescript
// 既存
interface Props {
  mission: Mission
  sim: SimResult
  hasNext: boolean
  onNext: () => void
}

// 変更後
interface Props {
  mission: Mission
  sim: SimResult
  hasNext: boolean
  onNext: () => void
  /** 健康診断の結果（diagnose() の戻り値） */
  healthFindings?: HealthFinding[]
}
```

`healthFindings` は optional。呼び出し元（App.tsx / DasWorkspaceLayout.tsx）で `diagnose()` を呼んで渡す。ResultPanel 側は渡されなければ診断セクションを非表示にする。

---

### 10 か条モーダル: HealthRulesPanel（src/components/game/HealthRulesPanel.tsx）

#### 構成

```typescript
interface HealthRulesPanelProps {
  onClose: () => void
  /** クリア済みミッション ID 配列（体験済みバッジ導出に使用） */
  completedMissions: string[]
}
```

**表示構成**:

```
┌──────────────────────────────────────────────────────┐
│ 健康なロボットのための10か条                    [✕]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. ロボットのサイズはコンパクトに保つこと  [体験済み] │
│     ステップ数は 100〜200 以内を目安に。              │
│     開いたとき全体が見渡せる範囲に...                 │
│                                                      │
│  2. 単一の処理に集中すること                          │
│     1 つのロボットには 1 つの役割だけ...              │
│                                                      │
│  ... （10 条すべて）                                 │
│                                                      │
│  ────────────────────────────────────────────        │
│  出典: RPA Technologies【入門】V1.0.0 2020.02.20     │
│  📎 PDFを見る                                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- 10 条すべてのタイトル + 短い解説を表示
- 「体験済み」バッジ: `completedMissions` に含まれるミッション ID の `MISSION_HEALTH_FOCUS` を逆引きし、体験済みの条番号を導出。該当条に `bg-ds-accent/10 text-ds-accent text-[10px] rounded px-1.5` のバッジを表示
- 出典 URL: `HEALTH_RULES_SOURCE_URL` へのリンクを末尾に表示
- Modal コンポーネント（既存）を使用。`maxWidth="max-w-lg"`

#### 体験済みバッジの導出ロジック

```typescript
import { MISSION_HEALTH_FOCUS } from '../../data/healthRules'

function getExperiencedRules(completedMissions: string[]): Set<number> {
  const experienced = new Set<number>()
  for (const missionId of completedMissions) {
    const focus = MISSION_HEALTH_FOCUS[missionId]
    if (focus) focus.forEach((n) => experienced.add(n))
  }
  return experienced
}
```

この導出は HealthRulesPanel 内のローカル計算で行い、gameStore に新しいフィールドを追加しない。`completedMissions` は既存の `useGameStore((s) => s.completedMissions)` からそのまま取得可能。

---

### 導線（Toolbar・HomeScreen からの開き方）

#### Toolbar の変更

```typescript
// 既存 props に追加
interface ToolbarProps {
  onRun: () => void
  onHome: () => void
  onOpenGlossary: () => void
  onOpenProgress: () => void
  onOpenHealthRules: () => void  // 追加
}
```

Toolbar の右側ボタン群に「10か条」ボタンを追加:

```tsx
<button onClick={onOpenHealthRules} className="rounded px-2 py-1 text-[12px] text-ds-textDim hover:text-ds-text">
  🩺 10か条
</button>
```

#### HomeScreen の変更

相談ボード上部（「ようこそ、○○さん」のすぐ下、「続きから」「最初から」ボタンの隣）に「10か条を見る」ボタンを追加:

```tsx
<button
  onClick={() => setShowHealthRules(true)}
  className="rounded-lg border border-ds-border bg-ds-bg px-4 py-2 text-[13px] text-ds-text hover:border-ds-accent2"
>
  🩺 健康なロボットの10か条
</button>
```

HomeScreen 内に `useState` で `showHealthRules` を管理し、`HealthRulesPanel` をレンダリング。

#### App.tsx / DasWorkspaceLayout.tsx の変更

両方に `showHealthRules` state を追加し、Toolbar の `onOpenHealthRules` → `setShowHealthRules(true)` → `HealthRulesPanel` をレンダリング。既存の `showGlossary` / `showProgress` と同じパターン。

---

### ミッション別 healthFocus 割当案

| ミッション | healthFocus | フォーカスの理由 |
|---|---|---|
| **M1** | `[1, 3]` | 初めてのロボット: ステップ数が少なくコンパクトに保つ体験 + ステップ名の重要性を意識 |
| **M2** | `[6]` | 複合型（Type）の定義でデータを整理する体験 |
| **M3** | `[3, 5]` | 条件分岐で業務フローの骨格を表現 + 同一抽出処理の重複を条件で整理 |
| **M4** | `[1]` | 全件取得（ForEach）でもロボットをコンパクトに保てることを確認 |
| **M5** | `[10]` | 入力変数で URL/パスワードを外部化（直書き禁止の体験） |
| **D1** | `[1, 3]` | 緑ロボ初回: 基本 3 ステップのコンパクトさ + 命名 |
| **D2** | `[9]` | ガードチョイス＋Timeout で例外系を設計する体験 |
| **D3** | `[9]` | Application Found ガードで不測の割り込みを例外として捉える |
| **D4** | `[5, 6]` | For Each で繰り返しを一元化（重複排除）+ スコープファインダーでデータ整理 |
| **D5** | `[10]` | 座標固定 vs 属性セレクタ = 環境依存値の外部化思考 |

---

### gameStore への変更

**変更なし**。`completedMissions` は既存フィールドをそのまま使用。体験済みバッジの導出は `MISSION_HEALTH_FOCUS` とのランタイム join で行い、gameStore に新しいフィールドを追加しない。localStorage スキーマも不変。

---

### 影響範囲分析

| 領域 | 影響内容 | リスク |
|---|---|---|
| `src/model/health.ts` | 全面書き換え（旧 6 軸 → 10 か条の型）。現在参照箇所ゼロのため他コードへの影響なし | Low |
| `src/model/mission.ts` | `healthFocus?: number[]` を optional 追加。既存コンパイル不変 | Low |
| `src/data/missions/m1〜m5.ts, d1〜d5.ts` | 各ファイルに `healthFocus: [N]` を 1 行追加 | Low |
| `src/components/game/ResultPanel.tsx` | `healthFindings` optional prop 追加 + HealthDiagnosis の挿入（~5 行追加）。既存構造は維持 | Low |
| `src/components/ds/Toolbar.tsx` | `onOpenHealthRules` prop 追加 + ボタン 1 個追加 | Low |
| `src/components/game/HomeScreen.tsx` | 「10か条を見る」ボタン追加 + `showHealthRules` state | Low |
| `src/app/App.tsx` | `showHealthRules` state + HealthRulesPanel モーダル描画 + Toolbar prop 追加 + `diagnose()` 呼び出し + ResultPanel に findings 渡す | Med |
| `src/components/das/DasWorkspaceLayout.tsx` | 同上（DAS 側の並行変更） | Med |
| `src/engine/healthCheck.ts`（新規） | 診断ロジック。Robot / DasRobot 両対応の構造解析。`stepStatus.ts` / `dasStepStatus.ts` の判定関数を内部利用 | Med |
| `src/data/healthRules.ts`（新規） | 10 か条の静的データ。変更頻度は低い | Low |
| `src/components/game/HealthDiagnosis.tsx`（新規） | 診断表示 UI。ResultPanel 内のサブコンポーネント | Low |
| `src/components/game/HealthRulesPanel.tsx`（新規） | リファレンスモーダル。Modal コンポーネントの利用 | Low |
| 既存 M1〜M5 / D1〜D5 の動作 | healthFocus は optional で既存テストに影響なし。diagnose は ResultPanel 表示のみ（合否判定に影響しない） | Low |
| gameStore / localStorage | **変更なし** | Low |

---

### 非機能観点

#### パフォーマンス影響

- `diagnose()` はミッションクリア時（`phase === 'result'`）にのみ呼ばれる（ビルド中の毎 render では呼ばない）。ステップ数最大 20 程度の O(n) 走査であり無視できる
- HealthRulesPanel の体験済みバッジ導出は `completedMissions`（最大 10 件） × `MISSION_HEALTH_FOCUS`（10 エントリ）の O(n*m) で瞬時

#### セキュリティ影響

- 外部通信なし。10 か条の出典 URL は `<a href>` でリンクするのみ
- ユーザー入力は受け付けない（診断は自動、リファレンスは静的データ）

#### 後方互換性

- `Mission.healthFocus` は optional。既存ミッションに `healthFocus` を追加しなくても型エラーは発生しない（実際にはすべてのミッションに追加するが、追加忘れでもビルドは通る）
- `ResultPanel.healthFindings` は optional。渡さなければ診断セクションは非表示
- `Toolbar.onOpenHealthRules` は必須 prop として追加するため、Toolbar の全呼び出し元（App.tsx / DasWorkspaceLayout.tsx）に prop を追加する必要がある

#### テスト戦略

- `src/engine/healthCheck.ts` のユニットテスト（Vitest）:
  - 青ロボット: ステップ数 ≤ 12 → rule-1 good、> 12 → improve
  - 青ロボット: 無名ステップあり → rule-3 improve、全命名 → good
  - 青ロボット: 重複アクション検出 → rule-5 improve
  - 青ロボット: types/variables 定義あり → rule-6 good
  - 青ロボット: 入力変数 + fromVariable 使用 → rule-10 good
  - 緑ロボット: ガードチョイスあり + timeout あり → rule-9 good
  - 緑ロボット: ガードチョイスあり + timeout なし → rule-9 improve
  - 緑ロボット: 無名ステップあり → rule-3 improve
  - `diagnose()` が healthFocus の条を必ず含むことの確認
  - `diagnose()` が diagnosable: false の条を返さないことの確認
- `src/data/healthRules.ts` の検証: 10 件の HEALTH_RULES が重複なく number 1〜10 を持つことを静的テスト
- 既存テスト（87 件）はすべて無影響で通過すること

---

### docs/ への波及

前回設計と同じく `docs/` 未整備のため更新不要。

- [ ] `docs/functional-design.md` — 未作成のため対象外
- [ ] `docs/architecture.md` — 未作成のため対象外

---

### 確定した公開 API 一覧（10 か条追補分）

#### 新規型

| 型名 | ファイル | 概要 |
|---|---|---|
| `HealthStatus` | `src/model/health.ts` | `'good' \| 'improve'` |
| `HealthFinding` | `src/model/health.ts` | 1 条の診断結果（ruleId / ruleNumber / status / message） |
| `HealthRule` | `src/model/health.ts` | 10 か条の 1 条の定義（id / number / title / description / diagnosable） |

#### 新規定数

| 定数名 | ファイル | 概要 |
|---|---|---|
| `HEALTH_RULES` | `src/data/healthRules.ts` | 10 か条の全定義（HealthRule[10]） |
| `HEALTH_RULES_SOURCE_URL` | `src/data/healthRules.ts` | 出典 PDF の URL 文字列 |
| `HEALTH_RULES_SOURCE_LABEL` | `src/data/healthRules.ts` | 出典のラベル文字列 |
| `MISSION_HEALTH_FOCUS` | `src/data/healthRules.ts` | ミッション ID → フォーカス条番号の Record |

#### 新規関数

| 関数名 | ファイル | シグネチャ | 概要 |
|---|---|---|---|
| `diagnose` | `src/engine/healthCheck.ts` | `(robot: Robot \| DasRobot, mission: Mission) => HealthFinding[]` | ロボット構造を解析し、該当条の診断結果を返す（純粋関数） |

#### 新規コンポーネント

| コンポーネント | ファイル | 概要 |
|---|---|---|
| `HealthDiagnosis` | `src/components/game/HealthDiagnosis.tsx` | ResultPanel 内の折りたたみ診断セクション |
| `HealthRulesPanel` | `src/components/game/HealthRulesPanel.tsx` | 10 か条リファレンスモーダル（Modal 利用） |

#### 変更された型

| 型名 | ファイル | 変更内容 |
|---|---|---|
| `Mission` | `src/model/mission.ts` | `healthFocus?: number[]` を optional 追加 |

#### 変更されたコンポーネント props

| コンポーネント | 追加 prop | 型 |
|---|---|---|
| `ResultPanel` | `healthFindings?` | `HealthFinding[]` |
| `Toolbar` | `onOpenHealthRules` | `() => void` |

---

### 未確定事項

藤田さんへの確認が必要な未確定事項はない。以下は実装フェーズで判断できる範囲:

1. **第 1 条の閾値（12 ステップ）**: 教材規模の上限として 12 を設定したが、M4（ForEach）や D4（ForEach）で body ステップを含めると超える可能性がある。実装時に各ミッションの典型的な正解構成をカウントして閾値を微調整してよい
2. **第 5 条の重複検出精度**: 完全一致（type + 全設定フィールド一致）での検出とする。部分一致や類似度計算は教材規模では over-engineering のため不採用
3. **第 8 条（ログ出力）の DAS 対応**: DAS にログ出力ステップ（カタログの「ログ出力」）が未実装のため、現時点では diagnose は第 8 条を返さない。DAS カタログにログ出力が `implemented: true` になった時点で追加可能
4. **HealthDiagnosis の初期展開/折りたたみ**: 設計では初期展開（教育目的で見せたい）とするが、プレイテストで「邪魔」との声があれば初期折りたたみに変更可能（useState のデフォルト値を変えるだけ）

---

## 実機練習編（Practice Studio）設計（2026-06-13 追補）

### 目的

ミッション（クエスト）ではない「自由練習モード」として、BizRobo! Design Studio の各アクションをマニュアル代わりに WEB アプリ上で操作体験できる機能を提供する。実機 DS シェル（参照画像: `.capture/docs2026/full_BER_real.png` = 青ロボット main_1.robot、`full_Robot_real.png` = 緑ロボット sub.robot）のレイアウトを再現した Practice Studio シェル上で、紹介タブのレクチャー一覧 → ガイドバー（手順指示 + done 述語の自動チェック + 次へ）→ 完了、の流れでアクション操作を学習する。緑ロボットのステップ列（実機 sub.robot に存在する「参照」「ダウン スクロール」等）は藤田さん指示で再現対象外。

---

### 全体構成図

```
┌─── PracticeStudio（screen='practice' 時に App.tsx が描画）──────────────────────────────────────┐
│                                                                                                 │
│ ┌── MenuBar ──────────────────────────────────────────────────────────────────────────────────┐  │
│ │ ファイル(F) │ 編集(E) │ 表示(V) │ デバッグ(D) │ ツール(T) │ 設定(S) │ ウィンドウ(W) │ ヘルプ(H)│  │
│ └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│ ┌── PracticeToolbar ──────────────────────────────────────────────── [ 🔍 検索... Aa .* ] ──┐  │
│ │ 📄 📂 💾 | ▶ ⏸ ⏹ | ↪ ↩ | 🔍 🔎 ⊞ | ✂️ 📋 📌 | ↶ ↷                                   │  │
│ └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│ ┌── GuideBar（レクチャー進行中のみ表示）────────────────────────────────────────────────────┐  │
│ │ [レクチャー] ブラウザ  ステップ 1/3  ✓完了          [レクチャー終了]                      │  │
│ │ パレットの「アプリケーション」から「ブラウザ」を…  💡ヒント   [次へ →]                    │  │
│ │ ████░░░░ (プログレスバー)                                                                 │  │
│ └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                 │
│ ┌─────────────────┐ ┌── FileTabs ──────────────────────────────────────┐ ┌──────────────────┐  │
│ │ ProjectTree     │ │ [デザイン] [デバッグ] | 🏠紹介 ✕ | sub.robot* ✕  │ │  右ペイン        │  │
│ │ (マイ プロジェクト)│ │ | main_1.robot ✕ | info.type ✕                  │ │  (タブ内容依存)  │  │
│ │                 │ ├────────────────────────────────────────────────────┤ │                  │  │
│ │ Local           │ │                                                    │ │  ・intro:        │  │
│ │ └ connector     │ │  タブコンテンツ（activeTab に応じて切替）           │ │    なし（非表示） │  │
│ │   ├ DifyConnector│ │                                                    │ │  ・main1:        │  │
│ │   ├ info.type   │ │  intro  → IntroTab（レクチャー一覧）               │ │    PropertiesPane│  │
│ │   ├ main_1 robot│ │  main1  → RobotView（青ロボット/再利用）           │ │    （青/再利用）  │  │
│ │   └ sub  robot* │ │  sub    → DasWorkflowView（緑ロボット/再利用）     │ │  ・sub:          │  │
│ │ デモ_薬剤部…    │ │           + RecorderView（MockApp/再利用、下部）   │ │    DasStatePane  │  │
│ │ DS データベース  │ │  infotype → TypeEditorTab（info.type属性一覧）    │ │    （緑/再利用）  │  │
│ │ MC (localhost)  │ │                                                    │ │  ・infotype:     │  │
│ │ windows_mc…     │ │                                                    │ │    なし（非表示） │  │
│ │ tmp (mini…)     │ │                                                    │ │                  │  │
│ │                 │ │                                                    │ │                  │  │
│ │ ── パレット ──  │ │                                                    │ │                  │  │
│ │ (DasPalette     │ │                                                    │ │                  │  │
│ │  カタログ表示   │ │                                                    │ │                  │  │
│ │  sub タブの時   │ │                                                    │ │                  │  │
│ │  のみ表示)      │ │                                                    │ │                  │  │
│ └─────────────────┘ └────────────────────────────────────────────────────┘ └──────────────────┘  │
│ ┌── StatusBar ─────────────────────────────────────────────────────────────────────────── 🔴 ┐  │
│ │ 準備が完了しました。                             about:blank                                │  │
│ └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### レクチャーデータモデル（Lecture / LectureStep / done 述語）

#### 実装済みの型（`src/data/lectures.ts`）

```typescript
interface LectureStep {
  id: string
  instruction: string                     // 操作指示文
  done: ((robot: any) => boolean) | null  // 完了判定述語（null = 判定なし）
  hint?: string                           // 詰まったときのヒント
}

interface Lecture {
  id: string
  actionLabel: string       // アクション正式名（DAS_ACTION_LABELS 準拠）
  robotType: 'das' | 'ds'   // 対象ロボット種別
  overview: string           // 概要説明（空文字 = 準備中）
  steps: LectureStep[]       // 操作手順（空配列 = 準備中）
  category: string           // カタログカテゴリ名
}
```

#### 初期 7 本のレクチャー

| ID | アクション名 | 種別 | ステップ数 | 操作対象 |
|---|---|---|---|---|
| `lec-browser` | ブラウザ | 緑 | 3 | sub.robot |
| `lec-click` | クリック | 緑 | 3 | sub.robot |
| `lec-extract` | 値を抽出 | 緑 | 3 | sub.robot |
| `lec-entertext` | テキストを入力 | 緑 | 3 | sub.robot |
| `lec-foreach` | 要素の繰り返し | 緑 | 3 | sub.robot |
| `lec-guardedchoice` | ガード チョイス | 緑 | 4 | sub.robot |
| `lec-callrobot` | ロボットを呼び出す | 青 | 3 | main_1.robot |

加えて `LECTURES_COMING_SOON`（11 件）が準備中として宣言済み。UI では一覧に名前を出し「準備中」バッジを表示する。

#### done 述語の形骸化防止方針

done 述語の設計原則は「段階的に厳しくなる判定」:

1. **ステップ s1**: 当該アクション型のステップがロボットに存在するか（`hasDasTopStep(robot, 'Browser')`）。パレットからの追加を検出する最低限のゲート
2. **ステップ s2**: s1 の前提に加え、特定フィールドが設定されているか（例: `browserAction === 'pageLoad'`）。カードを展開して設定を行ったことを検出
3. **ステップ s3**: s2 の前提に加え、さらに別のフィールドが設定されているか（例: `url.trim().length > 0`）。複数フィールドの設定完了を検出

この段階構造により「1 ステップ目で追加しただけで全部のチェックが通ってしまう」形骸化を防ぐ。テストファイル `practice.test.ts`（66 件）で空ロボットでの false → 設定後の true を全述語で網羅検証済み。

done が `null` のステップ（例: ガードチョイスの s2「展開して確認」）は UI 確認のみの説明ステップで、`checkLectureStep` は常に `true` を返す。

---

### コンポーネント分割と既存再利用マップ

#### 新規作成済みコンポーネント（`src/components/practice/`）

| コンポーネント | 役割 | 実装状態 |
|---|---|---|
| `MenuBar.tsx` | DS シェルのメニューバー。ファイル/編集/表示/デバッグ/ツール/設定/ウィンドウ/ヘルプ。大半 disabled、「ゲームに戻る」のみ有効 | 完了 |
| `PracticeToolbar.tsx` | アイコンツールバー。新規/保存/実行系/ズーム/クリップボード/元に戻す。実行系は「練習編では実行できません」をステータスバーに表示。右端に検索ボックス | 完了 |
| `ProjectTree.tsx` | 「マイ プロジェクト」ツリー。`PRACTICE_TREE` を再帰描画。展開/折りたたみ、ダブルクリックでタブを開く | 完了 |
| `FileTabs.tsx` | ファイルタブバー。デザイン/デバッグ切替 + 紹介/sub.robot*/main_1.robot/info.type。タブ閉じ・再オープン対応 | 完了 |
| `IntroTab.tsx` | 紹介タブ = レクチャー一覧。`LECTURES` + `LECTURES_COMING_SOON` をカテゴリ別に表示。「▶ レクチャーを開始」ボタンで開始 | 完了 |
| `TypeEditorTab.tsx` | info.type タブ。`INFO_TYPE_ATTRIBUTES` を表形式で読み取り表示 | 完了 |
| `GuideBar.tsx` | レクチャー進行中に表示されるガイドバー。手順指示 + 完了チェックマーク + 次へボタン + プログレスバー | 完了 |
| `StatusBar.tsx` | 最下部ステータスバー。flash() メソッドを ref で公開。メッセージのトースト表示 | 完了 |

#### 未作成コンポーネント（設計として規定）

| コンポーネント | 役割 | 備考 |
|---|---|---|
| `PracticeStudio.tsx` | Practice Studio 全体のシェル統合コンポーネント。上記 8 コンポーネント + 既存再利用コンポーネント群を組み合わせ、レクチャーエンジンの状態管理（現在レクチャー / 現在ステップ / done 判定のポーリング）を持つ。App.tsx の `screen === 'practice'` 分岐で描画される | 未作成 |

#### 既存コンポーネントの再利用

| 既存コンポーネント | 再利用箇所 | 再利用方法 |
|---|---|---|
| `RobotView.tsx` | main_1.robot タブ（青ロボットエディタ） | props で `robot` を渡す。robotStore ではなく practice ローカル状態から供給 |
| `PropertiesPane.tsx` | main_1.robot タブの右ペイン（青ロボットプロパティ） | 同上。CallRobot の「開く」ボタンで sub タブへ遷移する導線を追加 |
| `DasWorkflowView.tsx` | sub.robot タブ（緑ロボットエディタ） | dasRobotStore を直接参照。空ロボット初期状態から自由にステップ追加可能 |
| `RecorderView.tsx` | sub.robot タブの下部（模擬アプリ画面） | レクチャー用 MockApp（簡易版、静的 widgets）を props で渡す。ミッション用の tick タイムラインは不要 |
| `DasPalette.tsx` | 左ペイン下部（sub タブ選択時のみ表示） | そのまま再利用。カタログ表示でステップ追加 |
| `DasStatePane.tsx` | sub タブの右ペイン | そのまま再利用。変数一覧表示 |

**再利用上の課題と解決策**: `RobotView` と `PropertiesPane` は `robotStore` に直接依存している。Practice Studio では practice ローカルの Robot 状態（`createMain1Robot()` の結果）を使いたい。解決策は以下 2 つを検討し、案 2 を採用（後述のアーキテクチャ判断参照）。

---

### 状態管理（practice が既存ストア / 進捗を汚染しない設計）

#### 基本方針

Practice Studio は既存の `gameStore`（ミッション進捗）・`robotStore`（青ロボット状態）・`dasRobotStore`（緑ロボット状態）に対して**書き込み汚染をしない**設計とする。

| ストア | Practice Studio からの操作 | 汚染回避の方法 |
|---|---|---|
| `gameStore` | `screen: 'practice'` への遷移（`goPractice()`）と `goHome()` への復帰のみ | 実装済み。`currentMissionId` / `completedMissions` / `phase` には一切触れない |
| `robotStore` | main_1.robot タブで青ロボットの表示に使う可能性あり | **直接使わない**。PracticeStudio 内のローカル state に `createMain1Robot()` のスナップショットを保持し、RobotView / PropertiesPane にはそこから props で供給する（案 2 採用） |
| `dasRobotStore` | sub.robot タブで緑ロボットのステップ追加に使う | **レクチャー開始時に `loadMission` 相当で空ロボットをロード**する。レクチャー終了時にリセット。ただし dasRobotStore はミッション状態と共用のため、practice ⇔ play 切替時に状態が混ざるリスクがある。これは practice 開始時に必ず `createSubRobot()` で初期化することで回避する |
| `localStorage` | 一切書き込まない | Practice Studio にはプレイヤー進捗の永続化がない（レクチャーの「どこまでやったか」は永続化しない。都度やり直し前提） |

#### レクチャーエンジンの状態（PracticeStudio ローカル state）

```typescript
// PracticeStudio.tsx 内の useState 群
const [activeLectureId, setActiveLectureId] = useState<string | null>(null)
const [lectureStepIndex, setLectureStepIndex] = useState(0)
const [activeTabId, setActiveTabId] = useState<PracticeTabId>('intro')
const [openTabs, setOpenTabs] = useState<PracticeTab[]>(DEFAULT_PRACTICE_TABS)
const [main1Robot, setMain1Robot] = useState<Robot>(() => createMain1Robot())
const [designMode, setDesignMode] = useState<'デザイン' | 'デバッグ'>('デザイン')
```

レクチャー進行状態は全て PracticeStudio のローカル state。コンポーネントがアンマウントされれば消える（永続化不要）。

#### done 述語のポーリング

レクチャー進行中、GuideBar の `isDone` を更新するために done 述語を定期的に評価する必要がある。

```typescript
// PracticeStudio.tsx 内
const currentLecture = activeLectureId ? getLecture(activeLectureId) : null
const currentStep = currentLecture?.steps[lectureStepIndex]

// 緑ロボットの場合: dasRobotStore から最新の robot を取得
const dasRobot = useDasRobotStore((s) => s.robot)
// 青ロボットの場合: main1Robot ローカル state を使用
const targetRobot = currentLecture?.robotType === 'das' ? dasRobot : main1Robot

const isDone = currentStep
  ? checkLectureStep(currentStep, targetRobot)
  : false
```

done 述語は `useDasRobotStore` の selector が robot 変更時に自動で再レンダリングをトリガーするため、明示的なポーリング（setInterval）は不要。React の通常のリアクティブフローで done 判定が自動更新される。

---

### 代替案比較

#### 比較 1: Practice Studio のシェル実装方式

| 案 | メリット | デメリット |
|---|---|---|
| **案 1: 既存 App.tsx レイアウトの拡張**（screen='practice' 分岐を App.tsx 内に直接追加） | ファイル数が増えない。App.tsx 内で screen 分岐するだけ | App.tsx が既に 200 行超で、practice 用のレクチャーエンジン状態・タブ管理・ロボット切替ロジックが追加されると 400 行以上に膨れる。既存の play / home の分岐と practice の分岐が混ざって可読性が大幅低下 |
| **案 2: PracticeStudio を専用コンポーネントとして新規作成（採用）** | Practice Studio のレイアウト・レクチャーエンジン・タブ管理が 1 ファイルに閉じ込められる。App.tsx は `screen === 'practice' ? <PracticeStudio /> : ...` の 1 行分岐のみ追加 | 新規ファイルが 1 つ増える。ただし PracticeStudio は 8 つの practice/ コンポーネント + 再利用コンポーネントの統合点であり、コンポーネント設計として自然 |

**採用: 案 2**。理由: DasWorkspaceLayout が緑ロボット専用レイアウトとして独立しているのと同じパターン。Practice Studio は「ミッション」ではなく「自由練習」という異なるモードのため、独立したシェルコンポーネントとして設計するのが適切。App.tsx は `screen` ごとに 1 コンポーネントを描画するだけのルーターに留まる。

#### 比較 2: 青ロボット（RobotView / PropertiesPane）の状態供給方式

| 案 | メリット | デメリット |
|---|---|---|
| **案 1: robotStore をそのまま使う**（practice 開始時に `robotStore.loadRobot(createMain1Robot())` を呼ぶ） | 既存コンポーネントを無修正で再利用。RobotView / PropertiesPane は robotStore から自動取得 | **汚染リスク**: practice モードで robotStore を書き換えると、play モードに戻ったときにミッションの Robot 状態が上書きされる。`startMission` で再ロードされるとはいえ、中断・直帰時に汚染が残る。また robotStore の `loadMission` は Mission 前提の初期化ロジックを含み、Practice 用途と合わない |
| **案 2: PracticeStudio ローカル state + props 供給（採用）** | robotStore を一切汚染しない。PracticeStudio 内で `useState<Robot>(createMain1Robot())` を持ち、RobotView / PropertiesPane には `robot` / `selectedStepId` 等を props で渡す | RobotView / PropertiesPane が現在 `useRobotStore()` を直接呼んでいるため、**props 対応の修正が必要**。ただし修正は「store 直接参照」を「props 優先、なければ store fallback」に変えるだけで、既存の play モードには影響しない |

**採用: 案 2**。理由: 汚染回避が最優先。practice で robotStore を書き換えるのは設計として不健全。RobotView / PropertiesPane を props 対応にする変更量は中程度だが、一度やれば将来的にテスト用途（Storybook 等）でも活きる。代替として RobotView / PropertiesPane を「ストア依存版」と「props 版」に分けるラッパー方式も考えられるが、ラッパーの方が複雑になるため直接 props 対応を採用する。

#### 比較 3: レクチャー完了判定の方式

| 案 | メリット | デメリット |
|---|---|---|
| **案 1: ロボット状態述語（採用）** — done 関数が `(robot: DasRobot | Robot) => boolean` でロボット状態を直接検査 | 純粋関数で決定的。テストが容易（`practice.test.ts` の 66 件で実証済み）。UI イベントの取りこぼしがない | ロボット状態だけでは判定できない操作（「タブを切り替えた」「カードを展開した」等の UI 操作）を検出できない。そのようなステップは `done: null`（常に完了扱い）にする必要がある |
| **案 2: UI イベントフック** — done 判定を「ユーザーがボタンをクリックした」「ドロップダウンを変更した」等の DOM イベントで検出 | タブ切替・カード展開・ドロップダウン操作など、ロボット状態に反映されない UI 操作も正確に検出できる | テストが困難（DOM イベントの再現が必要）。イベントハンドラの配線が各コンポーネントに散在し、コンポーネントがレクチャーエンジンに強く結合する。イベントの取りこぼし（race condition）が発生しやすい |

**採用: 案 1**。理由: 教育ゲームとして重要なのは「正しいロボット構成が組めたか」であり、「どの UI 操作をしたか」ではない。ロボット状態述語は純粋関数であり、`practice.test.ts` で 66 件のテストが既に通っている。UI 確認のみのステップ（「展開して確認してください」等）は `done: null` にして `checkLectureStep` が常に `true` を返すことで対応済み。この判断により、Practice Studio のコンポーネント群はレクチャーエンジンを一切意識する必要がなく、疎結合が保たれる。

---

### 影響範囲分析

| 領域 | 影響内容 | リスク |
|---|---|---|
| `src/app/App.tsx` | `screen === 'practice'` 分岐を追加し `<PracticeStudio />` を描画（~3 行追加） | Low |
| `src/store/gameStore.ts` | `Screen` 型に `'practice'` 追加済み。`goPractice()` アクション追加済み。**変更不要**（実装完了） | Low |
| `src/data/practice.ts` | シードデータ（PRACTICE_TREE / DEFAULT_PRACTICE_TABS / createMain1Robot / createSubRobot / INFO_TYPE_ATTRIBUTES）。**変更不要**（実装完了） | Low |
| `src/data/lectures.ts` | レクチャー定義（LECTURES 7 本 + LECTURES_COMING_SOON 11 件 + ヘルパー関数群）。**変更不要**（実装完了） | Low |
| `src/data/practice.test.ts` | 66 件のユニットテスト。**変更不要**（実装完了・全件パス） | Low |
| `src/model/robot.ts` | `CallRobot` アクション型追加済み。**変更不要**（実装完了） | Low |
| `src/components/practice/` 8 ファイル | MenuBar / PracticeToolbar / ProjectTree / FileTabs / IntroTab / TypeEditorTab / GuideBar / StatusBar。**変更不要**（実装完了） | Low |
| `src/components/practice/PracticeStudio.tsx` | **新規作成が必要**。8 コンポーネント + 再利用コンポーネントの統合。レクチャーエンジン状態管理 | **Med**: 最大の実装タスク。タブ切替・レクチャー状態・ロボット初期化の統合 |
| `src/components/ds/RobotView.tsx` | props 対応の変更（store 直接参照 → props 優先 fallback）。Practice Studio で main_1.robot を表示するために必要 | Med: 既存 play モードへの影響なしを確認する必要あり |
| `src/components/ds/PropertiesPane.tsx` | 同上。加えて CallRobot の「開く」ボタンで sub タブへ遷移するコールバック props の追加 | Med |
| `src/components/das/DasWorkflowView.tsx` | **変更不要**。dasRobotStore を直接参照しており、Practice Studio では dasRobotStore に sub.robot を直接ロードして使う | Low |
| `src/components/das/DasPalette.tsx` | **変更不要**。dasRobotStore の `addStep` を直接呼ぶ | Low |
| `src/components/das/RecorderView.tsx` | Practice Studio 用の簡易 MockApp（静的 widgets）を渡す必要あり。既存 props で対応可能（MockApp は既に props 受け取り） | Low |
| `src/components/das/DasStatePane.tsx` | **変更不要** | Low |
| `src/store/dasRobotStore.ts` | Practice Studio 開始時に `createSubRobot()` で初期化。既存の `loadMission` とは別の初期化パスが必要か検討 → `loadMission` は Mission 前提なので、practice 用には dasRobotStore に `loadPracticeRobot(robot: DasRobot)` を追加するか、直接 `set({ robot: createSubRobot(), ... })` を呼ぶ | Low-Med |
| `src/components/game/HomeScreen.tsx` | 「実機練習編」ボタンの追加（`goPractice()` を呼ぶ導線）。実装済みかどうかは未確認、未実装なら追加が必要 | Low |
| 既存 M1-M5 / D1-D5 のミッション動作 | **影響なし**。Practice Studio は独立した screen で、ミッション系のストア・コンポーネントに書き込まない | Low |
| 既存テスト（87 件 + practice 66 件 = 153 件） | Practice Studio の統合テストは PracticeStudio.tsx 新規作成後に追加検討。既存テストは全件パスを維持 | Low |

---

### docs/ への波及

前回設計・前々回設計と同じく `docs/` 未整備のため更新不要。

---

### 未確定事項

1. **HomeScreen に「実機練習編」ボタンが実装済みかどうか**: 実装済みなら変更不要。未実装なら `goPractice()` を呼ぶボタンを相談ボード上に追加する（DasWorkspaceLayout の health rules ボタンと同程度の軽微変更）
2. **dasRobotStore の practice 用初期化メソッド**: `loadMission` は Mission を引数に取るため Practice には合わない。`set()` 直接呼び出しで対応するか、`loadPracticeRobot()` を新設するかは実装時に判断可能
3. **RobotView / PropertiesPane の props 対応**: 変更方針は「store 直接参照を props 優先 fallback に変更」だが、具体的な props インターフェースは実装時に確定してよい。既存の play モードでは props を渡さずに従来通り store から取得する fallback パターン
4. **RecorderView に渡す Practice 用 MockApp**: レクチャーではシミュレーション実行をしないため、静的な widgets のみの簡易 MockApp で十分。空の `{ id: 'practice', windowTitle: '', widgets: [], timeline: [] }` でよいか、より意味のあるサンプルを入れるかは実装時に判断可能
