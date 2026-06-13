// ============================================================
// PracticeStudio — 実機練習編 DS シェル（全体レイアウト）
//
// 実機 Design Studio の 2 画面を忠実再現したシェル。
// レイアウト構成（実機画像 full_BER_real.png / full_Robot_real.png 準拠）:
//   [タイトルバー風ヘッダ]
//   [メニューバー]
//   [ツールバー + 右上検索ボックス]
//   [ガイドバー: レクチャー進行中のみ表示]
//   ┌─────────────────────────────────────────────────────────┐
//   │ 左: ProjectTree + DasPalette（緑タブ時）/ 空（青タブ時）  │
//   │ 中: FileTabs + タブコンテンツスロット                     │
//   │    ├ 紹介タブ（IntroTab）                                │
//   │    ├ sub.robot タブ（緑エディタ DasWorkflowView）         │
//   │    ├ main_1.robot タブ（青エディタ RobotView）            │
//   │    └ info.type タブ（TypeEditorTab）                     │
//   │ 右: プロパティ/データ状態（青タブ）| 検索結果/コメント/状態（緑タブ） │
//   └─────────────────────────────────────────────────────────┘
//   [ステータスバー]
//
// レクチャーエンジン:
//   - lecState で現在のレクチャー・ステップを管理
//   - done 述語をリアクティブに評価してガイドバーに反映
//   - sub.robot（緑）= dasRobotStore、main_1.robot（青）= robotStore をそれぞれ監視
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useRobotStore } from '../../store/robotStore'
import { useDasRobotStore } from '../../store/dasRobotStore'

import {
  DEFAULT_PRACTICE_TABS,
  createMain1Robot,
  createSubRobot,
  type PracticeTab,
  type PracticeTabId,
} from '../../data/practice'
import { getLecture, checkLectureStep } from '../../data/lectures'
import { PRACTICE_MOCK_APP } from '../../data/practiceMockApp'

// シェルコンポーネント
import MenuBar from './MenuBar'
import PracticeToolbar from './PracticeToolbar'
import ProjectTree from './ProjectTree'
import FileTabs from './FileTabs'
import GuideBar from './GuideBar'
import IntroTab from './IntroTab'
import TypeEditorTab from './TypeEditorTab'
import StatusBar, { type StatusBarHandle } from './StatusBar'

// 既存コンポーネント（再利用）
import DasWorkflowView from '../das/DasWorkflowView'
import DasPalette from '../das/DasPalette'
import RecorderView from '../das/RecorderView'
import DasStatePane from '../das/DasStatePane'
import RobotView from '../ds/RobotView'
import PropertiesPane from '../ds/PropertiesPane'
import DataStatePane from '../ds/DataStatePane'
import PanelFrame from '../ds/PanelFrame'

// 青ロボットのダミー MockSite（練習編では実機を使わないため最小構成）
import type { MockSite } from '../../model/site'
const PRACTICE_SITE: MockSite = {
  id: 'practice',
  url: 'about:blank',
  title: '（練習編）',
  singles: [],
}

// ---- レクチャー状態 ------------------------------------------

interface LectureState {
  lectureId: string
  stepIndex: number
}

// ---- パネル最小化状態 ----------------------------------------

interface PanelMinimized {
  leftPanel: boolean
  rightPanel: boolean
  recorderPanel: boolean
}

// ---- PracticeStudio 本体 =====================================

export default function PracticeStudio() {
  const goHome = useGameStore((s) => s.goHome)

  // ---- タブ状態 -----------------------------------------------
  const [tabs, setTabs] = useState<PracticeTab[]>(DEFAULT_PRACTICE_TABS)
  const [activeTabId, setActiveTabId] = useState<PracticeTabId>('intro')

  // ---- デザイン/デバッグ切替 -----------------------------------
  const [designMode, setDesignMode] = useState<'デザイン' | 'デバッグ'>('デザイン')

  // ---- 検索クエリ（右ペインの検索結果に反映） ------------------
  const [searchQuery, setSearchQuery] = useState('')

  // ---- パネル最小化状態（将来の最小化ボタン用に保持） ----------
  const [minimized] = useState<PanelMinimized>({
    leftPanel: false,
    rightPanel: false,
    recorderPanel: false,
  })

  // ---- レコーダービューの現在 tick（練習用 MockApp のアニメーション） ----
  const [recorderTick, setRecorderTick] = useState(0)

  // ---- レクチャー状態 -----------------------------------------
  const [lecState, setLecState] = useState<LectureState | null>(null)

  // ---- ステータスバー ref ------------------------------------
  const statusBarRef = useRef<StatusBarHandle>(null)
  const statusFlash = useCallback((msg: string) => {
    statusBarRef.current?.flash(msg)
  }, [])

  // ---- ロボットストア（練習編専用初期化） ----------------------
  const setRobot = useRobotStore((s) => s.setRobot)
  const dasLoadCustom = useDasRobotStore((s) => s.loadCustom)
  const dsRobot = useRobotStore((s) => s.robot)
  const dasRobot = useDasRobotStore((s) => s.robot)

  // 初回マウント時に練習用ロボットをロード
  useEffect(() => {
    setRobot(createMain1Robot())
    dasLoadCustom(createSubRobot())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- レクチャー done 述語の評価 ----------------------------
  const currentLecture = lecState ? getLecture(lecState.lectureId) : null
  const currentStep = currentLecture?.steps[lecState?.stepIndex ?? 0]

  // done 述語をリアクティブに評価（ロボット状態変化で再評価）
  const isDone = useMemo(() => {
    if (!currentStep) return false
    if (currentStep.done === null) return true
    try {
      const robot = currentLecture?.robotType === 'das' ? dasRobot : dsRobot
      return checkLectureStep(currentStep, robot)
    } catch {
      return false
    }
  }, [currentStep, currentLecture, dasRobot, dsRobot])

  // ---- タブ操作 -----------------------------------------------

  const openTab = useCallback((tabId: PracticeTabId) => {
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev
      // タブが閉じられていた場合は DEFAULT_PRACTICE_TABS から復元
      const defaultTab = DEFAULT_PRACTICE_TABS.find((t) => t.id === tabId)
      if (!defaultTab) return prev
      return [...prev, defaultTab]
    })
    setActiveTabId(tabId)
  }, [])

  const closeTab = useCallback((tabId: PracticeTabId) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId)
      if (filtered.length === 0) return prev // 1枚は残す
      return filtered
    })
    setActiveTabId((prev) => {
      if (prev !== tabId) return prev
      // 閉じたタブがアクティブの場合は左隣か先頭に切替
      const remaining = tabs.filter((t) => t.id !== tabId)
      const idx = tabs.findIndex((t) => t.id === tabId)
      return remaining[Math.max(0, idx - 1)]?.id ?? remaining[0]?.id ?? 'intro'
    })
  }, [tabs])

  // ---- レクチャー操作 -----------------------------------------

  const startLecture = useCallback((lectureId: string) => {
    const lec = getLecture(lectureId)
    if (!lec) return
    setLecState({ lectureId, stepIndex: 0 })
    // ロボット種別に応じてタブを切替
    if (lec.robotType === 'das') {
      // 緑ロボット: レクチャー開始前に sub.robot を空に初期化（前のレクチャー残骸で done を誤判定しないように）
      dasLoadCustom(createSubRobot())
      openTab('sub')
    } else {
      // 青ロボット: main_1.robot を初期状態に戻す（CallSub ステップを持つシードに再設定）
      setRobot(createMain1Robot())
      openTab('main1')
    }
  }, [openTab, dasLoadCustom, setRobot])

  const finishLecture = useCallback(() => {
    setLecState(null)
    // 紹介タブに戻す
    openTab('intro')
    setActiveTabId('intro')
  }, [openTab])

  const nextStep = useCallback(() => {
    if (!lecState || !currentLecture) return
    const nextIdx = lecState.stepIndex + 1
    if (nextIdx >= currentLecture.steps.length) {
      // 最終ステップ完了
      statusFlash(`レクチャー「${currentLecture.actionLabel}」を完了しました！`)
      finishLecture()
    } else {
      setLecState((prev) => prev ? { ...prev, stepIndex: nextIdx } : prev)
    }
  }, [lecState, currentLecture, statusFlash, finishLecture])

  // ---- デバッグタブクリック -----------------------------------
  const handleDebugClick = useCallback(() => {
    statusFlash('デバッグは練習編では未対応です（クエストで体験できます）')
  }, [statusFlash])

  // ---- 検索ハンドラ -------------------------------------------
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query) {
      statusFlash('検索結果はありません。')
    }
  }, [statusFlash])

  // ---- コメントテキスト（緑タブ右ペイン） ----------------------
  const [commentText, setCommentText] = useState('')

  // ---- 右ペインのタイトル判定 --------------------------------
  const isActiveGreenTab = activeTabId === 'sub'
  const isActiveBlueTab = activeTabId === 'main1'

  // ---- コンテキスト文字列（ステータスバー中央） ----------------
  const contextText =
    activeTabId === 'main1'
      ? 'C:\\RPA\\connector\\Library\\main_1.robot'
      : activeTabId === 'sub'
        ? 'C:\\RPA\\connector\\Library\\sub.robot'
        : activeTabId === 'infotype'
          ? 'C:\\RPA\\connector\\Library\\info.type'
          : ''

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-das-panelAlt text-das-text">

      {/* タイトルバー風ヘッダ（実機準拠の装飾） */}
      <div
        className="flex h-[28px] shrink-0 select-none items-center justify-between bg-[#2d3142] px-3 text-[11px] text-white/80"
        aria-label="タイトルバー"
      >
        <div className="flex items-center gap-2">
          {/* ウィンドウアイコン（DS ロゴ） */}
          <span className="text-[14px]" aria-hidden="true">🤖</span>
          <span>
            Design Studio - connector - C:\RPA\connector\Library\
            {activeTabId === 'main1'
              ? 'main_1.robot'
              : activeTabId === 'sub'
                ? 'sub.robot'
                : activeTabId === 'infotype'
                  ? 'info.type'
                  : '（練習編）'}
          </span>
        </div>
        {/* ウィンドウコントロール（装飾のみ） */}
        <div className="flex items-center gap-1" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-white/20" />
          <span className="h-3 w-3 rounded-full bg-white/20" />
          <span className="h-3 w-3 rounded-full bg-white/20" />
        </div>
      </div>

      {/* メニューバー */}
      <MenuBar onGoHome={goHome} />

      {/* ツールバー */}
      <PracticeToolbar onStatusFlash={statusFlash} onSearch={handleSearch} />

      {/* ガイドバー（レクチャー進行中のみ表示） */}
      {lecState && currentLecture && currentStep && (
        <GuideBar
          lectureTitle={currentLecture.actionLabel}
          stepIndex={lecState.stepIndex}
          totalSteps={currentLecture.steps.length}
          instruction={currentStep.instruction}
          isDone={isDone}
          hint={currentStep.hint}
          onNext={nextStep}
          onFinish={finishLecture}
        />
      )}

      {/* メインワークスペース */}
      <main className="flex min-h-0 flex-1 overflow-hidden">

        {/* 左: ProjectTree + 設定カラム（緑タブ）または DasPalette */}
        {!minimized.leftPanel && (
          <div className="flex w-[200px] shrink-0 flex-col overflow-hidden border-r border-das-border bg-das-panel">
            {/* 緑タブ時: 設定カラム（入力値/デバイス/データベース/リターンタイプ）+ パレット */}
            {isActiveGreenTab ? (
              <>
                <div className="min-h-0 shrink-0 overflow-y-auto border-b border-das-border" style={{ maxHeight: '50%' }}>
                  <DasSettingsColumn onStatusFlash={statusFlash} />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <DasPalette />
                </div>
              </>
            ) : (
              <>
                {/* ProjectTree（緑以外のタブ）*/}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <ProjectTree activeTabId={activeTabId} onOpenTab={openTab} />
                </div>
              </>
            )}
          </div>
        )}

        {/* 中央: FileTabs + タブコンテンツ */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-das-border">

          {/* ファイルタブバー */}
          <FileTabs
            tabs={tabs}
            activeTabId={activeTabId}
            designMode={designMode}
            onSetDesignMode={setDesignMode}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onDebugClick={handleDebugClick}
          />

          {/* タブコンテンツスロット */}
          <div
            id={`tabpanel-${activeTabId}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTabId}`}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >

            {/* 紹介タブ */}
            {activeTabId === 'intro' && (
              <IntroTab onStartLecture={startLecture} />
            )}

            {/* sub.robot（緑ロボットエディタ） */}
            {activeTabId === 'sub' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* ワークフローキャンバス */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <DasWorkflowView />
                </div>

                {/* レコーダービュー（練習用 MockApp を表示）*/}
                {!minimized.recorderPanel && (
                  <div className="h-[220px] shrink-0 overflow-hidden border-t border-das-border">
                    {/* tick スライダー（MockApp のアニメーション制御） */}
                    <div className="flex shrink-0 items-center gap-2 border-b border-das-border bg-das-panelAlt px-3 py-1 text-[11px]">
                      <label htmlFor="practice-tick-slider" className="shrink-0 text-das-textDim">
                        tick:
                      </label>
                      <input
                        id="practice-tick-slider"
                        type="range"
                        min={0}
                        max={10}
                        value={recorderTick}
                        onChange={(e) => setRecorderTick(Number(e.target.value))}
                        className="flex-1 accent-das-accent2"
                        aria-label="模擬アプリの時間軸（tick）"
                      />
                      <span className="w-6 shrink-0 text-right font-mono text-das-text">{recorderTick}</span>
                      <button
                        type="button"
                        onClick={() => setRecorderTick(0)}
                        className="shrink-0 rounded border border-das-border px-1.5 py-0.5 text-[10px] text-das-textDim hover:text-das-text"
                        title="tick をリセット"
                      >
                        リセット
                      </button>
                    </div>
                    <div className="h-[190px] overflow-hidden">
                      <RecorderView app={PRACTICE_MOCK_APP} currentTick={recorderTick} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* main_1.robot（青ロボットエディタ） */}
            {activeTabId === 'main1' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* ロボットビュー（React Flow） */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <RobotView />
                </div>

                {/* アプリケーションペイン（青ロボット画面。about:blank 表示） */}
                <div className="h-[200px] shrink-0 overflow-hidden border-t border-das-border">
                  <PanelFrame title="アプリケーション" hint="about:blank">
                    <div className="flex h-full flex-col">
                      {/* タブ: about:blank */}
                      <div className="flex shrink-0 items-center gap-1 border-b border-das-border bg-das-panelAlt px-2 py-0.5">
                        <span className="rounded border border-das-border bg-das-bg px-2 py-0.5 text-[11px] text-das-textDim">about:blank</span>
                      </div>
                      {/* アドレスバー＋ナビアイコン */}
                      <div className="flex shrink-0 items-center gap-1 border-b border-das-border bg-das-panelAlt px-2 py-0.5 text-[11px]">
                        <span className="flex gap-0.5 text-das-textDim/50 text-[10px]">
                          <button type="button" title="戻る" className="px-0.5 hover:text-das-text">◀</button>
                          <button type="button" title="進む" className="px-0.5 hover:text-das-text">▶</button>
                          <button type="button" title="更新" className="px-0.5 hover:text-das-text">↺</button>
                          <button type="button" title="ホーム" className="px-0.5 hover:text-das-text">🏠</button>
                        </span>
                        <span className="flex-1 rounded border border-das-border bg-das-bg px-1.5 py-0.5 text-[11px] text-das-textDim">about:blank</span>
                        <button
                          type="button"
                          onClick={() => statusFlash('練習編では実行できません（クエストで体験できます）')}
                          className="shrink-0 rounded border border-das-border px-1.5 py-0.5 text-[10px] text-das-textDim hover:text-das-text"
                          title="▶ 実行（練習編では無効）"
                        >
                          ▶
                        </button>
                      </div>
                      {/* 空白ページ表示エリア */}
                      <div className="flex-1 overflow-hidden bg-white">
                        {/* 空白ページ上部 */}
                        <div className="h-[40px] bg-white" />
                      </div>
                      {/* HTML ツリー（実機準拠: root > <html>…</html>）*/}
                      <div className="shrink-0 overflow-hidden border-t border-das-border bg-das-panelAlt/50">
                        <HtmlTreeView onStatusFlash={statusFlash} />
                      </div>
                    </div>
                  </PanelFrame>
                </div>
              </div>
            )}

            {/* info.type タブ */}
            {activeTabId === 'infotype' && <TypeEditorTab />}
          </div>
        </div>

        {/* 右: ペイン群 */}
        {!minimized.rightPanel && (
          <div className="flex w-[280px] shrink-0 flex-col overflow-hidden bg-das-panel">

            {/* 青タブ: プロパティ（上）+ データの状態（下） */}
            {isActiveBlueTab && (
              <>
                <div className="min-h-0 flex-[3] overflow-hidden border-b border-das-border">
                  <PracticeCallRobotPropertiesPane
                    onOpenSubTab={() => openTab('sub')}
                    onStatusFlash={statusFlash}
                  />
                </div>
                <div className="min-h-0 flex-[2] overflow-hidden">
                  <DataStatePane />
                </div>
              </>
            )}

            {/* 緑タブ: 検索結果 / コメント / 状態 */}
            {isActiveGreenTab && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* 検索結果 */}
                <div className="min-h-0 flex-[2] overflow-hidden border-b border-das-border">
                  <PanelFrame title="検索結果">
                    <div className="p-3 text-[12px] text-das-textDim">
                      {searchQuery
                        ? `「${searchQuery}」の検索結果はありません。`
                        : '検索結果はありません。'}
                    </div>
                  </PanelFrame>
                </div>
                {/* コメント（自由入力テキストエリア）*/}
                <div className="min-h-0 flex-[2] overflow-hidden border-b border-das-border">
                  <PanelFrame title="コメント" hint="自由に入力できます">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="コメントを入力..."
                      aria-label="コメント"
                      className="h-full w-full resize-none bg-das-bg p-2 text-[12px] text-das-text placeholder:text-das-textDim/50 focus:outline-none focus:ring-1 focus:ring-das-accent2"
                    />
                  </PanelFrame>
                </div>
                {/* 状態 */}
                <div className="min-h-0 flex-[3] overflow-hidden">
                  <DasStatePane />
                </div>
              </div>
            )}

            {/* 紹介 / info.type タブ: 空の右ペイン */}
            {!isActiveBlueTab && !isActiveGreenTab && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <PanelFrame title="プロパティ">
                  <div className="p-3 text-[12px] text-das-textDim">
                    ステップまたは接続が選択されていません。
                  </div>
                </PanelFrame>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ステータスバー */}
      <StatusBar ref={statusBarRef} contextText={contextText} />
    </div>
  )
}

// ---- 練習編専用の CallRobot プロパティペイン --------------------
// 実機の「ロボットを呼び出す」アクション設定 UI を再現する。
// main_1.robot の「Call sub」ステップ選択時に表示される。

interface PracticeCallRobotPropertiesPaneProps {
  onOpenSubTab: () => void
  onStatusFlash: (msg: string) => void
}

type PropTab = '基本' | 'ファインダー' | 'アクション' | 'エラー処理'
const PROP_TABS: PropTab[] = ['基本', 'ファインダー', 'アクション', 'エラー処理']

function PracticeCallRobotPropertiesPane({
  onOpenSubTab,
  onStatusFlash,
}: PracticeCallRobotPropertiesPaneProps) {
  const robot = useRobotStore((s) => s.robot)
  const selectedId = useRobotStore((s) => s.selectedStepId)
  const step = robot.steps.find((s) => s.id === selectedId)
  const [propTab, setPropTab] = useState<PropTab>('アクション')

  if (!step) {
    return (
      <PanelFrame title="プロパティ" hint="選択中ステップの設定">
        <div className="p-3 text-[12px] text-das-textDim">ステップまたは接続が選択されていません。</div>
      </PanelFrame>
    )
  }

  const a = step.action
  const isCallRobot = a?.type === 'CallRobot'

  return (
    <PanelFrame title="プロパティ" hint={step.stepClass}>
      {/* タブ */}
      <div className="flex border-b border-das-border bg-das-panelAlt/60 text-[11px]">
        {PROP_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setPropTab(t)}
            className={[
              'px-2 py-1.5',
              propTab === t
                ? 'border-b-2 border-das-accent2 text-das-text'
                : 'text-das-textDim hover:text-das-text',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3 overflow-auto p-3 text-[12px]">
        {propTab === '基本' && (
          <div>
            <div className="mb-1 text-[11px] text-das-textDim">ステップ名</div>
            <div className="rounded border border-das-border bg-das-bg px-2 py-1 text-das-text">{step.name}</div>
            <div className="mt-2 mb-1 text-[11px] text-das-textDim">ステップクラス</div>
            <div className="rounded border border-das-border bg-das-bg px-2 py-1 font-mono text-[11px] text-das-textDim">{step.stepClass}</div>
          </div>
        )}

        {propTab === 'アクション' && (
          <div className="space-y-3">
            {/* アクション名（実機準拠のドロップダウン風ボタン） */}
            <div className="flex w-full items-center justify-between rounded border border-das-border2 bg-das-panelAlt px-3 py-1.5 text-[13px] font-semibold text-das-text">
              <span>ロボットを呼び出す</span>
              <span className="text-das-textDim text-[11px]">▼</span>
            </div>

            {/* 説明文 */}
            <div className="flex items-start gap-2">
              <p className="flex-1 text-[11px] leading-relaxed text-das-textDim">
                このアクションは、ロボットを呼び出すために使用されます。
              </p>
              <span title="ヘルプ" className="cursor-help text-[13px] text-das-accent2">?</span>
            </div>

            <div className="border-t border-das-border" />

            {/* ロボット選択行 */}
            {isCallRobot && a.type === 'CallRobot' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-right text-[11px] text-das-textDim">ロボット:</span>
                  <div className="flex flex-1 items-center gap-1">
                    <div className="flex-1 rounded border border-das-border bg-das-bg px-2 py-1 text-[12px] text-das-text">
                      {a.robotName}
                      <span className="ml-1 text-das-textDim text-[11px]">▼</span>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenSubTab}
                      className="shrink-0 rounded border border-das-accent2 bg-das-accent2/10 px-2 py-1 text-[11px] text-das-accent2 hover:bg-das-accent2/20 active:bg-das-accent2/30"
                      title={`${a.robotName}.robot を開く`}
                    >
                      開く
                    </button>
                  </div>
                </div>

                {/* 入力値リスト */}
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-right text-[11px] text-das-textDim">入力値:</span>
                  <div className="flex-1">
                    <div className="min-h-[40px] rounded border border-das-border bg-das-bg px-2 py-1 text-[11px] text-das-textDim/60">
                      （入力値なし）
                    </div>
                    <div className="mt-0.5 flex gap-0.5 text-[11px] text-das-textDim">
                      {['⊕', '⊖', '↑', '↓', '🗑'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          title={s}
                          onClick={() => onStatusFlash('入力値の編集は練習編では未対応です')}
                          className="rounded bg-das-panelAlt px-1 hover:bg-das-border"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* デバイス */}
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-right text-[11px] text-das-textDim">デバイス:</span>
                  <div className="flex-1 rounded border border-das-border bg-das-bg px-2 py-1 text-[11px] text-das-textDim/60">（なし）</div>
                </div>

                {/* データベース */}
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-right text-[11px] text-das-textDim">データベース:</span>
                  <div className="flex-1 rounded border border-das-border bg-das-bg px-2 py-1 text-[11px] text-das-textDim/60">（なし）</div>
                </div>
              </div>
            )}

            {/* 非 CallRobot アクション */}
            {!isCallRobot && (
              <PropertiesPane site={PRACTICE_SITE} />
            )}
          </div>
        )}

        {propTab === 'ファインダー' && (
          <div className="text-[12px] text-das-textDim">
            「ロボットを呼び出す」アクションにファインダーはありません。
          </div>
        )}

        {propTab === 'エラー処理' && (
          <div className="text-[12px] text-das-textDim">
            エラー時の動作: 後続のステップをスキップ
          </div>
        )}
      </div>
    </PanelFrame>
  )
}

// ---- HTML ツリービュー（青タブ・アプリケーションペイン下部）-----
// 実機画像: root > <html>…</html> の展開可能ツリー + 右に小パネル + ▶ + 「スタイルを無視」チェック

interface HtmlTreeViewProps {
  onStatusFlash: (msg: string) => void
}

function HtmlTreeView({ onStatusFlash }: HtmlTreeViewProps) {
  const [htmlExpanded, setHtmlExpanded] = useState(false)
  const [ignoreStyle, setIgnoreStyle] = useState(false)

  return (
    <div className="flex items-start gap-1 px-2 py-1 text-[11px]">
      {/* HTML ツリー */}
      <div className="flex-1 font-mono text-[10px] text-das-textDim">
        {/* root ノード */}
        <div className="flex items-center gap-0.5">
          <span className="cursor-default text-das-textDim/60">□</span>
          <span className="text-das-text">root</span>
        </div>
        {/* html ノード */}
        <div className="ml-3">
          <div
            className="flex cursor-pointer items-center gap-0.5 hover:text-das-text"
            onClick={() => setHtmlExpanded((v) => !v)}
            aria-expanded={htmlExpanded}
            role="treeitem"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHtmlExpanded((v) => !v) } }}
          >
            <span className="text-[9px] text-das-textDim">{htmlExpanded ? '▼' : '▶'}</span>
            <span className="text-blue-600">&lt;html&gt;</span>
            <span className="text-das-textDim/60">…</span>
            <span className="text-blue-600">&lt;/html&gt;</span>
          </div>
          {htmlExpanded && (
            <div className="ml-3 text-das-textDim/70">
              <div>&lt;head&gt;…&lt;/head&gt;</div>
              <div>&lt;body&gt;…&lt;/body&gt;</div>
            </div>
          )}
        </div>
      </div>

      {/* 右側コントロール */}
      <div className="flex shrink-0 items-center gap-1">
        {/* ▶（実行: inert） */}
        <button
          type="button"
          onClick={() => onStatusFlash('練習編では実行できません（クエストで体験できます）')}
          className="flex h-5 w-5 items-center justify-center rounded border border-das-border text-[10px] text-das-textDim hover:text-das-text"
          title="▶ 実行（練習編では無効）"
          aria-label="実行（練習編では無効）"
        >
          ▶
        </button>
        {/* スタイルを無視 チェック */}
        <label className="flex cursor-pointer select-none items-center gap-0.5 text-[10px] text-das-textDim hover:text-das-text">
          <input
            type="checkbox"
            checked={ignoreStyle}
            onChange={(e) => setIgnoreStyle(e.target.checked)}
            className="h-3 w-3 accent-das-accent2"
            aria-label="スタイルを無視"
          />
          スタイルを無視
        </label>
      </div>
    </div>
  )
}

// ---- 緑ロボット設定カラム（sub.robot 左パネル）-----------------
// 実機画像 full_Robot_real.png: 入力値 / デバイス / データベース / リターンタイプ
// 各セクションに「＋ ○○ を追加」ボタン、追加した行に⊖削除ボタン

interface DasSettingsColumnProps {
  onStatusFlash: (msg: string) => void
}

// 設定アイテムの型（入力値・デバイス・データベース）
interface SettingsItem {
  id: string
  label: string
}

function DasSettingsColumn({ onStatusFlash }: DasSettingsColumnProps) {
  const [inputs, setInputs] = useState<SettingsItem[]>([])
  const [devices, setDevices] = useState<SettingsItem[]>([])
  const [databases, setDatabases] = useState<SettingsItem[]>([])
  const [returnType, setReturnType] = useState<string>('')

  let nextId = 0
  const genId = () => `setting-${Date.now()}-${nextId++}`

  const addItem = (
    setter: React.Dispatch<React.SetStateAction<SettingsItem[]>>,
    defaultLabel: string,
  ) => {
    setter((prev) => [...prev, { id: genId(), label: defaultLabel }])
  }

  const removeItem = (
    setter: React.Dispatch<React.SetStateAction<SettingsItem[]>>,
    id: string,
  ) => {
    setter((prev) => prev.filter((it) => it.id !== id))
  }

  const updateLabel = (
    setter: React.Dispatch<React.SetStateAction<SettingsItem[]>>,
    id: string,
    label: string,
  ) => {
    setter((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)))
  }

  return (
    <div className="space-y-0 text-[11px]" aria-label="緑ロボット設定カラム">
      {/* セクション共通スタイル */}
      {(
        [
          {
            title: '入力値' as const,
            items: inputs,
            setter: setInputs,
            placeholder: '入力値名',
            addLabel: '入力値 を追加',
          },
          {
            title: 'デバイス' as const,
            items: devices,
            setter: setDevices,
            placeholder: 'デバイス名',
            addLabel: 'デバイス を追加',
          },
          {
            title: 'データベース' as const,
            items: databases,
            setter: setDatabases,
            placeholder: 'データベース名',
            addLabel: 'データベース を追加',
          },
        ] satisfies Array<{
          title: string
          items: SettingsItem[]
          setter: React.Dispatch<React.SetStateAction<SettingsItem[]>>
          placeholder: string
          addLabel: string
        }>
      ).map((section) => (
        <SettingsSection
          key={section.title}
          title={section.title}
          items={section.items}
          placeholder={section.placeholder}
          addLabel={section.addLabel}
          onAdd={() => addItem(section.setter, '')}
          onRemove={(id) => removeItem(section.setter, id)}
          onUpdateLabel={(id, label) => updateLabel(section.setter, id, label)}
          onStatusFlash={onStatusFlash}
        />
      ))}

      {/* リターンタイプ */}
      <div className="border-t border-das-border px-2 py-2">
        <div className="mb-1 flex items-center gap-1">
          <span className="font-semibold text-das-textDim">リターン タイプ</span>
          <button
            type="button"
            className="ml-0.5 cursor-help text-[11px] text-das-accent2"
            onClick={() => onStatusFlash('リターン タイプ: このロボットが返す値の型を指定します')}
            title="ヘルプ"
            aria-label="リターンタイプのヘルプ"
          >
            ?
          </button>
          <button
            type="button"
            className="ml-auto text-[11px] text-das-textDim"
            onClick={() => onStatusFlash('リターンタイプの編集は練習編では未対応です')}
            title="最小化"
            aria-label="最小化"
          >
            ^
          </button>
        </div>
        <div className="rounded border border-das-border bg-das-bg px-2 py-1 text-[11px] text-das-textDim/60">
          {returnType || '（リターンなし）'}
        </div>
        <button
          type="button"
          onClick={() => {
            const val = prompt('リターンタイプを入力（例: string）')
            if (val !== null) setReturnType(val)
          }}
          className="mt-1 w-full rounded border border-dashed border-das-border px-1.5 py-0.5 text-[10px] text-das-textDim hover:border-das-accent2 hover:text-das-accent2"
        >
          ＋ リターン タイプ を設定
        </button>
      </div>
    </div>
  )
}

// ---- 設定カラム各セクション -----------------------------------

interface SettingsSectionProps {
  title: string
  items: SettingsItem[]
  placeholder: string
  addLabel: string
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdateLabel: (id: string, label: string) => void
  onStatusFlash: (msg: string) => void
}

function SettingsSection({
  title,
  items,
  placeholder,
  addLabel,
  onAdd,
  onRemove,
  onUpdateLabel,
  onStatusFlash,
}: SettingsSectionProps) {
  // セクション展開状態（初期: 展開）
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border-b border-das-border px-2 py-2">
      {/* セクションヘッダ */}
      <div className="mb-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[9px] text-das-textDim"
          aria-label={expanded ? `${title}を折りたたむ` : `${title}を展開する`}
          aria-expanded={expanded}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className="font-semibold text-das-textDim">{title}</span>
        <button
          type="button"
          className="ml-0.5 cursor-help text-[11px] text-das-accent2"
          onClick={() => onStatusFlash(`${title}: ${addLabel}`)}
          title="ヘルプ"
          aria-label={`${title}のヘルプ`}
        >
          ?
        </button>
        <button
          type="button"
          className="ml-auto text-[11px] text-das-textDim"
          onClick={() => setExpanded((v) => !v)}
          title="最小化"
          aria-label="最小化"
        >
          ^
        </button>
      </div>

      {expanded && (
        <>
          {/* アイテム一覧 */}
          {items.length === 0 && (
            <div className="text-[10px] text-das-textDim/60 italic">
              使用できる{title}がありません
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="mb-0.5 flex items-center gap-1">
              <input
                type="text"
                value={item.label}
                onChange={(e) => onUpdateLabel(item.id, e.target.value)}
                placeholder={placeholder}
                aria-label={`${title}名`}
                className="flex-1 rounded border border-das-border bg-das-bg px-1.5 py-0.5 text-[11px] text-das-text placeholder:text-das-textDim/50 focus:outline-none focus:ring-1 focus:ring-das-accent2"
              />
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="shrink-0 rounded px-1 text-[11px] text-das-textDim hover:text-das-err"
                title={`${title}を削除`}
                aria-label={`${title}を削除`}
              >
                ⊖
              </button>
            </div>
          ))}

          {/* 追加ボタン */}
          <button
            type="button"
            onClick={onAdd}
            className="mt-1 w-full rounded border border-dashed border-das-border px-1.5 py-0.5 text-[10px] text-das-textDim hover:border-das-accent2 hover:text-das-accent2"
          >
            ＋ {addLabel}
          </button>
        </>
      )}
    </div>
  )
}
