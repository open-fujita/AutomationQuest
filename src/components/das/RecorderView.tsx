// ============================================================
// RecorderView — 模擬レコーダービュー
//
// 実機 DS のレコーダービュー（Windows アプリ画面 + 要素ツリー + 右クリックメニュー）を再現。
// 2タブ: アプリ画面 / 要素ツリー
// 要素右クリック → ステップ/ガード挿入（ファインダーを自動生成して dasRobotStore.addStep）
// 下部: マウス座標風のステータス行（実機準拠の演出）
// アクセシビリティ: tab 切り替え aria-selected / コンテキストメニュー role="menu"
//
// [修正] selectedWidget（AppWidget オブジェクト参照）を selectedWidgetId（string | null）に変更。
//   描画のたびに現在 tick のツリーから id で解決し、見つからなければ null 扱い（stale 参照安全化）。
// ============================================================

import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import type { AppWidget, MockApp } from '../../model/mockApp'
import { applyTimeline, findWidget, findWidgetPath } from '../../model/mockApp'
import type { DasFinder, Guard } from '../../model/dasRobot'
import { GUARD_TYPE_LABELS } from '../../model/dasRobot'
import { useDasRobotStore } from '../../store/dasRobotStore'
import MockAppView from './MockAppView'
import PanelFrame from '../ds/PanelFrame'

// ---- ファインダー自動生成 ------------------------------------

/** AppWidget から CSS 風セレクタを自動生成 */
function generateSelector(widget: AppWidget): string {
  const parts: string[] = [widget.type]
  // name 属性が最も有用なセレクタ
  if (widget.attrs['name']) {
    parts.push(`[name="${widget.attrs['name']}"]`)
  }
  // title 属性
  if (widget.attrs['title'] && !widget.attrs['name']) {
    parts.push(`[title="${widget.attrs['title']}"]`)
  }
  // enabled 状態を含める（ボタンで有用）
  if (widget.type === 'button' && widget.enabled === false) {
    parts.push(`[enabled="false"]`)
  }
  return parts.join('')
}

function generateFinder(widget: AppWidget): DasFinder {
  return {
    kind: 'component',
    selector: generateSelector(widget),
    reuse: 'none',
  }
}

// ---- スコープナビゲーションボタン（ツールバー用）--------------

interface ScopeNavButtonProps {
  /** SVG アイコン要素（緑の矢印風） */
  icon: React.ReactNode
  /** ツールチップ文言（実機の公式文言に合わせる） */
  label: string
  disabled: boolean
  onClick: () => void
}

function ScopeNavButton({ icon, label, disabled, onClick }: ScopeNavButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex h-6 w-6 items-center justify-center rounded text-[13px] transition-colors',
        'border',
        disabled
          ? 'border-das-border text-das-textDim/40 cursor-not-allowed'
          : 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200 cursor-pointer',
      ].join(' ')}
    >
      {icon}
    </button>
  )
}

// ---- 要素ツリー表示 ----------------------------------------

interface WidgetTreeItemProps {
  widget: AppWidget
  depth: number
  selectedWidgetId: string | null
  onSelect: (w: AppWidget) => void
  onRightClick: (w: AppWidget, e: React.MouseEvent) => void
}

function WidgetTreeItem({ widget, depth, selectedWidgetId, onSelect, onRightClick }: WidgetTreeItemProps) {
  const isSelected = selectedWidgetId === widget.id
  const hasChildren = widget.children.length > 0
  const [expanded, setExpanded] = useState(true)

  const selector = generateSelector(widget)

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={isSelected}>
      <div
        className={[
          'flex cursor-pointer select-none items-center gap-1 rounded px-1 py-0.5 text-[11px]',
          'focus:outline-none focus:ring-1 focus:ring-das-accent2',
          isSelected ? 'bg-das-accent2/20 text-das-text' : 'text-das-textDim hover:bg-das-panelAlt hover:text-das-text',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        tabIndex={0}
        onClick={() => onSelect(widget)}
        onContextMenu={(e) => { e.preventDefault(); onRightClick(widget, e) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(widget) }
          if (hasChildren && e.key === 'ArrowRight') setExpanded(true)
          if (hasChildren && e.key === 'ArrowLeft') setExpanded(false)
        }}
      >
        {hasChildren ? (
          <button
            className="shrink-0 text-[9px] text-das-textDim"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            aria-label={expanded ? '折りたたむ' : '展開する'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-3 shrink-0" aria-hidden="true" />
        )}

        {/* ウィジェット種別バッジ */}
        <span className="rounded bg-das-panelAlt px-1 text-[10px] text-das-accent2">{widget.type}</span>

        {/* 属性表示 */}
        {widget.attrs['name'] && (
          <span className="truncate text-das-text">{widget.attrs['name']}</span>
        )}
        {!widget.attrs['name'] && widget.text && (
          <span className="truncate italic text-das-textDim">"{widget.text}"</span>
        )}

        {/* 可視/非可視 */}
        {!widget.visible && (
          <span className="ml-auto shrink-0 text-[9px] text-das-textDim">(非表示)</span>
        )}

        {/* セレクタプレビュー */}
        <span className="ml-auto shrink-0 max-w-[120px] truncate font-mono text-[9px] text-das-textDim/60" title={selector}>
          {selector}
        </span>
      </div>

      {hasChildren && expanded && (
        <ul role="group">
          {widget.children.map((child) => (
            <WidgetTreeItem
              key={child.id}
              widget={child}
              depth={depth + 1}
              selectedWidgetId={selectedWidgetId}
              onSelect={onSelect}
              onRightClick={onRightClick}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ---- 右クリックコンテキストメニュー --------------------------

interface ContextMenuProps {
  widget: AppWidget
  position: { x: number; y: number }
  onClose: () => void
  onInsertClick: () => void
  onInsertExtract: () => void
  onInsertEnterText: () => void
  /** 兄弟系: scope = 親要素, element = > W.type */
  onInsertForEachSiblings: (() => void) | null
  /** 子ノード系: scope = W 自身, element = > 最初の子の type */
  onInsertForEachChildren: (() => void) | null
  onInsertGuard: (guardType: 'locationFound' | 'applicationFound') => void
}

const GUARD_QUICK_TYPES: { type: 'locationFound' | 'applicationFound'; label: string }[] = [
  { type: 'locationFound', label: '該当するロケーション（Location Found）' },
  { type: 'applicationFound', label: '該当するアプリケーション（Application Found）' },
]

function ContextMenu({
  widget,
  position,
  onClose,
  onInsertClick,
  onInsertExtract,
  onInsertEnterText,
  onInsertForEachSiblings,
  onInsertForEachChildren,
  onInsertGuard,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // ビューポートクランプ後の表示座標。初回測定前は visibility:hidden で非表示にしてチラつきを防ぐ
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const margin = 8
    const clampedY = Math.max(margin, Math.min(position.y, window.innerHeight - rect.height - margin))
    const clampedX = Math.max(margin, Math.min(position.x, window.innerWidth - rect.width - margin))
    setAdjustedPos({ x: clampedX, y: clampedY })
  }, [position])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const menuItems: { label: string; icon: string; action: (() => void) | null; hint?: string; disabled?: boolean }[] = [
    { label: 'クリック', icon: '👆', action: () => { onInsertClick(); onClose() }, hint: '選択した要素をクリックするステップを追加' },
    { label: '値を抽出', icon: '🔎', action: () => { onInsertExtract(); onClose() }, hint: '選択した要素から値を抽出するステップを追加' },
    { label: 'テキストを入力', icon: '⌨', action: () => { onInsertEnterText(); onClose() }, hint: '選択した要素にテキストを入力するステップを追加' },
    {
      // 兄弟系: 右クリックした要素 W の親をスコープ、W.type を繰り返す
      // scope = 親要素のセレクタ、element = > W.type
      label: `For Each ループ（各 [${widget.type}] の兄弟）`,
      icon: '↻',
      action: onInsertForEachSiblings
        ? () => { onInsertForEachSiblings!(); onClose() }
        : null,
      hint: `この要素の親をスコープに設定し、兄弟の ${widget.type} 要素を全件繰り返す ForEach ステップを追加`,
      disabled: onInsertForEachSiblings === null,
    },
    {
      // 子ノード系: 右クリックした要素 W 自身をスコープ、W の子要素を繰り返す
      // scope = W のセレクタ、element = > 最初の子の type
      label: `For Each ループ（各 [${widget.children[0]?.type ?? 'child'}] の子ノード）`,
      icon: '↺',
      action: onInsertForEachChildren
        ? () => { onInsertForEachChildren!(); onClose() }
        : null,
      hint: `この要素自身をスコープに設定し、直接の子要素 (${widget.children[0]?.type ?? 'child'}) を全件繰り返す ForEach ステップを追加`,
      disabled: onInsertForEachChildren === null,
    },
  ]

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="ステップ挿入メニュー"
      className="fixed z-50 rounded-md border border-das-border2 bg-white shadow-lg py-1 shadow-xl"
      style={{
        top: adjustedPos?.y ?? position.y,
        left: adjustedPos?.x ?? position.x,
        minWidth: '240px',
        maxHeight: 'calc(100vh - 16px)',
        overflowY: 'auto',
        // 初回 useLayoutEffect 測定前は非表示にしてチラつきを防ぐ
        visibility: adjustedPos ? 'visible' : 'hidden',
      }}
    >
      {/* 対象ウィジェット情報 */}
      <div className="border-b border-das-border px-3 py-1.5">
        <div className="text-[10px] text-das-textDim">対象: {widget.type}</div>
        <div className="truncate font-mono text-[10px] text-das-accent2">{generateSelector(widget)}</div>
      </div>

      {/* ステップ挿入メニュー */}
      <div className="py-0.5">
        {menuItems.map((item) => (
          <button
            key={item.label}
            role="menuitem"
            disabled={item.disabled}
            className={[
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px]',
              item.disabled
                ? 'cursor-not-allowed text-das-textDim/50'
                : 'text-das-text hover:bg-das-panelAlt',
            ].join(' ')}
            onClick={item.disabled || !item.action ? undefined : item.action}
            title={item.hint}
          >
            <span className="w-5 shrink-0 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ガード挿入サブセクション */}
      <div className="border-t border-das-border py-0.5">
        <div className="px-3 py-1 text-[10px] text-das-textDim">ガードチョイスのガードに使用</div>
        {GUARD_QUICK_TYPES.map((g) => (
          <button
            key={g.type}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-das-text hover:bg-das-panelAlt"
            onClick={() => { onInsertGuard(g.type); onClose() }}
          >
            <span className="w-5 shrink-0 text-center">⚡</span>
            <span className="truncate">{GUARD_TYPE_LABELS[g.type]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- RecorderView 本体 ----------------------------------------

interface RecorderViewProps {
  app: MockApp | null
  currentTick: number
}

export default function RecorderView({ app, currentTick }: RecorderViewProps) {
  const [activeTab, setActiveTab] = useState<'app' | 'tree'>('app')

  // [修正] AppWidget オブジェクト参照から ID 文字列へ変更（stale 参照安全化）。
  // 描画ごとに現在 tick のツリーから id で解決する。見つからない場合は null 扱い。
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    widget: AppWidget
    position: { x: number; y: number }
  } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const addStep = useDasRobotStore((s) => s.addStep)
  const selectedStepId = useDasRobotStore((s) => s.selectedStepId)
  const robot = useDasRobotStore((s) => s.robot)

  // ---- 現在 tick のウィジェット一覧（render 内で共有） ----------
  // メモ化は行わず tick 変化に応じて毎回再計算する（軽量な純粋関数）
  const currentWidgets = app ? applyTimeline(app, currentTick) : []

  // ---- selectedWidget を ID から現在 tick のツリーで解決 --------
  // 見つからなければ null（tick 後にウィジェットが消えた場合も安全）
  function resolveSelectedWidget(): AppWidget | null {
    if (!app || !selectedWidgetId) return null
    const path = findWidgetPath(currentWidgets, selectedWidgetId)
    return path ? (path[path.length - 1] ?? null) : null
  }
  const selectedWidget = resolveSelectedWidget()

  // ---- tick が変わったときに selectedWidgetId が存在しなければクリア ----
  // コンテキストメニューも tick 変化で閉じる（stale widget を保持しない）
  useEffect(() => {
    if (!app) return
    if (selectedWidgetId !== null) {
      const widgets = applyTimeline(app, currentTick)
      const path = findWidgetPath(widgets, selectedWidgetId)
      if (!path) {
        // ツリーから消えていたので選択解除
        setSelectedWidgetId(null)
      }
    }
    // tick が変わったらコンテキストメニューも閉じる
    setContextMenu(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTick, app])

  // ---- スコープナビゲーション用ヘルパー -------------------------

  // 選択ステップが ForEach の場合に loop/element ハイライト用ウィジェット ID を導出する
  const { loopScopeId, loopElementId } = (() => {
    if (!app) return { loopScopeId: null, loopElementId: null }
    if (!selectedStepId) return { loopScopeId: null, loopElementId: null }

    // ステップを再帰探索
    function findStep(steps: typeof robot.steps): typeof robot.steps[0] | null {
      for (const s of steps) {
        if (s.id === selectedStepId) return s
        if (s.action.type === 'ForEach') {
          const found = findStep(s.action.body)
          if (found) return found
        }
        if (s.action.type === 'Loop') {
          const found = findStep(s.action.body)
          if (found) return found
        }
        if (s.action.type === 'GuardedChoice') {
          for (const g of s.action.guards) {
            const found = findStep(g.steps)
            if (found) return found
          }
        }
      }
      return null
    }
    const step = findStep(robot.steps)
    if (!step || step.action.type !== 'ForEach') {
      return { loopScopeId: null, loopElementId: null }
    }
    const feAction = step.action

    // スコープ: scopeFinder.selector に一致する最初の 1 ウィジェット
    const scopeWidget = feAction.scopeFinder.selector
      ? findWidget(currentWidgets, feAction.scopeFinder.selector)
      : undefined

    // エレメント: スコープ配下で elementFinder.selector に一致する最初の 1 ウィジェット
    let firstElement: AppWidget | undefined
    if (scopeWidget && feAction.elementFinder.selector) {
      const rawElemSel = feAction.elementFinder.selector.trim()
      if (rawElemSel.startsWith('>')) {
        // '> TYPE' の場合: scopeWidget の直接の子のみを対象
        const rest = rawElemSel.slice(1).trim()
        firstElement = scopeWidget.children.find(
          (child) => child.visible && findWidget([child], rest) !== undefined,
        )
      } else {
        // 非相対: scopeWidget の子孫を再帰検索（最初の 1 件）
        firstElement = findWidget(scopeWidget.children, rawElemSel)
      }
    }

    return {
      loopScopeId: scopeWidget?.id ?? null,
      loopElementId: firstElement?.id ?? null,
    }
  })()

  // ---- タグパス（祖先パス）の計算 --------------------------------
  // selectedWidget が存在する場合にのみ計算する（ID ベースで解決済み）
  const tagPath: AppWidget[] = (() => {
    if (!selectedWidget) return []
    return findWidgetPath(currentWidgets, selectedWidget.id) ?? []
  })()

  // ---- タグパスセグメントの文字列変換 ---------------------------
  function tagSegmentLabel(widget: AppWidget, siblings: AppWidget[]): string {
    const sameType = siblings.filter((s) => s.type === widget.type)
    if (sameType.length <= 1) return widget.type
    const idx = sameType.indexOf(widget)
    return `${widget.type}[${idx + 1}]`
  }

  // ---- スコープ操作: 現在 tick のウィジェットを取得 -------------
  function getWidgets(): AppWidget[] {
    return currentWidgets
  }

  // 「1 レベル外側のタグを選択」（親へ）
  const canSelectParent = !!selectedWidget && tagPath.length >= 2
  const handleSelectParent = useCallback(() => {
    if (!app || !selectedWidgetId) return
    const widgets = applyTimeline(app, currentTick)
    const path = findWidgetPath(widgets, selectedWidgetId)
    if (!path || path.length < 2) return
    const parent = path[path.length - 2]
    if (parent) setSelectedWidgetId(parent.id)
  }, [app, selectedWidgetId, currentTick])

  // 「1 レベル内側のタグを選択」（最初の可視の子へ）
  const firstVisibleChild = selectedWidget?.children.find((c) => c.visible) ?? null
  const canSelectChild = !!firstVisibleChild
  const handleSelectChild = useCallback(() => {
    if (!firstVisibleChild) return
    setSelectedWidgetId(firstVisibleChild.id)
  }, [firstVisibleChild])

  // 「前のタグを選択」（前の兄弟）・「次のタグを選択」（次の兄弟）
  const visibleSiblings: AppWidget[] = (() => {
    if (tagPath.length < 2) {
      return getWidgets().filter((w) => w.visible)
    }
    return (tagPath[tagPath.length - 2]?.children ?? []).filter((w) => w.visible)
  })()
  const siblingIndex = selectedWidget
    ? visibleSiblings.findIndex((s) => s.id === selectedWidget.id)
    : -1
  const canSelectPrev = siblingIndex > 0
  const canSelectNext = siblingIndex >= 0 && siblingIndex < visibleSiblings.length - 1

  const handleSelectPrev = useCallback(() => {
    if (siblingIndex <= 0) return
    const prev = visibleSiblings[siblingIndex - 1]
    if (prev) setSelectedWidgetId(prev.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siblingIndex, visibleSiblings])

  const handleSelectNext = useCallback(() => {
    if (siblingIndex < 0 || siblingIndex >= visibleSiblings.length - 1) return
    const next = visibleSiblings[siblingIndex + 1]
    if (next) setSelectedWidgetId(next.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siblingIndex, visibleSiblings])

  // アプリ画面での要素左クリック（選択）
  const handleLeftClick = useCallback((widget: AppWidget, _e: React.MouseEvent) => {
    setSelectedWidgetId(widget.id)
  }, [])

  // アプリ画面での要素右クリック
  const handleRightClick = useCallback((widget: AppWidget, e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ widget, position: { x: e.clientX, y: e.clientY } })
    setSelectedWidgetId(widget.id)
  }, [])

  // マウス座標追跡（演出用）
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) })
  }, [])

  // 現在選択中のガードチョイスステップを取得（ガード追加に使う）
  const guardedChoiceStep = (() => {
    if (!selectedStepId) return null
    function findStep(steps: typeof robot.steps): typeof robot.steps[0] | null {
      for (const s of steps) {
        if (s.id === selectedStepId && s.action.type === 'GuardedChoice') return s
        if (s.action.type === 'GuardedChoice') {
          for (const g of s.action.guards) {
            const found = findStep(g.steps)
            if (found) return found
          }
        }
        if (s.action.type === 'ForEach') {
          const found = findStep(s.action.body)
          if (found) return found
        }
      }
      return null
    }
    return findStep(robot.steps)
  })()

  // ステップ挿入ハンドラ群
  const handleInsertClick = useCallback(() => {
    if (!contextMenu) return
    const finder = generateFinder(contextMenu.widget)
    addStep({ type: 'Click', finder, clickCount: 1, button: 'left' })
  }, [contextMenu, addStep])

  const handleInsertExtract = useCallback(() => {
    if (!contextMenu) return
    const finder = generateFinder(contextMenu.widget)
    // text 属性を既定に、なければ name を使う
    const attr = contextMenu.widget.text ? 'text' : (Object.keys(contextMenu.widget.attrs)[0] ?? 'name')
    addStep({
      type: 'ExtractValue',
      finder,
      toVariable: '抽出値',
      attribute: attr,
    })
  }, [contextMenu, addStep])

  const handleInsertEnterText = useCallback(() => {
    if (!contextMenu) return
    const finder = generateFinder(contextMenu.widget)
    addStep({ type: 'EnterText', finder, text: '' })
  }, [contextMenu, addStep])

  // ---- For Each ループ（兄弟系）----------------------------------
  const handleInsertForEachSiblings = useCallback((): (() => void) | null => {
    if (!app || !contextMenu) return null
    const widget = contextMenu.widget
    const widgets = applyTimeline(app, currentTick)
    const path = findWidgetPath(widgets, widget.id)
    if (!path || path.length < 2) return null
    const parent = path[path.length - 2]
    if (!parent) return null

    return () => {
      const parentSelector =
        parent.type + (parent.attrs['name'] ? `[name="${parent.attrs['name']}"]` : '')
      const elementSelector = `> ${widget.type}`
      const scopeFinder: DasFinder = { kind: 'component', selector: parentSelector, reuse: 'none' }
      const elementFinder: DasFinder = {
        kind: 'component',
        selector: elementSelector,
        reuse: 'none',
        scopeRef: 'scope1',
      }
      addStep({
        type: 'ForEach',
        scopeFinder,
        scopeFinderName: 'scope1',
        elementFinder,
        body: [],
      })
    }
  }, [app, contextMenu, currentTick, addStep])

  // ---- For Each ループ（子ノード系）-------------------------------
  const handleInsertForEachChildren = useCallback((): (() => void) | null => {
    if (!contextMenu) return null
    const widget = contextMenu.widget
    const firstChild = widget.children.find((c) => c.visible)
    if (!firstChild) return null

    return () => {
      const scopeSelector =
        widget.type + (widget.attrs['name'] ? `[name="${widget.attrs['name']}"]` : '')
      const elementSelector = `> ${firstChild.type}`
      const scopeFinder: DasFinder = { kind: 'component', selector: scopeSelector, reuse: 'none' }
      const elementFinder: DasFinder = {
        kind: 'component',
        selector: elementSelector,
        reuse: 'none',
        scopeRef: 'scope1',
      }
      addStep({
        type: 'ForEach',
        scopeFinder,
        scopeFinderName: 'scope1',
        elementFinder,
        body: [],
      })
    }
  }, [contextMenu, addStep])

  const handleInsertGuard = useCallback((guardType: 'locationFound' | 'applicationFound') => {
    if (!contextMenu || !guardedChoiceStep) {
      if (contextMenu) {
        const finder = generateFinder(contextMenu.widget)
        const guard: Guard = { type: guardType, finder, steps: [] }
        addStep({ type: 'GuardedChoice', guards: [guard] })
      }
      return
    }
    const finder = generateFinder(contextMenu.widget)
    const addGuard = useDasRobotStore.getState().addGuard
    addGuard(guardedChoiceStep.id, { type: guardType, finder, steps: [] })
  }, [contextMenu, guardedChoiceStep, addStep])

  if (!app) {
    return (
      <PanelFrame title="レコーダービュー" hint="模擬デスクトップアプリ" className="!bg-das-panel [&>header]:!bg-das-panelAlt [&>header]:!border-das-border [&>header_h2]:!text-das-text [&>header_span]:!text-das-textDim">
        <div className="flex h-full items-center justify-center text-[13px] text-das-textDim">
          <div className="text-center">
            <div className="mb-2 text-[32px]">🖥</div>
            <p>このミッションにはアプリが設定されていません</p>
          </div>
        </div>
      </PanelFrame>
    )
  }

  return (
    <PanelFrame
      title="レコーダービュー"
      hint="要素を右クリックしてステップを挿入"
      scroll={false}
      className="!bg-das-panel [&>header]:!bg-das-panelAlt [&>header]:!border-das-border [&>header_h2]:!text-das-text [&>header_span]:!text-das-textDim"
    >
      <div className="flex h-full flex-col">
        {/* タブ切り替え + スコープ操作ツールバー（実機 DS のタブ行準拠） */}
        <div className="flex shrink-0 items-center border-b border-das-border bg-das-panelAlt px-2 pt-1 gap-2">
          {/* タブ */}
          <div className="flex">
            {(['app', 'tree'] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'rounded-t px-3 py-1 text-[12px] transition-colors',
                  activeTab === tab
                    ? 'bg-das-bg text-das-text'
                    : 'text-das-textDim hover:text-das-text',
                ].join(' ')}
              >
                {tab === 'app' ? '🖥 アプリ画面' : '🌳 要素ツリー'}
              </button>
            ))}
          </div>

          {/* セパレータ */}
          <span className="text-das-border2 select-none text-[12px]" aria-hidden="true">|</span>

          {/* スコープ操作ツールバー（実機 DS の緑矢印アイコン群） */}
          <div
            role="toolbar"
            aria-label="スコープ操作"
            className="flex items-center gap-0.5 pb-1"
          >
            {/* 1 レベル外側のタグを選択 (↖ 親) */}
            <ScopeNavButton
              icon={
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
                  <path d="M3 3h5v1.5H5.06l5.47 5.47-1.06 1.06L4 5.56V7.5H2.5V3H3z"/>
                  <rect x="2" y="2" width="6" height="1.5" rx="0.4"/>
                </svg>
              }
              label="1 レベル外側のタグを選択"
              disabled={!canSelectParent}
              onClick={handleSelectParent}
            />
            {/* 1 レベル内側のタグを選択 (↘ 子) */}
            <ScopeNavButton
              icon={
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
                  <path d="M13 13H8v-1.5h1.94L4.47 6.03 5.53 4.97 11 10.44V8.5h1.5V13H13z"/>
                  <rect x="8" y="12.5" width="6" height="1.5" rx="0.4"/>
                </svg>
              }
              label="1 レベル内側のタグを選択"
              disabled={!canSelectChild}
              onClick={handleSelectChild}
            />
            {/* 前のタグを選択 (← 前兄弟) */}
            <ScopeNavButton
              icon={
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
                  <path d="M9.5 4l-5 4 5 4V9.5H14v-3H9.5V4z"/>
                </svg>
              }
              label="前のタグを選択"
              disabled={!canSelectPrev}
              onClick={handleSelectPrev}
            />
            {/* 次のタグを選択 (→ 次兄弟) */}
            <ScopeNavButton
              icon={
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
                  <path d="M6.5 4l5 4-5 4V9.5H2v-3h4.5V4z"/>
                </svg>
              }
              label="次のタグを選択"
              disabled={!canSelectNext}
              onClick={handleSelectNext}
            />
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="min-h-0 flex-1 overflow-auto p-3" onMouseMove={handleMouseMove}>
          {activeTab === 'app' && (
            <MockAppView
              app={app}
              currentTick={currentTick}
              onLeftClick={handleLeftClick}
              onRightClick={handleRightClick}
              selectedWidgetId={selectedWidgetId}
              loopScopeId={loopScopeId}
              loopElementId={loopElementId}
            />
          )}

          {activeTab === 'tree' && (
            <div className="rounded border border-das-border bg-das-bg p-2">
              <ul
                role="tree"
                aria-label="要素ツリー"
                className="text-[11px]"
              >
                {currentWidgets.map((w) => (
                  <WidgetTreeItem
                    key={w.id}
                    widget={w}
                    depth={0}
                    selectedWidgetId={selectedWidgetId}
                    onSelect={(widget) => setSelectedWidgetId(widget.id)}
                    onRightClick={handleRightClick}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* タグパスバー（実機 DS 最下部のパスバー準拠） */}
        <div
          className="flex shrink-0 items-center gap-0 border-t border-das-border bg-das-panelAlt px-2 py-0.5 text-[10px] overflow-x-auto"
          role="navigation"
          aria-label="タグパス"
        >
          {tagPath.length === 0 ? (
            <span className="text-das-textDim italic">
              {selectedWidgetId ? '...' : '要素をクリックして選択'}
            </span>
          ) : (
            tagPath.map((seg, i) => {
              // 親の children を求める（セグメントラベルの [n] 計算用）
              const parentChildren =
                i === 0
                  ? currentWidgets
                  : tagPath[i - 1].children
              const label = tagSegmentLabel(seg, parentChildren)
              const isLast = i === tagPath.length - 1
              return (
                <React.Fragment key={seg.id}>
                  {i > 0 && (
                    <span className="mx-0.5 shrink-0 text-das-textDim/60 select-none" aria-hidden="true">
                      .
                    </span>
                  )}
                  <button
                    className={[
                      'shrink-0 rounded px-1 py-0 font-mono transition-colors',
                      isLast
                        ? 'font-bold text-das-text bg-das-accent2/10 border border-das-accent2/30'
                        : 'text-das-textDim hover:text-das-text hover:bg-das-panelAlt',
                    ].join(' ')}
                    onClick={() => setSelectedWidgetId(seg.id)}
                    title={`${label} を選択`}
                    aria-current={isLast ? 'true' : undefined}
                  >
                    {label}
                  </button>
                </React.Fragment>
              )
            })
          )}
          {/* 右端: tick・デバイス情報（実機準拠の演出） */}
          <span className="ml-auto shrink-0 text-das-textDim/60 pl-2">
            x:{mousePos.x} y:{mousePos.y}
          </span>
        </div>
      </div>

      {/* 右クリックコンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          widget={contextMenu.widget}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onInsertClick={handleInsertClick}
          onInsertExtract={handleInsertExtract}
          onInsertEnterText={handleInsertEnterText}
          onInsertForEachSiblings={handleInsertForEachSiblings()}
          onInsertForEachChildren={handleInsertForEachChildren()}
          onInsertGuard={handleInsertGuard}
        />
      )}
    </PanelFrame>
  )
}
