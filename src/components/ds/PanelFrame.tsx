import type { ReactNode } from 'react'

interface PanelFrameProps {
  title: string
  hint?: string
  /** タイトルバー右側に置く操作 */
  actions?: ReactNode
  children: ReactNode
  /** 中身をスクロールさせる（既定 true）。React Flow など自前管理は false */
  scroll?: boolean
  className?: string
}

/** Design Studio 風のパネル枠（タイトルバー付き） */
export default function PanelFrame({ title, hint, actions, children, scroll = true, className }: PanelFrameProps) {
  return (
    <section className={['flex h-full min-h-0 flex-col overflow-hidden bg-das-panel', className ?? ''].join(' ')}>
      <header className="flex shrink-0 items-center justify-between border-b border-das-border bg-das-panelAlt px-3 py-1.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[12px] font-semibold tracking-wide text-das-text">{title}</h2>
          {hint && <span className="text-[10px] text-das-textDim">{hint}</span>}
        </div>
        {actions}
      </header>
      <div className={['min-h-0 flex-1', scroll ? 'overflow-auto' : 'overflow-hidden'].join(' ')}>{children}</div>
    </section>
  )
}
