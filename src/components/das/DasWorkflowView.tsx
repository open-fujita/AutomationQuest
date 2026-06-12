// ============================================================
// DasWorkflowView — 緑ロボットの横方向フロー描画（2026.1 準拠リワーク）
//
// 実機 DS のロボットビューを横フローで再現:
//   ○（フローポイント）—[StepCard]—○—[StepCard]—○ の左→右配置
//   青い接続線、折りたたみ/展開 StepCard
//   ガードチョイス: カード内にガードレーン縦並び（GuardLane）
//   ForEach / Loop: カード展開時に body の横フロー（再帰）
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

// ---- 横フロー描画（再帰） ------------------------------------

interface HorizontalFlowProps {
  steps: DasStep[]
  sim: DasSimResult
  selectedStepId: string | null
  onSelect: (id: string) => void
  onRemove?: (id: string) => void
  /** 再帰時は true（最初の FlowPoint を省略しない） */
  isNested?: boolean
}

function HorizontalFlow({
  steps,
  sim,
  selectedStepId,
  onSelect,
  onRemove,
  isNested = false,
}: HorizontalFlowProps) {
  // renderSteps: 循環参照を避けて再帰呼び出しするためのコールバック
  const renderSteps = useCallback(
    (innerSteps: DasStep[]) => (
      <HorizontalFlow
        steps={innerSteps}
        sim={sim}
        selectedStepId={selectedStepId}
        onSelect={onSelect}
        isNested
      />
    ),
    [sim, selectedStepId, onSelect],
  )

  return (
    <div className="flex items-start" role="list" aria-label={isNested ? undefined : 'ステップ一覧'}>
      {/* 最初の FlowPoint */}
      <div className="flex items-center self-stretch mt-3">
        <FlowPoint label={isNested ? undefined : 'フロー開始'} />
        <FlowLine width={8} />
      </div>

      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div role="listitem" className="flex items-start">
            {/* ステップカード（展開時は縦に広がる） */}
            <div className="mt-[5px]">
              <StepCard
                step={step}
                sim={sim}
                selectedStepId={selectedStepId}
                onSelect={onSelect}
                onRemove={onRemove}
                renderSteps={renderSteps}
              />
            </div>
          </div>
          {/* カード後の接続線 + フローポイント */}
          <div className="flex items-center self-stretch mt-3">
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

      {/* 最後のフローポイント（ステップが 0 件のときは最初の後につける） */}
      {steps.length === 0 && (
        <div className="flex items-center self-stretch mt-3">
          <FlowLine width={16} />
          <FlowPoint label="フロー終了" />
        </div>
      )}
      {steps.length > 0 && (
        <div className="flex items-center self-stretch mt-3">
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
