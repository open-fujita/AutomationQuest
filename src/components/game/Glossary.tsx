import { GLOSSARY } from '../../data/glossary'
import { useGameStore } from '../../store/gameStore'
import Modal from './Modal'

export default function Glossary({ onClose }: { onClose: () => void }) {
  const unlocked = useGameStore((s) => s.unlockedTerms)
  const entries = Object.values(GLOSSARY)
  const unlockedSet = new Set(unlocked)

  return (
    <Modal title={`BizRobo! 用語集（${unlockedSet.size}/${entries.length} 解禁）`} onClose={onClose}>
      <p className="mb-3 text-[12px] text-ds-textDim">相談を解決するたびに、出会った用語がここに記録されていきます。</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map((e) => {
          const open = unlockedSet.has(e.key)
          return (
            <div
              key={e.key}
              className={['rounded-lg border p-3', open ? 'border-ds-border bg-ds-bg/40' : 'border-ds-border/40 bg-ds-bg/20 opacity-60'].join(' ')}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-bold text-ds-text">{open ? e.term : '？？？'}</span>
                {open && e.en && <span className="text-[10px] text-ds-textDim">{e.en}</span>}
              </div>
              <div className="mt-1 text-[12px] text-ds-textDim">{open ? e.desc : '（未解禁 — 相談を進めると明らかになる）'}</div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
