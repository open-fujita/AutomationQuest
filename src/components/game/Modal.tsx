import type { ReactNode } from 'react'

interface ModalProps {
  title?: ReactNode
  onClose?: () => void
  children: ReactNode
  maxWidth?: string
}

// すごろくMAP と配色を揃えた明テーマのモーダル枠（白カード＋オレンジ→赤グラデヘッダ）。
export default function Modal({ title, onClose, children, maxWidth = 'max-w-2xl' }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26,26,26,.42)',
        padding: 16,
        fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",
      }}
    >
      <div
        className={maxWidth}
        style={{ width: '100%', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px rgba(26,26,26,.32)', overflow: 'hidden', color: '#1A1A1A' }}
      >
        {(title || onClose) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 22px',
              background: 'linear-gradient(100deg,#F6A35A,#ED6A82)',
              color: '#fff',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '.02em' }}>{title}</div>
            {onClose && (
              <button
                onClick={onClose}
                style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.22)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div style={{ maxHeight: '78vh', overflow: 'auto', padding: 22 }}>{children}</div>
      </div>
    </div>
  )
}
