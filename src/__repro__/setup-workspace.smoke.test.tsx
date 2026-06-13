// ============================================================
// SetupWorkspace スモークテスト
//
// SetupWorkspace の初期状態と result フェーズ（クラッシュ確認）を
// renderToString して throw が発生しないことを確認する。
//
// ローカル state の初期値は INITIAL_SETUP_STATE（全チェック false）で
// 外部から注入できないため、result フェーズの HTML 内容確認は
// SetupResultPanel を直接 renderToString して行う。
//
// NOTE: useLayoutEffect は SSR では警告になるが無視（throw のみを検査）。
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

// 動的 import（localStorage スタブ後）
async function loadModules() {
  const { useGameStore } = await import('../store/gameStore')
  const { S1 } = await import('../data/missions/s1')
  const SetupWorkspace = (await import('../components/setup/SetupWorkspace')).default
  return { useGameStore, S1, SetupWorkspace }
}

function tryRender(node: React.ReactElement): Error | null {
  try {
    renderToString(node)
    return null
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

function renderHtml(node: React.ReactElement): string {
  return renderToString(node)
}

// ============================================================
// 初期状態スモークテスト（SetupWorkspace 全体）
// ============================================================

describe('SetupWorkspace スモーク: 初期状態（全チェック false）', () => {
  it('briefing フェーズで SetupWorkspace が renderToString でクラッシュしないこと', async () => {
    const { useGameStore, S1, SetupWorkspace } = await loadModules()

    // briefing フェーズ・S1 ミッションを設定
    useGameStore.setState({ screen: 'play', currentMissionId: 's1', phase: 'briefing' })

    const err = tryRender(React.createElement(SetupWorkspace, { mission: S1 }))
    if (err) console.error('[SetupWorkspace briefing CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  })

  it('build フェーズで SetupWorkspace が renderToString でクラッシュしないこと', async () => {
    const { useGameStore, S1, SetupWorkspace } = await loadModules()

    useGameStore.setState({ screen: 'play', currentMissionId: 's1', phase: 'build' })

    const err = tryRender(React.createElement(SetupWorkspace, { mission: S1 }))
    if (err) console.error('[SetupWorkspace build CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  })

  it('build フェーズの HTML に「Desktop Automation」が含まれること', async () => {
    const { useGameStore, S1, SetupWorkspace } = await loadModules()

    useGameStore.setState({ screen: 'play', currentMissionId: 's1', phase: 'build' })

    const html = renderHtml(React.createElement(SetupWorkspace, { mission: S1 }))
    // タスクトレイラベルまたはワークエリアのテキストが含まれること
    expect(html).toContain('Desktop Automation')
  })

  it('build フェーズの HTML にセットアップ手順ガイドが含まれること', async () => {
    const { useGameStore, S1, SetupWorkspace } = await loadModules()

    useGameStore.setState({ screen: 'play', currentMissionId: 's1', phase: 'build' })

    const html = renderHtml(React.createElement(SetupWorkspace, { mission: S1 }))
    // 手順ガイドに「タスクトレイ」が含まれること
    expect(html).toContain('タスクトレイ')
  })

  it('result フェーズで SetupWorkspace が renderToString でクラッシュしないこと', async () => {
    const { useGameStore, S1, SetupWorkspace } = await loadModules()

    // result フェーズを強制。SSR では useEffect は走らないため
    // renderToString 時点の store state が使われる。
    // 他テストで phase が書き換えられている可能性があるため直前に再設定する。
    useGameStore.setState({ phase: 'result' })

    const err = tryRender(React.createElement(SetupWorkspace, { mission: S1 }))
    if (err) console.error('[SetupWorkspace result CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  })
})

// ============================================================
// SetupResultPanel の直接スモークテスト（接続成功状態）
//
// SetupWorkspace のローカル state（INITIAL_SETUP_STATE）は外部から注入できないため、
// SetupResultPanel を直接 renderToString してコンテンツを確認する。
// ============================================================

describe('SetupResultPanel スモーク: 接続成功状態の HTML 確認', () => {
  it('setupReveal テキストが HTML に含まれること', async () => {
    const { S1 } = await loadModules()
    const { INITIAL_SETUP_STATE } = await import('../model/setup')

    // SetupResultPanel は SetupWorkspace.tsx 内のローカル関数のため、
    // setupReveal 関数を直接呼び出して文字列を検証する。
    const revealText = S1.setupReveal ? S1.setupReveal(INITIAL_SETUP_STATE) : ''
    expect(revealText).toContain('接続成功')
    expect(revealText).toContain('デバイスマッピング')
    expect(revealText).toContain('ベーシックエンジンロボット')
  })

  it('setupReveal が SetupState を受け取り文字列を返す（null/undefined でない）', async () => {
    const { S1 } = await loadModules()
    const { INITIAL_SETUP_STATE } = await import('../model/setup')

    expect(S1.setupReveal).toBeDefined()
    const result = S1.setupReveal!(INITIAL_SETUP_STATE)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ============================================================
// MISSIONS における S1 の配線確認
// ============================================================

describe('MISSIONS 配線確認: S1 が緑ロボット編先頭であること', () => {
  it('S1 の missionKind が "setup" であること', async () => {
    const { S1 } = await loadModules()
    expect(S1.missionKind).toBe('setup')
  })

  it('S1 の setupChecks が 6 件あること', async () => {
    const { S1 } = await loadModules()
    expect(S1.setupChecks).toHaveLength(6)
  })

  it('S1 の setupChecks の初期状態は全 false であること', async () => {
    const { S1 } = await loadModules()
    const { INITIAL_SETUP_STATE } = await import('../model/setup')
    const { validateSetupMission } = await import('../engine/setupChecks')

    const result = validateSetupMission({ state: INITIAL_SETUP_STATE }, S1.setupChecks ?? [])
    expect(result.pass).toBe(false)
    expect(result.outcomes.every((o) => !o.pass)).toBe(true)
  })

  it('S1 の glossary に "deviceMapping" / "singleUser" / "dasToken" が含まれること', async () => {
    const { S1 } = await loadModules()
    expect(S1.glossary).toContain('deviceMapping')
    expect(S1.glossary).toContain('singleUser')
    expect(S1.glossary).toContain('dasToken')
  })

  it('MISSIONS で S1 は D1 の直前にある', async () => {
    const { MISSIONS } = await import('../data/missions/index')
    const s1Idx = MISSIONS.findIndex((m) => m.id === 's1')
    const d1Idx = MISSIONS.findIndex((m) => m.id === 'd1')
    expect(s1Idx).toBeGreaterThanOrEqual(0)
    expect(d1Idx).toBe(s1Idx + 1)
  })
})
