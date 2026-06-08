import { useState } from 'react'
import type { Mission } from '../../model/mission'
import type { ValidationResult } from '../../engine/validator'

interface Props {
  mission: Mission
  validation: ValidationResult
  ran: boolean
}

export default function MissionBar({ mission, validation, ran }: Props) {
  const [open, setOpen] = useState(true)
  const done = validation.outcomes.filter((o) => o.pass).length
  const total = validation.outcomes.length

  return (
    <div className="shrink-0 border-b border-ds-border bg-ds-bg/70">
      <div className="flex items-center gap-3 px-3 py-1.5">
        <span className="rounded bg-ds-accent/20 px-2 py-0.5 text-[12px] font-bold text-ds-accent">
          相談 #{mission.index}
        </span>
        <span className="text-[13px] font-semibold text-ds-text">{mission.title}</span>
        <span className="text-[12px] text-ds-textDim">
          受け入れ条件 {done}/{total}
        </span>
        {validation.firstHint && (
          <span className="hidden truncate text-[12px] text-ds-warn md:inline">💡 {validation.firstHint}</span>
        )}
        <button onClick={() => setOpen((v) => !v)} className="ml-auto rounded px-2 text-[12px] text-ds-textDim hover:text-ds-text">
          目標 {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div className="grid gap-1 border-t border-ds-border/60 px-3 py-2 md:grid-cols-2">
          {validation.outcomes.map((o) => (
            <div key={o.id} className="flex items-start gap-2 text-[12px]">
              <span className={o.pass ? 'text-ds-ok' : 'text-ds-textDim'}>{o.pass ? '✓' : '○'}</span>
              <div>
                <span className={o.pass ? 'text-ds-textDim line-through' : 'text-ds-text'}>{o.label}</span>
                {!o.pass && ran && <div className="text-[11px] text-ds-warn">└ {o.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
