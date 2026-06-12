// ============================================================
// DasWorkspaceLayout — 緑ロボット専用の全体レイアウト（2026.1 準拠リワーク）
//
// 実機 DS のレイアウト構成（DS_2.png 準拠）:
//   左:   マイプロジェクト + DasPalette（カタログ表示）
//   中央上: タブバー（デザイン/デバッグ + ロボットファイルタブ）
//   中央:  ワークフローキャンバス（横フロー: ○—[Card]—○）overflow-x: auto
//   下:   レコーダービュー（模擬アプリ画面 | 要素ツリー）
//   右:   状態（変数）パネル + tick スライダー（DasStatePane）
//
// 変更点（旧実装との差分）:
//   - 右パネル: 状態（変数）パネル（DasStatePane）
//   - 中央: ワークフロービュー + 下部レコーダービューの縦分割に変更
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import type { Mission } from '../../model/mission'
import { runDasRobot } from '../../engine/dasSimulator'
import { validateDasMission } from '../../engine/dasValidator'
import { useDasRobotStore } from '../../store/dasRobotStore'
import { useGameStore } from '../../store/gameStore'
import { MISSIONS } from '../../data/missions'

import Toolbar from '../ds/Toolbar'
import MissionBar from '../game/MissionBar'
import MissionBriefing from '../game/MissionBriefing'
import DeductionPanel from '../game/DeductionPanel'
import ResultPanel from '../game/ResultPanel'
import Glossary from '../game/Glossary'
import ProgressMap from '../game/ProgressMap'
import HealthRulesPanel from '../game/HealthRulesPanel'

import { diagnose } from '../../engine/healthCheck'

import DasWorkflowView from './DasWorkflowView'
import RecorderView from './RecorderView'
import DasPalette from './DasPalette'
import DasStatePane from './DasStatePane'
import MyProjectsPane from '../ds/MyProjectsPane'

interface DasWorkspaceLayoutProps {
  mission: Mission
}

export default function DasWorkspaceLayout({ mission }: DasWorkspaceLayoutProps) {
  const phase = useGameStore((s) => s.phase)
  const setPhase = useGameStore((s) => s.setPhase)
  const completeMission = useGameStore((s) => s.completeMission)
  const unlockTerms = useGameStore((s) => s.unlockTerms)
  const goHome = useGameStore((s) => s.goHome)
  const setMission = useGameStore((s) => s.setMission)
  const currentMissionId = useGameStore((s) => s.currentMissionId)

  const robot = useDasRobotStore((s) => s.robot)
  const sim = useDasRobotStore((s) => s.sim)
  const setSim = useDasRobotStore((s) => s.setSim)
  const loadMission = useDasRobotStore((s) => s.loadMission)

  const [showGlossary, setShowGlossary] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showHealthRules, setShowHealthRules] = useState(false)
  // 現在の tick（RecorderView の模擬アプリ描画に使う）
  const [currentTick, setCurrentTick] = useState(0)

  // ミッション切り替え時にロボットを初期化
  useEffect(() => {
    loadMission(mission)
    setPhase('briefing')
    setCurrentTick(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMissionId])

  // DAS バリデーション（dasChecks がある場合のみ）
  const validation = useMemo(() => {
    if (!mission.dasChecks || mission.dasChecks.length === 0) {
      return {
        pass: sim.ran && sim.errors.length === 0,
        outcomes: [],
        firstHint: sim.ran && sim.errors.length > 0 ? sim.errors[0] : null,
      }
    }
    return validateDasMission({ robot, sim }, mission.dasChecks)
  }, [robot, sim, mission])

  // クリア時の健康診断（result フェーズになったタイミングで実行）
  const healthFindings = useMemo(
    () => (phase === 'result' ? diagnose(robot, mission) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, mission],
  )

  // 実行ボタン
  const onRun = () => {
    if (!mission.mockApp) {
      setSim({ ran: true, data: {}, log: [], errors: [], totalTick: 0, guardResults: [] })
      return
    }
    const result = runDasRobot(robot, mission.mockApp, {
      maxTick: 120,
      defaultTimeoutTick: 60,
    })
    setSim(result)
    setCurrentTick(result.totalTick)
  }

  // 受け入れ条件をすべて満たしたら解決（結果）へ
  useEffect(() => {
    if (phase === 'build' && sim.ran && validation.pass) {
      completeMission(mission.id)
      unlockTerms(mission.glossary)
      setPhase('result')
    }
  }, [phase, sim.ran, validation.pass, mission, completeMission, unlockTerms, setPhase])

  const onNext = () => {
    const idx = MISSIONS.findIndex((m) => m.id === mission.id)
    const next = MISSIONS[idx + 1]
    if (next) setMission(next.id)
  }
  const hasNext = MISSIONS.findIndex((m) => m.id === mission.id) < MISSIONS.length - 1

  const showWorkspaceChrome = phase === 'build' || phase === 'result'

  const dasSimForResult = sim as unknown as import('../../model/sim').SimResult

  return (
    <div className="flex h-screen flex-col bg-ds-bg text-ds-text">
      <Toolbar
        onRun={onRun}
        onHome={goHome}
        onOpenGlossary={() => setShowGlossary(true)}
        onOpenProgress={() => setShowProgress(true)}
        onOpenHealthRules={() => setShowHealthRules(true)}
      />

      {showWorkspaceChrome && (
        <MissionBar
          mission={mission}
          validation={validation}
          ran={sim.ran}
        />
      )}

      {/* DAS ワークスペース本体: ライトテーマ領域 */}
      <main className="flex min-h-0 flex-1 bg-das-panelAlt">
        {/* ---- 左: マイプロジェクト + パレット ---- */}
        {/* [data-das-light] で ds-* トークンのダーク色を CSS で上書き */}
        <div
          className="flex w-[200px] shrink-0 flex-col border-r border-das-border overflow-hidden bg-das-panel text-das-text"
          data-das-light="true"
        >
          <div className="shrink-0">
            <MyProjectsPane />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DasPalette />
          </div>
        </div>

        {/* ---- 中央: ワークフローキャンバス（上）+ レコーダービュー（下）---- */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-das-border">
          {/* タブバー: デザイン/デバッグ + ロボットファイルタブ */}
          <div className="flex shrink-0 items-center gap-1 border-b border-das-border bg-das-panelAlt px-2 py-1 text-[12px]">
            <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] text-green-700 border border-green-200">
              緑ロボット（DAS）
            </span>
            <span className="mx-1 text-das-border2">|</span>
            <span className="flex items-center gap-1 rounded-t border border-b-0 border-das-border bg-das-bg px-2 py-0.5 text-das-text">
              🤖 {robot.name}.robot
            </span>
          </div>

          {/* ワークフローキャンバス（上: flex-1, min-h-0） */}
          <div className="min-h-0 flex-1 border-b border-das-border overflow-hidden">
            <DasWorkflowView />
          </div>

          {/* レコーダービュー（下: 固定高 h-[280px]） */}
          <div className="h-[280px] shrink-0 overflow-hidden">
            <RecorderView
              app={mission.mockApp ?? null}
              currentTick={currentTick}
            />
          </div>
        </div>

        {/* ---- 右: 状態（変数）パネル + tick スライダー ---- */}
        <div className="flex w-[280px] shrink-0 flex-col overflow-hidden bg-das-panel">
          {/* tick スライダー（mockApp がある場合のみ表示） */}
          {mission.mockApp && mission.mockApp.timeline.length > 0 && (
            <div className="shrink-0 border-b border-das-border bg-das-panelAlt px-3 py-2">
              <div className="flex items-center gap-2 text-[11px]">
                <label htmlFor="tick-slider-das" className="shrink-0 text-das-textDim">
                  tick:
                </label>
                <input
                  id="tick-slider-das"
                  type="range"
                  min={0}
                  max={120}
                  value={currentTick}
                  onChange={(e) => setCurrentTick(Number(e.target.value))}
                  className="flex-1 accent-das-accent2"
                  aria-label="模擬アプリの時間軸（tick）"
                />
                <span className="w-8 shrink-0 text-right font-mono text-das-text">{currentTick}</span>
              </div>
            </div>
          )}
          {/* 状態パネル（変数一覧 + 実行ログ）*/}
          <div className="min-h-0 flex-1 overflow-hidden">
            <DasStatePane />
          </div>
        </div>
      </main>

      {/* フェーズ別モーダル */}
      {phase === 'briefing' && <MissionBriefing mission={mission} onAccept={() => setPhase('deduction')} />}
      {phase === 'deduction' && <DeductionPanel mission={mission} onProceed={() => setPhase('build')} />}
      {phase === 'result' && (
        <ResultPanel
          mission={mission}
          sim={dasSimForResult}
          hasNext={hasNext}
          onNext={onNext}
          healthFindings={healthFindings}
        />
      )}

      {/* 独立モーダル */}
      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
      {showProgress && (
        <ProgressMap
          onClose={() => setShowProgress(false)}
          onJump={(id) => setMission(id)}
        />
      )}
      {showHealthRules && <HealthRulesPanel onClose={() => setShowHealthRules(false)} />}
    </div>
  )
}
