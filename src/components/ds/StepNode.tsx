import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { RobotStep, StepActionType } from '../../model/robot'
import { displayName, isAnonymous, stepIssue } from '../../engine/stepStatus'

export type StepNodeData = {
  step: RobotStep
  isSelected: boolean
}

export type StepFlowNode = Node<StepNodeData, 'dsStep'>

const ACTION_ICON: Record<StepActionType, string> = {
  LoadPage: '🌐',
  ExtractText: '🔎',
  ExtractURL: '🔗',
  ForEach: '↻',
  TestValue: '◇',
  Click: '👆',
  EnterText: '⌨',
  SaveFile: '💾',
  ReturnValue: '📤',
}

function iconFor(step: RobotStep): string {
  if (step.action) return ACTION_ICON[step.action.type]
  return '⬛'
}

// 実機 DS 風: アイコンは上、名前は下、横矢印で連結。開始=小マーカー、終了=⊗。
export default function StepNode({ data }: NodeProps<StepFlowNode>) {
  const { step, isSelected } = data

  // 開始ステップ: 左端のマーカー（ハンドル位置はアクションと揃える）
  if (step.kind === 'start') {
    return (
      <div className="flex w-[104px] flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-400/70 bg-emerald-900/40 text-[18px] text-emerald-300">
          ▸
        </div>
        <div className="mt-1 text-[10px] text-ds-textDim">開始</div>
        <Handle type="source" position={Position.Right} style={{ top: 24 }} />
      </div>
    )
  }

  // 終了ステップ: ⊗（×丸）
  if (step.kind === 'end') {
    return (
      <div className="flex w-[104px] flex-col items-center">
        <Handle type="target" position={Position.Left} style={{ top: 24 }} />
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-400/70 bg-slate-800/70 text-[20px] text-slate-300">
          ⊗
        </div>
        <div className="mt-1 text-[10px] text-ds-textDim">終了</div>
      </div>
    )
  }

  // 分岐点: ○（BranchPoint）
  if (step.kind === 'branch') {
    return (
      <div className="flex w-[64px] flex-col items-center">
        <Handle type="target" position={Position.Left} style={{ top: 24 }} />
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ds-accent/70 bg-ds-panelAlt text-[16px] text-ds-accent">
          ○
        </div>
        <div className="mt-1 text-[10px] text-ds-textDim">分岐</div>
        <Handle type="source" position={Position.Right} style={{ top: 24 }} />
      </div>
    )
  }

  const issue = stepIssue(step)
  const anon = isAnonymous(step)
  const disabled = !step.enabled
  const isLoop = step.kind === 'loop'
  const isTest = step.kind === 'test'

  return (
    <div className={['flex w-[104px] flex-col items-center', disabled ? 'opacity-45 grayscale' : ''].join(' ')}>
      <Handle type="target" position={Position.Left} style={{ top: 24 }} />
      {/* アイコンボックス */}
      <div
        className={[
          'relative flex h-12 w-12 items-center justify-center border-2 text-[18px] shadow',
          isLoop ? 'rounded-md border-amber-400/70 bg-amber-900/30' : '',
          isTest ? 'rotate-45 rounded-sm border-violet-400/70 bg-violet-900/30' : '',
          !isLoop && !isTest ? 'rounded-md border-sky-400/60 bg-sky-900/30' : '',
          isSelected ? 'ring-2 ring-ds-accent ring-offset-2 ring-offset-ds-panel' : '',
        ].join(' ')}
      >
        <span className={isTest ? '-rotate-45' : ''}>{iconFor(step)}</span>
        {/* 設定不備の警告バッジ（実機の黄色三角） */}
        {issue && (
          <span
            title={issue}
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-ds-warn text-[10px] font-bold text-black"
          >
            !
          </span>
        )}
      </div>
      {/* 名前（下） */}
      <div
        className={[
          'mt-1 max-w-[104px] truncate text-center text-[11px]',
          anon ? 'italic text-ds-warn' : 'text-ds-text',
        ].join(' ')}
        title={displayName(step)}
      >
        {displayName(step)}
      </div>
      <Handle type="source" position={Position.Right} style={{ top: 24 }} />
    </div>
  )
}
