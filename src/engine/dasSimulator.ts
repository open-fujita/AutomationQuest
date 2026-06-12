// ============================================================
// DAS シミュレータ — 緑ロボット（Desktop Automation）を模擬アプリに対して実行する。
//
// 実行モデル（公式仕様準拠）:
//   ・前方移動のみ（バックトラックなし）
//   ・ガードチョイス: 複数ガードを並行監視 → 最初成立ガードの枝を排他実行
//   ・For Each: スコープファインダーで起点特定 → 相対セレクタで各子を反復
//   ・Loop/Break/Continue: 内部フラグで制御
//   ・Throw: 例外を送出して上位に伝播
//   ・Return: ロボットを正常終了
//   ・tick 駆動・純粋関数・シード乱数（決定的）
//
// 2026.1 リワーク:
//   ・execOpenWindow → execWindows / execBrowser に分割
//   ・execThrow / execReturn 追加
//   ・Assign / TryCatch / WhileLoop は disabled ステップとして skip（UI 表示のみ）
// ============================================================

import type { DasRobot, DasStep, DasAction, Guard, GuardType, DasFinder } from '../model/dasRobot'
import type { MockApp, AppWidget } from '../model/mockApp'
import { applyTimeline, findWidget } from '../model/mockApp'
import type { SimRecord } from '../model/sim'

// ---- 公開型定義 -----------------------------------------------

export interface DasSimOptions {
  /** シミュレーション最大 tick（既定 120） */
  maxTick?: number
  /** Timeout ガードの既定秒数（既定 60 秒 = 60 tick） */
  defaultTimeoutTick?: number
  /** シード値（ガードの成立 tick に影響しない。MockApp タイムラインで制御） */
  seed?: number
}

export interface DasSimLogEntry {
  stepId: string
  stepName: string
  status: 'ok' | 'skip' | 'error' | 'guard-waiting' | 'guard-matched'
  /** ガード待機/成立の可視化文字列（例: '⏳待機(3tick)→✓locationFound 成立'） */
  message: string
  tick?: number
}

/** For Each ステップ 1 回の実行統計 */
export interface ForEachRunRecord {
  stepId: string
  stepName: string
  /** scopeFinder がウィジェットとして解決できたか */
  scopeMatched: boolean
  /** 反復した要素数（scopeMatched=false のとき 0） */
  iterations: number
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
  /** For Each ステップごとの実行統計（未実行の場合は空配列） */
  forEachRuns: ForEachRunRecord[]
}

export const EMPTY_DAS_SIM: DasSimResult = {
  ran: false,
  data: {},
  log: [],
  errors: [],
  totalTick: 0,
  guardResults: [],
  forEachRuns: [],
}

// ---- 内部状態 -------------------------------------------------

/** Throw によって送出される例外（ロジック制御用） */
class DasThrowSignal {
  constructor(public readonly exception: string) {}
}

/** Return によって正常終了を伝えるシグナル */
class DasReturnSignal {}

interface SimState {
  app: MockApp
  opts: Required<DasSimOptions>
  data: Record<string, SimRecord[]>
  log: DasSimLogEntry[]
  errors: string[]
  guardResults: { stepId: string; winnerGuardType: GuardType; tick: number }[]
  forEachRuns: ForEachRunRecord[]
  currentTick: number
  /** For Each の反復中の現在ウィジェット（ネスト対応スタック） */
  forEachStack: { scopeWidget: AppWidget; currentElement: AppWidget }[]
  /** Loop 制御フラグ */
  breakFlag: boolean
  continueFlag: boolean
}

// ---- 公開 API -------------------------------------------------

/**
 * 緑ロボットを模擬アプリに対して実行する（純粋関数）。
 *
 * 実行モデル:
 *   - 前方移動のみ（バックトラックなし）
 *   - ガードチョイス: 並行監視 → 最初成立ガードの枝を排他実行
 *   - For Each: スコープファインダーで起点を特定 → 相対セレクタで各子を反復
 *   - Loop/Break/Continue: 内部フラグで制御
 *   - Throw: 例外を送出（DasThrowSignal をスロー）
 *   - Return: 正常終了（DasReturnSignal をスロー）
 */
export function runDasRobot(
  robot: DasRobot,
  app: MockApp,
  opts?: DasSimOptions,
): DasSimResult {
  const resolvedOpts: Required<DasSimOptions> = {
    maxTick: opts?.maxTick ?? 120,
    defaultTimeoutTick: opts?.defaultTimeoutTick ?? 60,
    seed: opts?.seed ?? 0,
  }

  const state: SimState = {
    app,
    opts: resolvedOpts,
    data: {},
    log: [],
    errors: [],
    guardResults: [],
    forEachRuns: [],
    currentTick: 0,
    forEachStack: [],
    breakFlag: false,
    continueFlag: false,
  }

  try {
    execSteps(state, robot.steps)
  } catch (e) {
    if (e instanceof DasReturnSignal) {
      // Return による正常終了 — エラーなし
    } else if (e instanceof DasThrowSignal) {
      const msg = `未キャッチの例外: ${e.exception}`
      state.errors.push(msg)
      state.log.push({
        stepId: 'sim-throw',
        stepName: 'シミュレーター',
        status: 'error',
        message: msg,
      })
    } else {
      const msg = e instanceof Error ? e.message : String(e)
      state.errors.push(`シミュレーション例外: ${msg}`)
      state.log.push({
        stepId: 'sim-error',
        stepName: 'シミュレーター',
        status: 'error',
        message: `致命的エラー: ${msg}`,
      })
    }
  }

  return {
    ran: true,
    data: state.data,
    log: state.log,
    errors: state.errors,
    totalTick: state.currentTick,
    guardResults: state.guardResults,
    forEachRuns: state.forEachRuns,
  }
}

// ---- ステップ実行（再帰）--------------------------------------

/**
 * ステップ列を順に実行する。Break/Continue フラグが立ったら即座に戻る。
 * DasThrowSignal / DasReturnSignal は呼び出し元に伝播する。
 */
function execSteps(state: SimState, steps: DasStep[]): void {
  for (const step of steps) {
    if (!step.enabled) {
      state.log.push({
        stepId: step.id,
        stepName: step.name,
        status: 'skip',
        message: '無効化されたステップをスキップ',
      })
      continue
    }
    execStep(state, step)
    if (state.breakFlag || state.continueFlag) return
    if (state.currentTick >= state.opts.maxTick) {
      state.errors.push('最大 tick 数を超過しました（暴走防止）')
      return
    }
  }
}

function execStep(state: SimState, step: DasStep): void {
  const action = step.action

  switch (action.type) {
    case 'Windows':
      execWindows(state, step, action)
      break

    case 'Browser':
      execBrowser(state, step, action)
      break

    case 'Click':
      execClick(state, step, action)
      break

    case 'ExtractValue':
      execExtractValue(state, step, action)
      break

    case 'EnterText':
      execEnterText(state, step, action)
      break

    case 'GuardedChoice':
      execGuardedChoice(state, step, action)
      break

    case 'ForEach':
      execForEach(state, step, action)
      break

    case 'Loop':
      execLoop(state, step, action)
      break

    case 'Break':
      state.breakFlag = true
      state.log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: 'ブレイク: ループを終了します' })
      break

    case 'Continue':
      state.continueFlag = true
      state.log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: 'コンテニュー: 次の反復へスキップします' })
      break

    case 'Condition':
      execCondition(state, step, action)
      break

    case 'Group':
      state.log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `グループ「${action.name}」開始` })
      execSteps(state, action.steps)
      break

    case 'Return':
      execReturn(state, step)
      break

    case 'Throw':
      execThrow(state, step, action)
      break

    // Assign / TryCatch / WhileLoop は UI 表示のみ（skip）
    case 'Assign':
    case 'TryCatch':
    case 'WhileLoop':
      state.log.push({
        stepId: step.id,
        stepName: step.name,
        status: 'skip',
        message: `「${action.type}」は研修ラボでは未実装のためスキップします`,
      })
      break
  }
}

// ---- Windows（デスクトップアプリ起動）-------------------------

function execWindows(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'Windows' }>): void {
  const widgets = applyTimeline(state.app, state.currentTick)
  // executable がアプリのウィンドウタイトルまたは name に一致するか確認
  const rootWindow = widgets.find(
    (w) => w.type === 'window' &&
           w.visible &&
           (w.attrs['title'] === action.executable ||
            w.attrs['name'] === action.executable ||
            // アプリ名（拡張子なし）でも一致を確認
            w.attrs['title']?.includes(action.executable) ||
            action.executable === ''),
  )

  if (rootWindow || action.executable.trim() === '') {
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'ok',
      message: `Windows: 「${action.executable}」を実行しました（デバイス: ${action.device || 'local'}）`,
      tick: state.currentTick,
    })
  } else {
    // ウィンドウが見つからなくても「起動試行」として ok ログ（実機と同じ: 起動コマンドは失敗しない）
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'ok',
      message: `Windows: 「${action.executable}」の起動コマンドを送信しました`,
      tick: state.currentTick,
    })
  }
  state.currentTick += 1
}

// ---- Browser（組み込みブラウザ）------------------------------

function execBrowser(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'Browser' }>): void {
  const actionLabel =
    action.browserAction === 'pageLoad' ? 'ページ読込' :
    action.browserAction === 'pageCreate' ? 'ページ生成' :
    'ダウンロードを待機'

  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'ok',
    message: `ブラウザ（${action.browser}）: ${actionLabel}「${action.url || action.applicationName}」`,
    tick: state.currentTick,
  })
  state.currentTick += 1
}

// ---- Return（正常終了）----------------------------------------

function execReturn(state: SimState, step: DasStep): void {
  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'ok',
    message: 'リターン: ロボットを正常終了します',
    tick: state.currentTick,
  })
  throw new DasReturnSignal()
}

// ---- Throw（例外送出）-----------------------------------------

function execThrow(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'Throw' }>): void {
  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'error',
    message: `スロー: 例外「${action.exception}」を送出します`,
    tick: state.currentTick,
  })
  throw new DasThrowSignal(action.exception)
}

// ---- Click ----------------------------------------------------

function execClick(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'Click' }>): void {
  const widgets = applyTimeline(state.app, state.currentTick)
  const target = resolveWidget(state, widgets, action.finder)

  if (!target) {
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'error',
      message: `クリック対象が見つかりません: ${action.finder.selector}`,
      tick: state.currentTick,
    })
    state.errors.push(`クリック対象が見つかりません: ${action.finder.selector}`)
  } else if (target.enabled === false) {
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'error',
      message: `クリック対象が無効化されています: ${target.attrs['name'] ?? target.id}`,
      tick: state.currentTick,
    })
    state.errors.push(`クリック対象が無効化されています: ${target.attrs['name'] ?? target.id}`)
  } else {
    const clickLabel = action.clickCount === 2 ? 'ダブルクリック' : 'クリック'
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'ok',
      message: `${clickLabel}: 「${target.attrs['name'] ?? target.id}」`,
      tick: state.currentTick,
    })
  }
  state.currentTick += 1
}

// ---- ExtractValue ---------------------------------------------

function execExtractValue(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'ExtractValue' }>): void {
  const widgets = applyTimeline(state.app, state.currentTick)
  const target = resolveWidget(state, widgets, action.finder)

  if (!target) {
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'error',
      message: `抽出対象が見つかりません: ${action.finder.selector}`,
      tick: state.currentTick,
    })
    state.errors.push(`抽出対象が見つかりません: ${action.finder.selector}`)
    state.currentTick += 1
    return
  }

  // 座標固定セレクタかどうか判定（D5 の失敗体験用）
  const isCoordinate = isCoordinateSelector(action.finder.selector)

  // 値の取得: attribute 名でウィジェットから値を取り出す
  let value: string
  if (isCoordinate) {
    // 座標固定: 列が入れ替わっていると意図しないセルの値になる
    value = target.text ?? target.attrs[action.attribute] ?? ''
  } else {
    value = target.attrs[action.attribute] ?? target.text ?? ''
  }

  // 変数に格納
  if (!state.data[action.toVariable]) state.data[action.toVariable] = []
  const recIdx = state.data[action.toVariable].length
  state.data[action.toVariable].push({ [action.attribute]: value })

  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'ok',
    message: `値を抽出: ${action.toVariable}[${recIdx}].${action.attribute} = "${value}"${isCoordinate ? ' ⚠️座標固定' : ''}`,
    tick: state.currentTick,
  })
  state.currentTick += 1
}

/** 座標固定セレクタの判定（'[x="..."]' or '[y="..."]' を含む） */
function isCoordinateSelector(selector: string): boolean {
  return /\[x="|y="/.test(selector)
}

// ---- EnterText ------------------------------------------------

function execEnterText(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'EnterText' }>): void {
  const widgets = applyTimeline(state.app, state.currentTick)
  const target = resolveWidget(state, widgets, action.finder)
  const text = action.fromVariable
    ? state.data[action.fromVariable]?.[0]?.[action.fromAttribute ?? ''] ?? ''
    : action.text

  if (!target) {
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'error',
      message: `入力対象が見つかりません: ${action.finder.selector}`,
      tick: state.currentTick,
    })
    state.errors.push(`入力対象が見つかりません: ${action.finder.selector}`)
  } else {
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'ok',
      message: `テキストを入力: 「${text}」→ ${target.attrs['name'] ?? target.id}`,
      tick: state.currentTick,
    })
  }
  state.currentTick += 1
}

// ---- GuardedChoice -------------------------------------------

/**
 * ガードチョイス実行アルゴリズム:
 * 1. currentTick から始め、各 tick で全ガードの成立条件を並行評価
 * 2. 最初に成立したガードの枝 steps を実行し、残りのガードは評価対象外（排他実行）
 * 3. timeout ガードは currentTick + guard.seconds tick で成立
 * 4. locationFound は findWidget() が undefined でないとき成立
 * 5. applicationFound は root window が可視かつタイトルが一致するとき成立
 */
function execGuardedChoice(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'GuardedChoice' }>): void {
  if (action.guards.length === 0) {
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'error',
      message: 'ガードが設定されていません',
    })
    state.errors.push('ガードチョイス: ガードが設定されていません')
    return
  }

  const startTick = state.currentTick
  const maxEvalTick = state.opts.maxTick

  // timeout ガードの成立 tick を事前計算（相対）
  const timeoutTicks: number[] = action.guards.map((g) => {
    if (g.type === 'timeout') {
      return startTick + (g.seconds ?? state.opts.defaultTimeoutTick)
    }
    return Infinity
  })

  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'guard-waiting',
    message: `ガード チョイス: ${action.guards.map((g) => g.type).join(' / ')} を並行監視中…`,
    tick: startTick,
  })

  let winnerIndex = -1
  let winnerTick = -1

  for (let tick = startTick; tick <= maxEvalTick; tick++) {
    const widgets = applyTimeline(state.app, tick)

    for (let i = 0; i < action.guards.length; i++) {
      const guard = action.guards[i]
      if (evaluateGuard(guard, widgets, state.app, tick, timeoutTicks[i])) {
        winnerIndex = i
        winnerTick = tick
        break
      }
    }

    if (winnerIndex >= 0) break
  }

  if (winnerIndex < 0) {
    // maxTick を超えても成立しなかった
    state.errors.push('ガードチョイス: 最大 tick 内にガードが成立しませんでした')
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'error',
      message: `ガード チョイス: ${state.opts.maxTick} tick 以内にガードが成立しませんでした`,
      tick: state.currentTick,
    })
    state.currentTick = state.opts.maxTick
    return
  }

  const winner = action.guards[winnerIndex]
  const waitedTick = winnerTick - startTick

  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'guard-matched',
    message: `⏳待機(${waitedTick}tick)→✓${winner.type} 成立（tick=${winnerTick}）`,
    tick: winnerTick,
  })

  state.guardResults.push({
    stepId: step.id,
    winnerGuardType: winner.type,
    tick: winnerTick,
  })

  state.currentTick = winnerTick + 1

  // 成立したガードの枝ステップを実行（排他実行）
  execSteps(state, winner.steps)
}

/** ガードが指定 tick で成立するか判定する */
function evaluateGuard(
  guard: Guard,
  widgets: AppWidget[],
  app: MockApp,
  tick: number,
  timeoutTick: number,
): boolean {
  switch (guard.type) {
    case 'timeout':
      return tick >= timeoutTick

    case 'locationFound':
      if (!guard.finder) return false
      return findWidget(widgets, guard.finder.selector) !== undefined

    case 'locationNotFound':
      if (!guard.finder) return true
      return findWidget(widgets, guard.finder.selector) === undefined

    case 'locationRemoved':
      // 初期状態に存在して、tick 時点で消えている場合に成立
      if (!guard.finder) return false
      {
        const initialWidgets = applyTimeline(app, 0)
        const wasPresent = findWidget(initialWidgets, guard.finder.selector) !== undefined
        const nowAbsent = findWidget(widgets, guard.finder.selector) === undefined
        return wasPresent && nowAbsent
      }

    case 'applicationFound':
      // タイトルバーを持つウィンドウウィジェットが可視の場合に成立
      if (!guard.finder) {
        return widgets.some((w) => w.type === 'window' && w.visible)
      }
      {
        const found = findWidget(widgets, guard.finder.selector)
        return found !== undefined && found.visible
      }

    case 'applicationNotFound':
      if (!guard.finder) {
        return !widgets.some((w) => w.type === 'window' && w.visible)
      }
      {
        const found = findWidget(widgets, guard.finder.selector)
        return found === undefined || !found.visible
      }

    case 'treeStoppedChanging': {
      // 指定ミリ秒（tick に換算: ms / 1000 tick）の間ツリーが変化しない
      const stableTickCount = Math.max(1, Math.floor((guard.ms ?? 500) / 1000))
      if (tick < stableTickCount) return false
      // 直前 stableTickCount tick でイベントが無ければ成立
      const hasRecentEvent = app.timeline.some(
        (ev) => ev.tick > tick - stableTickCount && ev.tick <= tick,
      )
      return !hasRecentEvent
    }

    default:
      return false
  }
}

// ---- ForEach --------------------------------------------------

/**
 * For Each 実行アルゴリズム:
 * 1. scopeFinder で起点ウィジェットを特定（scope として保持）
 * 2. elementFinder.selector を相対セレクタとして scope の子孫から検索
 * 3. 見つかった各ウィジェットを反復: body ステップを実行
 */
function execForEach(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'ForEach' }>): void {
  const widgets = applyTimeline(state.app, state.currentTick)

  // スコープファインダーで起点ウィジェットを特定
  const scopeWidget = findWidget(widgets, action.scopeFinder.selector)
  if (!scopeWidget) {
    // スコープ解決失敗として記録
    state.forEachRuns.push({
      stepId: step.id,
      stepName: step.name,
      scopeMatched: false,
      iterations: 0,
    })
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'error',
      message: `スコープファインダーが見つかりません: ${action.scopeFinder.selector}`,
      tick: state.currentTick,
    })
    state.errors.push(`要素の繰り返し: スコープファインダーが見つかりません: ${action.scopeFinder.selector}`)
    state.currentTick += 1
    return
  }

  // エレメントファインダー（相対セレクタ）で反復対象を取得
  // 現在の tick での状態で全子孫を収集（'> ' 相対セレクタ対応）
  const elements = collectElements(widgets, action.elementFinder.selector, scopeWidget)

  if (elements.length === 0) {
    // スコープは解決できたが反復対象が 0 件
    state.forEachRuns.push({
      stepId: step.id,
      stepName: step.name,
      scopeMatched: true,
      iterations: 0,
    })
    state.log.push({
      stepId: step.id,
      stepName: step.name,
      status: 'ok',
      message: `要素の繰り返し: 反復対象が 0 件（エレメントファインダー: ${action.elementFinder.selector}）`,
      tick: state.currentTick,
    })
    state.currentTick += 1
    return
  }

  // excludeFirst: 最初の要素をスキップ（□最初を除外 チェックボックス）
  const iterElements = action.excludeFirst ? elements.slice(1) : elements

  // For Each 実行統計を記録（スコープ解決成功 + 実際の反復件数）
  state.forEachRuns.push({
    stepId: step.id,
    stepName: step.name,
    scopeMatched: true,
    iterations: iterElements.length,
  })

  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'ok',
    message: `要素の繰り返し 開始: ${iterElements.length} 件を反復（スコープ: ${action.scopeFinder.selector}${action.excludeFirst ? '、最初を除外' : ''}）`,
    tick: state.currentTick,
  })
  state.currentTick += 1

  // iterationVariable: 各反復のインデックスをシミュレータ変数として記録する
  // （□イテレーション変数 ON のとき、state.data に {index: i} レコードを格納）
  const iterVarName = action.iterationVariable ? (action.iterationVariableName || 'i') : null

  // 各要素を反復
  for (let i = 0; i < iterElements.length; i++) {
    const elem = iterElements[i]
    state.forEachStack.push({ scopeWidget, currentElement: elem })

    // イテレーション変数をシミュレータ状態パネルに記録
    if (iterVarName) {
      if (!state.data[iterVarName]) state.data[iterVarName] = []
      state.data[iterVarName].push({ index: String(i) })
    }

    state.log.push({
      stepId: step.id,
      stepName: `${step.name}[${i + 1}/${iterElements.length}]`,
      status: 'ok',
      message: `反復 ${i + 1}: ${elem.type}[${elem.attrs['name'] ?? elem.id}]${iterVarName ? ` (${iterVarName}=${i})` : ''}`,
      tick: state.currentTick,
    })

    state.continueFlag = false
    execSteps(state, action.body)

    state.forEachStack.pop()

    if (state.breakFlag) {
      state.breakFlag = false
      break
    }
    state.continueFlag = false

    if (state.currentTick >= state.opts.maxTick) break
  }
}

/**
 * スコープウィジェットの子孫からセレクタにマッチする要素を収集する。
 * 相対セレクタ（'> ...'）の場合は scopeWidget の直接の子のみ。
 */
function collectElements(
  _widgets: AppWidget[],
  selector: string,
  scopeWidget: AppWidget,
): AppWidget[] {
  const trimmed = selector.trim()

  if (trimmed.startsWith('>')) {
    // 直接の子のみ
    const rest = trimmed.slice(1).trim()
    return scopeWidget.children.filter((child) => {
      if (!child.visible) return false
      // タグ名のみの単純セレクタ
      if (/^[a-zA-Z_][\w-]*$/.test(rest)) return child.type === rest
      // 属性セレクタ付き
      const dummy = findWidget([child], rest)
      return dummy !== undefined
    })
  }

  // 非相対: scope 配下の全子孫を再帰検索
  const results: AppWidget[] = []
  function recurse(children: AppWidget[]) {
    for (const child of children) {
      if (!child.visible) continue
      const found = findWidget([child], trimmed)
      if (found) results.push(found)
      recurse(child.children)
    }
  }
  recurse(scopeWidget.children)
  return results
}

// ---- Loop -----------------------------------------------------

function execLoop(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'Loop' }>): void {
  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'ok',
    message: 'ループ 開始',
    tick: state.currentTick,
  })

  let guard = 0
  while (state.currentTick < state.opts.maxTick) {
    if (guard++ > 10000) {
      state.errors.push('ループ: 最大反復回数を超過しました（暴走防止）')
      break
    }
    state.continueFlag = false
    execSteps(state, action.body)

    if (state.breakFlag) {
      state.breakFlag = false
      break
    }
    state.continueFlag = false
  }
}

// ---- Condition ------------------------------------------------

function execCondition(state: SimState, step: DasStep, action: Extract<DasAction, { type: 'Condition' }>): void {
  for (const branch of action.branches) {
    // 'true' 条件はデフォルト分岐（必ず実行）
    const condMet = branch.condition === 'true' || evaluateCondition(state, branch.condition)
    if (condMet) {
      state.log.push({
        stepId: step.id,
        stepName: step.name,
        status: 'ok',
        message: `条件分岐: 「${branch.condition}」が成立`,
        tick: state.currentTick,
      })
      execSteps(state, branch.steps)
      return
    }
  }
  state.log.push({
    stepId: step.id,
    stepName: step.name,
    status: 'skip',
    message: '条件分岐: いずれの条件も成立しませんでした',
    tick: state.currentTick,
  })
}

/** 簡易条件評価（教育用: 'true'/'false' 文字列のみ対応） */
function evaluateCondition(_state: SimState, condition: string): boolean {
  return condition.trim().toLowerCase() === 'true'
}

// ---- ファインダー解決 -----------------------------------------

/**
 * DasFinder を解決して対応するウィジェットを返す。
 * For Each 実行中は forEachStack の現在要素を起点（scope）として使う。
 *
 * セレクタ解決の優先順位:
 *   1. セレクタが '>' で始まる場合: scope の直接の子を検索
 *   2. For Each body 内かつ scopeRef が設定されている場合: currentElement 自体にマッチするか確認
 *      → マッチしなければ currentElement の子孫を検索
 *   3. それ以外: 全ツリーを検索
 */
function resolveWidget(
  state: SimState,
  widgets: AppWidget[],
  finder: DasFinder,
): AppWidget | undefined {
  const currentFrame =
    state.forEachStack.length > 0
      ? state.forEachStack[state.forEachStack.length - 1]
      : undefined

  const scope = currentFrame?.currentElement

  // scopeRef が設定されている場合（For Each body 内で currentElement を基点とする）
  // または '>' 始まりの相対セレクタ
  if (scope && (finder.scopeRef || finder.selector.trim().startsWith('>'))) {
    return findWidget(widgets, finder.selector, scope)
  }

  // For Each body 内で、セレクタが currentElement 自体にマッチするか確認
  if (scope) {
    const directMatch = findWidget([scope], finder.selector)
    if (directMatch) return directMatch
  }

  return findWidget(widgets, finder.selector, scope)
}
