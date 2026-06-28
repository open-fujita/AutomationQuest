// ============================================================
// PracticeToolbar — 実機練習編 DS シェルのアイコンツールバー
//
// 実機画像（full_BER_real.png）のアイコン列を再現:
//   - アイコンボタン列（divider 含む）
//   - ほぼ全て inert（クリックでステータスバーメッセージを表示するのみ）
//   - ▶実行系ボタンは「練習編では実行できません（クエストで体験できます）」をステータスバーに表示
//   - 右上に検索ボックス（入力可・Aa/</>/ ✕ボタン付き）
//     Enter で「検索結果はありません。」を表示（SearchResultsRef 経由）
//
// props:
//   onStatusFlash: ステータスバーに一時メッセージを表示するコールバック
//   onSearch: 検索文字列を通知するコールバック
// ============================================================

import { useState, useRef } from 'react'

interface PracticeToolbarProps {
  onStatusFlash: (msg: string) => void
  onSearch: (query: string) => void
}

// ツールバーアイコン定義
interface ToolbarBtn {
  icon: string
  label: string
  /** 実行系かどうか（押したとき「練習編では実行できません」を表示） */
  isRun?: boolean
  separator?: false
}
interface ToolbarSep {
  separator: true
}
type ToolbarItem = ToolbarBtn | ToolbarSep

const TOOLBAR_ITEMS: ToolbarItem[] = [
  // 新規・保存系
  { icon: '📄', label: '新規' },
  { icon: '📂', label: '開く' },
  { icon: '💾', label: '保存' },
  { separator: true },
  // 実行系
  { icon: '▶', label: '実行', isRun: true },
  { icon: '⏸', label: '一時停止', isRun: true },
  { icon: '⏹', label: '停止', isRun: true },
  { separator: true },
  // ステップ系
  { icon: '↪', label: 'ステップ実行', isRun: true },
  { icon: '↩', label: 'ステップオーバー', isRun: true },
  { separator: true },
  // ズーム・表示系
  { icon: '🔍', label: 'ズームイン' },
  { icon: '🔎', label: 'ズームアウト' },
  { icon: '⊞', label: 'フィット表示' },
  { separator: true },
  // クリップボード系
  { icon: '✂️', label: '切り取り' },
  { icon: '📋', label: 'コピー' },
  { icon: '📌', label: '貼り付け' },
  { separator: true },
  // 元に戻す
  { icon: '↶', label: '元に戻す' },
  { icon: '↷', label: 'やり直し' },
]

export default function PracticeToolbar({ onStatusFlash, onSearch }: PracticeToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  // 正規表現モード・大文字小文字区別（実機の Aa/<>/ボタン）
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regexMode, setRegexMode] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const handleRun = () => {
    onStatusFlash('練習編では実行できません（クエストで体験できます）')
  }

  const handleInert = () => {
    // 操作なし（inert）
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(searchQuery)
    }
    if (e.key === 'Escape') {
      setSearchQuery('')
      searchRef.current?.blur()
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    onSearch('')
    searchRef.current?.focus()
  }

  return (
    <div
      role="toolbar"
      aria-label="ツールバー"
      className="flex shrink-0 items-center border-b border-das-border bg-das-panelAlt px-1 py-0.5"
    >
      {/* アイコンボタン列 */}
      <div className="flex items-center gap-0.5 flex-1">
        {TOOLBAR_ITEMS.map((item, i) => {
          if ('separator' in item && item.separator) {
            return (
              <div
                key={`sep-${i}`}
                className="mx-0.5 h-5 w-px bg-das-border2"
                aria-hidden="true"
              />
            )
          }
          const btn = item as ToolbarBtn
          return (
            <button
              key={btn.label}
              type="button"
              title={btn.label}
              aria-label={btn.label}
              onClick={btn.isRun ? handleRun : handleInert}
              className={[
                'flex h-6 w-6 items-center justify-center rounded text-[13px]',
                'hover:bg-das-border/50 active:bg-das-border text-das-text',
                'focus:outline-none focus:ring-1 focus:ring-das-accent2',
              ].join(' ')}
            >
              {btn.icon}
            </button>
          )
        })}
      </div>

      {/* 右上: 検索ボックス（実機準拠: Aa / < > / ✕） */}
      <div
        role="search"
        aria-label="検索"
        className="ml-2 flex shrink-0 items-center gap-0.5 rounded border border-das-border bg-das-bg px-1"
      >
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="検索..."
          aria-label="検索キーワード"
          className="w-[120px] bg-transparent py-0.5 text-[11px] text-das-text outline-none placeholder:text-das-textDim/50"
        />

        {/* Aa: 大文字小文字区別 */}
        <button
          type="button"
          title={caseSensitive ? '大文字小文字を区別（有効）' : '大文字小文字を区別（無効）'}
          aria-pressed={caseSensitive}
          onClick={() => setCaseSensitive((v) => !v)}
          className={[
            'px-0.5 text-[11px] rounded',
            caseSensitive ? 'text-das-accent2 font-bold' : 'text-das-textDim hover:text-das-text',
          ].join(' ')}
        >
          Aa
        </button>

        {/* <: 前の一致へ（inert） */}
        <button
          type="button"
          title="前の一致へ"
          aria-label="前の一致へ"
          onClick={() => onStatusFlash('検索結果はありません。')}
          className="px-0.5 text-[11px] text-das-textDim hover:text-das-text"
        >
          {'<'}
        </button>

        {/* >: 次の一致へ（inert） */}
        <button
          type="button"
          title="次の一致へ"
          aria-label="次の一致へ"
          onClick={() => onStatusFlash('検索結果はありません。')}
          className="px-0.5 text-[11px] text-das-textDim hover:text-das-text"
        >
          {'>'}
        </button>

        {/* ✕: 検索クリア */}
        <button
          type="button"
          title="検索をクリア"
          aria-label="検索をクリア"
          onClick={clearSearch}
          className="px-0.5 text-[11px] text-das-textDim hover:text-das-err"
        >
          ✕
        </button>

        {/* 正規表現モード切替（実機の .*） */}
        <button
          type="button"
          title={regexMode ? '正規表現（有効）' : '正規表現（無効）'}
          aria-pressed={regexMode}
          onClick={() => setRegexMode((v) => !v)}
          className={[
            'px-0.5 text-[10px] rounded font-mono',
            regexMode ? 'text-das-accent2 font-bold' : 'text-das-textDim hover:text-das-text',
          ].join(' ')}
        >
          .*
        </button>
      </div>
    </div>
  )
}
