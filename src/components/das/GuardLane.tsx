// ============================================================
// GuardLane — ガードチョイスカード内のガードレーン
//
// 実機 UI スクリーンショット（DS_3_guardedchoice_real.png）準拠:
//
//   レーン構造（横一列）:
//     ガード設定ボックス（白ボックス: ドロップダウン＋設定フィールド縦並び）
//       → 青線 → ○ → 枝ステップカード列 → 右端合流線
//
//   複数レーン = 縦積み（左側の縦線から各レーンに分配）
//   レーン間に破線 + 緑の ⊕（クリックでガード追加）
//
// フィールド検証:
//   秒数が空/不正なとき: 入力欄を赤枠 + 右に赤い ❗ アイコン
//   ファインダーのコンポーネントが未設定: FinderForm に showError を渡して ❗ 表示
//
// アクセシビリティ: ドロップダウンに aria-label、⊕ ボタンに aria-label
// ============================================================

import React, { useState } from 'react'
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

  // 秒数フィールドのローカル状態（空文字を許容して赤枠表示するため）
  const [secondsInput, setSecondsInput] = useState<string>(
    guard.seconds !== undefined ? String(guard.seconds) : '',
  )

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
    // 秒数ローカル状態リセット
    if (newType === 'timeout') {
      setSecondsInput(guard.seconds !== undefined ? String(guard.seconds) : '60')
    }
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

  // 秒数 input の onChange（ローカル state を更新、数値確定時に store へ）
  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setSecondsInput(raw)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed) && parsed >= 1) {
      updateGuardTimeout(parentStepId, guardIndex, parsed)
    }
  }

  // 秒数が空/不正かどうか
  const secondsInvalid = secondsInput === '' || isNaN(parseInt(secondsInput, 10)) || parseInt(secondsInput, 10) < 1

  // ファインダーが未設定かどうか（セレクタが空）
  const finderEmpty = !guard.finder?.selector || guard.finder.selector.trim() === ''

  return (
    // 横レーン: ガード設定ボックス → 青線 → ○ → 枝ステップ
    <div
      className={[
        'flex items-start gap-0 overflow-x-auto',
        // 成立ガードは全体を薄緑でハイライト
        isWinner ? 'bg-green-400/5 rounded' : '',
      ].join(' ')}
    >
      {/* ──────────────────────────────────────────────────
          ガード設定ボックス（実機: 白い小ボックス＋薄いグレー枠）
          ────────────────────────────────────────────────── */}
      <div
        className={[
          'shrink-0 rounded border bg-white p-1.5 text-[11px] min-w-[130px] max-w-[200px]',
          isWinner ? 'border-green-500/60' : 'border-das-border',
        ].join(' ')}
      >
        {/* ガード種別ドロップダウン + 削除ボタン */}
        <div className="flex items-center gap-1 mb-1">
          <select
            value={guard.type}
            onChange={(e) => handleTypeChange(e.target.value as GuardType)}
            className={[
              'flex-1 rounded border px-1 py-0.5 text-[11px] focus:outline-none bg-white',
              isWinner
                ? 'border-green-500/60 text-green-700 focus:border-green-500'
                : 'border-das-border text-das-text focus:border-green-600',
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
            <span className="shrink-0 text-[11px] text-green-500" title="成立したガード">✓</span>
          )}
          {/* 削除ボタン（控えめに） */}
          <button
            type="button"
            onClick={() => removeGuard(parentStepId, guardIndex)}
            className="shrink-0 rounded px-0.5 py-0.5 text-[10px] text-das-textDim hover:text-das-err leading-none"
            aria-label={`ガード ${guardIndex + 1} を削除`}
            title="ガードを削除"
          >
            ✕
          </button>
        </div>

        {/* timeout: 秒数入力（赤枠 + ❗ バリデーション） */}
        {guard.type === 'timeout' && (
          <div>
            <label
              htmlFor={`guard-sec-${parentStepId}-${guardIndex}`}
              className="block text-[10px] text-das-textDim mb-0.5"
            >
              秒
            </label>
            <div className="flex items-center gap-1">
              <input
                id={`guard-sec-${parentStepId}-${guardIndex}`}
                type="number"
                min={1}
                max={600}
                value={secondsInput}
                onChange={handleSecondsChange}
                className={[
                  'w-20 rounded border px-1.5 py-0.5 text-[11px] bg-white text-das-text focus:outline-none',
                  secondsInvalid
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-das-border focus:border-green-600',
                ].join(' ')}
                aria-label="タイムアウト秒数"
                aria-invalid={secondsInvalid}
              />
              {secondsInvalid && (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                  aria-label="秒数が未設定または不正です"
                  title="秒数が未設定または不正です"
                >
                  ❗
                </span>
              )}
            </div>
          </div>
        )}

        {/* treeStoppedChanging: ミリ秒表示 */}
        {guard.type === 'treeStoppedChanging' && (
          <div>
            <label className="block text-[10px] text-das-textDim mb-0.5">ミリ秒</label>
            <span className="text-[11px] text-das-text font-mono">{guard.ms ?? 500}</span>
          </div>
        )}

        {/* Location / Application 系: ファインダーフォーム */}
        {guard.finder !== undefined && guard.type !== 'timeout' && guard.type !== 'treeStoppedChanging' && (
          <FinderForm
            finder={guard.finder}
            onChange={handleFinderChange}
            showHeader={true}
            headerLabel="コンポーネント"
            idPrefix={`guard-finder-${parentStepId}-${guardIndex}`}
            showError={finderEmpty}
          />
        )}
      </div>

      {/* ──────────────────────────────────────────────────
          青線 → ○ → 枝ステップカード列（横フロー）
          ────────────────────────────────────────────────── */}
      <div className="flex items-start shrink-0">
        <FlowLine width={16} />
        <FlowPoint label={`ガード ${guardIndex + 1} 枝の開始`} />
        <FlowLine width={8} />
      </div>
      <div className="flex items-start gap-0">
        {renderBranchSteps(guard.steps)}
        {guard.steps.length === 0 && (
          <div className="flex items-center text-[10px] text-das-textDim/60 italic px-2 py-1 shrink-0 self-center">
            （ステップなし）
          </div>
        )}
      </div>
      {/* 右端合流線 */}
      <div className="flex items-start shrink-0">
        <FlowLine width={8} />
        <FlowPoint label={`ガード ${guardIndex + 1} 枝の終了`} />
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
