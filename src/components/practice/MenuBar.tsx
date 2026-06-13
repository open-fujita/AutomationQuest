// ============================================================
// MenuBar — 実機練習編 DS シェルのメニューバー
//
// 実機画像（full_BER_real.png）のメニューバーを再現:
//   ファイル(F) / 編集(E) / 表示(V) / デバッグ(D) / ツール(T) / 設定(S) / ウィンドウ(W) / ヘルプ(H)
//
// 動作:
//   - クリックでドロップダウンを開く
//   - Esc / 外側クリックで閉じる
//   - 項目は基本 disabled（実機練習編ではメニュー操作を非対応）
//   - 「ファイル」内の「ゲームに戻る」だけ有効（ホームへ遷移）
//   - 「ウィンドウ」内の「パネル表示」は表示のみ有効（inert）
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'

interface MenuItem {
  label: string
  disabled?: boolean
  separator?: boolean
  /** 有効なアイテムのクリックハンドラ */
  onClick?: () => void
}

interface MenuDef {
  label: string
  items: MenuItem[]
}

interface MenuBarProps {
  onGoHome: () => void
}

function buildMenus(onGoHome: () => void): MenuDef[] {
  return [
    {
      label: 'ファイル(F)',
      items: [
        { label: 'ゲームに戻る', onClick: onGoHome },
        { label: '', separator: true },
        { label: '新規作成', disabled: true },
        { label: '開く', disabled: true },
        { label: '保存', disabled: true },
        { label: '名前を付けて保存', disabled: true },
        { label: '', separator: true },
        { label: '閉じる', disabled: true },
      ],
    },
    {
      label: '編集(E)',
      items: [
        { label: '元に戻す', disabled: true },
        { label: 'やり直し', disabled: true },
        { label: '', separator: true },
        { label: '切り取り', disabled: true },
        { label: 'コピー', disabled: true },
        { label: '貼り付け', disabled: true },
        { label: '削除', disabled: true },
        { label: '', separator: true },
        { label: 'すべて選択', disabled: true },
      ],
    },
    {
      label: '表示(V)',
      items: [
        { label: 'ズームイン', disabled: true },
        { label: 'ズームアウト', disabled: true },
        { label: '100%', disabled: true },
        { label: '', separator: true },
        { label: 'ワークフローに合わせる', disabled: true },
      ],
    },
    {
      label: 'デバッグ(D)',
      items: [
        { label: '実行', disabled: true },
        { label: 'ステップ実行', disabled: true },
        { label: 'ステップオーバー', disabled: true },
        { label: '', separator: true },
        { label: '一時停止', disabled: true },
        { label: '停止', disabled: true },
        { label: '', separator: true },
        { label: 'ブレークポイント', disabled: true },
      ],
    },
    {
      label: 'ツール(T)',
      items: [
        { label: 'リファクタリング', disabled: true },
        { label: 'パッケージング', disabled: true },
        { label: '', separator: true },
        { label: '外部サービス', disabled: true },
      ],
    },
    {
      label: '設定(S)',
      items: [
        { label: '環境設定', disabled: true },
        { label: 'キーバインド', disabled: true },
      ],
    },
    {
      label: 'ウィンドウ(W)',
      items: [
        { label: 'パネル表示', disabled: true },
        { label: '', separator: true },
        { label: 'レイアウトをリセット', disabled: true },
      ],
    },
    {
      label: 'ヘルプ(H)',
      items: [
        { label: 'ドキュメント', disabled: true },
        { label: 'バージョン情報', disabled: true },
      ],
    },
  ]
}

export default function MenuBar({ onGoHome }: MenuBarProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const menus = buildMenus(onGoHome)

  const closeAll = useCallback(() => setOpenIdx(null), [])

  // 外側クリック・Esc で閉じる
  useEffect(() => {
    if (openIdx === null) return

    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        closeAll()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openIdx, closeAll])

  return (
    <div
      ref={barRef}
      role="menubar"
      aria-label="メニューバー"
      className="flex shrink-0 items-center border-b border-das-border bg-das-panelAlt text-[12px] text-das-text"
    >
      {menus.map((menu, i) => (
        <div key={menu.label} className="relative">
          <button
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openIdx === i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className={[
              'px-2 py-0.5 hover:bg-das-border/60 focus:outline-none',
              openIdx === i ? 'bg-das-border/60' : '',
            ].join(' ')}
          >
            {menu.label}
          </button>

          {openIdx === i && (
            <div
              role="menu"
              aria-label={`${menu.label} メニュー`}
              className="absolute left-0 top-full z-50 min-w-[180px] rounded-b border border-das-border bg-das-panel shadow-lg"
            >
              {menu.items.map((item, j) => {
                if (item.separator) {
                  return <div key={`sep-${j}`} className="my-0.5 border-t border-das-border" />
                }
                return (
                  <button
                    key={item.label}
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled && item.onClick) {
                        item.onClick()
                        closeAll()
                      }
                    }}
                    className={[
                      'flex w-full items-center px-3 py-1 text-left text-[12px]',
                      item.disabled
                        ? 'cursor-not-allowed text-das-textDim/50'
                        : 'text-das-text hover:bg-das-border/40',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
