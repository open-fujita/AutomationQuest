import { describe, it, expect } from 'vitest'
import { createEmptyRobot, type Robot, type StepAction, type RobotStep, nextStepId } from '../model/robot'
import { runRobot } from './simulator'
import { validateMission } from './validator'
import { M1 } from '../data/missions/m1'
import { M2 } from '../data/missions/m2'
import { M3 } from '../data/missions/m3'
import { M4 } from '../data/missions/m4'
import { M5 } from '../data/missions/m5'
import { colTarget, ROW_TARGET } from '../model/site'

/** 終了ステップの前にアクションステップを差し込むヘルパ */
function addStep(robot: Robot, kind: RobotStep['kind'], name: string, action: StepAction) {
  const step: RobotStep = { id: nextStepId(), kind, name, stepClass: 'ActionStep', action, enabled: true }
  const endIdx = robot.steps.findIndex((s) => s.kind === 'end')
  robot.steps.splice(endIdx, 0, step)
}

describe('Mission 1 — はじめての自動化', () => {
  function buildCorrect(): Robot {
    const robot = createEmptyRobot('robot1')
    M1.seed?.(robot)
    addStep(robot, 'action', 'ページを読み込む', { type: 'LoadPage', url: M1.site.url })
    addStep(robot, 'action', 'テキストを抽出', {
      type: 'ExtractText',
      targetId: 'notice-title',
      toVariable: 'お知らせ',
      toAttribute: '見出し',
    })
    return robot
  }

  it('正しく組むと受け入れ条件をすべて満たす', () => {
    const robot = buildCorrect()
    const sim = runRobot(robot, M1.site)
    const v = validateMission({ robot, sim }, M1.checks)
    expect(sim.errors).toHaveLength(0)
    expect(sim.data['お知らせ']).toHaveLength(1)
    expect(v.pass).toBe(true)
  })

  it('抽出ステップが無いと未達になり、抽出を促すヒントが出る', () => {
    const robot = createEmptyRobot('robot1')
    M1.seed?.(robot)
    addStep(robot, 'action', 'ページを読み込む', { type: 'LoadPage', url: M1.site.url })
    const sim = runRobot(robot, M1.site)
    const v = validateMission({ robot, sim }, M1.checks)
    expect(v.pass).toBe(false)
    expect(v.firstHint).toContain('抽出')
  })
})

describe('Mission 2 — 一覧をまるごと', () => {
  function buildBase(): Robot {
    const robot = createEmptyRobot('robot1')
    robot.types.push({
      name: '取引先',
      kind: 'complex',
      attributes: [{ name: '会社名' }, { name: '担当者' }, { name: '電話' }],
    })
    robot.variables.push({ name: '取引先', typeName: '取引先' })
    addStep(robot, 'action', 'ページを読み込む', { type: 'LoadPage', url: M2.site.url })
    return robot
  }

  function addExtracts(robot: Robot) {
    addStep(robot, 'action', '会社名を抽出', { type: 'ExtractText', targetId: colTarget('company'), toVariable: '取引先', toAttribute: '会社名' })
    addStep(robot, 'action', '担当者を抽出', { type: 'ExtractText', targetId: colTarget('contact'), toVariable: '取引先', toAttribute: '担当者' })
    addStep(robot, 'action', '電話を抽出', { type: 'ExtractText', targetId: colTarget('tel'), toVariable: '取引先', toAttribute: '電話' })
  }

  it('ループ有りで全 6 件を抽出し、受け入れ条件を満たす', () => {
    const robot = buildBase()
    addStep(robot, 'loop', '要素の繰り返し', { type: 'ForEach', targetId: ROW_TARGET })
    addExtracts(robot)
    const sim = runRobot(robot, M2.site)
    const v = validateMission({ robot, sim }, M2.checks)
    expect(sim.data['取引先']).toHaveLength(6)
    expect(v.pass).toBe(true)
  })

  it('ループが無いと先頭 1 件しか取れず未達、ループを促すヒントが出る', () => {
    const robot = buildBase()
    addExtracts(robot)
    const sim = runRobot(robot, M2.site)
    const v = validateMission({ robot, sim }, M2.checks)
    expect(sim.data['取引先']).toHaveLength(1)
    expect(v.pass).toBe(false)
    const hints = v.outcomes.filter((o) => !o.pass).map((o) => o.hint).join(' ')
    expect(hints).toContain('繰り返し')
  })

  it('クリア時の気づき／成果が台帳の重複（青葉商事）を指摘する', () => {
    const robot = buildBase()
    addStep(robot, 'loop', '要素の繰り返し', { type: 'ForEach', targetId: ROW_TARGET })
    addExtracts(robot)
    const sim = runRobot(robot, M2.site)
    const reveal = M2.reveal(sim)
    expect(reveal).toContain('青葉商事')
  })

  it('タイプ名・属性名が違っても（完全一致でなくても）構造が正しければ合格する', () => {
    const robot = createEmptyRobot('robot1')
    robot.types.push({ name: 'Torihikisaki', kind: 'complex', attributes: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] })
    robot.variables.push({ name: 'v', typeName: 'Torihikisaki' })
    addStep(robot, 'action', 'Load Page', { type: 'LoadPage', url: M2.site.url })
    addStep(robot, 'loop', 'Loop', { type: 'ForEach', targetId: ROW_TARGET })
    addStep(robot, 'action', 'e1', { type: 'ExtractText', targetId: colTarget('company'), toVariable: 'v', toAttribute: 'A' })
    addStep(robot, 'action', 'e2', { type: 'ExtractText', targetId: colTarget('contact'), toVariable: 'v', toAttribute: 'B' })
    addStep(robot, 'action', 'e3', { type: 'ExtractText', targetId: colTarget('tel'), toVariable: 'v', toAttribute: 'C' })
    const sim = runRobot(robot, M2.site)
    const v = validateMission({ robot, sim }, M2.checks)
    expect(sim.data['v']).toHaveLength(6)
    expect(v.pass).toBe(true)
  })
})

describe('Mission 3 — 条件で仕分ける', () => {
  function buildBase(): Robot {
    const robot = createEmptyRobot('robot1')
    robot.types.push({ name: '問い合わせ', kind: 'complex', attributes: [{ name: '件名' }, { name: '状態' }, { name: '担当' }] })
    robot.variables.push({ name: '問い合わせ', typeName: '問い合わせ' })
    addStep(robot, 'action', 'Load Page', { type: 'LoadPage', url: M3.site.url })
    addStep(robot, 'loop', 'Loop', { type: 'ForEach', targetId: ROW_TARGET })
    addStep(robot, 'action', '件名抽出', { type: 'ExtractText', targetId: colTarget('subject'), toVariable: '問い合わせ', toAttribute: '件名' })
    addStep(robot, 'action', '状態抽出', { type: 'ExtractText', targetId: colTarget('status'), toVariable: '問い合わせ', toAttribute: '状態' })
    addStep(robot, 'action', '担当抽出', { type: 'ExtractText', targetId: colTarget('assignee'), toVariable: '問い合わせ', toAttribute: '担当' })
    return robot
  }

  it('値判定で未対応だけ残すと 4 件になり合格する', () => {
    const robot = buildBase()
    addStep(robot, 'test', '値判定', { type: 'TestValue', toVariable: '問い合わせ', toAttribute: '状態', op: 'equals', value: '未対応' })
    const sim = runRobot(robot, M3.site)
    const v = validateMission({ robot, sim }, M3.checks)
    expect(sim.data['問い合わせ']).toHaveLength(4)
    expect(v.pass).toBe(true)
  })

  it('値判定が無いと全 7 件のままで未達（4 件に絞れていない）', () => {
    const robot = buildBase()
    const sim = runRobot(robot, M3.site)
    const v = validateMission({ robot, sim }, M3.checks)
    expect(sim.data['問い合わせ']).toHaveLength(7)
    expect(v.pass).toBe(false)
  })
})

describe('Mission 4 — 分岐グラフ（○分岐 / End 戻り / ループ枝＋仕上げ枝）', () => {
  function buildSeeded(): Robot {
    const robot = createEmptyRobot('robot1')
    M4.seed?.(robot)
    return robot
  }
  function setLoadUrl(robot: Robot, url: string) {
    const load = robot.steps.find((s) => s.id === 'load')!
    load.action = { type: 'LoadPage', url }
  }

  it('グラフ実行: ループ枝で 5 件集め、仕上げ枝の保存が 1 回だけ走る', () => {
    const robot = buildSeeded()
    setLoadUrl(robot, M4.site.url)
    const sim = runRobot(robot, M4.site)
    expect(sim.data['受注']).toHaveLength(5) // ループ枝が各行を反復
    expect(sim.data['受注'].every((r) => r['注文番号'] && r['金額'])).toBe(true)
    const saves = sim.log.filter((l) => l.message.includes('保存しました'))
    expect(saves).toHaveLength(1) // 仕上げ枝は全行終了後に 1 回だけ
    const v = validateMission({ robot, sim }, M4.checks)
    expect(v.pass).toBe(true)
  })

  it('URL 未設定だと受け入れ条件を満たさない', () => {
    const robot = buildSeeded() // load.url は '' のまま
    const sim = runRobot(robot, M4.site)
    const v = validateMission({ robot, sim }, M4.checks)
    expect(v.pass).toBe(false)
  })
})

describe('Mission 5 — 入力変数と出力変数', () => {
  function buildCorrect(): Robot {
    const robot = createEmptyRobot('robot1')
    M5.seed?.(robot) // 入力変数「ログイン情報」(role input) が用意される
    // 出力変数（複合型）
    robot.types.push({ name: '取引先', kind: 'complex', attributes: [{ name: '会社名' }, { name: '担当者' }, { name: '電話' }] })
    robot.variables.push({ name: '取引先', typeName: '取引先', role: 'output' })
    addStep(robot, 'action', 'ページを読み込む', { type: 'LoadPage', url: M5.site.url })
    addStep(robot, 'action', 'ID入力', { type: 'EnterText', targetId: 'login-id', text: '', fromVariable: 'ログイン情報', fromAttribute: 'ID' })
    addStep(robot, 'action', 'ログイン', { type: 'Click', targetId: 'login-btn' })
    addStep(robot, 'loop', '要素の繰り返し', { type: 'ForEach', targetId: ROW_TARGET })
    addStep(robot, 'action', '会社名抽出', { type: 'ExtractText', targetId: colTarget('company'), toVariable: '取引先', toAttribute: '会社名' })
    addStep(robot, 'action', '担当者抽出', { type: 'ExtractText', targetId: colTarget('contact'), toVariable: '取引先', toAttribute: '担当者' })
    addStep(robot, 'action', '電話抽出', { type: 'ExtractText', targetId: colTarget('tel'), toVariable: '取引先', toAttribute: '電話' })
    addStep(robot, 'action', '値を返す', { type: 'ReturnValue', variableName: '取引先' })
    return robot
  }

  it('入力変数を使い、出力5件を返すと合格する', () => {
    const robot = buildCorrect()
    const sim = runRobot(robot, M5.site, M5.inputs)
    const v = validateMission({ robot, sim }, M5.checks)
    expect(sim.data['取引先']).toHaveLength(5)
    expect(sim.returned).toContain('取引先')
    // 入力変数の値が入力に使われている（ログに ID の値が出る）
    expect(sim.log.some((l) => l.message.includes('staff01'))).toBe(true)
    expect(v.pass).toBe(true)
  })

  it('「値を返す」が無いと未達', () => {
    const robot = buildCorrect()
    // ReturnValue ステップを取り除く
    robot.steps = robot.steps.filter((s) => s.action?.type !== 'ReturnValue')
    const sim = runRobot(robot, M5.site, M5.inputs)
    const v = validateMission({ robot, sim }, M5.checks)
    expect(sim.returned).toHaveLength(0)
    expect(v.pass).toBe(false)
  })
})
