// ============================================================
// StepCard — 折りたたみ⇔展開可能なステップカード
//
// 実機 DS の横フローカード構造を再現:
//   折りたたみ時: アイコン + 名前 + ▼（アクション切替ドロップダウン）
//   展開時: ヘッダ（アイコン + タイトル + ^（折りたたみ）+ ?（ヘルプ））+ インラインフォーム
//
// 特殊構造:
//   GuardedChoice: カード内にガードレーン（GuardLane）が縦に並ぶ
//   ForEach / Loop / WhileLoop:
//     実機 DS_4_loop_real.png 準拠 — カード右端に黄色フローマーカー（LoopFlowMarker）を配置し、
//     body ステップを同レーン上の右側（カード外）に横並びで描画する。
//     カード内には body を入れ子表示しない。
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
import { FlowPoint, FlowLine, LoopFlowMarker } from './FlowPoint'
import { GuardLane, AddGuardButton } from './GuardLane'
import { useDasRobotStore } from '../../store/dasRobotStore'
import type { InsertTarget } from '../../store/dasRobotStore'

// カードヘッダ中心 Y（DasWorkflowView と同じ値）: ○/線の上端オフセット(px)
const FLOW_Y_OFFSET = 7
import {
  BrowserForm,
  WindowsForm,
  ClickForm,
  ExtractValueForm,
  EnterTextForm,
  ForEachForm,
  WhileLoopForm,
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

  // 挿入先ターゲット（ForEach body への挿入先切り替えに使う）
  const insertTarget = useDasRobotStore((s) => s.insertTarget)
  const setInsertTarget = useDasRobotStore((s) => s.setInsertTarget)

  // この ForEach のbody が挿入先として選択されているか
  const isBodyInsertTarget =
    insertTarget.kind === 'forEachBody' && insertTarget.stepId === step.id

  // body プレースホルダ / body レーンのクリック: 挿入先を body に切り替える
  const handleBodyClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const target: InsertTarget = { kind: 'forEachBody', stepId: step.id }
      setInsertTarget(target)
      onSelect(step.id)
    },
    [setInsertTarget, step.id, onSelect],
  )

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

  // ステータスの色（ライトテーマ上での緑枠はそのまま維持）
  const statusBorderColor =
    isCurrent
      ? 'ring-2 ring-green-500 bg-green-50'
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

  // ループ系ステップ（body を持つ）
  const isLoopStep =
    action.type === 'ForEach' || action.type === 'Loop' || action.type === 'WhileLoop'
  const loopBody =
    action.type === 'ForEach'
      ? action.body
      : action.type === 'Loop'
        ? action.body
        : action.type === 'WhileLoop'
          ? action.body
          : []

  return (
    // ループ系: カード + 黄色フローマーカー + body ステップを横一列で並べる
    <div
      role="article"
      aria-label={`ステップ: ${displayName}`}
      className={['flex items-start shrink-0', isLoopStep ? '' : 'relative'].join(' ')}
    >
      {/* カード本体: ライトテーマ（白地・薄グレー枠・濃グレー文字） */}
      <div
        className={[
          'relative rounded border bg-das-bg text-das-text cursor-pointer select-none shrink-0',
          'border-das-border shadow-sm',
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
            className="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-das-warn text-[10px] text-white"
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
                ? 'bg-das-ok text-white'
                : status === 'error'
                  ? 'bg-das-err text-white'
                  : status === 'guard-waiting'
                    ? 'bg-das-warn text-white'
                    : 'bg-das-textDim text-white',
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
            <span className={['flex-1 truncate text-[11px] text-das-text', !step.enabled ? 'line-through' : ''].join(' ')}>
              {displayName}
            </span>
            <button
              type="button"
              onClick={toggleExpanded}
              className="shrink-0 text-[11px] text-das-textDim hover:text-das-text px-0.5"
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
            {/* 展開時ヘッダ: ↻ アイコン + ラベル + ^ + ? */}
            <div className="flex items-center gap-1.5 border-b border-das-border px-2 py-1.5 text-[12px] bg-das-panelAlt">
              <span className="text-[13px] shrink-0">{icon}</span>
              <span className="flex-1 text-[11px] font-medium truncate text-das-text">{label}</span>
              <button
                type="button"
                onClick={toggleExpanded}
                className="shrink-0 text-[11px] text-das-textDim hover:text-das-text px-0.5"
                aria-label={`${displayName} を折りたたむ`}
                title="折りたたむ"
              >
                ^
              </button>
              <button
                type="button"
                className="shrink-0 text-[11px] text-das-textDim hover:text-das-text px-0.5"
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
              {action.type === 'WhileLoop' && <WhileLoopForm step={step} action={action} />}
              {action.type === 'Throw' && <ThrowForm step={step} action={action} />}
              {action.type === 'Return' && <ReturnForm />}
              {action.type === 'Loop' && (
                <div className="text-[10px] text-das-textDim italic">
                  🔁 ループ（Body ステップは右の横フローに表示）
                </div>
              )}
              {action.type === 'Break' && (
                <div className="text-[10px] text-das-textDim italic">⛔ ループを終了します</div>
              )}
              {action.type === 'Continue' && (
                <div className="text-[10px] text-das-textDim italic">⏭ 次の反復へスキップします</div>
              )}
              {action.type === 'Condition' && (
                <div className="text-[10px] text-das-textDim italic">◇ 条件分岐（未実装ステップ）</div>
              )}
              {action.type === 'Group' && (
                <div className="text-[10px] text-das-textDim italic">📦 グループ（未実装ステップ）</div>
              )}
              {(action.type === 'Assign' ||
                action.type === 'TryCatch') && (
                <div className="text-[10px] text-das-textDim italic">
                  この研修ラボでは未対応のステップです
                </div>
              )}

              {/* ステップ削除（onRemove が渡されたときのみ） */}
              {onRemove && (
                <div className="mt-3 border-t border-das-border pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(step.id)
                    }}
                    className="w-full rounded border border-das-err/60 px-2 py-1 text-[11px] text-das-err hover:bg-red-50"
                    aria-label="ステップを削除"
                  >
                    ✕ ステップを削除
                  </button>
                </div>
              )}
            </div>

            {/* ---- GuardedChoice: ガードレーン縦並び ---- */}
            {action.type === 'GuardedChoice' && (
              <div className="border-t border-das-border p-2 space-y-1">
                {action.guards.length === 0 && (
                  <div className="rounded border border-amber-400 bg-amber-50 p-2 text-[11px] text-amber-700">
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
          </>
        )}
      </div>

      {/* ---- ループ系: カード右に黄色フローマーカー + body ステップ横並び ----
       *
       * 実機 DS_4_loop_real.png 準拠:
       *   カード右端 → 黄色○フローポイント（LoopFlowMarker）→ body ステップ列
       *   本体ステップはカード外の同レーン上で横並び。
       *   折りたたみ時も黄色フローポイントは常時表示（実機と同様）。
       *
       * フローライン固定 Y 方式（問題1修正）:
       *   LoopFlowMarker の黄色○・接続線も FLOW_Y_OFFSET で固定 Y に揃える。
       *   body の HorizontalFlow も同じ FLOW_Y_OFFSET を使うため、
       *   LoopFlowMarker と body ステップのフロー線が一直線に繋がる。
       */}
      {isLoopStep && (
        <div className="flex items-start ml-0">
          {/* 黄色フローポイント + 縦線 + 三角マーカー: 固定 Y に合わせる */}
          <div
            className="flex items-center self-start shrink-0"
            style={{ marginTop: `${FLOW_Y_OFFSET}px` }}
          >
            <FlowLine width={4} loop />
            <LoopFlowMarker />
            <FlowLine width={4} loop />
          </div>
          {/* body ステップ列（再帰描画）: HorizontalFlow が内部で FLOW_Y_OFFSET を使う */}
          <div
            className={[
              'flex items-start rounded transition-colors cursor-pointer',
              // body が挿入先として選択されているとき: 点線ハイライト
              isBodyInsertTarget
                ? 'outline outline-2 outline-dashed outline-amber-400 bg-amber-50/60'
                : 'hover:bg-amber-50/20',
            ].join(' ')}
            onClick={handleBodyClick}
            title={isBodyInsertTarget ? 'ここに挿入されます（右クリックでステップを追加）' : 'クリックして body を挿入先に設定'}
            role="button"
            aria-label={`${step.name || 'ForEach'} の body（クリックで挿入先に設定）`}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBodyClick(e as unknown as React.MouseEvent) } }}
          >
            {renderSteps(loopBody)}
            {loopBody.length === 0 && (
              <div
                className="flex items-center gap-1 self-start shrink-0 px-2"
                style={{ marginTop: `${FLOW_Y_OFFSET - 2}px` }}
              >
                {/* 小さな空 body 表示: 実機に近い「○—○」を省スペースで再現 */}
                <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-white shrink-0" aria-hidden="true" />
                <div className="h-px w-4 bg-amber-300" aria-hidden="true" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-white shrink-0" aria-hidden="true" />
                <span className="text-[10px] text-amber-600 italic ml-1">（body が空）</span>
                {isBodyInsertTarget && (
                  <span className="ml-1 rounded bg-amber-400 px-1 py-0 text-[9px] text-white font-medium">
                    ここに挿入
                  </span>
                )}
              </div>
            )}
            {loopBody.length > 0 && isBodyInsertTarget && (
              <div
                className="self-start shrink-0 px-1"
                style={{ marginTop: `${FLOW_Y_OFFSET - 2}px` }}
              >
                <span className="rounded bg-amber-400 px-1 py-0 text-[9px] text-white font-medium">
                  ここに挿入
                </span>
              </div>
            )}
          </div>
          {/* body 末尾のフローポイント */}
          <div
            className="flex items-center self-start shrink-0"
            style={{ marginTop: `${FLOW_Y_OFFSET}px` }}
          >
            <FlowLine width={4} loop />
            <FlowPoint loop label={`${label} body 終了`} />
          </div>
        </div>
      )}
    </div>
  )
})

export default StepCard
