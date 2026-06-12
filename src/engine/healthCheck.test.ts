// ============================================================
// healthCheck.ts の単体テスト
// ============================================================
import { describe, it, expect } from 'vitest'
import { diagnose } from './healthCheck'
import { createEmptyRobot, type Robot, type RobotStep, nextStepId } from '../model/robot'
import { createEmptyDasRobot, nextDasStepId, type DasRobot, type DasStep } from '../model/dasRobot'
import type { Mission } from '../model/mission'

// ---- テスト用ミッションスタブ --------------------------------

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'test',
    index: 0,
    title: 'テスト',
    client: { name: 'テスト', dept: 'テスト部' },
    briefing: '',
    manualMinutes: 0,
    robotSeconds: 0,
    deductions: [],
    goals: [],
    site: { id: 'test', url: 'https://test.local', title: '', intro: '', singles: [] },
    checks: [],
    reveal: () => '',
    glossary: [],
    ...overrides,
  }
}

// ---- 青ロボット用ヘルパー -----------------------------------

function addActionStep(
  robot: Robot,
  name: string,
  action: RobotStep['action'],
): void {
  const step: RobotStep = {
    id: nextStepId(),
    kind: 'action',
    name,
    stepClass: 'ActionStep',
    action,
    enabled: true,
  }
  const endIdx = robot.steps.findIndex((s) => s.kind === 'end')
  robot.steps.splice(endIdx, 0, step)
}

// ---- 緑ロボット用ヘルパー -----------------------------------

function makeDasStep(name: string, action: DasStep['action']): DasStep {
  return { id: nextDasStepId(), name, action, enabled: true }
}

// =============================================================
// 第1条: ステップ数チェック
// =============================================================

describe('第1条: ステップ数チェック', () => {
  const mission = makeMission({ healthFocus: [1] })

  it('青: ステップ数 ≤ 12 → good', () => {
    const robot = createEmptyRobot('r')
    // start + end が既に 2 ステップ。3 ステップ追加 → 合計 5
    for (let i = 0; i < 3; i++) {
      addActionStep(robot, `ステップ${i}`, { type: 'LoadPage', url: 'https://a.local' })
    }
    const findings = diagnose(robot, mission)
    const f = findings.find((f) => f.ruleNumber === 1)
    expect(f?.status).toBe('good')
  })

  it('青: ステップ数 > 12 → improve', () => {
    const robot = createEmptyRobot('r')
    // start + end + 13 steps = 15
    for (let i = 0; i < 13; i++) {
      addActionStep(robot, `ステップ${i}`, { type: 'LoadPage', url: `https://step${i}.local` })
    }
    const findings = diagnose(robot, mission)
    const f = findings.find((f) => f.ruleNumber === 1)
    expect(f?.status).toBe('improve')
  })

  it('緑: ステップ数 ≤ 12 → good', () => {
    const robot = createEmptyDasRobot('r')
    for (let i = 0; i < 3; i++) {
      robot.steps.push(
        makeDasStep(`ステップ${i}`, {
          type: 'Click',
          finder: { kind: 'component', selector: `button[name="btn${i}"]`, reuse: 'none' },
        }),
      )
    }
    const findings = diagnose(robot, makeMission({ robotType: 'das', healthFocus: [1] }))
    const f = findings.find((f) => f.ruleNumber === 1)
    expect(f?.status).toBe('good')
  })
})

// =============================================================
// 第3条: 無名ステップチェック
// =============================================================

describe('第3条: 無名ステップチェック', () => {
  const mission = makeMission({ healthFocus: [3] })

  it('青: 全ステップに名前 → good', () => {
    const robot = createEmptyRobot('r')
    addActionStep(robot, 'ページを読み込む', { type: 'LoadPage', url: 'https://a.local' })
    const findings = diagnose(robot, mission)
    const f = findings.find((f) => f.ruleNumber === 3)
    expect(f?.status).toBe('good')
  })

  it('青: 無名ステップあり → improve', () => {
    const robot = createEmptyRobot('r')
    // name が空文字 → isAnonymous = true
    addActionStep(robot, '', { type: 'LoadPage', url: 'https://a.local' })
    const findings = diagnose(robot, mission)
    const f = findings.find((f) => f.ruleNumber === 3)
    expect(f?.status).toBe('improve')
    expect(f?.message).toContain('(名前がありません)')
  })

  it('緑: 無名ステップなし → good', () => {
    const robot = createEmptyDasRobot('r')
    robot.steps.push(
      makeDasStep('検索ボタンをクリック', {
        type: 'Click',
        finder: { kind: 'component', selector: 'button[name="検索"]', reuse: 'none' },
      }),
    )
    const findings = diagnose(robot, makeMission({ robotType: 'das', healthFocus: [3] }))
    const f = findings.find((f) => f.ruleNumber === 3)
    expect(f?.status).toBe('good')
  })

  it('緑: 無名ステップあり → improve', () => {
    const robot = createEmptyDasRobot('r')
    robot.steps.push(
      makeDasStep('', {
        type: 'Click',
        finder: { kind: 'component', selector: 'button[name="検索"]', reuse: 'none' },
      }),
    )
    const findings = diagnose(robot, makeMission({ robotType: 'das', healthFocus: [3] }))
    const f = findings.find((f) => f.ruleNumber === 3)
    expect(f?.status).toBe('improve')
  })
})

// =============================================================
// 第9条: Timeout フォールバック（緑のみ）
// =============================================================

describe('第9条: Timeout フォールバックチェック（緑）', () => {
  const dasMission = makeMission({ robotType: 'das', healthFocus: [9] })

  it('ガードチョイスなし → 第9条は返さない（判定対象外）', () => {
    const robot = createEmptyDasRobot('r')
    robot.steps.push(
      makeDasStep('クリック', {
        type: 'Click',
        finder: { kind: 'component', selector: 'button[name="OK"]', reuse: 'none' },
      }),
    )
    const findings = diagnose(robot, dasMission)
    const f = findings.find((f) => f.ruleNumber === 9)
    expect(f).toBeUndefined()
  })

  it('ガードチョイスあり + Timeout あり → good', () => {
    const robot = createEmptyDasRobot('r')
    robot.steps.push(
      makeDasStep('ガードチョイス', {
        type: 'GuardedChoice',
        guards: [
          {
            type: 'locationFound',
            finder: { kind: 'component', selector: 'button[name="送信"]', reuse: 'none' },
            steps: [],
          },
          {
            type: 'timeout',
            seconds: 30,
            steps: [],
          },
        ],
      }),
    )
    const findings = diagnose(robot, dasMission)
    const f = findings.find((f) => f.ruleNumber === 9)
    expect(f?.status).toBe('good')
  })

  it('ガードチョイスあり + Timeout なし → improve', () => {
    const robot = createEmptyDasRobot('r')
    robot.steps.push(
      makeDasStep('ガードチョイス', {
        type: 'GuardedChoice',
        guards: [
          {
            type: 'locationFound',
            finder: { kind: 'component', selector: 'button[name="送信"]', reuse: 'none' },
            steps: [],
          },
        ],
      }),
    )
    const findings = diagnose(robot, dasMission)
    const f = findings.find((f) => f.ruleNumber === 9)
    expect(f?.status).toBe('improve')
    expect(f?.message).toContain('Timeout')
  })

  it('ガードチョイスあり + Throw あり → good（Timeout なしでも可）', () => {
    const robot = createEmptyDasRobot('r')
    robot.steps.push(
      makeDasStep('ガードチョイス', {
        type: 'GuardedChoice',
        guards: [
          {
            type: 'locationFound',
            finder: { kind: 'component', selector: 'button[name="送信"]', reuse: 'none' },
            steps: [
              makeDasStep('スロー', { type: 'Throw', exception: 'TimeOutError' }),
            ],
          },
        ],
      }),
    )
    const findings = diagnose(robot, dasMission)
    const f = findings.find((f) => f.ruleNumber === 9)
    expect(f?.status).toBe('good')
  })
})

// =============================================================
// 第10条: 入力変数 / 外部化チェック（青）
// =============================================================

describe('第10条: 入力変数の外部化チェック（青）', () => {
  const mission = makeMission({ healthFocus: [10] })

  it('入力変数なし → 第10条は返さない（判定対象外）', () => {
    const robot = createEmptyRobot('r')
    // 入力変数を追加しない
    addActionStep(robot, 'ページを読み込む', { type: 'LoadPage', url: 'https://a.local' })
    const findings = diagnose(robot, mission)
    const f = findings.find((f) => f.ruleNumber === 10)
    expect(f).toBeUndefined()
  })

  it('入力変数あり + 変数参照あり → good', () => {
    const robot = createEmptyRobot('r')
    robot.types.push({ name: 'ログイン情報', kind: 'complex', attributes: [{ name: 'ID' }, { name: 'パスワード' }] })
    robot.variables.push({ name: 'ログイン情報', typeName: 'ログイン情報', role: 'input' })
    addActionStep(robot, 'ページを読み込む', { type: 'LoadPage', url: 'https://portal.local/secure' })
    addActionStep(robot, 'ID を入力', {
      type: 'EnterText',
      targetId: 'login-id',
      text: '',
      fromVariable: 'ログイン情報',
      fromAttribute: 'ID',
    })
    const findings = diagnose(robot, mission)
    const f = findings.find((f) => f.ruleNumber === 10)
    expect(f?.status).toBe('good')
  })

  it('入力変数あり + 変数参照なし（固定値直書き）→ improve', () => {
    const robot = createEmptyRobot('r')
    robot.types.push({ name: 'ログイン情報', kind: 'complex', attributes: [{ name: 'ID' }] })
    robot.variables.push({ name: 'ログイン情報', typeName: 'ログイン情報', role: 'input' })
    addActionStep(robot, 'ページを読み込む', { type: 'LoadPage', url: 'https://portal.local/secure' })
    // fromVariable を使わず text に直書き
    addActionStep(robot, 'ID を入力', {
      type: 'EnterText',
      targetId: 'login-id',
      text: 'staff01',
    })
    const findings = diagnose(robot, mission)
    const f = findings.find((f) => f.ruleNumber === 10)
    expect(f?.status).toBe('improve')
  })
})

// =============================================================
// フォーカス条が先頭に来ること（表示順の確認）
// =============================================================

describe('フォーカス条が先頭に配置されること', () => {
  it('healthFocus=[6] のミッションでは第6条が最初に返る', () => {
    const robot = createEmptyRobot('r')
    robot.types.push({ name: '取引先', kind: 'complex', attributes: [{ name: '会社名' }] })
    robot.variables.push({ name: '取引先', typeName: '取引先' })
    addActionStep(robot, 'ページを読み込む', { type: 'LoadPage', url: 'https://a.local' })
    const mission = makeMission({ healthFocus: [6] })
    const findings = diagnose(robot, mission)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].ruleNumber).toBe(6)
  })
})
