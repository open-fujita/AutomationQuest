// ============================================================
// StepCard — 折りたたみ⇔展開可能なステップカード
//
// 実機 DS の横フローカード構造を再現:
//   折りたたみ時: アイコン + 名前 + ▼（アクション切替ドロップダウン）
//   展開時: ヘッダ（アイコン + タイトル + ^（折りたたみ）+ ?（ヘルプ））+ インラインフォーム
//
// 特殊構造:
//   GuardedChoice: カード内にガードレーン（GuardLane）が縦に並ぶ
//   ForEach: カード内に body の横フロー（再帰）
//
// ⚠ バッジ: 設定不備時にカード右上に表示
// 選択中: ring-2 ring-green-500（緑枠）
// 現在ステップ（実行後）: ring-2 ring-green-400 bg-green-50/10
// アクセシビリティ: role="article"、キーボード操作（Enter/Space で展開）
// ============================================================

import React, { useState, useCallback } from 'react'
import type { DasStep } from '../../model/dasRobot'
import { DAS_ACTION_LABELS } from '../../model/dasRobot'
import { dasStepIssue } from '../../engine/dasStepStatus'
import type { DasSimResult } from '../../engine/dasSimulator'
import { FlowPoint, FlowLine } from './FlowPoint'
import { GuardLane, AddGuardButton } from './GuardLane'
import {
  BrowserForm,
  WindowsForm,
  ClickForm,
  ExtractValueForm,
  EnterTextForm,
  ForEachForm,
  ThrowForm,
  ReturnForm,
  StepNameEditor,
} from './StepCardForms'

// ---- アクション種別ごとのアイコン ----------------------------

const ACTION_ICONS: Record<string, string> = {
  Browser: '🌐',
  Windows: '🪟',
  Click: '👆',
  ExtractValue: '🔎',
  EnterText: '⌨',
  GuardedChoice: '🖐',
  ForEach: '↻',
  Loop: '🔁',
  Break: '⛔',
  Continue: '⏭',
  Condition: '◇',
  Group: '📦',
  Return: '↵',
  Throw: '❗',
  Assign: '=',
  TryCatch: '🔒',
  WhileLoop: '🔄',
}

// ---- 実行ログ解析ヘルパー ------------------------------------

function getStepStatus(
  stepId: string,
  sim: DasSimResult,
): 'ok' | 'error' | 'skip' | 'guard-matched' | 'guard-waiting' | null {
  const entry = [...sim.log].reverse().find((e) => e.stepId === stepId)
  return entry?.status ?? null
}

function isCurrentStep(stepId: string, sim: DasSimResult): boolean {
  if (!sim.ran || sim.log.length === 0) return false
  const last = sim.log[sim.log.length - 1]
  return last.stepId === stepId
}

// ---- StepCard -----------------------------------------------

interface StepCardProps {
  step: DasStep
  sim: DasSimResult
  selectedStepId: string | null
  onSelect: (id: string) => void
  /** 自身の削除（トップレベルのみ有効） */
  onRemove?: (id: string) => void
  /** 再帰的にステップカードを描画するためのコールバック */
  renderSteps: (steps: DasStep[]) => React.ReactNode
}

export const StepCard = React.memo(function StepCard({
  step,
  sim,
  selectedStepId,
  onSelect,
  onRemove,
  renderSteps,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isSelected = selectedStepId === step.id
  const isCurrent = isCurrentStep(step.id, sim)
  const status = getStepStatus(step.id, sim)
  const issue = dasStepIssue(step)

  // 実行後の成立ガード
  const winnerGuardType = sim.guardResults.find((gr) => gr.stepId === step.id)?.winnerGuardType

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(step.id)
    },
    [onSelect, step.id],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(step.id)
      }
    },
    [onSelect, step.id],
  )

  const toggleExpanded = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setExpanded((v) => !v)
      onSelect(step.id)
    },
    [onSelect, step.id],
  )

  // ステータスの色
  const statusBorderColor =
    isCurrent
      ? 'ring-2 ring-green-400 bg-green-400/5'
      : isSelected
        ? 'ring-2 ring-green-500'
        : 'ring-0'

  const statusMark =
    status === 'ok' || status === 'guard-matched'
      ? '✓'
      : status === 'error'
        ? '✕'
        : status === 'skip'
          ? '–'
          : status === 'guard-waiting'
            ? '⏳'
            : null

  const action = step.action
  const icon = ACTION_ICONS[action.type] ?? '▸'
  const label = DAS_ACTION_LABELS[action.type] ?? action.type
  const displayName = step.name || label

  return (
    <div
      role="article"
      aria-label={`ステップ: ${displayName}`}
      className="relative shrink-0"
    >
      {/* カード本体 */}
      <div
        className={[
          'relative rounded border bg-ds-bg text-ds-text cursor-pointer select-none',
          'border-ds-border',
          statusBorderColor,
          !step.enabled ? 'opacity-50' : '',
          // GuardedChoice はレーンが横に伸びるため幅制限を外す
          action.type === 'GuardedChoice' ? 'min-w-[280px]' : 'min-w-[120px] max-w-[280px]',
        ].join(' ')}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* ⚠ バッジ（設定不備時） */}
        {issue && (
          <span
            className="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-ds-warn text-[10px] text-white"
            title={issue}
            aria-label={`警告: ${issue}`}
          >
            ⚠
          </span>
        )}

        {/* ステータスマーク（実行後） */}
        {statusMark && (
          <span
            className={[
              'absolute -top-1.5 -left-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
              status === 'ok' || status === 'guard-matched'
                ? 'bg-ds-ok text-white'
                : status === 'error'
                  ? 'bg-ds-err text-white'
                  : status === 'guard-waiting'
                    ? 'bg-ds-warn text-white'
                    : 'bg-ds-textDim text-white',
            ].join(' ')}
            aria-hidden="true"
          >
            {statusMark}
          </span>
        )}

        {/* ---- 折りたたみ時ヘッダ ---- */}
        {!expanded && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-[12px]">
            <span className="text-[13px] shrink-0">{icon}</span>
            <span className={['flex-1 truncate text-[11px]', !step.enabled ? 'line-through' : ''].join(' ')}>
              {displayName}
            </span>
            <button
              type="button"
              onClick={toggleExpanded}
              className="shrink-0 text-[11px] text-ds-textDim hover:text-ds-text px-0.5"
              aria-label={`${displayName} を展開`}
              title="展開"
            >
              ▼
            </button>
          </div>
        )}

        {/* ---- 展開時 ---- */}
        {expanded && (
          <>
            {/* 展開時ヘッダ */}
            <div className="flex items-center gap-1.5 border-b border-ds-border px-2 py-1.5 text-[12px]">
              <span className="text-[13px] shrink-0">{icon}</span>
              <span className="flex-1 text-[11px] font-medium truncate">{label}</span>
              <button
                type="button"
                onClick={toggleExpanded}
                className="shrink-0 text-[11px] text-ds-textDim hover:text-ds-text px-0.5"
                aria-label={`${displayName} を折りたたむ`}
                title="折りたたむ"
              >
                ^
              </button>
              <button
                type="button"
                className="shrink-0 text-[11px] text-ds-textDim hover:text-ds-text px-0.5"
                aria-label="ヘルプ"
                title="ヘルプ"
              >
                ?
              </button>
            </div>

            {/* 展開時ボディ: インラインフォーム */}
            <div className="p-2 text-[11px]">
              {/* ステップ名編集（共通） */}
              <StepNameEditor step={step} />

              {/* アクション種別ごとのフォーム */}
              {action.type === 'Browser' && <BrowserForm step={step} action={action} />}
              {action.type === 'Windows' && <WindowsForm step={step} action={action} />}
              {action.type === 'Click' && <ClickForm step={step} action={action} />}
              {action.type === 'ExtractValue' && <ExtractValueForm step={step} action={action} />}
              {action.type === 'EnterText' && <EnterTextForm step={step} action={action} />}
              {action.type === 'ForEach' && <ForEachForm step={step} action={action} />}
              {action.type === 'Throw' && <ThrowForm step={step} action={action} />}
              {action.type === 'Return' && <ReturnForm />}
              {action.type === 'Loop' && (
                <div className="text-[10px] text-ds-textDim italic">🔁 ループ（Body ステップは下の横フローに表示）</div>
              )}
              {action.type === 'Break' && (
                <div className="text-[10px] text-ds-textDim italic">⛔ ループを終了します</div>
              )}
              {action.type === 'Continue' && (
                <div className="text-[10px] text-ds-textDim italic">⏭ 次の反復へスキップします</div>
              )}
              {action.type === 'Condition' && (
                <div className="text-[10px] text-ds-textDim italic">◇ 条件分岐（未実装ステップ）</div>
              )}
              {action.type === 'Group' && (
                <div className="text-[10px] text-ds-textDim italic">📦 グループ（未実装ステップ）</div>
              )}
              {(action.type === 'Assign' ||
                action.type === 'TryCatch' ||
                action.type === 'WhileLoop') && (
                <div className="text-[10px] text-ds-textDim italic">
                  この研修ラボでは未対応のステップです
                </div>
              )}

              {/* ステップ削除（onRemove が渡されたときのみ） */}
              {onRemove && (
                <div className="mt-3 border-t border-ds-border/40 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(step.id)
                    }}
                    className="w-full rounded border border-ds-err/40 px-2 py-1 text-[11px] text-ds-err hover:bg-ds-err/10"
                    aria-label="ステップを削除"
                  >
                    ✕ ステップを削除
                  </button>
                </div>
              )}
            </div>

            {/* ---- GuardedChoice: ガードレーン縦並び ---- */}
            {action.type === 'GuardedChoice' && (
              <div className="border-t border-ds-border p-2 space-y-1">
                {action.guards.length === 0 && (
                  <div className="rounded border border-ds-warn/30 bg-ds-warn/5 p-2 text-[11px] text-ds-warn">
                    ⚠ ガードが未設定です。⊕ボタンから追加してください。
                  </div>
                )}
                {action.guards.map((guard, i) => (
                  <React.Fragment key={i}>
                    <GuardLane
                      guard={guard}
                      guardIndex={i}
                      parentStepId={step.id}
                      isWinner={winnerGuardType === guard.type}
                      renderBranchSteps={renderSteps}
                    />
                    {/* レーン間の破線 + 緑 ⊕（最後のレーンの後にも表示） */}
                    {i < action.guards.length - 1 && (
                      <AddGuardButton stepId={step.id} />
                    )}
                  </React.Fragment>
                ))}
                {/* 最後のガードの後にも追加ボタン */}
                <AddGuardButton stepId={step.id} />
              </div>
            )}

            {/* ---- ForEach: body の横フロー ---- */}
            {action.type === 'ForEach' && (
              <div className="border-t border-ds-border p-2">
                <div className="text-[10px] text-ds-textDim mb-1">body:</div>
                <div className="flex items-center overflow-x-auto">
                  <FlowPoint label="ForEach body 開始" />
                  <FlowLine width={8} />
                  {renderSteps(action.body)}
                  {action.body.length === 0 && (
                    <span className="text-[10px] text-ds-textDim/60 italic px-2">（body が空）</span>
                  )}
                  <FlowLine width={8} />
                  <FlowPoint label="ForEach body 終了" />
                </div>
              </div>
            )}

            {/* ---- Loop: body の横フロー ---- */}
            {action.type === 'Loop' && (
              <div className="border-t border-ds-border p-2">
                <div className="text-[10px] text-ds-textDim mb-1">body:</div>
                <div className="flex items-center overflow-x-auto">
                  <FlowPoint label="Loop body 開始" />
                  <FlowLine width={8} />
                  {renderSteps(action.body)}
                  {action.body.length === 0 && (
                    <span className="text-[10px] text-ds-textDim/60 italic px-2">（body が空）</span>
                  )}
                  <FlowLine width={8} />
                  <FlowPoint label="Loop body 終了" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})

export default StepCard
