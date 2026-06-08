import { MISSIONS } from '../../data/missions'
import { useGameStore } from '../../store/gameStore'
import Modal from './Modal'

export default function ProgressMap({ onClose, onJump }: { onClose: () => void; onJump: (id: string) => void }) {
  const completed = useGameStore((s) => s.completedMissions)
  const current = useGameStore((s) => s.currentMissionId)
  const completedSet = new Set(completed)

  // 解放判定: 先頭、クリア済み、または直前がクリア済み
  const isUnlocked = (idx: number) => idx === 0 || completedSet.has(MISSIONS[idx - 1]?.id)

  return (
    <Modal title="クエストボード — 進捗" onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-2">
        {MISSIONS.map((m, i) => {
          const cleared = completedSet.has(m.id)
          const unlocked = isUnlocked(i)
          const isCurrent = m.id === current
          return (
            <button
              key={m.id}
              disabled={!unlocked}
              onClick={() => {
                onJump(m.id)
                onClose()
              }}
              className={[
                'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left',
                isCurrent ? 'border-ds-accent bg-ds-accent/10' : 'border-ds-border bg-ds-bg/40',
                !unlocked ? 'cursor-not-allowed opacity-50' : 'hover:border-ds-accent2',
              ].join(' ')}
            >
              <span className="text-[18px]">{cleared ? '✅' : unlocked ? '🗂' : '🔒'}</span>
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-ds-text">
                  相談 #{m.index}「{m.title}」
                </span>
                <span className="block text-[11px] text-ds-textDim">
                  {m.client.dept}・{m.client.name} / 手作業 {m.manualMinutes} 分
                </span>
              </span>
              {cleared && <span className="text-[11px] text-ds-ok">解決済み</span>}
              {isCurrent && !cleared && <span className="text-[11px] text-ds-accent">挑戦中</span>}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
