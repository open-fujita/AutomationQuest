// ============================================================
// GuardLane — ガードチョイスカード内のガードレーン
//
// 実機 UI 画像（GuardedChoiceLocation.png / add_guard2.png）準拠:
//   各レーン = ガード種別ドロップダウン + インライン設定フォーム → 青線 → ○ → 枝ステップカード列 → ○
//   レーン間に破線 + 緑の ⊕（クリックでガード追加）
//
// アクセシビリティ: ドロップダウンに aria-label、⊕ ボタンに aria-label
// ============================================================

import React from 'react'
import type { Guard, GuardType, DasFinder } from '../../model/dasRobot'
import { GUARD_TYPE_DROPDOWN_LABELS } from '../../model/dasRobot'
import { useDasRobotStore } from '../../store/dasRobotStore'
import { FinderForm } from './FinderForm'
import { FlowPoint, FlowLine } from './FlowPoint'
import { mapStepById } from './StepCardForms'

// ガード種別の選択肢（ドロップダウン表示）
const GUARD_TYPES: GuardType[] = [
  'locationFound',
  'locationNotFound',
  'locationRemoved',
  'applicationFound',
  'applicationNotFound',
  'treeStoppedChanging',
  'timeout',
]

// ---- 遅延インポート（循環参照回避: StepCard → GuardLane → StepCard）----
// StepCard をここでは型だけ使い、実際の描画は dynamic import 的に扱う
// （実際には props で children として受け取る方式を採用）

interface GuardLaneProps {
  guard: Guard
  guardIndex: number
  /** 親ステップ（GuardedChoice）の ID */
  parentStepId: string
  /** 実行後に成立したガードかどうか */
  isWinner: boolean
  /** 枝ステップの描画（StepCard を循環せず使うため children として受け取る）*/
  renderBranchSteps: (steps: import('../../model/dasRobot').DasStep[]) => React.ReactNode
}

export const GuardLane = React.memo(function GuardLane({
  guard,
  guardIndex,
  parentStepId,
  isWinner,
  renderBranchSteps,
}: GuardLaneProps) {
  const removeGuard = useDasRobotStore((s) => s.removeGuard)
  const updateGuardTimeout = useDasRobotStore((s) => s.updateGuardTimeout)

  // ガード種別変更
  const handleTypeChange = (newType: GuardType) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, parentStepId, (step) => {
          if (step.action.type !== 'GuardedChoice') return step
          const guards = step.action.guards.map((g, i) =>
            i === guardIndex
              ? {
                  ...g,
                  type: newType,
                  // Location/Application 系はファインダー初期化
                  ...(newType !== 'timeout' && newType !== 'treeStoppedChanging'
                    ? { finder: g.finder ?? { kind: 'component' as const, selector: '', reuse: 'none' as const } }
                    : {}),
                  // timeout は seconds 初期化
                  ...(newType === 'timeout' ? { seconds: g.seconds ?? 60 } : {}),
                }
              : g,
          )
          return { ...step, action: { ...step.action, guards } }
        }),
      },
    }))
  }

  // ファインダー変更
  const handleFinderChange = (finder: DasFinder) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, parentStepId, (step) => {
          if (step.action.type !== 'GuardedChoice') return step
          const guards = step.action.guards.map((g, i) =>
            i === guardIndex ? { ...g, finder } : g,
          )
          return { ...step, action: { ...step.action, guards } }
        }),
      },
    }))
  }

  return (
    <div
      className={[
        'rounded border',
        isWinner
          ? 'border-green-500/50 bg-green-400/5'
          : 'border-ds-border/60 bg-ds-panelAlt',
      ].join(' ')}
    >
      {/* レーンヘッダ: ガード種別ドロップダウン + 削除ボタン */}
      <div className="flex items-center gap-1 p-1.5">
        <select
          value={guard.type}
          onChange={(e) => handleTypeChange(e.target.value as GuardType)}
          className={[
            'flex-1 rounded border px-1.5 py-0.5 text-[11px] focus:outline-none',
            'border-ds-border bg-ds-bg text-ds-text focus:border-ds-accent2',
            isWinner ? 'border-green-500/60 text-green-300' : '',
          ].join(' ')}
          aria-label={`ガード ${guardIndex + 1} の種別`}
        >
          {GUARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {GUARD_TYPE_DROPDOWN_LABELS[t]}
            </option>
          ))}
        </select>
        {isWinner && (
          <span className="shrink-0 text-[11px] text-green-400" title="成立したガード">✓</span>
        )}
        <button
          type="button"
          onClick={() => removeGuard(parentStepId, guardIndex)}
          className="shrink-0 rounded px-1 py-0.5 text-[11px] text-ds-textDim hover:text-ds-err"
          aria-label={`ガード ${guardIndex + 1} を削除`}
          title="ガードを削除"
        >
          ✕
        </button>
      </div>

      {/* ガード設定: timeout は秒数 input、Location/Application はファインダーフォーム */}
      {guard.type === 'timeout' && (
        <div className="px-2 pb-1.5">
          <label
            htmlFor={`guard-sec-${parentStepId}-${guardIndex}`}
            className="block text-[10px] text-ds-textDim mb-0.5"
          >
            秒
          </label>
          <input
            id={`guard-sec-${parentStepId}-${guardIndex}`}
            type="number"
            min={1}
            max={600}
            value={guard.seconds ?? 60}
            onChange={(e) => updateGuardTimeout(parentStepId, guardIndex, Number(e.target.value))}
            className="w-24 rounded border border-ds-border bg-ds-bg px-2 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
            aria-label="タイムアウト秒数"
          />
        </div>
      )}
      {guard.type === 'treeStoppedChanging' && (
        <div className="px-2 pb-1.5">
          <label className="block text-[10px] text-ds-textDim mb-0.5">ミリ秒</label>
          <span className="text-[11px] text-ds-text font-mono">{guard.ms ?? 500}</span>
        </div>
      )}
      {guard.finder !== undefined && guard.type !== 'timeout' && guard.type !== 'treeStoppedChanging' && (
        <div className="px-2 pb-1.5">
          <FinderForm
            finder={guard.finder}
            onChange={handleFinderChange}
            idPrefix={`guard-finder-${parentStepId}-${guardIndex}`}
          />
        </div>
      )}

      {/* 枝ステップの横フロー: → ○ → [枝ステップカード列] → ○ */}
      <div className="flex items-start px-1.5 pb-1.5 gap-0 overflow-x-auto">
        <div className="flex items-center shrink-0">
          <FlowLine width={12} />
          <FlowPoint label={`ガード ${guardIndex + 1} 枝の開始`} />
          <FlowLine width={8} />
        </div>
        <div className="flex items-start gap-0">
          {renderBranchSteps(guard.steps)}
          {guard.steps.length === 0 && (
            <div className="flex items-center text-[10px] text-ds-textDim/60 italic px-2 py-1 shrink-0">
              （ステップなし）
            </div>
          )}
        </div>
        <div className="flex items-center shrink-0">
          <FlowLine width={8} />
          <FlowPoint label={`ガード ${guardIndex + 1} 枝の終了`} />
        </div>
      </div>
    </div>
  )
})

// ---- ガード追加ボタン（レーン間の破線 + 緑 ⊕）-----------------

interface AddGuardButtonProps {
  stepId: string
}

export const AddGuardButton = React.memo(function AddGuardButton({ stepId }: AddGuardButtonProps) {
  const addGuard = useDasRobotStore((s) => s.addGuard)

  const handleAdd = () => {
    const guard: Guard = {
      type: 'locationFound',
      finder: { kind: 'component', selector: '', reuse: 'none' },
      steps: [],
    }
    addGuard(stepId, guard)
  }

  return (
    <div className="flex items-center gap-2 py-0.5 group">
      {/* 破線 */}
      <div
        className="flex-1 border-t-2 border-dashed border-green-500/50 group-hover:border-green-400"
        aria-hidden="true"
      />
      {/* ⊕ ボタン */}
      <button
        type="button"
        onClick={handleAdd}
        className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-green-500 bg-white text-green-600 text-[14px] font-bold hover:bg-green-50 focus:outline-none focus:ring-1 focus:ring-green-500"
        aria-label="ガードを追加"
        title="ガードを追加"
      >
        +
      </button>
      {/* 破線 */}
      <div
        className="flex-1 border-t-2 border-dashed border-green-500/50 group-hover:border-green-400"
        aria-hidden="true"
      />
    </div>
  )
})

export default GuardLane
