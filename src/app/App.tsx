import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useRobotStore } from '../store/robotStore'
import { MISSIONS, getMission } from '../data/missions'
import { runRobot } from '../engine/simulator'
import { validateMission } from '../engine/validator'

import Toolbar from '../components/ds/Toolbar'
import MyProjectsPane from '../components/ds/MyProjectsPane'
import Palette from '../components/ds/Palette'
import RobotView from '../components/ds/RobotView'
import BrowserView from '../components/ds/BrowserView'
import DataStatePane from '../components/ds/DataStatePane'
import PropertiesPane from '../components/ds/PropertiesPane'
import StatusView from '../components/ds/StatusView'

import MissionBar from '../components/game/MissionBar'
import MissionBriefing from '../components/game/MissionBriefing'
import DeductionPanel from '../components/game/DeductionPanel'
import ResultPanel from '../components/game/ResultPanel'
import Glossary from '../components/game/Glossary'
import ProgressMap from '../components/game/ProgressMap'
import HomeScreen from '../components/game/HomeScreen'
import HealthRulesPanel from '../components/game/HealthRulesPanel'

import { diagnose } from '../engine/healthCheck'

// 緑ロボット（DAS）専用レイアウト
import DasWorkspaceLayout from '../components/das/DasWorkspaceLayout'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  const goHome = useGameStore((s) => s.goHome)
  const currentMissionId = useGameStore((s) => s.currentMissionId)
  const phase = useGameStore((s) => s.phase)
  const setPhase = useGameStore((s) => s.setPhase)
  const setMission = useGameStore((s) => s.setMission)
  const completeMission = useGameStore((s) => s.completeMission)
  const unlockTerms = useGameStore((s) => s.unlockTerms)

  const robot = useRobotStore((s) => s.robot)
  const sim = useRobotStore((s) => s.sim)
  const setSim = useRobotStore((s) => s.setSim)
  const loadMission = useRobotStore((s) => s.loadMission)

  const mission = getMission(currentMissionId) ?? MISSIONS[0]

  const [showGlossary, setShowGlossary] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showHealthRules, setShowHealthRules] = useState(false)
  const [designMode, setDesignMode] = useState<'デザイン' | 'デバッグ'>('デザイン')

  // ミッション切り替え時にロボットを初期化（seed 適用）。
  // ロボット状態は永続化しないため、リロード時は briefing から再開する。
  useEffect(() => {
    loadMission(mission)
    setPhase('briefing')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMissionId])

  const validation = useMemo(
    () => validateMission({ robot, sim }, mission.checks),
    [robot, sim, mission],
  )

  // クリア時の健康診断（result フェーズになったタイミングで実行）
  const healthFindings = useMemo(
    () => (phase === 'result' ? diagnose(robot, mission) : []),
    // phase が result に変わった時点のスナップショット。robot 変更追従は不要。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, mission],
  )

  const onRun = () => {
    setSim(runRobot(robot, mission.site, mission.inputs))
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
  // 分岐グラフ（ミッション提供の固定構成）では、ステップ追加・右クリック追加を抑止
  const isGraph = !!(robot.edges && robot.edges.length > 0)

  // トップページ（プレイヤー選択・相談選択）
  if (screen === 'home') return <HomeScreen />

  // 緑ロボット（DAS）ミッション: DasWorkspaceLayout に委譲
  if (mission.robotType === 'das') {
    return <DasWorkspaceLayout mission={mission} />
  }

  return (
    <div className="flex h-screen flex-col bg-ds-bg text-ds-text">
      <Toolbar
        onRun={onRun}
        onHome={goHome}
        onOpenGlossary={() => setShowGlossary(true)}
        onOpenProgress={() => setShowProgress(true)}
        onOpenHealthRules={() => setShowHealthRules(true)}
      />

      {showWorkspaceChrome && <MissionBar mission={mission} validation={validation} ran={sim.ran} />}

      <main className="flex min-h-0 flex-1">
        {/* 左: マイプロジェクト + パレット */}
        <div className="flex w-[220px] shrink-0 flex-col border-r border-ds-border">
          <div className="min-h-0 flex-1">
            <MyProjectsPane />
          </div>
          {isGraph ? (
            <div className="border-t border-ds-border p-3 text-[11px] text-ds-textDim">
              この相談はフロー構成が用意済みです。ステップを<strong className="text-ds-text">選択</strong>して設定を確認し、［実行］で動きを見ましょう。
            </div>
          ) : (
            <Palette />
          )}
        </div>

        {/* 中央: モード/ファイルタブ + ロボットビュー + アプリケーション(ブラウザ) */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-ds-border">
          {/* デザイン/デバッグ + ファイルタブ */}
          <div className="flex shrink-0 items-center gap-1 border-b border-ds-border bg-ds-panelAlt px-2 py-1 text-[12px]">
            {(['デザイン', 'デバッグ'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setDesignMode(m)}
                className={[
                  'rounded px-2 py-0.5',
                  designMode === m ? 'bg-ds-bg text-ds-text' : 'text-ds-textDim hover:text-ds-text',
                ].join(' ')}
              >
                {m === 'デザイン' ? '🏠 ' : '🐞 '}
                {m}
              </button>
            ))}
            <span className="mx-1 text-ds-border2">|</span>
            <span className="flex items-center gap-1 rounded-t border border-b-0 border-ds-border bg-ds-bg px-2 py-0.5 text-ds-text">
              🤖 {robot.name}.robot
            </span>
          </div>
          <div className="min-h-0 flex-1 border-b border-ds-border">
            <RobotView />
          </div>
          <div className="min-h-0 flex-1">
            <BrowserView site={mission.site} readOnly={isGraph} />
          </div>
        </div>

        {/* 右: プロパティ(上) + データの状態(下) — 実機準拠 */}
        <div className="flex w-[330px] shrink-0 flex-col">
          <div className="min-h-0 flex-1 border-b border-ds-border">
            <PropertiesPane site={mission.site} />
          </div>
          <div className="min-h-0 flex-1">
            <DataStatePane suggested={mission.suggested} inputs={mission.inputs} />
          </div>
        </div>
      </main>

      {/* 下: ステータスビュー */}
      <div className="h-36 shrink-0 border-t border-ds-border">
        <StatusView />
      </div>

      {/* フェーズ別モーダル */}
      {phase === 'briefing' && <MissionBriefing mission={mission} onAccept={() => setPhase('deduction')} />}
      {phase === 'deduction' && <DeductionPanel mission={mission} onProceed={() => setPhase('build')} />}
      {phase === 'result' && <ResultPanel mission={mission} sim={sim} hasNext={hasNext} onNext={onNext} healthFindings={healthFindings} />}

      {/* 独立モーダル */}
      {showGlossary && <Glossary onClose={() => setShowGlossary(false)} />}
      {showProgress && <ProgressMap onClose={() => setShowProgress(false)} onJump={(id) => setMission(id)} />}
      {showHealthRules && <HealthRulesPanel onClose={() => setShowHealthRules(false)} />}
    </div>
  )
}
