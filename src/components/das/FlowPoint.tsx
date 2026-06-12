// ============================================================
// FlowPoint — ○ フローポイント（接続線の始点/終点）
//
// 横フロー描画で使用する小さな丸（実機 DS 準拠）。
// ステップカードの左右に配置し、接続線でつなぐ。
//
// 2 種類のバリアント:
//   blue  = 通常フローポイント（青）
//   loop  = ループ系フローポイント（黄色/オレンジ）
//
// LoopFlowMarker:
//   実機 DS_4_loop_real.png のループフローポイント構造を再現。
//   カード右端に黄色○ → 縦の黄色線（上下に伸びる）→ 上端に黄色▼三角マーカー。
//   ループ本体ステップはこの黄色○の右側に横並びで続く。
// ============================================================

import React from 'react'

interface FlowPointProps {
  /** aria ラベル（省略可） */
  label?: string
  /** ループ系（黄色/オレンジ）にするか（デフォルト: false = 青） */
  loop?: boolean
}

/** 小さな丸（○ フローポイント） */
export const FlowPoint = React.memo(function FlowPoint({ label, loop = false }: FlowPointProps) {
  return (
    <div
      className={[
        'w-3 h-3 rounded-full border-2 shrink-0 z-10',
        loop
          ? 'border-amber-500 bg-white'
          : 'border-blue-500 bg-white',
      ].join(' ')}
      aria-label={label}
      aria-hidden={!label}
      role={label ? 'img' : undefined}
    />
  )
})

/** 水平の接続線 */
export const FlowLine = React.memo(function FlowLine({
  width = 24,
  loop = false,
}: {
  width?: number
  loop?: boolean
}) {
  return (
    <div
      className={['h-0.5 shrink-0', loop ? 'bg-amber-500' : 'bg-blue-500'].join(' ')}
      style={{ width: `${width}px` }}
      aria-hidden="true"
    />
  )
})

/**
 * LoopFlowMarker — ループ系ステップのフローポイント構造
 *
 * 実機 DS_4_loop_real.png 準拠:
 *   ・黄色○ フローポイント（カード右端から body ステップへの接続点）
 *   ・黄色縦線（上下に伸びる反復戻り経路を示す）
 *   ・黄色▼ 三角マーカー（縦線上端に配置、反復の戻り位置を示す）
 *
 * 使い方: ループカードと body ステップ列の間に配置する。
 * <FlowLine loop /><LoopFlowMarker /><FlowLine loop />[body steps]
 */
export const LoopFlowMarker = React.memo(function LoopFlowMarker() {
  return (
    <div
      className="relative flex shrink-0 flex-col items-center self-stretch"
      style={{ width: '16px' }}
      aria-label="ループ フローポイント"
      role="img"
    >
      {/* 上端の▼三角マーカー（反復の戻り位置を示す） */}
      <div
        className="shrink-0"
        style={{
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '7px solid #f59e0b', // amber-500
        }}
        aria-hidden="true"
      />
      {/* 縦の黄色線（上下に伸びる） */}
      <div className="w-0.5 flex-1 bg-amber-500" aria-hidden="true" />
      {/* 黄色○ フローポイント（中央） */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-amber-500 bg-white z-10"
        style={{ left: '2px' }}
        aria-hidden="true"
      />
    </div>
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
