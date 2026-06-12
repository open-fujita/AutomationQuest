// ============================================================
// ロボット健康診断エンジン — 「健康なロボットのための10か条」に基づく構造解析
//
// 純粋関数。Robot（青）と DasRobot（緑）の両モデルに対応する。
// 構造的に判定可能な条のみ HealthFinding を返す。
// 判定不能な条（第 2/4/7/8 条、前提条件不成立の条）は返さない。
// ============================================================

import type { Robot, RobotStep, StepAction } from '../model/robot'
import type { DasRobot, DasStep, DasAction } from '../model/dasRobot'
import type { Mission } from '../model/mission'
import type { HealthFinding } from '../model/health'
import { isAnonymous } from './stepStatus'
import { dasIsAnonymous } from './dasStepStatus'

// ---- 閾値 ---------------------------------------------------

/** 教材規模のステップ数閾値（これを超えると第1条 improve） */
const STEP_COUNT_THRESHOLD = 12

// ---- ユーティリティ: 緑ロボットのステップを再帰的にフラット化 ---

/** DasStep のツリーをすべての葉まで再帰的に展開して 1 次元配列に戻す */
function flattenDasSteps(steps: DasStep[]): DasStep[] {
  const result: DasStep[] = []
  for (const step of steps) {
    result.push(step)
    result.push(...flattenDasAction(step.action))
  }
  return result
}

function flattenDasAction(action: DasAction): DasStep[] {
  switch (action.type) {
    case 'GuardedChoice':
      return action.guards.flatMap((g) => flattenDasSteps(g.steps))
    case 'ForEach':
      return flattenDasSteps(action.body)
    case 'Loop':
      return flattenDasSteps(action.body)
    case 'Condition':
      return action.branches.flatMap((b) => flattenDasSteps(b.steps))
    case 'Group':
      return flattenDasSteps(action.steps)
    case 'TryCatch':
      return [
        ...flattenDasSteps(action.trySteps),
        ...action.catches.flatMap((c) => flattenDasSteps(c.steps)),
        ...flattenDasSteps(action.finallySteps),
      ]
    case 'WhileLoop':
      return flattenDasSteps(action.body)
    default:
      return []
  }
}

// ---- 第1条: ステップ数チェック (共通) -------------------------

function checkRule1(stepCount: number): HealthFinding {
  if (stepCount <= STEP_COUNT_THRESHOLD) {
    return {
      ruleId: 'rule-1',
      ruleNumber: 1,
      status: 'good',
      message: `ステップ数 ${stepCount} 件——コンパクトにまとまっていますね！`,
    }
  }
  return {
    ruleId: 'rule-1',
    ruleNumber: 1,
    status: 'improve',
    message: `ステップ数が ${stepCount} 件あります。役割ごとにロボットを分割して、見通しよく保ちましょう。`,
  }
}

// ---- 第3条: 無名ステップチェック (青) -------------------------

function checkRule3Blue(steps: RobotStep[]): HealthFinding {
  // start / end / branch は構造的なステップで命名対象外とする
  const nameable = steps.filter((s) => s.kind !== 'start' && s.kind !== 'end' && s.kind !== 'branch')
  const anonCount = nameable.filter((s) => isAnonymous(s)).length
  if (anonCount === 0) {
    return {
      ruleId: 'rule-3',
      ruleNumber: 3,
      status: 'good',
      message: 'すべてのステップに名前が付いています！初見でも業務の流れが伝わります。',
    }
  }
  return {
    ruleId: 'rule-3',
    ruleNumber: 3,
    status: 'improve',
    message: `「(名前がありません)」のステップが ${anonCount} 件あります。初見でも業務がわかる名前を付けましょう。`,
  }
}

// ---- 第3条: 無名ステップチェック (緑) -------------------------

function checkRule3Das(steps: DasStep[]): HealthFinding {
  const all = flattenDasSteps(steps)
  const anonCount = all.filter((s) => dasIsAnonymous(s)).length
  if (anonCount === 0) {
    return {
      ruleId: 'rule-3',
      ruleNumber: 3,
      status: 'good',
      message: 'すべてのステップに名前が付いています！初見でも業務の流れが伝わります。',
    }
  }
  return {
    ruleId: 'rule-3',
    ruleNumber: 3,
    status: 'improve',
    message: `「(名前がありません)」のステップが ${anonCount} 件あります。初見でも業務がわかる名前を付けましょう。`,
  }
}

// ---- 第5条: 重複ステップチェック (青) -------------------------

/** 青ロボットのステップアクションからデduplication キーを生成 */
function blueActionKey(action: StepAction | undefined): string | null {
  if (!action) return null
  switch (action.type) {
    case 'LoadPage':
      return `LoadPage::${action.url}`
    case 'ExtractText':
      return `ExtractText::${action.targetId}`
    case 'ExtractURL':
      return `ExtractURL::${action.targetId}`
    case 'Click':
      return `Click::${action.targetId}`
    case 'EnterText':
      return `EnterText::${action.targetId}`
    default:
      return null
  }
}

function checkRule5Blue(steps: RobotStep[]): HealthFinding | null {
  const counts = new Map<string, number>()
  for (const s of steps) {
    const key = blueActionKey(s.action)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const hasDup = [...counts.values()].some((n) => n >= 2)
  if (!hasDup) {
    return {
      ruleId: 'rule-5',
      ruleNumber: 5,
      status: 'good',
      message: '同じ処理の重複はありません！整理された構成ですね。',
    }
  }
  return {
    ruleId: 'rule-5',
    ruleNumber: 5,
    status: 'improve',
    message: '似た処理が複数あります。繰り返しや変数で一本化できないか検討しましょう。',
  }
}

// ---- 第5条: 重複ステップチェック (緑) -------------------------

/** 緑ロボットのステップアクションからdeduplication キーを生成 */
function dasActionKey(action: DasAction): string | null {
  switch (action.type) {
    case 'Click':
      return `Click::${action.finder.selector}`
    case 'ExtractValue':
      return `ExtractValue::${action.finder.selector}`
    case 'EnterText':
      return `EnterText::${action.finder.selector}`
    case 'Browser':
      return `Browser::${action.url}`
    default:
      return null
  }
}

function checkRule5Das(steps: DasStep[]): HealthFinding | null {
  const all = flattenDasSteps(steps)
  const counts = new Map<string, number>()
  for (const s of all) {
    const key = dasActionKey(s.action)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const hasDup = [...counts.values()].some((n) => n >= 2)
  if (!hasDup) {
    return {
      ruleId: 'rule-5',
      ruleNumber: 5,
      status: 'good',
      message: '同じ処理の重複はありません！整理された構成ですね。',
    }
  }
  return {
    ruleId: 'rule-5',
    ruleNumber: 5,
    status: 'improve',
    message: '似た処理が複数あります。繰り返しや変数で一本化できないか検討しましょう。',
  }
}

// ---- 第6条: タイプ・変数定義チェック (共通) -------------------

function checkRule6(typesCount: number, variablesCount: number): HealthFinding {
  if (typesCount >= 1 && variablesCount >= 1) {
    return {
      ruleId: 'rule-6',
      ruleNumber: 6,
      status: 'good',
      message: 'タイプと変数でデータが整理されています！',
    }
  }
  return {
    ruleId: 'rule-6',
    ruleNumber: 6,
    status: 'improve',
    message: 'データの入れ物（タイプ・変数）を定義して整理しましょう。手順を作る前にデータの棚卸しが大切です。',
  }
}

// ---- 第9条: 例外処理チェック (緑のみ) -------------------------

/** ガードチョイスが存在するか（ネスト含む再帰） */
function hasGuardedChoice(steps: DasStep[]): boolean {
  for (const step of steps) {
    if (step.action.type === 'GuardedChoice') return true
    const nested = flattenDasAction(step.action)
    if (nested.some((s) => s.action.type === 'GuardedChoice')) return true
  }
  return false
}

/** ガードチョイスに timeout ガードがあるか（ネスト含む再帰） */
function hasTimeoutGuard(steps: DasStep[]): boolean {
  const all = flattenDasSteps(steps)
  for (const s of all) {
    if (s.action.type === 'GuardedChoice') {
      if (s.action.guards.some((g) => g.type === 'timeout')) return true
    }
  }
  return false
}

/** Throw ステップが存在するか */
function hasThrow(steps: DasStep[]): boolean {
  return flattenDasSteps(steps).some((s) => s.action.type === 'Throw')
}

/**
 * 第9条の判定は「ガードチョイスが存在する場合のみ」。
 * ガードチョイスが無いミッション（D1 等）では null を返し診断対象外とする。
 */
function checkRule9Das(steps: DasStep[]): HealthFinding | null {
  const gcExists = hasGuardedChoice(steps)
  if (!gcExists) return null // 前提条件不成立 → 判定対象外

  const hasTimeout = hasTimeoutGuard(steps)
  const hasThrowStep = hasThrow(steps)

  if (hasTimeout || hasThrowStep) {
    return {
      ruleId: 'rule-9',
      ruleNumber: 9,
      status: 'good',
      message: 'タイムアウトで例外をしっかり捕捉しています！時間切れも例外として捉えた設計ですね。',
    }
  }
  return {
    ruleId: 'rule-9',
    ruleNumber: 9,
    status: 'improve',
    message: 'ガードチョイスに時間経過（Timeout）がありません。例外として捉えてフォールバックを追加しましょう。',
  }
}

// ---- 第10条: 入力変数 / 外部化チェック (青) -------------------

function checkRule10Blue(robot: Robot): HealthFinding | null {
  const hasInput = robot.variables.some((v) => v.role === 'input')
  if (!hasInput) return null // 入力変数が無いミッションは判定対象外

  // 入力変数があるとき、EnterText で fromVariable を使っているか確認
  const usesVarRef = robot.steps.some((s) => {
    if (s.action?.type === 'EnterText') {
      return !!s.action.fromVariable
    }
    return false
  })
  if (usesVarRef) {
    return {
      ruleId: 'rule-10',
      ruleNumber: 10,
      status: 'good',
      message: '入力変数を活用して環境値を外部化しています！ロボット内への直書きがなく、再利用しやすい設計です。',
    }
  }
  return {
    ruleId: 'rule-10',
    ruleNumber: 10,
    status: 'improve',
    message: '入力変数があるのに固定値が直書きされています。入力変数を使って呼び出し元から渡しましょう。',
  }
}

// ---- 第10条: 入力変数 / 外部化チェック (緑) -------------------

function checkRule10Das(robot: DasRobot): HealthFinding | null {
  // 変数を持つミッションのみ判定対象
  if (robot.variables.length === 0) return null

  const all = flattenDasSteps(robot.steps)
  // EnterText で fromVariable 使用 または ExtractValue で toVariable 使用 があれば外部化済み
  const usesVar = all.some((s) => {
    if (s.action.type === 'EnterText') return !!s.action.fromVariable
    if (s.action.type === 'ExtractValue') return !!s.action.toVariable
    return false
  })
  if (usesVar) {
    return {
      ruleId: 'rule-10',
      ruleNumber: 10,
      status: 'good',
      message: '変数を活用して値を外部化しています！環境に依存しない、壊れにくい設計ですね。',
    }
  }
  return {
    ruleId: 'rule-10',
    ruleNumber: 10,
    status: 'improve',
    message: '変数が定義されているのに利用されていません。固定値の直書きを変数参照に置き換えましょう。',
  }
}

// ---- メイン: diagnose() ----------------------------------------

/**
 * プレイヤーが組んだロボットを構造解析し、該当する条を判定する。
 * 純粋関数。Robot（青）と DasRobot（緑）の両方を受け取れる。
 *
 * @param robot   - プレイヤーが組んだロボット（青 or 緑）
 * @param mission - 現在のミッション（robotType と healthFocus を参照）
 * @returns HealthFinding[] - 判定対象の条ごとの結果（フォーカス条優先順）
 */
export function diagnose(robot: Robot | DasRobot, mission: Mission): HealthFinding[] {
  const isDas = mission.robotType === 'das'
  const focus = new Set(mission.healthFocus ?? [])

  // 全判定を実行して候補を集める
  let candidates: (HealthFinding | null)[]

  if (!isDas) {
    // 青ロボット
    const blueRobot = robot as Robot
    const stepCount = blueRobot.steps.length
    candidates = [
      checkRule1(stepCount),
      checkRule3Blue(blueRobot.steps),
      checkRule5Blue(blueRobot.steps),
      checkRule6(blueRobot.types.length, blueRobot.variables.length),
      // 第9条: 青ロボットはエラー処理設定が構造的に取得しにくいため対象外
      checkRule10Blue(blueRobot),
    ]
  } else {
    // 緑ロボット
    const dasRobot = robot as DasRobot
    const allSteps = flattenDasSteps(dasRobot.steps)
    const stepCount = allSteps.length
    candidates = [
      checkRule1(stepCount),
      checkRule3Das(dasRobot.steps),
      checkRule5Das(dasRobot.steps),
      checkRule6(dasRobot.types.length, dasRobot.variables.length),
      checkRule9Das(dasRobot.steps),
      checkRule10Das(dasRobot),
    ]
  }

  // null を除外
  const valid = candidates.filter((f): f is HealthFinding => f !== null)

  // フォーカス条と非フォーカス条に分けて、フォーカス条を先に並べる
  const focusFindings = valid.filter((f) => focus.has(f.ruleNumber))
  const otherFindings = valid.filter((f) => !focus.has(f.ruleNumber))

  // フォーカス条は条番号順にソート
  focusFindings.sort((a, b) => a.ruleNumber - b.ruleNumber)
  otherFindings.sort((a, b) => a.ruleNumber - b.ruleNumber)

  return [...focusFindings, ...otherFindings]
}
