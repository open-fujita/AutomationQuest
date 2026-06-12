// ============================================================
// DasWorkspaceLayout — 緑ロボット専用の全体レイアウト
//
// 青ロボット（App.tsx の既存レイアウト）と完全に独立したコンポーネント。
// App.tsx で mission.robotType === 'das' の場合にここを描画する。
//
// レイアウト構成（実機 DS 参考）:
//   左: マイプロジェクト + DasPalette
//   中: DasWorkflowView（上）+ RecorderView（下）
//   右: DasPropertiesPane（上）+ DasStatusView（下）
//   上: Toolbar + MissionBar
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

import DasWorkflowView from './DasWorkflowView'
import RecorderView from './RecorderView'
import DasPropertiesPane from './DasPropertiesPane'
import DasPalette from './DasPalette'
import DasStatusView from './DasStatusView'
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
      // dasChecks がないミッションのための空バリデーション
      return {
        pass: sim.ran && sim.errors.length === 0,
        outcomes: [],
        firstHint: sim.ran && sim.errors.length > 0 ? sim.errors[0] : null,
      }
    }
    return validateDasMission({ robot, sim }, mission.dasChecks)
  }, [robot, sim, mission])

  // 実行ボタン
  const onRun = () => {
    if (!mission.mockApp) {
      // mockApp がないミッションは空実行
      setSim({ ran: true, data: {}, log: [], errors: [], totalTick: 0, guardResults: [] })
      return
    }
    const result = runDasRobot(robot, mission.mockApp, {
      maxTick: 120,
      defaultTimeoutTick: 60,
    })
    setSim(result)
    // 実行後は最終 tick を表示
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

  // DAS ミッション用 ResultPanel に渡す sim（型変換: DasSimResult → SimResult 相当）
  // ResultPanel は mission.reveal(sim) を呼ぶが、DAS ミッションの reveal は undefined のことが多い
  // reveal が未定義の場合はデフォルト文字列を使う
  const dasSimForResult = sim as unknown as import('../../model/sim').SimResult

  return (
    <div className="flex h-screen flex-col bg-ds-bg text-ds-text">
      <Toolbar
        onRun={onRun}
        onHome={goHome}
        onOpenGlossary={() => setShowGlossary(true)}
        onOpenProgress={() => setShowProgress(true)}
      />

      {showWorkspaceChrome && (
        <MissionBar
          mission={mission}
          validation={validation}
          ran={sim.ran}
        />
      )}

      <main className="flex min-h-0 flex-1">
        {/* 左: マイプロジェクト + パレット */}
        <div className="flex w-[220px] shrink-0 flex-col border-r border-ds-border">
          <div className="min-h-0 flex-1">
            <MyProjectsPane />
          </div>
          <DasPalette />
        </div>

        {/* 中央: ロボットビュー（上）+ レコーダービュー（下） */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-ds-border">
          {/* デザイン/デバッグ + ファイルタブ（緑ロボット版） */}
          <div className="flex shrink-0 items-center gap-1 border-b border-ds-border bg-ds-panelAlt px-2 py-1 text-[12px]">
            <span className="rounded bg-green-500/20 px-2 py-0.5 text-[11px] text-green-300">
              緑ロボット（DAS）
            </span>
            <span className="mx-1 text-ds-border2">|</span>
            <span className="flex items-center gap-1 rounded-t border border-b-0 border-ds-border bg-ds-bg px-2 py-0.5 text-ds-text">
              🤖 {robot.name}.robot
            </span>
          </div>

          {/* ロボットビュー（上半分） */}
          <div className="min-h-0 flex-1 border-b border-ds-border">
            <DasWorkflowView />
          </div>

          {/* レコーダービュー（下半分） */}
          <div className="min-h-0 flex-1">
            <RecorderView
              app={mission.mockApp ?? null}
              currentTick={currentTick}
            />
          </div>
        </div>

        {/* 右: プロパティ（上）+ ステータス（下） */}
        <div className="flex w-[330px] shrink-0 flex-col">
          <div className="min-h-0 flex-1 border-b border-ds-border">
            <DasPropertiesPane />
          </div>
          <div className="min-h-0 flex-1">
            {/* tick スライダー（模擬アプリの時間軸コントロール） */}
            {mission.mockApp && mission.mockApp.timeline.length > 0 && (
              <div className="shrink-0 border-b border-ds-border bg-ds-panelAlt px-3 py-1.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <label htmlFor="tick-slider" className="shrink-0 text-ds-textDim">
                    tick:
                  </label>
                  <input
                    id="tick-slider"
                    type="range"
                    min={0}
                    max={120}
                    value={currentTick}
                    onChange={(e) => setCurrentTick(Number(e.target.value))}
                    className="flex-1 accent-ds-accent2"
                    aria-label="模擬アプリの時間軸（tick）"
                  />
                  <span className="w-8 shrink-0 text-right font-mono text-ds-text">{currentTick}</span>
                </div>
              </div>
            )}
            <DasStatusView />
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
    </div>
  )
}
