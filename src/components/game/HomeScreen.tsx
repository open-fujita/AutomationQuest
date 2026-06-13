import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { MISSIONS, getMission } from '../../data/missions'
import HealthRulesPanel from './HealthRulesPanel'

export default function HomeScreen() {
  const profile = useGameStore((s) => s.profile)
  const profiles = useGameStore((s) => s.profiles)
  const completed = useGameStore((s) => s.completedMissions)
  const currentMissionId = useGameStore((s) => s.currentMissionId)
  const loginProfile = useGameStore((s) => s.loginProfile)
  const logoutProfile = useGameStore((s) => s.logoutProfile)
  const deleteProfile = useGameStore((s) => s.deleteProfile)
  const continueGame = useGameStore((s) => s.continueGame)
  const startFromBeginning = useGameStore((s) => s.startFromBeginning)
  const startMission = useGameStore((s) => s.startMission)

  const [newName, setNewName] = useState('')
  const [showHealthRules, setShowHealthRules] = useState(false)

  const completedSet = new Set(completed)
  // シリーズ内直列解放判定:
  //   ds シリーズ: M1〜M5（青ロボット）
  //   das シリーズ: S1（セットアップ）+ D1〜D5（緑ロボット）
  //   S1 は das シリーズの先頭（常に解放）、D1 は S1 クリア後に解放される。
  const seriesOf = (m: (typeof MISSIONS)[number]) =>
    m.robotType === 'das' || m.missionKind === 'setup' ? 'das' : 'ds'
  const isUnlocked = (m: (typeof MISSIONS)[number]) => {
    const series = MISSIONS.filter((x) => seriesOf(x) === seriesOf(m))
    const idx = series.indexOf(m)
    return idx <= 0 || completedSet.has(series[idx - 1].id)
  }
  const hasProgress = completed.length > 0 || currentMissionId !== 'm1'
  const resumeTitle = getMission(currentMissionId)?.title ?? ''

  return (
    <div className="flex h-screen flex-col items-center overflow-auto bg-ds-bg px-4 py-10 text-ds-text">
      <div className="w-full max-w-2xl">
        {/* タイトル */}
        <div className="mb-8 text-center">
          <div className="text-[28px] font-bold tracking-wide text-ds-accent">自動化推進室クエスト</div>
          <div className="mt-1 text-[13px] text-ds-textDim">
            BizRobo! Design Studio 研修ラボ — 各部署の相談を、ロボットで解決していこう
          </div>
          <div className="mt-3">
            <button
              onClick={() => setShowHealthRules(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ds-border bg-ds-panel px-3 py-1.5 text-[12px] text-ds-textDim hover:border-ds-accent2 hover:text-ds-text"
            >
              🩺 健康なロボットのための10か条
            </button>
          </div>
        </div>

        {!profile ? (
          /* プレイヤー選択 */
          <div className="rounded-xl border border-ds-border2 bg-ds-panel p-5">
            <div className="mb-3 text-[14px] font-semibold">プレイヤーを選択</div>
            <p className="mb-3 text-[12px] text-ds-textDim">
              進捗は名前ごとに保存されます。複数の人が同じ環境でも、それぞれの続きから再開できます。
            </p>

            {profiles.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {profiles.map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <button
                      onClick={() => loginProfile(name)}
                      className="flex-1 rounded-lg border border-ds-border bg-ds-bg/50 px-3 py-2 text-left text-[13px] hover:border-ds-accent2"
                    >
                      👤 {name}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`「${name}」の進捗を削除しますか？`)) deleteProfile(name)
                      }}
                      title="このプレイヤーを削除"
                      className="rounded px-2 py-1 text-[12px] text-ds-textDim hover:text-ds-err"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) loginProfile(newName)
                }}
                placeholder="新しい名前を入力"
                className="flex-1 rounded-lg border border-ds-border bg-ds-bg px-3 py-2 text-[13px] outline-none focus:border-ds-accent2"
              />
              <button
                onClick={() => loginProfile(newName)}
                disabled={!newName.trim()}
                className={[
                  'rounded-lg px-4 py-2 text-[13px] font-bold',
                  newName.trim() ? 'bg-ds-accent text-ds-bg hover:brightness-110' : 'cursor-not-allowed bg-ds-border text-ds-textDim',
                ].join(' ')}
              >
                はじめる
              </button>
            </div>
          </div>
        ) : (
          /* 相談ボード */
          <div className="rounded-xl border border-ds-border2 bg-ds-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[14px]">
                ようこそ、<strong className="text-ds-accent">{profile}</strong> さん
              </div>
              <button onClick={logoutProfile} className="rounded px-2 py-1 text-[12px] text-ds-textDim hover:text-ds-text">
                プレイヤーを変更
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {hasProgress && (
                <button
                  onClick={continueGame}
                  className="rounded-lg bg-ds-accent px-4 py-2 text-[13px] font-bold text-ds-bg hover:brightness-110"
                >
                  ▶ 続きから（相談「{resumeTitle}」）
                </button>
              )}
              <button
                onClick={() => {
                  if (!hasProgress || confirm('最初からやり直しますか？（このプレイヤーの進捗はリセットされます）')) startFromBeginning()
                }}
                className="rounded-lg border border-ds-border bg-ds-bg px-4 py-2 text-[13px] text-ds-text hover:border-ds-accent2"
              >
                {hasProgress ? '最初から' : '▶ はじめる'}
              </button>
            </div>

            <div className="mb-2 text-[12px] font-semibold text-ds-textDim">相談ボード</div>

            {/* 青ロボット編（M1〜M5）シリーズ — setupミッションは除外 */}
            {MISSIONS.filter((m) => (!m.robotType || m.robotType === 'ds') && m.missionKind !== 'setup').length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="inline-block rounded bg-ds-accent2/20 px-2 py-0.5 text-[11px] text-ds-accent2">
                    🤖 青ロボット編（Basic Engine Robot）
                  </span>
                </div>
                <div className="space-y-1.5">
                  {MISSIONS.filter((m) => (!m.robotType || m.robotType === 'ds') && m.missionKind !== 'setup').map((m) => {
                    const cleared = completedSet.has(m.id)
                    const unlocked = isUnlocked(m)
                    return (
                      <button
                        key={m.id}
                        disabled={!unlocked}
                        onClick={() => startMission(m.id)}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left',
                          unlocked ? 'border-ds-border bg-ds-bg/40 hover:border-ds-accent2' : 'cursor-not-allowed border-ds-border/40 opacity-50',
                        ].join(' ')}
                      >
                        <span className="text-[18px]">{cleared ? '✅' : unlocked ? '🗂' : '🔒'}</span>
                        <span className="flex-1">
                          <span className="block text-[13px] font-semibold">
                            相談 #{m.index}「{m.title}」
                          </span>
                          <span className="block text-[11px] text-ds-textDim">
                            {m.client.dept}・{m.client.name} / 手作業 {m.manualMinutes} 分
                          </span>
                        </span>
                        {cleared && <span className="text-[11px] text-ds-ok">解決済み</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 緑ロボット編（S1 セットアップ + D1〜D5）シリーズ */}
            {MISSIONS.filter((m) => m.robotType === 'das' || m.missionKind === 'setup').length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="inline-block rounded bg-green-500/20 px-2 py-0.5 text-[11px] text-green-300">
                    🤖 緑ロボット編（Desktop Automation）
                  </span>
                </div>
                <div className="space-y-1.5">
                  {MISSIONS.filter((m) => m.robotType === 'das' || m.missionKind === 'setup').map((m) => {
                    const cleared = completedSet.has(m.id)
                    const unlocked = isUnlocked(m)
                    const isSetup = m.missionKind === 'setup'
                    return (
                      <button
                        key={m.id}
                        disabled={!unlocked}
                        onClick={() => startMission(m.id)}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left',
                          unlocked ? 'border-green-500/30 bg-ds-bg/40 hover:border-green-400/60' : 'cursor-not-allowed border-ds-border/40 opacity-50',
                        ].join(' ')}
                      >
                        <span className="text-[18px]">
                          {cleared ? '✅' : unlocked ? (isSetup ? '⚙' : '🗂') : '🔒'}
                        </span>
                        <span className="flex-1">
                          <span className="block text-[13px] font-semibold">
                            {isSetup && (
                              <span className="mr-1.5 rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-300">
                                セットアップ
                              </span>
                            )}
                            {isSetup ? m.title : `相談 #${m.index}「${m.title}」`}
                          </span>
                          <span className="block text-[11px] text-ds-textDim">
                            {m.client.dept}・{m.client.name}
                            {!isSetup && ` / 手作業 ${m.manualMinutes} 分`}
                          </span>
                        </span>
                        {cleared && <span className="text-[11px] text-ds-ok">完了済み</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 両シリーズが未追加の場合のフォールバック */}
            {MISSIONS.filter((m) => m.robotType === 'das' || m.missionKind === 'setup').length === 0 &&
              MISSIONS.filter((m) => !m.robotType || m.robotType === 'ds').length === 0 && (
                <div className="space-y-2">
                  {MISSIONS.map((m) => {
                    const cleared = completedSet.has(m.id)
                    const unlocked = isUnlocked(m)
                    return (
                      <button
                        key={m.id}
                        disabled={!unlocked}
                        onClick={() => startMission(m.id)}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left',
                          unlocked ? 'border-ds-border bg-ds-bg/40 hover:border-ds-accent2' : 'cursor-not-allowed border-ds-border/40 opacity-50',
                        ].join(' ')}
                      >
                        <span className="text-[18px]">{cleared ? '✅' : unlocked ? '🗂' : '🔒'}</span>
                        <span className="flex-1">
                          <span className="block text-[13px] font-semibold">
                            相談 #{m.index}「{m.title}」
                          </span>
                          <span className="block text-[11px] text-ds-textDim">
                            {m.client.dept}・{m.client.name} / 手作業 {m.manualMinutes} 分
                          </span>
                        </span>
                        {cleared && <span className="text-[11px] text-ds-ok">解決済み</span>}
                      </button>
                    )
                  })}
                </div>
              )}
          </div>
        )}
      </div>

      {/* 10か条モーダル */}
      {showHealthRules && <HealthRulesPanel onClose={() => setShowHealthRules(false)} />}
    </div>
  )
}
