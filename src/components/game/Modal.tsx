import type { ReactNode } from 'react'

interface ModalProps {
  title?: ReactNode
  onClose?: () => void
  children: ReactNode
  maxWidth?: string
}

export default function Modal({ title, onClose, children, maxWidth = 'max-w-2xl' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className={['w-full overflow-hidden rounded-xl border border-ds-border2 bg-ds-panel shadow-2xl', maxWidth].join(' ')}>
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-ds-border bg-ds-panelAlt px-4 py-2.5">
            <div className="text-[14px] font-bold text-ds-text">{title}</div>
            {onClose && (
              <button onClick={onClose} className="rounded px-2 text-ds-textDim hover:text-ds-text">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="max-h-[78vh] overflow-auto p-5">{children}</div>
      </div>
    </div>
  )
}
