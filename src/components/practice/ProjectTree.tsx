// ============================================================
// ProjectTree — 実機練習編 DS シェルの「マイ プロジェクト」ツリー
//
// 実機画像（full_BER_real.png / full_Robot_real.png）の左ペインを再現:
//   Local
//   └ connector
//     ├ DifyConnector  connector
//     ├ info.type
//     ├ main_1  robot
//     └ sub  robot*（アスタリスク：変更済み）
//   デモ_薬剤部情報収集業務
//   Design Studio データベース
//   Management Console (localhost)
//   windows_mc (localhost)
//   tmp (mini.bizrobo.com)
//
// 動作:
//   - ノードの展開/折りたたみ（ローカル/プロジェクト系は初期展開）
//   - openable=true ノード: ダブルクリックまたはクリックでタブを開く
//   - 選択ノードはハイライト（activeNode state）
// ============================================================

import { useState } from 'react'
import type { PracticeTreeNode, PracticeTabId } from '../../data/practice'
import { PRACTICE_TREE } from '../../data/practice'

// ---- アイコン定義 -------------------------------------------

const KIND_ICONS: Record<string, string> = {
  project: '📁',
  robot:   '🤖',
  type:    '📄',
  connector: '🔗',
  server:  '🖥',
  local:   '💻',
}

// ---- 初期展開状態 -------------------------------------------

/** 初期展開するノード ID のセット（Local と connector-project） */
const INITIALLY_EXPANDED = new Set(['local', 'connector-project'])

// ---- TreeNode コンポーネント --------------------------------

interface TreeNodeProps {
  node: PracticeTreeNode
  depth: number
  selectedId: string | null
  onSelect: (id: string) => void
  onOpen: (tabId: PracticeTabId) => void
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
}

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  onOpen,
  expandedIds,
  toggleExpand,
}: TreeNodeProps) {
  const isSelected = selectedId === node.id
  const hasChildren = (node.children?.length ?? 0) > 0
  const isExpanded = expandedIds.has(node.id)

  const icon = KIND_ICONS[node.kind] ?? '📄'

  // ノードラベル（robot 種別のサフィックス・アスタリスク）
  const renderLabel = () => {
    const suffix =
      node.kind === 'robot'
        ? ` robot${node.modified ? '*' : ''}`
        : node.kind === 'connector'
          ? '  connector'
          : ''
    return (
      <span className="flex-1 truncate">
        {node.label}
        {suffix && (
          <span className={node.modified ? 'text-das-warn' : 'text-das-textDim'}>{suffix}</span>
        )}
      </span>
    )
  }

  const handleClick = () => {
    onSelect(node.id)
    if (hasChildren) {
      toggleExpand(node.id)
    }
  }

  const handleDoubleClick = () => {
    if (node.openable && node.tabId) {
      onOpen(node.tabId)
    } else if (hasChildren) {
      toggleExpand(node.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (node.openable && node.tabId) {
        onOpen(node.tabId)
      } else {
        handleClick()
      }
    }
    if (e.key === 'ArrowRight' && hasChildren && !isExpanded) toggleExpand(node.id)
    if (e.key === 'ArrowLeft' && hasChildren && isExpanded) toggleExpand(node.id)
  }

  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
    >
      <div
        className={[
          'flex cursor-pointer select-none items-center gap-1 rounded py-0.5 pr-1 text-[12px]',
          'focus:outline-none focus:ring-1 focus:ring-das-accent2',
          isSelected
            ? 'bg-das-accent2/20 text-das-text'
            : 'text-das-text hover:bg-das-border/30',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        tabIndex={0}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        title={
          node.openable
            ? `${node.label}（ダブルクリックで開く）`
            : node.label
        }
      >
        {/* 展開/折りたたみ矢印 */}
        {hasChildren ? (
          <span className="shrink-0 text-[9px] text-das-textDim w-3 text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
        ) : (
          <span className="w-3 shrink-0" aria-hidden="true" />
        )}

        {/* アイコン */}
        <span className="shrink-0 text-[13px]" aria-hidden="true">{icon}</span>

        {/* ラベル */}
        {renderLabel()}
      </div>

      {/* 子ノード */}
      {hasChildren && isExpanded && (
        <ul role="group">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onOpen={onOpen}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ---- ProjectTree 本体 ----------------------------------------

interface ProjectTreeProps {
  /** アクティブなタブ ID（選択ハイライトに使う） */
  activeTabId: PracticeTabId | null
  onOpenTab: (tabId: PracticeTabId) => void
}

export default function ProjectTree({ activeTabId, onOpenTab }: ProjectTreeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(INITIALLY_EXPANDED))

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // activeTabId に対応するノード ID を選択
  const effectiveSelectedId =
    selectedId ??
    (activeTabId === 'main1'
      ? 'main1-robot'
      : activeTabId === 'sub'
        ? 'sub-robot'
        : activeTabId === 'infotype'
          ? 'info-type'
          : null)

  return (
    <div className="flex min-h-0 flex-col overflow-hidden bg-das-panel">
      {/* ヘッダ */}
      <div className="flex shrink-0 items-center justify-between border-b border-das-border bg-das-panelAlt px-2 py-1">
        <span className="text-[12px] font-semibold text-das-text">マイ プロジェクト</span>
        {/* 折りたたみ・展開ボタン（実機にある −/+ 風） */}
        <div className="flex items-center gap-0.5 text-[11px] text-das-textDim">
          <button
            type="button"
            title="すべて折りたたむ"
            onClick={() => setExpandedIds(new Set(['local']))}
            className="rounded px-1 hover:text-das-text"
            aria-label="すべて折りたたむ"
          >
            −
          </button>
          <button
            type="button"
            title="すべて展開"
            onClick={() => setExpandedIds(new Set(INITIALLY_EXPANDED))}
            className="rounded px-1 hover:text-das-text"
            aria-label="すべて展開"
          >
            ↗
          </button>
        </div>
      </div>

      {/* ツリー本体 */}
      <div className="min-h-0 flex-1 overflow-auto py-1">
        <ul role="tree" aria-label="プロジェクトツリー">
          {PRACTICE_TREE.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={effectiveSelectedId}
              onSelect={(id) => {
                setSelectedId(id)
                // openable ノードはシングルクリックでも開く（ダブルクリック準拠だが利便性優先）
                const findNode = (nodes: PracticeTreeNode[], targetId: string): PracticeTreeNode | null => {
                  for (const n of nodes) {
                    if (n.id === targetId) return n
                    if (n.children) {
                      const found = findNode(n.children, targetId)
                      if (found) return found
                    }
                  }
                  return null
                }
                const found = findNode(PRACTICE_TREE, id)
                if (found?.openable && found.tabId) {
                  onOpenTab(found.tabId)
                }
              }}
              onOpen={onOpenTab}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
