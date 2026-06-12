// ============================================================
// DasPalette — 緑ロボット用ステップパレット
//
// クリックで dasRobotStore.addStep を呼んでトップレベルにステップを追加する。
// 表示するステップ: OpenWindow / Click / ExtractValue / EnterText /
//                  GuardedChoice / ForEach / Loop / Condition / Group / Break
// アクセシビリティ: role="list" + button（tabIndex での操作）
// ============================================================

import type { DasAction } from '../../model/dasRobot'
import { DAS_ACTION_LABELS } from '../../model/dasRobot'
import { useDasRobotStore } from '../../store/dasRobotStore'

// ---- パレット定義 --------------------------------------------

interface PaletteItem {
  /** クリック時に作成するデフォルトアクション */
  createAction: () => DasAction
  icon: string
  note: string
}

/** 既定のファインダー（空セレクタ） */
const emptyFinder = () => ({ kind: 'component' as const, selector: '', reuse: 'none' as const })

const PALETTE_ITEMS: PaletteItem[] = [
  {
    createAction: () => ({ type: 'OpenWindow', windowTitle: '', appName: '' }),
    icon: '🪟',
    note: 'Windows アプリを開く',
  },
  {
    createAction: () => ({ type: 'Click', finder: emptyFinder(), clickCount: 1, button: 'left' }),
    icon: '👆',
    note: '要素をクリック',
  },
  {
    createAction: () => ({ type: 'ExtractValue', finder: emptyFinder(), toVariable: '', attribute: 'text' }),
    icon: '🔎',
    note: '要素から値を取り出す',
  },
  {
    createAction: () => ({ type: 'EnterText', finder: emptyFinder(), text: '' }),
    icon: '⌨',
    note: 'テキストフィールドに入力',
  },
  {
    createAction: () => ({
      type: 'GuardedChoice',
      guards: [
        { type: 'locationFound', finder: emptyFinder(), steps: [] },
        { type: 'timeout', seconds: 60, steps: [] },
      ],
    }),
    icon: '⚡',
    note: '状態を並行監視して分岐（安定化の要）',
  },
  {
    createAction: () => ({
      type: 'ForEach',
      scopeFinder: emptyFinder(),
      scopeFinderName: 'scope1',
      elementFinder: { kind: 'component' as const, selector: '> listitem', reuse: 'none' as const, scopeRef: 'scope1' },
      body: [],
    }),
    icon: '↻',
    note: '要素群を繰り返し処理',
  },
  {
    createAction: () => ({ type: 'Loop', body: [] }),
    icon: '🔁',
    note: '繰り返し（Break で終了）',
  },
  {
    createAction: () => ({
      type: 'Condition',
      branches: [{ condition: 'true', steps: [] }],
    }),
    icon: '◇',
    note: '条件で処理を分岐',
  },
  {
    createAction: () => ({ type: 'Group', name: 'グループ', steps: [] }),
    icon: '📦',
    note: 'ステップをグループ化',
  },
  {
    createAction: () => ({ type: 'Break' }),
    icon: '⛔',
    note: 'ループを終了（Break）',
  },
]

// ---- DasPalette 本体 -----------------------------------------

export default function DasPalette() {
  const addStep = useDasRobotStore((s) => s.addStep)

  return (
    <div className="border-t border-ds-border">
      <div className="border-b border-ds-border bg-ds-panelAlt px-3 py-1.5 text-[12px] font-semibold text-ds-text">
        パレット
        <span className="ml-1 text-[10px] font-normal text-ds-textDim">（緑ロボット）</span>
      </div>
      <div className="space-y-1 p-2">
        <div className="px-1 pb-1 text-[10px] text-ds-textDim">
          クリックでステップを末尾に追加
        </div>
        <ul role="list" aria-label="緑ロボットパレット">
          {PALETTE_ITEMS.map((item) => {
            const action = item.createAction()
            const label = DAS_ACTION_LABELS[action.type]
            return (
              <li key={action.type} role="listitem">
                <button
                  onClick={() => addStep(item.createAction())}
                  className="flex w-full items-center gap-2 rounded border border-ds-border bg-ds-bg/40 px-2 py-1.5 text-left hover:border-ds-accent2 hover:bg-ds-accent2/10"
                  aria-label={`${label}ステップを追加`}
                >
                  <span className="text-[14px]">{item.icon}</span>
                  <span className="flex-1">
                    <span className="block text-[12px] text-ds-text">{label}</span>
                    <span className="block text-[10px] text-ds-textDim">{item.note}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
