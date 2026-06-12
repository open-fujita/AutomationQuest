// ============================================================
// DasWorkflowView — 緑ロボットの横方向フロー描画（2026.1 準拠リワーク）
//
// 実機 DS のロボットビューを横フローで再現:
//   ○（フローポイント）—[StepCard]—○—[StepCard]—○ の左→右配置
//   青い接続線、折りたたみ/展開 StepCard
//   ガードチョイス: カード内にガードレーン縦並び（GuardLane）
//   ForEach / Loop: カード展開時に body の横フロー（再帰）
//
// フローライン固定Y方式（実機準拠）:
//   水平フロー線・フローポイントは全ステップ共通の固定 Y を通る。
//   FLOW_Y_OFFSET = カードヘッダ中心までの距離（px）。
//   カードは line が貫通するヘッダを持ち、展開フォームは下へ伸びる。
//   各フロー要素に mt-[FLOW_Y_OFFSETpx] を付与して線を固定 Y に揃える。
//
// overflow-x: auto でキャンバスをスクロール可能にする。
// アクセシビリティ: role="region"、aria-label="ワークフロー キャンバス"
// ============================================================

import React, { useCallback } from 'react'
import type { DasStep } from '../../model/dasRobot'
import { useDasRobotStore } from '../../store/dasRobotStore'
import type { DasSimResult } from '../../engine/dasSimulator'
import { FlowPoint, FlowLine } from './FlowPoint'
import { StepCard } from './StepCard'


// カードヘッダの中心 Y（上端からの px）。
// StepCard のヘッダ高は py-1.5（6px top/bottom） + text-[12px]（約14px） ≒ 26px → 中心 = 13px。
// 線・○ の中心をここに合わせる（mt でオフセット）。
// ○ の半径 = 6px（h-3=12px/2）なので mt = FLOW_Y - 6 = 7px。
const FLOW_Y_OFFSET = 7 // px: ○/線 の上端オフセット（mt として付与）

// ---- 横フロー描画（再帰） ------------------------------------

interface HorizontalFlowProps {
  steps: DasStep[]
  sim: DasSimResult
  selectedStepId: string | null
  onSelect: (id: string) => void
  onRemove?: (id: string) => void
  /** 再帰時は true（ aria-label を省略） */
  isNested?: boolean
  /**
   * true のとき先頭 FlowPoint を描かない。
   * ループ body（StepCard の renderSteps 経由）では LoopFlowMarker が既に黄○を描いているため
   * HorizontalFlow の先頭青○と重複しないよう省略する。
   */
  omitFirstPoint?: boolean
}

function HorizontalFlow({
  steps,
  sim,
  selectedStepId,
  onSelect,
  onRemove,
  isNested = false,
  omitFirstPoint = false,
}: HorizontalFlowProps) {
  // renderSteps: ループ body 用（先頭 FlowPoint を省略）
  const renderSteps = useCallback(
    (innerSteps: DasStep[]) => (
      <HorizontalFlow
        steps={innerSteps}
        sim={sim}
        selectedStepId={selectedStepId}
        onSelect={onSelect}
        isNested
        omitFirstPoint
      />
    ),
    [sim, selectedStepId, onSelect],
  )

  // 接続線・フローポイントのスタイル: 固定 Y に揃えるため self-start + mt で上端を指定
  const lineStyle = `flex items-center self-start shrink-0`
  const lineMt = `mt-[${FLOW_Y_OFFSET}px]`

  return (
    <div className="flex items-start" role="list" aria-label={isNested ? undefined : 'ステップ一覧'}>
      {/* 先頭 FlowPoint: omitFirstPoint=true（ループ body）のときは省略 */}
      {!omitFirstPoint && (
        <div className={`${lineStyle} ${lineMt}`}>
          <FlowPoint label={isNested ? undefined : 'フロー開始'} />
          <FlowLine width={8} />
        </div>
      )}

      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div role="listitem" className="flex items-start shrink-0">
            {/* ステップカード: 先頭揃え（items-start）で展開しても線 Y は動かない */}
            <StepCard
              step={step}
              sim={sim}
              selectedStepId={selectedStepId}
              onSelect={onSelect}
              onRemove={onRemove}
              renderSteps={renderSteps}
            />
          </div>
          {/*
           * カード後コネクタ（接続線 + ○）
           *
           * ループ系・通常系ともに同じ構造:
           *   中間: FlowLine — FlowPoint — FlowLine
           *   最終: FlowLine のみ（終端○は後続の「フロー終了」ブロックで描く）
           *
           * ループ系 StepCard（ForEach / Loop / WhileLoop）は body 末尾まで内部で描くが、
           * 末尾 FlowLine / FlowPoint は描かず DasWorkflowView に委ねる。
           * これにより LoopFlowMarker（黄○）と通常コネクタ（青○）の重複が発生しない。
           */}
          <div className={`${lineStyle} ${lineMt}`}>
            <FlowLine width={8} />
            {i < steps.length - 1 && (
              <>
                <FlowPoint />
                <FlowLine width={8} />
              </>
            )}
          </div>
        </React.Fragment>
      ))}

      {/*
       * 末尾 FlowPoint
       *
       * ループ body（omitFirstPoint=true）では省略する:
       *   body 末尾の ○ は DasWorkflowView の通常コネクタが描くため重複しない。
       * トップレベル / ガード枝（omitFirstPoint=false）: 従来通り描く。
       *
       * ステップ 0 件: omitFirstPoint=true（ループ空 body）のときは StepCard がピルを表示するため何も描かない。
       */}
      {!omitFirstPoint && steps.length === 0 && (
        <div className={`${lineStyle} ${lineMt}`}>
          <FlowLine width={16} />
          <FlowPoint label="フロー終了" />
        </div>
      )}
      {!omitFirstPoint && steps.length > 0 && (
        <div className={`${lineStyle} ${lineMt}`}>
          <FlowPoint label={isNested ? undefined : 'フロー終了'} />
        </div>
      )}
    </div>
  )
}

// ---- DasWorkflowView 本体 ------------------------------------

export default function DasWorkflowView() {
  const robot = useDasRobotStore((s) => s.robot)
  const selectedStepId = useDasRobotStore((s) => s.selectedStepId)
  const sim = useDasRobotStore((s) => s.sim)
  const selectStep = useDasRobotStore((s) => s.selectStep)
  const removeStep = useDasRobotStore((s) => s.removeStep)

  return (
    <div
      role="region"
      aria-label="ワークフロー キャンバス"
      className="h-full overflow-auto bg-das-bg p-4"
    >
      {/* タブ風ヘッダ（デザイン / デバッグ） */}
      <div className="flex items-center gap-0 mb-3 shrink-0">
        <div className="flex rounded-t border border-das-border bg-das-bg px-3 py-1 text-[11px] text-das-text border-b-white -mb-px z-10">
          デザイン
        </div>
        <div className="flex rounded-t border border-das-border bg-das-panelAlt px-3 py-1 text-[11px] text-das-textDim">
          デバッグ
        </div>
      </div>

      {/* ワークフロー キャンバス */}
      <div
        className="min-h-[80px] overflow-x-auto overflow-y-visible"
        aria-label="ステップフロー"
      >
        {robot.steps.length === 0 ? (
          <div className="flex items-center gap-2 p-4">
            {/* 空のフロー表示 */}
            <div className="flex items-center text-[12px] text-das-textDim">
              <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white shrink-0" aria-hidden="true" />
              <div className="h-0.5 w-8 bg-blue-500" aria-hidden="true" />
              <div className="flex flex-col items-center justify-center rounded border border-dashed border-das-border px-4 py-3 text-center min-w-[160px]">
                <div className="mb-1 text-[20px]">🤖</div>
                <div className="text-[11px] text-das-textDim">
                  パレットからステップを追加するか
                  <br />
                  レコーダービューで右クリックして
                  <br />
                  ステップを挿入してください
                </div>
              </div>
              <div className="h-0.5 w-8 bg-blue-500" aria-hidden="true" />
              <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white shrink-0" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <HorizontalFlow
            steps={robot.steps}
            sim={sim}
            selectedStepId={selectedStepId}
            onSelect={selectStep}
            onRemove={removeStep}
          />
        )}
      </div>
    </div>
  )
}
