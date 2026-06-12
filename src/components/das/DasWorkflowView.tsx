// ============================================================
// DasWorkflowView — 緑ロボットの縦ワークフローツリー描画
//
// 実機 DS のロボットビュー（縦）を純 DOM ツリーで再現する。
// @xyflow/react は使わず、div ネスト + border-l の縦線で階層を表現する。
// アクセシビリティ: role="tree" + role="treeitem" + aria-selected
// ============================================================

import type { DasStep, DasAction, Guard, GuardType } from '../../model/dasRobot'
import { DAS_ACTION_LABELS, GUARD_TYPE_LABELS } from '../../model/dasRobot'
import { dasStepIssue } from '../../engine/dasStepStatus'
import { useDasRobotStore } from '../../store/dasRobotStore'
import type { DasSimResult } from '../../engine/dasSimulator'
import PanelFrame from '../ds/PanelFrame'

// ---- アクション種別ごとのアイコン ----------------------------

const ACTION_ICONS: Record<string, string> = {
  OpenWindow: '🪟',
  Click: '👆',
  ExtractValue: '🔎',
  EnterText: '⌨',
  GuardedChoice: '⚡',
  ForEach: '↻',
  Loop: '🔁',
  Break: '⛔',
  Continue: '⏭',
  Condition: '◇',
  Group: '📦',
}

// ---- ガード種別ごとのアイコン --------------------------------

const GUARD_ICONS: Record<GuardType, string> = {
  timeout: '⏱',
  locationFound: '🔍',
  locationNotFound: '❌',
  locationRemoved: '🗑',
  applicationFound: '🪟',
  applicationNotFound: '⛔',
  treeStoppedChanging: '⏸',
}

// ---- 実行ログ解析ヘルパー ------------------------------------

function getStepStatus(stepId: string, sim: DasSimResult): 'ok' | 'error' | 'skip' | 'guard-matched' | 'guard-waiting' | null {
  const entry = [...sim.log].reverse().find((e) => e.stepId === stepId)
  return entry?.status ?? null
}

function isCurrentStep(stepId: string, sim: DasSimResult): boolean {
  if (!sim.ran || sim.log.length === 0) return false
  const last = sim.log[sim.log.length - 1]
  return last.stepId === stepId
}

// ---- ステップ行コンポーネント --------------------------------

interface StepRowProps {
  step: DasStep
  depth: number
  sim: DasSimResult
  selectedStepId: string | null
  onSelect: (id: string) => void
}

function StepRow({ step, depth, sim, selectedStepId, onSelect }: StepRowProps) {
  const isSelected = selectedStepId === step.id
  const isCurrent = isCurrentStep(step.id, sim)
  const status = getStepStatus(step.id, sim)
  const issue = dasStepIssue(step)

  const statusColor = {
    ok: 'text-ds-ok',
    error: 'text-ds-err',
    skip: 'text-ds-textDim',
    'guard-matched': 'text-ds-ok',
    'guard-waiting': 'text-ds-warn',
    null: '',
  }[status ?? 'null']

  const statusMark = {
    ok: '✓',
    error: '✕',
    skip: '–',
    'guard-matched': '✓',
    'guard-waiting': '⏳',
    null: '',
  }[status ?? 'null']

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelect(step.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(step.id) }}
      className={[
        'flex cursor-pointer select-none items-center gap-1.5 rounded px-1.5 py-1 text-[12px]',
        'focus:outline-none focus:ring-1 focus:ring-ds-accent2',
        isSelected ? 'bg-ds-accent2/20 text-ds-text' : 'hover:bg-ds-panelAlt text-ds-text',
        isCurrent ? 'border-l-2 border-green-400' : `border-l-2 border-transparent`,
      ].join(' ')}
      style={{ paddingLeft: `${depth * 16 + 6}px` }}
    >
      {/* ステータスマーク */}
      <span className={`w-4 shrink-0 text-center text-[11px] ${statusColor}`}>{statusMark}</span>

      {/* アクションアイコン */}
      <span className="shrink-0 text-[13px]">{ACTION_ICONS[step.action.type] ?? '▸'}</span>

      {/* ステップ名 */}
      <span className={['flex-1 truncate', !step.enabled ? 'opacity-50 line-through' : ''].join(' ')}>
        {step.name || DAS_ACTION_LABELS[step.action.type]}
      </span>

      {/* 警告バッジ */}
      {issue && (
        <span className="ml-auto shrink-0 text-[10px] text-ds-warn" title={issue}>
          ⚠
        </span>
      )}
    </div>
  )
}

// ---- ガード枝コンポーネント ----------------------------------

interface GuardBranchProps {
  guard: Guard
  guardIndex: number
  parentStepId: string
  depth: number
  sim: DasSimResult
  selectedStepId: string | null
  onSelect: (id: string) => void
  isWinner: boolean
}

function GuardBranch({ guard, guardIndex, depth, sim, selectedStepId, onSelect, isWinner }: GuardBranchProps) {
  const label = GUARD_TYPE_LABELS[guard.type]
  const icon = GUARD_ICONS[guard.type]

  return (
    <div>
      {/* ガードラベル行 */}
      <div
        className={[
          'flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px]',
          isWinner ? 'bg-green-400/10 text-green-300' : 'text-ds-textDim',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
        aria-label={`ガード ${guardIndex + 1}: ${label}`}
      >
        <span className="shrink-0 text-[11px]">{isWinner ? '✓' : '['}</span>
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
        {guard.type === 'timeout' && (
          <span className="ml-auto shrink-0 text-[10px]">{guard.seconds ?? 60}s</span>
        )}
        {!isWinner && <span className="ml-1 shrink-0">]</span>}
      </div>

      {/* ガード枝内のステップ */}
      {guard.steps.length > 0 && (
        <div className="relative">
          <div
            className="absolute bottom-1 top-0 border-l border-ds-border/50"
            style={{ left: `${(depth + 1) * 16 + 6}px` }}
            aria-hidden="true"
          />
          {guard.steps.map((step) => (
            <StepTree
              key={step.id}
              step={step}
              depth={depth + 2}
              sim={sim}
              selectedStepId={selectedStepId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      {guard.steps.length === 0 && (
        <div
          className="text-[10px] text-ds-textDim/60 italic"
          style={{ paddingLeft: `${(depth + 1) * 16 + 6}px` }}
        >
          （ステップなし）
        </div>
      )}
    </div>
  )
}

// ---- ネストコンテンツ（GuardedChoice / ForEach / Loop / Group） ----

interface NestedContentProps {
  action: DasAction
  parentStepId: string
  depth: number
  sim: DasSimResult
  selectedStepId: string | null
  onSelect: (id: string) => void
}

function NestedContent({ action, parentStepId, depth, sim, selectedStepId, onSelect }: NestedContentProps) {
  // ガードチョイスの勝者を取得
  const winnerGuardType = sim.guardResults.find((gr) => gr.stepId === parentStepId)?.winnerGuardType

  if (action.type === 'GuardedChoice') {
    return (
      <div>
        {action.guards.map((guard, i) => (
          <GuardBranch
            key={i}
            guard={guard}
            guardIndex={i}
            parentStepId={parentStepId}
            depth={depth}
            sim={sim}
            selectedStepId={selectedStepId}
            onSelect={onSelect}
            isWinner={winnerGuardType === guard.type}
          />
        ))}
        {action.guards.length === 0 && (
          <div
            className="text-[10px] text-ds-warn italic"
            style={{ paddingLeft: `${depth * 16 + 6}px` }}
          >
            ガードを追加してください
          </div>
        )}
      </div>
    )
  }

  if (action.type === 'ForEach') {
    return (
      <div>
        {/* スコープ情報 */}
        <div
          className="text-[10px] text-ds-textDim"
          style={{ paddingLeft: `${depth * 16 + 6}px` }}
        >
          ↻ スコープ: <code className="font-mono">{action.scopeFinder.selector || '(未設定)'}</code>
        </div>
        <div
          className="text-[10px] text-ds-textDim"
          style={{ paddingLeft: `${depth * 16 + 6}px` }}
        >
          &gt; 要素: <code className="font-mono">{action.elementFinder.selector || '(未設定)'}</code>
        </div>
        {/* body ステップ */}
        <div className="relative">
          <div
            className="absolute bottom-1 top-0 border-l border-ds-border/50"
            style={{ left: `${(depth) * 16 + 6}px` }}
            aria-hidden="true"
          />
          {action.body.map((step) => (
            <StepTree
              key={step.id}
              step={step}
              depth={depth + 1}
              sim={sim}
              selectedStepId={selectedStepId}
              onSelect={onSelect}
            />
          ))}
          {action.body.length === 0 && (
            <div
              className="text-[10px] text-ds-textDim/60 italic"
              style={{ paddingLeft: `${(depth + 1) * 16 + 6}px` }}
            >
              （body が空です）
            </div>
          )}
        </div>
      </div>
    )
  }

  if (action.type === 'Loop') {
    return (
      <div className="relative">
        <div
          className="absolute bottom-1 top-0 border-l border-ds-border/50"
          style={{ left: `${depth * 16 + 6}px` }}
          aria-hidden="true"
        />
        {action.body.map((step) => (
          <StepTree
            key={step.id}
            step={step}
            depth={depth + 1}
            sim={sim}
            selectedStepId={selectedStepId}
            onSelect={onSelect}
          />
        ))}
        {action.body.length === 0 && (
          <div
            className="text-[10px] text-ds-textDim/60 italic"
            style={{ paddingLeft: `${(depth + 1) * 16 + 6}px` }}
          >
            （body が空です）
          </div>
        )}
      </div>
    )
  }

  if (action.type === 'Group') {
    return (
      <div className="relative">
        <div
          className="absolute bottom-1 top-0 border-l border-ds-border/50"
          style={{ left: `${depth * 16 + 6}px` }}
          aria-hidden="true"
        />
        {action.steps.map((step) => (
          <StepTree
            key={step.id}
            step={step}
            depth={depth + 1}
            sim={sim}
            selectedStepId={selectedStepId}
            onSelect={onSelect}
          />
        ))}
      </div>
    )
  }

  if (action.type === 'Condition') {
    return (
      <div>
        {action.branches.map((branch, i) => (
          <div key={i}>
            <div
              className="text-[10px] text-ds-textDim"
              style={{ paddingLeft: `${depth * 16 + 6}px` }}
            >
              条件: <code className="font-mono">{branch.condition}</code>
            </div>
            {branch.steps.map((step) => (
              <StepTree
                key={step.id}
                step={step}
                depth={depth + 1}
                sim={sim}
                selectedStepId={selectedStepId}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return null
}

// ---- ステップツリー（再帰） -----------------------------------

interface StepTreeProps {
  step: DasStep
  depth: number
  sim: DasSimResult
  selectedStepId: string | null
  onSelect: (id: string) => void
}

function StepTree({ step, depth, sim, selectedStepId, onSelect }: StepTreeProps) {
  const hasChildren =
    step.action.type === 'GuardedChoice' ||
    step.action.type === 'ForEach' ||
    step.action.type === 'Loop' ||
    step.action.type === 'Group' ||
    step.action.type === 'Condition'

  return (
    <div>
      <StepRow
        step={step}
        depth={depth}
        sim={sim}
        selectedStepId={selectedStepId}
        onSelect={onSelect}
      />
      {hasChildren && (
        <NestedContent
          action={step.action}
          parentStepId={step.id}
          depth={depth + 1}
          sim={sim}
          selectedStepId={selectedStepId}
          onSelect={onSelect}
        />
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

  return (
    <PanelFrame title="ロボットビュー" hint="縦ワークフローツリー">
      <div
        role="tree"
        aria-label="ワークフロー"
        className="min-h-full p-1"
      >
        {robot.steps.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-ds-textDim">
            <div className="mb-1 text-[24px]">🤖</div>
            パレットからステップを追加するか、
            <br />
            レコーダービューで要素を右クリックして
            <br />
            ステップを挿入してください
          </div>
        ) : (
          robot.steps.map((step) => (
            <StepTree
              key={step.id}
              step={step}
              depth={0}
              sim={sim}
              selectedStepId={selectedStepId}
              onSelect={selectStep}
            />
          ))
        )}
      </div>
    </PanelFrame>
  )
}
