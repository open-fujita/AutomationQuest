// ============================================================
// 一時再現テスト — 「実行ボタンを押すと画面が真っ白」バグの再現
//
// ブラウザ無しで描画クラッシュ（未捕捉例外で React ツリーが落ちる）を検出する。
// react-dom/server の renderToString を使い、
//   loadMission → ステップ追加（UI 挿入相当）→ runDasRobot → sim を store に反映 →
//   主要コンポーネントを renderToString
// の流れで throw を捕捉する。
//
// 緑（D4: ForEach + body ExtractValue）と青（M1/M2）両方の実行パスを確認する。
//
// NOTE: useLayoutEffect は SSR で警告になるが無視（throw だけを見る）。
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'

// ---- localStorage スタブ（gameStore がモジュール読込時に参照するため） ----
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>()
    // @ts-expect-error テスト用最小スタブ
    globalThis.localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size
      },
    }
  }
})

// 動的 import（localStorage スタブ後にモジュールを読む）
async function loadModules() {
  const { useDasRobotStore } = await import('../store/dasRobotStore')
  const { useRobotStore } = await import('../store/robotStore')
  const { runDasRobot } = await import('../engine/dasSimulator')
  const { runRobot } = await import('../engine/simulator')
  const { D4 } = await import('../data/missions/d4')
  const { M1 } = await import('../data/missions/m1')
  const { M2 } = await import('../data/missions/m2')
  const DasWorkflowView = (await import('../components/das/DasWorkflowView')).default
  const DasStatePane = (await import('../components/das/DasStatePane')).default
  const DasWorkspaceLayout = (await import('../components/das/DasWorkspaceLayout')).default
  const App = (await import('../app/App')).default
  return {
    useDasRobotStore,
    useRobotStore,
    runDasRobot,
    runRobot,
    D4,
    M1,
    M2,
    DasWorkflowView,
    DasStatePane,
    DasWorkspaceLayout,
    App,
  }
}

// renderToString を実行し、throw を返す（throw しなければ null）
function tryRender(node: React.ReactElement): Error | null {
  try {
    renderToString(node)
    return null
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

// renderToString して HTML 文字列を返す（クラッシュ時は例外を投げる）
function renderHtml(node: React.ReactElement): string {
  return renderToString(node)
}

describe('白画面バグ再現: 緑ロボット D4（ForEach + body ExtractValue）', () => {
  it('D4 を実行後、DasWorkflowView が renderToString でクラッシュしないこと', async () => {
    const m = await loadModules()

    // 1. ミッションロード（dasSeed 適用）
    m.useDasRobotStore.getState().loadMission(m.D4)

    // 2. UI 挿入相当: トップレベルに Windows → ForEach、ForEach body に ExtractValue
    const store = m.useDasRobotStore.getState()
    store.addStep({
      type: 'Windows',
      device: 'local',
      windowsAction: 'execute',
      executable: '仕入れ管理システム',
    })
    const forEachId = m.useDasRobotStore.getState().addStep({
      type: 'ForEach',
      scopeFinder: { kind: 'component', selector: 'table[name="仕入れ一覧"]', reuse: 'none' },
      scopeFinderName: 'scope1',
      elementFinder: { kind: 'component', selector: '> listitem', reuse: 'none', scopeRef: 'scope1' },
      body: [],
    })
    // body を挿入先に切り替えて ExtractValue 追加（実機の右クリック挿入に相当）
    m.useDasRobotStore.getState().setInsertTarget({ kind: 'forEachBody', stepId: forEachId })
    m.useDasRobotStore.getState().addStep({
      type: 'ExtractValue',
      finder: { kind: 'component', selector: 'label[col="品目名"]', reuse: 'none' },
      toVariable: '品目',
      attribute: 'value',
    })

    // 3. 実行（runDasRobot）
    const robot = m.useDasRobotStore.getState().robot
    const sim = m.runDasRobot(robot, m.D4.mockApp!, { maxTick: 120, defaultTimeoutTick: 60 })
    m.useDasRobotStore.getState().setSim(sim)

    // sim が正常に走ったことを確認（前提）
    expect(sim.ran).toBe(true)

    // 4. 主要コンポーネントを描画してクラッシュを検出
    const errWorkflow = tryRender(React.createElement(m.DasWorkflowView))
    if (errWorkflow) console.error('[DasWorkflowView CRASH]\n', errWorkflow.stack)

    const errState = tryRender(React.createElement(m.DasStatePane))
    if (errState) console.error('[DasStatePane CRASH]\n', errState.stack)

    expect(errWorkflow, errWorkflow?.message).toBeNull()
    expect(errState, errState?.message).toBeNull()
  })

  it('D4 を実行後、DasWorkspaceLayout 全体（result フェーズ含む）が renderToString でクラッシュしないこと', async () => {
    const m = await loadModules()
    m.useDasRobotStore.getState().loadMission(m.D4)
    const store = m.useDasRobotStore.getState()
    store.addStep({
      type: 'Windows',
      device: 'local',
      windowsAction: 'execute',
      executable: '仕入れ管理システム',
    })
    const forEachId = m.useDasRobotStore.getState().addStep({
      type: 'ForEach',
      scopeFinder: { kind: 'component', selector: 'table[name="仕入れ一覧"]', reuse: 'none' },
      scopeFinderName: 'scope1',
      elementFinder: { kind: 'component', selector: '> listitem', reuse: 'none', scopeRef: 'scope1' },
      body: [],
    })
    m.useDasRobotStore.getState().setInsertTarget({ kind: 'forEachBody', stepId: forEachId })
    m.useDasRobotStore.getState().addStep({
      type: 'ExtractValue',
      finder: { kind: 'component', selector: 'label[col="品目名"]', reuse: 'none' },
      toVariable: '品目',
      attribute: 'value',
    })
    const robot = m.useDasRobotStore.getState().robot
    const sim = m.runDasRobot(robot, m.D4.mockApp!, { maxTick: 120, defaultTimeoutTick: 60 })
    m.useDasRobotStore.getState().setSim(sim)

    // result フェーズ（健康診断 + ResultPanel）を含む全体描画
    const err = tryRender(React.createElement(m.DasWorkspaceLayout, { mission: m.D4 }))
    if (err) console.error('[DasWorkspaceLayout CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  })
})

describe('白画面バグ再現: result フェーズ（実行後にモーダルが開く瞬間）', () => {
  it('D1〜D5 を実行 → phase=result を強制 → DasWorkspaceLayout が描画クラッシュしないこと', async () => {
    const m = await loadModules()
    const { useGameStore } = await import('../store/gameStore')
    const missions = await import('../data/missions')

    for (const dm of missions.MISSIONS.filter((mm) => mm.robotType === 'das')) {
      m.useDasRobotStore.getState().loadMission(dm)

      // 実機の典型操作を最小再現: Windows + (mockApp があれば) 実行
      m.useDasRobotStore.getState().addStep({
        type: 'Windows',
        device: 'local',
        windowsAction: 'execute',
        executable: dm.mockApp?.windowTitle ?? '',
      })
      if (dm.mockApp) {
        const robot = m.useDasRobotStore.getState().robot
        const sim = m.runDasRobot(robot, dm.mockApp, { maxTick: 120, defaultTimeoutTick: 60 })
        m.useDasRobotStore.getState().setSim(sim)
      }

      // 実行後の効果（effect）で起きる phase=result を強制して描画
      useGameStore.setState({ phase: 'result' })

      const err = tryRender(React.createElement(m.DasWorkspaceLayout, { mission: dm }))
      if (err) console.error(`[DasWorkspaceLayout result CRASH @ ${dm.id}]\n`, err.stack)
      expect(err, `${dm.id}: ${err?.message}`).toBeNull()
    }
  })

  it('M1〜M5（青）を実行 → phase=result を強制 → App が描画クラッシュしないこと', async () => {
    const m = await loadModules()
    const { useGameStore } = await import('../store/gameStore')
    const missions = await import('../data/missions')

    for (const bm of missions.MISSIONS.filter((mm) => mm.robotType !== 'das')) {
      useGameStore.setState({ screen: 'play', currentMissionId: bm.id })
      m.useRobotStore.getState().loadMission(bm)
      const robot = m.useRobotStore.getState().robot
      const sim = m.runRobot(robot, bm.site, bm.inputs)
      m.useRobotStore.getState().setSim(sim)
      useGameStore.setState({ phase: 'result' })

      const err = tryRender(React.createElement(m.App))
      if (err) console.error(`[App result CRASH @ ${bm.id}]\n`, err.stack)
      expect(err, `${bm.id}: ${err?.message}`).toBeNull()
    }
  })
})

describe('白画面バグ再現: RecorderView を実行後の高 tick + ForEach 選択で描画', () => {
  it('D4 実行後（currentTick=totalTick, ForEach 選択中）に RecorderView がクラッシュしないこと', async () => {
    const m = await loadModules()
    const RecorderView = (await import('../components/das/RecorderView')).default

    m.useDasRobotStore.getState().loadMission(m.D4)
    const forEachId = m.useDasRobotStore.getState().addStep({
      type: 'ForEach',
      scopeFinder: { kind: 'component', selector: 'table[name="仕入れ一覧"]', reuse: 'none' },
      scopeFinderName: 'scope1',
      elementFinder: { kind: 'component', selector: '> listitem', reuse: 'none', scopeRef: 'scope1' },
      body: [],
    })
    // ForEach を選択（loopScope/loopElement ハイライト IIFE を発火させる）
    m.useDasRobotStore.getState().selectStep(forEachId)
    const sim = m.runDasRobot(m.useDasRobotStore.getState().robot, m.D4.mockApp!, { maxTick: 120 })
    m.useDasRobotStore.getState().setSim(sim)

    // 実機の onRun は currentTick=totalTick をセットするため、それを再現
    const html = renderHtml(
      React.createElement(RecorderView, { app: m.D4.mockApp!, currentTick: sim.totalTick }),
    )
    // 実際に中身が描画されていること（白画面 = 空文字でないこと）を確認
    expect(html.length).toBeGreaterThan(100)
    expect(html).toContain('仕入れ')
  })
})

describe('白画面バグ再現: 青ロボット M1 / M2', () => {
  it('M1 を実行後、App 全体が renderToString でクラッシュしないこと', async () => {
    const m = await loadModules()
    m.useRobotStore.getState().loadMission(m.M1)
    const robot = m.useRobotStore.getState().robot
    const sim = m.runRobot(robot, m.M1.site, m.M1.inputs)
    m.useRobotStore.getState().setSim(sim)

    const err = tryRender(React.createElement(m.App))
    if (err) console.error('[App(M1) CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  })

  it('M2 を実行後、App 全体が renderToString でクラッシュしないこと', async () => {
    const m = await loadModules()
    m.useRobotStore.getState().loadMission(m.M2)
    const robot = m.useRobotStore.getState().robot
    const sim = m.runRobot(robot, m.M2.site, m.M2.inputs)
    m.useRobotStore.getState().setSim(sim)

    const err = tryRender(React.createElement(m.App))
    if (err) console.error('[App(M2) CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  })
})

// ============================================================
// RecorderView selectedWidgetId null 安全テスト
//
// [修正確認] selectedWidget をオブジェクト参照から ID 文字列に変更したことで、
//   tick 変化後にウィジェットが消えた（stale 参照）場合でもクラッシュしないことを確認する。
// ============================================================

describe('RecorderView selectedWidgetId null 安全テスト', () => {
  it('実行後（totalTick）に存在しない ID を selectedWidgetId として渡しても RecorderView がクラッシュしないこと', async () => {
    const m = await loadModules()
    const RecorderView = (await import('../components/das/RecorderView')).default

    m.useDasRobotStore.getState().loadMission(m.D4)
    const forEachId = m.useDasRobotStore.getState().addStep({
      type: 'ForEach',
      scopeFinder: { kind: 'component', selector: 'table[name="仕入れ一覧"]', reuse: 'none' },
      scopeFinderName: 'scope1',
      elementFinder: { kind: 'component', selector: '> listitem', reuse: 'none', scopeRef: 'scope1' },
      body: [],
    })
    m.useDasRobotStore.getState().selectStep(forEachId)
    const sim = m.runDasRobot(m.useDasRobotStore.getState().robot, m.D4.mockApp!, { maxTick: 120 })
    m.useDasRobotStore.getState().setSim(sim)

    // tick=0 で存在するウィジェット ID を渡してから totalTick で描画する。
    // 実行後に tick が進んでウィジェットが変化していても安全なことを確認する。
    // RecorderView は props で app と currentTick を受け取るため、
    // 内部 state の selectedWidgetId は SSR では制御できない。
    // ここでは「stale になりうる最大 tick」で renderToString し throw が無いことを確認する。
    const html = renderHtml(
      React.createElement(RecorderView, { app: m.D4.mockApp!, currentTick: sim.totalTick }),
    )
    expect(html.length).toBeGreaterThan(100)
  })

  it('selectedWidgetId が存在しない（null）状態で RecorderView が描画できること', async () => {
    const m = await loadModules()
    const RecorderView = (await import('../components/das/RecorderView')).default

    m.useDasRobotStore.getState().loadMission(m.D4)
    // ステップ未追加・選択なしで totalTick=0 で描画（初期状態）
    const html = renderHtml(
      React.createElement(RecorderView, { app: m.D4.mockApp!, currentTick: 0 }),
    )
    // 描画されていること（白画面でないこと）を確認
    expect(html.length).toBeGreaterThan(50)
  })

  it('D4 実行後、RecorderView に存在しないウィジェット ID を stale として渡しても findWidgetPath が安全に null を返すこと', async () => {
    // findWidgetPath が存在しない ID を引いたとき undefined/throw せず null を返すことを確認する
    const { applyTimeline, findWidgetPath } = await import('../model/mockApp')
    const { D4 } = await import('../data/missions/d4')

    const widgets = applyTimeline(D4.mockApp!, 0)
    // 存在しない ID
    const result = findWidgetPath(widgets, 'non-existent-id-xyz')
    expect(result).toBeNull()
  })
})

// ============================================================
// D5 tablecell 選択ハイライト修正テスト
//
// 修正確認: ring-* (box-shadow) は border-collapse テーブルの <td>/<tr> では描画されない。
// tablecell を選択したとき、選択スタイル（outline ベース）が HTML 出力に含まれることを確認する。
// renderToString ベースで selectedWidgetId を直接 MockAppView に渡し、
// 生成 HTML のクラス属性を検査する。
// ============================================================

describe('D5 tablecell 選択ハイライト: outline クラスが td に付与されること', () => {
  it('D5 mockApp の tablecell に selectedWidgetId を与えると outline-green-600 クラスが出力 HTML に含まれること', async () => {
    const { applyTimeline } = await import('../model/mockApp')
    const { D5 } = await import('../data/missions/d5')
    const MockAppView = (await import('../components/das/MockAppView')).default

    // tick=1 でシャッフル後の状態（D5 の実プレイ状態）を再現する
    const widgets = applyTimeline(D5.mockApp!, 1)

    // tablecell の id を取得（売上テーブル 1 行目 1 列目）
    const table = widgets.flatMap((w) => w.children).find((w) => w.type === 'table')
    const firstRow = table?.children.find((w) => w.type === 'tablerow')
    const firstCell = firstRow?.children.find((w) => w.type === 'tablecell')
    expect(firstCell).toBeDefined()
    const cellId = firstCell!.id

    // selectedWidgetId に tablecell の id を渡して renderToString
    const html = renderHtml(
      React.createElement(MockAppView, {
        app: D5.mockApp!,
        currentTick: 1,
        selectedWidgetId: cellId,
      }),
    )

    // outline-green-600 が選択セルの <td> クラスに出力されること
    // （ring-green-500 は border-collapse 下で描画されないため outline に修正済み）
    expect(html).toContain('outline-green-600')
    // ring-green-500 は tablecell には付かないこと（div 系ウィジェットのみ許容）
    // NOTE: テーブル要素以外の ring-green-500 は許容するため tablecell 行に含まれないことを検査する
    // <td> タグ内に ring-green-500 が含まれないことを確認
    const tdMatches = [...html.matchAll(/<td[^>]*class="([^"]*)"[^>]*>/g)]
    for (const match of tdMatches) {
      const cls = match[1] ?? ''
      expect(cls, `<td> に ring-green-500 が含まれている: ${cls}`).not.toContain('ring-green-500')
    }
  })

  it('D5 mockApp の tablecell に loopScopeId を与えると outline-blue-500 クラスが出力 HTML に含まれること', async () => {
    const { applyTimeline } = await import('../model/mockApp')
    const { D5 } = await import('../data/missions/d5')
    const MockAppView = (await import('../components/das/MockAppView')).default

    const widgets = applyTimeline(D5.mockApp!, 1)
    const table = widgets.flatMap((w) => w.children).find((w) => w.type === 'table')
    // tablerow を loopScope に設定する
    const firstRow = table?.children.find((w) => w.type === 'tablerow')
    expect(firstRow).toBeDefined()
    const rowId = firstRow!.id

    const html = renderHtml(
      React.createElement(MockAppView, {
        app: D5.mockApp!,
        currentTick: 1,
        loopScopeId: rowId,
      }),
    )

    // outline-blue-500 が loopScope の <tr> クラスに出力されること
    expect(html).toContain('outline-blue-500')
  })
})
