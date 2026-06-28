// ============================================================
// MockAppView — タイトルバー付き疑似 Windows アプリ描画
//
// applyTimeline() で現在 tick のウィジェット状態を取得してレンダリングする。
// Windows 10 風タイトルバー（#0078d7）+ ウィジェット種別ごとのスタイル。
// React.memo で不要な再描画を抑制する。
// アクセシビリティ: role="application" + ウィジェットごとの role/aria 属性
// ============================================================

import React from 'react'
import type { AppWidget, MockApp } from '../../model/mockApp'
import { applyTimeline } from '../../model/mockApp'

// ---- ウィジェット描画 ----------------------------------------

interface WidgetProps {
  widget: AppWidget
  onRightClick?: (widget: AppWidget, e: React.MouseEvent) => void
  /** 左クリックで選択（selectedWidgetId の更新に使う） */
  onLeftClick?: (widget: AppWidget, e: React.MouseEvent) => void
  selectedWidgetId?: string | null
  /**
   * ForEach 選択中ハイライト（DALoopFinder.png 準拠）:
   *   loopScopeId  = スコープに一致した最初の 1 ウィジェットの id → 青枠 + 「loop」タグ
   *   loopElementId = スコープ配下で結合セレクタに一致する最初の 1 エレメントの id → 緑枠 + 「element」タグ
   *
   * ID ベースで判定することで「全一致に付けてしまう」バグを防ぐ。
   */
  loopScopeId?: string | null
  loopElementId?: string | null
}

const WidgetComponent = React.memo(function WidgetComponent({
  widget,
  onRightClick,
  onLeftClick,
  selectedWidgetId,
  loopScopeId,
  loopElementId,
}: WidgetProps) {
  if (!widget.visible) return null

  const isSelected = selectedWidgetId === widget.id

  // loop/element ハイライト判定（DALoopFinder.png 準拠）
  // ID ベースで単一ウィジェットのみに付ける（全一致に付けない）
  const isLoopScope = loopScopeId !== null && loopScopeId !== undefined && loopScopeId === widget.id
  const isLoopElement = loopElementId !== null && loopElementId !== undefined && loopElementId === widget.id

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onRightClick?.(widget, e)
  }

  const handleLeftClick = (e: React.MouseEvent) => {
    // 右ボタンや修飾キーは無視
    if (e.button !== 0) return
    e.stopPropagation()
    onLeftClick?.(widget, e)
  }

  const baseClass = [
    'select-none cursor-pointer',
    isLoopElement
      ? 'outline outline-2 outline-green-500'
      : isLoopScope
        ? 'outline outline-2 outline-blue-500'
        : isSelected
          // 選択枠: 実機準拠の緑（das-ok 相当 = green-600）
          ? 'ring-2 ring-green-500'
          : '',
  ].join(' ')

  // <td>/<tr> 専用の選択・ハイライトクラス
  // ring-* (box-shadow) は border-collapse: collapse のテーブルセル内で描画されない（ブラウザ仕様）。
  // outline は border-collapse の影響を受けず確実に描画される。
  // outline-offset に負値を指定することで inset 風の枠線になる。
  const tableCellBaseClass = [
    'select-none cursor-pointer',
    isLoopElement
      ? 'outline outline-2 outline-green-500 outline-offset-[-2px]'
      : isLoopScope
        ? 'outline outline-2 outline-blue-500 outline-offset-[-2px]'
        : isSelected
          ? 'bg-green-100 outline outline-2 outline-green-600 outline-offset-[-2px]'
          : '',
  ].join(' ')

  // loop/element バッジ（DALoopFinder.png 準拠の青/緑タグ）
  // isLoopScope → 青地白文字「loop」、isLoopElement → 緑地白文字「element」
  const loopBadge =
    isLoopElement ? (
      <span
        className="absolute -top-3 left-0 z-20 rounded-sm bg-green-500 px-1 text-[9px] font-bold text-white leading-4"
        aria-label="loop element"
      >
        element
      </span>
    ) : isLoopScope ? (
      <span
        className="absolute -top-3 left-0 z-20 rounded-sm bg-blue-500 px-1 text-[9px] font-bold text-white leading-4"
        aria-label="loop scope"
      >
        loop
      </span>
    ) : null

  // 子ウィジェットへ props を伝達するヘルパー
  const childProps = {
    onRightClick,
    onLeftClick,
    selectedWidgetId,
    loopScopeId,
    loopElementId,
  }

  switch (widget.type) {
    case 'window':
      return (
        <div
          className={`${baseClass} relative rounded border border-gray-400 bg-gray-100 p-2`}
          role="group"
          aria-label={widget.attrs['title'] ?? widget.attrs['name'] ?? 'ウィンドウ'}
          onClick={handleLeftClick}
          onContextMenu={handleRightClick}
        >
          {loopBadge}
          {widget.children.map((child) => (
            <WidgetComponent
              key={child.id}
              widget={child}
              {...childProps}
            />
          ))}
        </div>
      )

    case 'button': {
      const isDisabled = widget.enabled === false
      return (
        <div className="relative inline-block">
          {loopBadge}
          <button
            disabled={isDisabled}
            className={[
              baseClass,
              'rounded border px-4 py-1 text-[13px]',
              isDisabled
                ? 'border-gray-300 bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-400 bg-[#e1e1e1] text-gray-800 hover:bg-[#d0d0d0] active:bg-[#c0c0c0]',
            ].join(' ')}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
            aria-label={widget.attrs['name'] ?? widget.text}
            aria-disabled={isDisabled}
          >
            {widget.text ?? widget.attrs['name']}
          </button>
        </div>
      )
    }

    case 'label':
      return (
        <div className="relative inline-block">
          {loopBadge}
          <label
            className={`${baseClass} text-[13px] text-gray-700`}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
          >
            {widget.text ?? widget.attrs['name']}
          </label>
        </div>
      )

    case 'textfield':
      return (
        <div className="relative inline-block">
          {loopBadge}
          <input
            readOnly
            value={widget.text ?? widget.attrs['value'] ?? ''}
            className={[
              baseClass,
              'rounded border border-gray-400 bg-white px-2 py-0.5 text-[13px] text-gray-800',
              'read-only:bg-gray-50',
            ].join(' ')}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
            aria-label={widget.attrs['name']}
          />
        </div>
      )

    case 'listitem':
      return (
        <div
          role="listitem"
          className={`${baseClass} relative rounded px-2 py-0.5 text-[12px] text-gray-700 hover:bg-blue-100`}
          onClick={handleLeftClick}
          onContextMenu={handleRightClick}
        >
          {loopBadge}
          {widget.text ?? widget.attrs['name']}
          {widget.children.map((child) => (
            <WidgetComponent
              key={child.id}
              widget={child}
              {...childProps}
            />
          ))}
        </div>
      )

    case 'table':
      return (
        <div className="relative">
          {loopBadge}
          <table
            className={`${baseClass} w-full border-collapse text-[12px]`}
            role="grid"
            aria-label={widget.attrs['name']}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
          >
            <tbody>
              {widget.children.map((row) => {
                // [修正] listitem など tablerow 以外の子を tbody 直下に div で入れると
                //   不正な DOM ネストになる（tbody > div は HTML 仕様違反）。
                //   tablerow 以外の子は tr > td で包んで正しいネストを保つ。
                //   見た目は listitem ケースと同等（セル内にレンダリング）。
                if (row.type !== 'tablerow') {
                  return (
                    <tr key={row.id} className="border-b border-gray-300">
                      <td className="px-2 py-0.5">
                        <WidgetComponent
                          widget={row}
                          {...childProps}
                        />
                      </td>
                    </tr>
                  )
                }
                return (
                  <WidgetComponent
                    key={row.id}
                    widget={row}
                    {...childProps}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )

    case 'tablerow':
      return (
        // ring-* (box-shadow) は border-collapse テーブルの <tr> では描画されないため
        // tableCellBaseClass (outline ベース) を使用する
        <tr
          role="row"
          className={`${tableCellBaseClass} border-b border-gray-300`}
          onClick={handleLeftClick}
          onContextMenu={handleRightClick}
        >
          {widget.children.map((cell) => (
            <WidgetComponent
              key={cell.id}
              widget={cell}
              {...childProps}
            />
          ))}
        </tr>
      )

    case 'tablecell':
      return (
        // ring-* (box-shadow) は border-collapse テーブルの <td> では描画されないため
        // tableCellBaseClass (outline ベース) を使用する
        <td
          role="gridcell"
          className={`${tableCellBaseClass} relative border border-gray-300 px-2 py-1`}
          onClick={handleLeftClick}
          onContextMenu={handleRightClick}
        >
          {loopBadge}
          {widget.text ?? widget.attrs['value']}
        </td>
      )

    case 'checkbox':
      return (
        <div className="relative inline-block">
          {loopBadge}
          <label className={`${baseClass} flex items-center gap-1.5 text-[13px] text-gray-700`} onClick={handleLeftClick} onContextMenu={handleRightClick}>
            <input
              type="checkbox"
              readOnly
              checked={widget.attrs['checked'] === 'true'}
              className="cursor-context-menu"
            />
            {widget.text ?? widget.attrs['name']}
          </label>
        </div>
      )

    case 'notification':
      return (
        <div
          role="alert"
          className={[
            baseClass,
            'relative rounded border border-yellow-400 bg-yellow-100 px-3 py-2 text-[13px] text-yellow-800',
          ].join(' ')}
          onClick={handleLeftClick}
          onContextMenu={handleRightClick}
        >
          {loopBadge}
          <span className="mr-2">⚠</span>
          {widget.text ?? widget.attrs['name']}
          {widget.children.map((child) => (
            <WidgetComponent
              key={child.id}
              widget={child}
              {...childProps}
            />
          ))}
        </div>
      )

    default:
      return (
        <div
          className={`${baseClass} relative text-[12px] text-gray-500`}
          onClick={handleLeftClick}
          onContextMenu={handleRightClick}
        >
          {loopBadge}
          [{widget.type}] {widget.text ?? widget.attrs['name']}
        </div>
      )
  }
})

// ---- MockAppView 本体 ----------------------------------------

interface MockAppViewProps {
  app: MockApp
  currentTick: number
  onRightClick?: (widget: AppWidget, e: React.MouseEvent) => void
  /** 左クリックで要素を選択する（スコープ操作の起点） */
  onLeftClick?: (widget: AppWidget, e: React.MouseEvent) => void
  selectedWidgetId?: string | null
  /**
   * ForEach 選択中ハイライト（DALoopFinder.png 準拠）:
   *   loopScopeId  = スコープに一致した最初の 1 ウィジェットの id → 青枠 + 「loop」タグ
   *   loopElementId = スコープ配下の最初の 1 エレメントの id → 緑枠 + 「element」タグ
   *
   * RecorderView 側でセレクタを解決して ID として渡すことで、
   * 全一致ウィジェットにバッジが付く問題を防ぐ。
   */
  loopScopeId?: string | null
  loopElementId?: string | null
}

export default React.memo(function MockAppView({
  app,
  currentTick,
  onRightClick,
  onLeftClick,
  selectedWidgetId,
  loopScopeId,
  loopElementId,
}: MockAppViewProps) {
  const widgets = applyTimeline(app, currentTick)

  return (
    <div
      className="flex flex-col overflow-hidden rounded-md border border-gray-500 bg-[#f0f0f0] shadow-md"
      role="application"
      aria-label={app.windowTitle}
    >
      {/* Windows 10 風タイトルバー */}
      <div className="flex shrink-0 items-center bg-[#0078d7] px-2 py-1">
        <span className="mr-2 text-[13px] text-white">🖥</span>
        <span className="flex-1 truncate text-[12px] font-medium text-white">{app.windowTitle}</span>
        {/* 最小化/最大化/閉じるボタン（ダミー・演出用） */}
        <div className="ml-2 flex items-center gap-1" aria-hidden="true">
          <button
            className="flex h-5 w-5 items-center justify-center rounded-sm text-[11px] text-white/70 hover:bg-white/20"
            tabIndex={-1}
            aria-label="最小化（ダミー）"
          >
            ─
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center rounded-sm text-[11px] text-white/70 hover:bg-white/20"
            tabIndex={-1}
            aria-label="最大化（ダミー）"
          >
            □
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center rounded-sm text-[11px] text-white/70 hover:bg-red-600"
            tabIndex={-1}
            aria-label="閉じる（ダミー）"
          >
            ✕
          </button>
        </div>
      </div>

      {/* アプリケーションコンテンツ */}
      <div className="min-h-0 flex-1 overflow-auto bg-[#f0f0f0] p-3">
        <div className="flex flex-col gap-2">
          {widgets.map((widget) => (
            <WidgetComponent
              key={widget.id}
              widget={widget}
              onRightClick={onRightClick}
              onLeftClick={onLeftClick}
              selectedWidgetId={selectedWidgetId}
              loopScopeId={loopScopeId}
              loopElementId={loopElementId}
            />
          ))}
          {widgets.length === 0 && (
            <div className="text-center text-[12px] text-gray-400">
              （ウィジェットがありません）
            </div>
          )}
        </div>
      </div>

      {/* ステータスバー（マウス座標風演出） */}
      <div
        className="flex shrink-0 items-center gap-4 border-t border-gray-400 bg-[#e0e0e0] px-3 py-0.5 text-[10px] text-gray-500"
        aria-label="ステータスバー"
      >
        <span>tick: {currentTick}</span>
        <span>ウィジェット数: {widgets.length}</span>
        <span className="ml-auto">DAS レコーダービュー</span>
      </div>
    </div>
  )
})
