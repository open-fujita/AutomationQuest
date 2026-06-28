// ============================================================
// FileTabs — 実機練習編 DS シェルのファイルタブバー
//
// 実機画像（full_BER_real.png）のタブ列を再現:
//   🏠紹介 ✕ / sub.robot* ✕ / main_1.robot ✕ / info.type ✕
//
// 動作:
//   - タブクリックで切替
//   - ✕で閉じる（紹介タブは closable=false のため ✕ なし）
//   - ツリーから再オープン可（openTab で既存タブがあれば選択、なければ追加）
//
// デザイン・デバッグ切替ボタンも含む（左端）
// ============================================================

import type { PracticeTab, PracticeTabId } from '../../data/practice'

// タブの絵文字マップ
const TAB_ICON: Record<PracticeTabId, string> = {
  intro:    '🏠',
  sub:      '🤖',
  main1:    '🤖',
  infotype: '📄',
}

interface FileTabsProps {
  tabs: PracticeTab[]
  activeTabId: PracticeTabId
  designMode: 'デザイン' | 'デバッグ'
  onSetDesignMode: (mode: 'デザイン' | 'デバッグ') => void
  onSelectTab: (id: PracticeTabId) => void
  onCloseTab: (id: PracticeTabId) => void
  /** デバッグタブクリック時の通知（「デバッグは練習編では未対応」をステータスバーに表示する） */
  onDebugClick?: () => void
}

export default function FileTabs({
  tabs,
  activeTabId,
  designMode,
  onSetDesignMode,
  onSelectTab,
  onCloseTab,
  onDebugClick,
}: FileTabsProps) {
  return (
    <div className="flex shrink-0 items-stretch border-b border-das-border bg-das-panelAlt text-[12px]">
      {/* デザイン / デバッグ 切替 */}
      {(['デザイン', 'デバッグ'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => {
            if (m === 'デバッグ' && onDebugClick) onDebugClick()
            else onSetDesignMode(m)
          }}
          className={[
            'flex items-center gap-1 px-2 py-1 text-[12px] border-r border-das-border',
            designMode === m
              ? 'bg-das-bg text-das-text font-semibold'
              : 'text-das-textDim hover:text-das-text',
          ].join(' ')}
          aria-pressed={designMode === m}
        >
          {m === 'デザイン' ? '🎨' : '🐞'} {m}
        </button>
      ))}

      {/* セパレータ */}
      <div className="w-px bg-das-border2 mx-0.5 self-stretch" aria-hidden="true" />

      {/* ファイルタブ一覧 */}
      <div
        role="tablist"
        aria-label="ファイルタブ"
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const icon = TAB_ICON[tab.id] ?? '📄'
          return (
            <div
              key={tab.id}
              className={[
                'flex shrink-0 items-center gap-1 border-r border-das-border px-2 py-0.5',
                isActive
                  ? 'bg-das-bg text-das-text border-t-2 border-t-das-accent2'
                  : 'text-das-textDim hover:text-das-text hover:bg-das-bg/50',
              ].join(' ')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className="flex items-center gap-1 text-[12px] focus:outline-none"
              >
                <span aria-hidden="true" className="text-[12px]">{icon}</span>
                <span>
                  {tab.label}
                  {/* sub.robot* のアスタリスク表示 */}
                  {tab.id === 'sub' && (
                    <span className="text-das-warn text-[10px]">*</span>
                  )}
                </span>
              </button>

              {/* ✕ 閉じるボタン（closable=true のみ） */}
              {tab.closable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(tab.id)
                  }}
                  title={`${tab.label} を閉じる`}
                  aria-label={`${tab.label} を閉じる`}
                  className="ml-0.5 rounded px-0.5 text-[11px] text-das-textDim hover:text-das-err hover:bg-das-err/10 focus:outline-none"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 右端: ページ送りボタン（実機準拠の装飾。inert） */}
      <div className="ml-auto flex shrink-0 items-center border-l border-das-border px-1 text-[11px] text-das-textDim">
        <button type="button" aria-label="前のタブ" className="px-0.5 hover:text-das-text" onClick={() => {}}>‹</button>
        <button type="button" aria-label="次のタブ" className="px-0.5 hover:text-das-text" onClick={() => {}}>›</button>
      </div>
    </div>
  )
}
