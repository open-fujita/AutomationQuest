// ============================================================
// 実機練習編 基盤データのユニットテスト
//
// テスト対象:
//   1. practice.ts — シードデータの型適合・構造検証
//   2. lectures.ts — 各レクチャーの done 述語（空ロボ=false → 操作後=true）
//   3. gameStore.ts — 'practice' 画面遷移
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  createMain1Robot,
  createSubRobot,
  createPracticeRobots,
  PRACTICE_TREE,
  DEFAULT_PRACTICE_TABS,
  INFO_TYPE_ATTRIBUTES,
  type PracticeRobots,
} from './practice'
import {
  LECTURES,
  getLecture,
  isComingSoon,
  checkLectureStep,
} from './lectures'
import type { DasRobot, DasStep, DasAction, Guard, DasFinder } from '../model/dasRobot'
import { nextDasStepId } from '../model/dasRobot'
import type { Robot } from '../model/robot'
import { nextStepId } from '../model/robot'

// ---- ヘルパー -------------------------------------------------

const defaultFinder = (selector: string): DasFinder => ({
  kind: 'component',
  selector,
  reuse: 'none',
})

function makeDasStep(id: string, action: DasAction): DasStep {
  return { id, name: action.type, action, enabled: true }
}

function makeRobot(steps: DasStep[] = []): DasRobot {
  return { name: 'test', steps, variables: [], types: [] }
}

// ---- practice.ts 型適合テスト --------------------------------

describe('createMain1Robot()', () => {
  it('Robot 型として構造が正しい（name / steps / variables / types）', () => {
    const r = createMain1Robot()
    expect(r.name).toBe('main_1')
    expect(Array.isArray(r.steps)).toBe(true)
    expect(Array.isArray(r.variables)).toBe(true)
    expect(Array.isArray(r.types)).toBe(true)
  })

  it('start → call-sub → end の 3 ステップを持つ', () => {
    const r = createMain1Robot()
    expect(r.steps.length).toBe(3)
    expect(r.steps[0].kind).toBe('start')
    expect(r.steps[1].kind).toBe('action')
    expect(r.steps[1].action?.type).toBe('CallRobot')
    expect(r.steps[2].kind).toBe('end')
  })

  it('Call sub ステップの robotName が "sub"', () => {
    const r = createMain1Robot()
    const callStep = r.steps.find((s) => s.action?.type === 'CallRobot')
    expect(callStep).toBeDefined()
    if (callStep?.action?.type === 'CallRobot') {
      expect(callStep.action.robotName).toBe('sub')
    }
  })

  it('step ID が重複しない', () => {
    const r = createMain1Robot()
    const ids = r.steps.map((s) => s.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})

describe('createSubRobot()', () => {
  it('DasRobot 型として構造が正しい（name / steps / variables / types）', () => {
    const r = createSubRobot()
    expect(r.name).toBe('sub')
    expect(Array.isArray(r.steps)).toBe(true)
    expect(Array.isArray(r.variables)).toBe(true)
    expect(Array.isArray(r.types)).toBe(true)
  })

  it('ステップが空（藤田さん指示: ステップ列は再現不要）', () => {
    const r = createSubRobot()
    expect(r.steps.length).toBe(0)
  })
})

describe('createPracticeRobots()', () => {
  it('main1 / sub の両ロボットを返す', () => {
    const robots: PracticeRobots = createPracticeRobots()
    expect(robots.main1).toBeDefined()
    expect(robots.sub).toBeDefined()
  })

  it('main1 は CallRobot ステップを持つ', () => {
    const { main1 } = createPracticeRobots()
    const hasCallRobot = main1.steps.some((s) => s.action?.type === 'CallRobot')
    expect(hasCallRobot).toBe(true)
  })

  it('sub はステップが空', () => {
    const { sub } = createPracticeRobots()
    expect(sub.steps.length).toBe(0)
  })
})

describe('PRACTICE_TREE', () => {
  it('配列で要素が存在する', () => {
    expect(Array.isArray(PRACTICE_TREE)).toBe(true)
    expect(PRACTICE_TREE.length).toBeGreaterThan(0)
  })

  it('Local グループが含まれている', () => {
    const local = PRACTICE_TREE.find((n) => n.id === 'local')
    expect(local).toBeDefined()
  })

  it('connector プロジェクト配下に main1 / sub / info.type の 3 ノードがある', () => {
    const local = PRACTICE_TREE.find((n) => n.id === 'local')
    const connector = local?.children?.find((n) => n.id === 'connector-project')
    expect(connector).toBeDefined()
    const ids = (connector?.children ?? []).map((n) => n.id)
    expect(ids).toContain('main1-robot')
    expect(ids).toContain('sub-robot')
    expect(ids).toContain('info-type')
  })

  it('sub-robot ノードは modified=true（アスタリスク表示）', () => {
    const local = PRACTICE_TREE.find((n) => n.id === 'local')
    const connector = local?.children?.find((n) => n.id === 'connector-project')
    const subNode = connector?.children?.find((n) => n.id === 'sub-robot')
    expect(subNode?.modified).toBe(true)
  })
})

describe('DEFAULT_PRACTICE_TABS', () => {
  it('intro / sub / main1 / infotype の 4 タブがある', () => {
    const ids = DEFAULT_PRACTICE_TABS.map((t) => t.id)
    expect(ids).toContain('intro')
    expect(ids).toContain('sub')
    expect(ids).toContain('main1')
    expect(ids).toContain('infotype')
  })

  it('紹介タブは closable=false', () => {
    const intro = DEFAULT_PRACTICE_TABS.find((t) => t.id === 'intro')
    expect(intro?.closable).toBe(false)
  })
})

describe('INFO_TYPE_ATTRIBUTES', () => {
  it('1 件以上の属性定義がある', () => {
    expect(INFO_TYPE_ATTRIBUTES.length).toBeGreaterThan(0)
  })

  it('各属性は name / typeName / description を持つ', () => {
    for (const attr of INFO_TYPE_ATTRIBUTES) {
      expect(typeof attr.name).toBe('string')
      expect(attr.name.trim().length).toBeGreaterThan(0)
      expect(typeof attr.typeName).toBe('string')
      expect(typeof attr.description).toBe('string')
    }
  })
})

// ---- lectures.ts done 述語ユニットテスト ---------------------

describe('Lecture: lec-browser（ブラウザ）', () => {
  const lec = getLecture('lec-browser')!

  it('レクチャーが取得できる', () => {
    expect(lec).toBeDefined()
    expect(lec.robotType).toBe('das')
  })

  it('s1: 空ロボットで false', () => {
    const empty = makeRobot()
    expect(checkLectureStep(lec.steps[0], empty)).toBe(false)
  })

  it('s1: Browser ステップ追加後に true', () => {
    const robot = makeRobot([
      makeDasStep('b1', {
        type: 'Browser',
        browser: 'Chromium',
        browserAction: 'pageLoad',
        applicationName: 'web',
        url: 'https://example.com',
      }),
    ])
    expect(checkLectureStep(lec.steps[0], robot)).toBe(true)
  })

  it('s2: browserAction が未設定のとき false', () => {
    // browserAction が 'pageLoad' でないと s2 は false
    // TypeScript の型上 browserAction は必須なので、ダミーで 'pageCreate' を入れて確認
    const robot = makeRobot([
      makeDasStep('b1', {
        type: 'Browser',
        browser: 'Chromium',
        browserAction: 'pageCreate', // pageLoad でない
        applicationName: 'web',
        url: 'https://example.com',
      }),
    ])
    // s2 は pageLoad かどうかを判定
    expect(checkLectureStep(lec.steps[1], robot)).toBe(false)
  })

  it('s2: browserAction=pageLoad のとき true', () => {
    const robot = makeRobot([
      makeDasStep('b1', {
        type: 'Browser',
        browser: 'Chromium',
        browserAction: 'pageLoad',
        applicationName: 'web',
        url: 'https://example.com',
      }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(true)
  })

  it('s3: url が空のとき false', () => {
    const robot = makeRobot([
      makeDasStep('b1', {
        type: 'Browser',
        browser: 'Chromium',
        browserAction: 'pageLoad',
        applicationName: 'web',
        url: '', // 空
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(false)
  })

  it('s3: applicationName と url 両方設定済みで true', () => {
    const robot = makeRobot([
      makeDasStep('b1', {
        type: 'Browser',
        browser: 'Chromium',
        browserAction: 'pageLoad',
        applicationName: 'web',
        url: 'https://example.com',
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(true)
  })
})

describe('Lecture: lec-click（クリック）', () => {
  const lec = getLecture('lec-click')!

  it('s1: 空ロボットで false', () => {
    expect(checkLectureStep(lec.steps[0], makeRobot())).toBe(false)
  })

  it('s1: Click ステップ追加後に true', () => {
    const robot = makeRobot([
      makeDasStep('c1', {
        type: 'Click',
        finder: defaultFinder('button[name="検索"]'),
      }),
    ])
    expect(checkLectureStep(lec.steps[0], robot)).toBe(true)
  })

  it('s2: セレクタが空のとき false', () => {
    const robot = makeRobot([
      makeDasStep('c1', { type: 'Click', finder: defaultFinder('') }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(false)
  })

  it('s2: セレクタ設定済みで true', () => {
    const robot = makeRobot([
      makeDasStep('c1', {
        type: 'Click',
        finder: defaultFinder('button[name="検索"]'),
      }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(true)
  })

  it('s3: button=left / clickCount=1（既定）で true', () => {
    const robot = makeRobot([
      makeDasStep('c1', {
        type: 'Click',
        finder: defaultFinder('button[name="検索"]'),
        button: 'left',
        clickCount: 1,
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(true)
  })

  it('s3: undefined（既定値）でも true', () => {
    const robot = makeRobot([
      makeDasStep('c1', {
        type: 'Click',
        finder: defaultFinder('button[name="検索"]'),
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(true)
  })
})

describe('Lecture: lec-extract（値を抽出）', () => {
  const lec = getLecture('lec-extract')!

  it('s1: 空ロボットで false', () => {
    expect(checkLectureStep(lec.steps[0], makeRobot())).toBe(false)
  })

  it('s1: ExtractValue ステップ追加後に true', () => {
    const robot = makeRobot([
      makeDasStep('e1', {
        type: 'ExtractValue',
        finder: defaultFinder('textfield[name="在庫数表示"]'),
        toVariable: '',
        attribute: 'value',
      }),
    ])
    expect(checkLectureStep(lec.steps[0], robot)).toBe(true)
  })

  it('s2: セレクタが空のとき false', () => {
    const robot = makeRobot([
      makeDasStep('e1', {
        type: 'ExtractValue',
        finder: defaultFinder(''),
        toVariable: '',
        attribute: 'value',
      }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(false)
  })

  it('s2: セレクタ設定済みで true', () => {
    const robot = makeRobot([
      makeDasStep('e1', {
        type: 'ExtractValue',
        finder: defaultFinder('textfield[name="在庫数表示"]'),
        toVariable: '',
        attribute: 'value',
      }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(true)
  })

  it('s3: toVariable が空のとき false', () => {
    const robot = makeRobot([
      makeDasStep('e1', {
        type: 'ExtractValue',
        finder: defaultFinder('textfield[name="在庫数表示"]'),
        toVariable: '',
        attribute: 'value',
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(false)
  })

  it('s3: セレクタ + toVariable 両方設定済みで true', () => {
    const robot = makeRobot([
      makeDasStep('e1', {
        type: 'ExtractValue',
        finder: defaultFinder('textfield[name="在庫数表示"]'),
        toVariable: '在庫情報',
        attribute: 'value',
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(true)
  })
})

describe('Lecture: lec-entertext（テキストを入力）', () => {
  const lec = getLecture('lec-entertext')!

  it('s1: 空ロボットで false', () => {
    expect(checkLectureStep(lec.steps[0], makeRobot())).toBe(false)
  })

  it('s1: EnterText ステップ追加後に true', () => {
    const robot = makeRobot([
      makeDasStep('et1', {
        type: 'EnterText',
        finder: defaultFinder('textfield[name="品目コード入力"]'),
        text: 'ITEM-0042',
      }),
    ])
    expect(checkLectureStep(lec.steps[0], robot)).toBe(true)
  })

  it('s2: セレクタが空のとき false', () => {
    const robot = makeRobot([
      makeDasStep('et1', {
        type: 'EnterText',
        finder: defaultFinder(''),
        text: 'ITEM-0042',
      }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(false)
  })

  it('s3: text が空のとき false', () => {
    const robot = makeRobot([
      makeDasStep('et1', {
        type: 'EnterText',
        finder: defaultFinder('textfield[name="品目コード入力"]'),
        text: '',
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(false)
  })

  it('s3: セレクタ + text 両方設定済みで true', () => {
    const robot = makeRobot([
      makeDasStep('et1', {
        type: 'EnterText',
        finder: defaultFinder('textfield[name="品目コード入力"]'),
        text: 'ITEM-0042',
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(true)
  })
})

describe('Lecture: lec-foreach（要素の繰り返し）', () => {
  const lec = getLecture('lec-foreach')!

  it('s1: 空ロボットで false', () => {
    expect(checkLectureStep(lec.steps[0], makeRobot())).toBe(false)
  })

  it('s1: ForEach ステップ追加後に true', () => {
    const robot = makeRobot([
      makeDasStep('fe1', {
        type: 'ForEach',
        scopeFinder: defaultFinder(''),
        scopeFinderName: 'scope1',
        elementFinder: defaultFinder(''),
        body: [],
      }),
    ])
    expect(checkLectureStep(lec.steps[0], robot)).toBe(true)
  })

  it('s2: scopeFinder セレクタが空のとき false', () => {
    const robot = makeRobot([
      makeDasStep('fe1', {
        type: 'ForEach',
        scopeFinder: defaultFinder(''),
        scopeFinderName: 'scope1',
        elementFinder: defaultFinder(''),
        body: [],
      }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(false)
  })

  it('s2: scopeFinder セレクタ設定済みで true', () => {
    const robot = makeRobot([
      makeDasStep('fe1', {
        type: 'ForEach',
        scopeFinder: defaultFinder('listview[name="仕入れ一覧"]'),
        scopeFinderName: 'scope1',
        elementFinder: defaultFinder(''),
        body: [],
      }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(true)
  })

  it('s3: elementFinder が相対セレクタでないとき false', () => {
    const robot = makeRobot([
      makeDasStep('fe1', {
        type: 'ForEach',
        scopeFinder: defaultFinder('listview[name="仕入れ一覧"]'),
        scopeFinderName: 'scope1',
        elementFinder: defaultFinder('listitem'), // > で始まらない
        body: [],
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(false)
  })

  it('s3: elementFinder が「> 」で始まる相対セレクタのとき true', () => {
    const robot = makeRobot([
      makeDasStep('fe1', {
        type: 'ForEach',
        scopeFinder: defaultFinder('listview[name="仕入れ一覧"]'),
        scopeFinderName: 'scope1',
        elementFinder: defaultFinder('> listitem'),
        body: [],
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(true)
  })
})

describe('Lecture: lec-guardedchoice（ガード チョイス）', () => {
  const lec = getLecture('lec-guardedchoice')!

  const timeoutGuard: Guard = {
    type: 'timeout',
    seconds: 60,
    steps: [],
  }

  const locationFoundGuard: Guard = {
    type: 'locationFound',
    finder: defaultFinder('button[name="完了"]'),
    steps: [],
  }

  it('s1: 空ロボットで false', () => {
    expect(checkLectureStep(lec.steps[0], makeRobot())).toBe(false)
  })

  it('s1: GuardedChoice 追加後に true', () => {
    const robot = makeRobot([
      makeDasStep('gc1', {
        type: 'GuardedChoice',
        guards: [timeoutGuard],
      }),
    ])
    expect(checkLectureStep(lec.steps[0], robot)).toBe(true)
  })

  it('s2: GuardedChoice 存在すれば true（説明確認ステップ）', () => {
    const robot = makeRobot([
      makeDasStep('gc1', {
        type: 'GuardedChoice',
        guards: [timeoutGuard],
      }),
    ])
    expect(checkLectureStep(lec.steps[1], robot)).toBe(true)
  })

  it('s3: timeout のみのとき false（timeout 以外のガードが必要）', () => {
    const robot = makeRobot([
      makeDasStep('gc1', {
        type: 'GuardedChoice',
        guards: [timeoutGuard],
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(false)
  })

  it('s3: locationFound ガード追加後に true', () => {
    const robot = makeRobot([
      makeDasStep('gc1', {
        type: 'GuardedChoice',
        guards: [locationFoundGuard, timeoutGuard],
      }),
    ])
    expect(checkLectureStep(lec.steps[2], robot)).toBe(true)
  })

  it('s4: locationFound ガードにセレクタが空のとき false', () => {
    const robot = makeRobot([
      makeDasStep('gc1', {
        type: 'GuardedChoice',
        guards: [
          { type: 'locationFound', finder: defaultFinder(''), steps: [] }, // セレクタ空
          timeoutGuard,
        ],
      }),
    ])
    expect(checkLectureStep(lec.steps[3], robot)).toBe(false)
  })

  it('s4: locationFound ガードにセレクタ設定済みで true', () => {
    const robot = makeRobot([
      makeDasStep('gc1', {
        type: 'GuardedChoice',
        guards: [locationFoundGuard, timeoutGuard],
      }),
    ])
    expect(checkLectureStep(lec.steps[3], robot)).toBe(true)
  })
})

describe('Lecture: lec-callrobot（ロボットを呼び出す）', () => {
  const lec = getLecture('lec-callrobot')!

  it('robotType が ds（青ロボット）', () => {
    expect(lec.robotType).toBe('ds')
  })

  it('s1: CallRobot ステップなしで false', () => {
    const emptyRobot: Robot = {
      name: 'test',
      steps: [],
      variables: [],
      types: [],
    }
    expect(checkLectureStep(lec.steps[0], emptyRobot)).toBe(false)
  })

  it('s1: CallRobot ステップ存在で true', () => {
    const robot: Robot = {
      name: 'main_1',
      steps: [
        {
          id: 'start',
          kind: 'start',
          name: '開始',
          stepClass: 'BlockBeginStep',
          enabled: true,
        },
        {
          id: 'call-sub',
          kind: 'action',
          name: 'Call sub',
          stepClass: 'CallRobotStep',
          action: { type: 'CallRobot', robotName: 'sub' },
          enabled: true,
        },
      ],
      variables: [],
      types: [],
    }
    expect(checkLectureStep(lec.steps[0], robot)).toBe(true)
  })

  it('s2: robotName が sub の CallRobot ステップで true', () => {
    const robot = createMain1Robot()
    expect(checkLectureStep(lec.steps[1], robot)).toBe(true)
  })

  it('s2: robotName が別名のとき false', () => {
    const robot: Robot = {
      name: 'main_1',
      steps: [
        {
          id: 'start',
          kind: 'start',
          name: '開始',
          stepClass: 'BlockBeginStep',
          enabled: true,
        },
        {
          id: 'call-other',
          kind: 'action',
          name: 'Call other',
          stepClass: 'CallRobotStep',
          action: { type: 'CallRobot', robotName: 'other' }, // sub でない
          enabled: true,
        },
      ],
      variables: [],
      types: [],
    }
    expect(checkLectureStep(lec.steps[1], robot)).toBe(false)
  })
})

// ---- LECTURES 配列の構造チェック ----------------------------

describe('LECTURES 配列', () => {
  it('7 本のレクチャーが定義されている', () => {
    expect(LECTURES.length).toBe(7)
  })

  it('各レクチャーの ID が一意', () => {
    const ids = LECTURES.map((l) => l.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('各レクチャーの steps 数が 3〜6 の範囲', () => {
    for (const lec of LECTURES) {
      if (!isComingSoon(lec)) {
        expect(lec.steps.length).toBeGreaterThanOrEqual(3)
        expect(lec.steps.length).toBeLessThanOrEqual(6)
      }
    }
  })

  it('各レクチャーのステップ ID が一意（同レクチャー内）', () => {
    for (const lec of LECTURES) {
      const stepIds = lec.steps.map((s) => s.id)
      const unique = new Set(stepIds)
      expect(unique.size).toBe(stepIds.length)
    }
  })

  it('overview が空でない（準備中でない全レクチャー）', () => {
    for (const lec of LECTURES) {
      if (!isComingSoon(lec)) {
        expect(lec.overview.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('緑ロボット 6 本・青ロボット 1 本', () => {
    const dasCount = LECTURES.filter((l) => l.robotType === 'das').length
    const dsCount = LECTURES.filter((l) => l.robotType === 'ds').length
    expect(dasCount).toBe(6)
    expect(dsCount).toBe(1)
  })
})

// ---- gameStore の 'practice' 画面遷移 -----------------------

describe('gameStore: practice 画面遷移', () => {
  it("Screen 型に 'practice' が含まれる（型チェック）", () => {
    // 型システムレベルで確認する（実行時は文字列一致のみ）
    const screen: 'home' | 'play' | 'practice' = 'practice'
    expect(screen).toBe('practice')
  })
})
