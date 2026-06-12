// ============================================================
// FlowPoint — ○ フローポイント（接続線の始点/終点）
//
// 横フロー描画で使用する小さな青い丸（実機 DS 準拠）。
// ステップカードの左右に配置し、青い接続線でつなぐ。
// ============================================================

import React from 'react'

interface FlowPointProps {
  /** aria ラベル（省略可） */
  label?: string
}

/** 小さな青い丸（○ フローポイント） */
export const FlowPoint = React.memo(function FlowPoint({ label }: FlowPointProps) {
  return (
    <div
      className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white shrink-0 z-10"
      aria-label={label}
      aria-hidden={!label}
      role={label ? 'img' : undefined}
    />
  )
})

/** 水平の青い接続線 */
export const FlowLine = React.memo(function FlowLine({ width = 24 }: { width?: number }) {
  return (
    <div
      className="h-0.5 bg-blue-500 shrink-0"
      style={{ width: `${width}px` }}
      aria-hidden="true"
    />
  )
})

/** フローポイント + 接続線 + フローポイント のセット */
export const FlowConnector = React.memo(function FlowConnector() {
  return (
    <div className="flex items-center shrink-0" aria-hidden="true">
      <FlowLine />
      <FlowPoint />
      <FlowLine />
    </div>
  )
})

export default FlowPoint
