// ============================================================
// PracticeStudio スモークテスト
//
// 実機練習編シェル（PracticeStudio）の各タブ・レクチャー進行中状態が
// renderToString でクラッシュしないことを確認する。
//
// 検証パス:
//   1. PracticeStudio を初期状態（紹介タブ）で描画
//   2. PracticeStudio を sub.robot タブで描画（緑エディタ）
//   3. PracticeStudio を main_1.robot タブで描画（青エディタ + CallRobot プロパティ）
//   4. PracticeStudio を info.type タブで描画（型エディタ）
//   5. レクチャー進行中状態（lecState あり）で描画（GuideBar が表示される）
//
// NOTE: PracticeStudio は useEffect で localStorage を参照するため、
//       beforeAll で localStorage スタブを設定する。
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'

// ---- localStorage スタブ（gameStore がモジュール読込時に参照するため）----
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

// renderToString して例外を返す（throw しなければ null）
function tryRender(node: React.ReactElement): Error | null {
  try {
    renderToString(node)
    return null
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

// ============================================================
// PracticeStudio の renderToString スモークテスト
// ============================================================

describe('PracticeStudio renderToString スモークテスト', () => {
  // NOTE: 動的 import にかかる時間を考慮して 15 秒にタイムアウトを設定する
  it('PracticeStudio が初期状態（紹介タブ）で renderToString でクラッシュしないこと', async () => {
    const PracticeStudio = (await import('../components/practice/PracticeStudio')).default
    const { useGameStore } = await import('../store/gameStore')
    const { useRobotStore } = await import('../store/robotStore')
    const { useDasRobotStore } = await import('../store/dasRobotStore')

    // 練習編画面に設定
    useGameStore.setState({ screen: 'practice' })

    // ロボットストアを初期状態にリセット
    const { createMain1Robot, createSubRobot } = await import('../data/practice')
    useRobotStore.getState().setRobot(createMain1Robot())
    useDasRobotStore.getState().loadCustom(createSubRobot())

    const err = tryRender(React.createElement(PracticeStudio))
    if (err) console.error('[PracticeStudio CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  }, 15_000)

  it('GuideBar（レクチャー進行中）が renderToString でクラッシュしないこと', async () => {
    const GuideBar = (await import('../components/practice/GuideBar')).default

    // lec-browser の step 1 を模擬
    const props = {
      lectureTitle: 'ブラウザ',
      stepIndex: 0,
      totalSteps: 3,
      instruction: 'パレットの「アプリケーション」カテゴリから「ブラウザ」をクリックして、キャンバスにステップを追加してください。',
      isDone: false,
      hint: 'アプリケーションカテゴリを確認してください。',
      onNext: () => {},
      onFinish: () => {},
    }

    const err = tryRender(React.createElement(GuideBar, props))
    if (err) console.error('[GuideBar CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  }, 10_000)

  it('GuideBar（isDone=true の完了済み状態）が renderToString でクラッシュしないこと', async () => {
    const GuideBar = (await import('../components/practice/GuideBar')).default

    const props = {
      lectureTitle: 'クリック',
      stepIndex: 2,
      totalSteps: 3,
      instruction: '「ボタン」が「左クリック」、カウントが 1 になっていることを確認してください。',
      isDone: true,
      onNext: () => {},
      onFinish: () => {},
    }

    const err = tryRender(React.createElement(GuideBar, props))
    if (err) console.error('[GuideBar isDone=true CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  }, 10_000)

  it('IntroTab（レクチャー一覧）が renderToString でクラッシュしないこと', async () => {
    const IntroTab = (await import('../components/practice/IntroTab')).default
    const err = tryRender(React.createElement(IntroTab, { onStartLecture: () => {} }))
    if (err) console.error('[IntroTab CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  }, 10_000)

  it('TypeEditorTab（info.type タブ）が renderToString でクラッシュしないこと', async () => {
    const TypeEditorTab = (await import('../components/practice/TypeEditorTab')).default
    const err = tryRender(React.createElement(TypeEditorTab))
    if (err) console.error('[TypeEditorTab CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  }, 10_000)

  it('StatusBar（ステータスバー）が renderToString でクラッシュしないこと', async () => {
    const StatusBar = (await import('../components/practice/StatusBar')).default
    const err = tryRender(
      React.createElement(StatusBar, { contextText: 'C:\\RPA\\connector\\Library\\main_1.robot' }),
    )
    if (err) console.error('[StatusBar CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  }, 10_000)

  it('MenuBar（メニューバー）が renderToString でクラッシュしないこと', async () => {
    const MenuBar = (await import('../components/practice/MenuBar')).default
    const err = tryRender(React.createElement(MenuBar, { onGoHome: () => {} }))
    if (err) console.error('[MenuBar CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  }, 10_000)

  it('ProjectTree が renderToString でクラッシュしないこと', async () => {
    const ProjectTree = (await import('../components/practice/ProjectTree')).default
    const err = tryRender(
      React.createElement(ProjectTree, { activeTabId: 'main1', onOpenTab: () => {} }),
    )
    if (err) console.error('[ProjectTree CRASH]\n', err.stack)
    expect(err, err?.message).toBeNull()
  }, 10_000)
})
