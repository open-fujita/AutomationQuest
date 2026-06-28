// ============================================================
// dasRobotStore — insertTarget 挿入先ターゲット機能のユニットテスト
//
// insertTarget の初期値・setInsertTarget・addStep（forEachBody）の動作を検証する。
// Zustand ストアを直接 getState() / setState() で操作してテストする。
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { useDasRobotStore } from './dasRobotStore'
import type { InsertTarget } from './dasRobotStore'
import type { DasAction, DasRobot } from '../model/dasRobot'

// ---- ヘルパー ------------------------------------------------

function getStore() {
  return useDasRobotStore.getState()
}

/** テスト間でストア状態をリセットする */
function resetStore() {
  useDasRobotStore.setState({
    robot: { name: 'test', steps: [], variables: [], types: [] },
    selectedStepId: null,
    selectedPath: [],
    sim: {
      ran: false,
      data: {},
      log: [],
      errors: [],
      totalTick: 0,
      guardResults: [],
      forEachRuns: [],
    },
    insertTarget: { kind: 'main' },
  })
}

const emptyForEachAction = (): DasAction => ({
  type: 'ForEach',
  scopeFinder: { kind: 'component', selector: 'table', reuse: 'none' },
  scopeFinderName: 'scope1',
  elementFinder: { kind: 'component', selector: '> listitem', reuse: 'none', scopeRef: 'scope1' },
  body: [],
})

const extractAction = (): DasAction => ({
  type: 'ExtractValue',
  finder: { kind: 'component', selector: 'label', reuse: 'none' },
  toVariable: '抽出値',
  attribute: 'text',
})

// ============================================================
// insertTarget の初期値
// ============================================================

describe('insertTarget: 初期値', () => {
  beforeEach(resetStore)

  it('初期値は { kind: "main" }', () => {
    expect(getStore().insertTarget).toEqual({ kind: 'main' })
  })
})

// ============================================================
// setInsertTarget
// ============================================================

describe('setInsertTarget', () => {
  beforeEach(resetStore)

  it('forEachBody ターゲットに変更できる', () => {
    const target: InsertTarget = { kind: 'forEachBody', stepId: 'step-abc' }
    getStore().setInsertTarget(target)
    expect(getStore().insertTarget).toEqual(target)
  })

  it('main ターゲットに戻せる', () => {
    getStore().setInsertTarget({ kind: 'forEachBody', stepId: 'step-abc' })
    getStore().setInsertTarget({ kind: 'main' })
    expect(getStore().insertTarget).toEqual({ kind: 'main' })
  })
})

// ============================================================
// addStep: insertTarget が main のとき → トップレベルに追加
// ============================================================

describe('addStep: insertTarget=main', () => {
  beforeEach(resetStore)

  it('トップレベルにステップが追加される', () => {
    const id = getStore().addStep(extractAction())
    const steps = getStore().robot.steps
    expect(steps).toHaveLength(1)
    expect(steps[0].id).toBe(id)
    expect(steps[0].action.type).toBe('ExtractValue')
  })

  it('複数回追加すると末尾に追加される', () => {
    getStore().addStep(extractAction())
    getStore().addStep({ type: 'Click', finder: { kind: 'component', selector: 'button', reuse: 'none' }, clickCount: 1, button: 'left' })
    expect(getStore().robot.steps).toHaveLength(2)
    expect(getStore().robot.steps[1].action.type).toBe('Click')
  })
})

// ============================================================
// addStep: insertTarget が forEachBody のとき → body に追加
// ============================================================

describe('addStep: insertTarget=forEachBody', () => {
  beforeEach(resetStore)

  it('ForEach の body 末尾にステップが追加される', () => {
    // トップレベルに ForEach を追加
    const forEachId = getStore().addStep(emptyForEachAction())

    // insertTarget を forEachBody に変更
    getStore().setInsertTarget({ kind: 'forEachBody', stepId: forEachId })

    // 次の addStep は body に入るべき
    const extractId = getStore().addStep(extractAction())

    const steps = getStore().robot.steps
    // トップレベルは ForEach の 1 件のみ（ExtractValue はトップに追加されない）
    expect(steps).toHaveLength(1)
    expect(steps[0].action.type).toBe('ForEach')

    // ForEach の body に ExtractValue が入っている
    const feAction = steps[0].action
    if (feAction.type !== 'ForEach') throw new Error('ForEach でない')
    expect(feAction.body).toHaveLength(1)
    expect(feAction.body[0].id).toBe(extractId)
    expect(feAction.body[0].action.type).toBe('ExtractValue')
  })

  it('挿入後も insertTarget は forEachBody のまま（連続挿入が可能）', () => {
    const forEachId = getStore().addStep(emptyForEachAction())
    getStore().setInsertTarget({ kind: 'forEachBody', stepId: forEachId })

    getStore().addStep(extractAction())
    getStore().addStep(extractAction())

    // insertTarget は変わっていない
    expect(getStore().insertTarget).toEqual({ kind: 'forEachBody', stepId: forEachId })

    // body に 2 件入っている
    const feAction = getStore().robot.steps[0].action
    if (feAction.type !== 'ForEach') throw new Error('ForEach でない')
    expect(feAction.body).toHaveLength(2)
  })

  it('存在しない stepId を指定した場合でもトップレベルに fallback せずにエラーなく動作する', () => {
    // 存在しない stepId を指定すると body に追加できず、updateStepById が何もしない
    // addStep 自体はエラーを throw しない（ステップは生成されるが body には入らない）
    getStore().setInsertTarget({ kind: 'forEachBody', stepId: 'non-existent' })
    const id = getStore().addStep(extractAction())
    // トップレベルには追加されない（body 追加が失敗した場合でも addStep は ID を返す）
    // 実装上: addStepToForEachBody が見つからなければ元の steps を返す → steps 変化なし
    expect(getStore().robot.steps).toHaveLength(0)
    // 返り値の ID は生成されている
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})

// ============================================================
// loadMission: insertTarget がリセットされる
// ============================================================

describe('loadMission: insertTarget のリセット', () => {
  beforeEach(resetStore)

  it('loadMission 後は insertTarget が { kind: "main" } に戻る', () => {
    // まず ForEach body ターゲットに変更
    getStore().setInsertTarget({ kind: 'forEachBody', stepId: 'step-xyz' })
    expect(getStore().insertTarget.kind).toBe('forEachBody')

    // ミッションロード（dasSeed なしの最小 Mission）
    const fakeMission = {
      id: 'test-mission',
      robotType: 'das' as const,
    } as import('../model/mission').Mission

    getStore().loadMission(fakeMission)

    // insertTarget がリセットされている
    expect(getStore().insertTarget).toEqual({ kind: 'main' })
    // ロボットもリセットされている
    expect(getStore().robot.steps).toHaveLength(0)
  })
})
