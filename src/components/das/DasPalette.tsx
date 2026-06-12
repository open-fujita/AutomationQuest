// ============================================================
// DasPalette — 緑ロボット用ステップパレット（2026.1 カタログ表示）
//
// DAS_STEP_CATALOG を使い §5.5 B の全カタログをカテゴリ付きで表示する。
//   - implemented: true のステップ: 通常表示、クリックで addStep 実行
//   - implemented: false のステップ: opacity-50 cursor-not-allowed + ツールチップ「この研修ラボでは未対応」
//   - actionType: null のステップ: 同上（actionType が null のため addStep を呼ばない）
//
// 各カテゴリは <details>/<summary> で折りたたみ表示。
// アクセシビリティ: ボタンに aria-label、disabled ステップに aria-disabled
// ============================================================

import type { DasAction } from '../../model/dasRobot'
import {
  DAS_STEP_CATALOG,
  type DasActionType,
} from '../../model/dasRobot'
import { useDasRobotStore } from '../../store/dasRobotStore'

// ---- アクション種別ごとのデフォルトアクション生成 ----------------

/** 既定のファインダー（空セレクタ） */
const emptyFinder = () => ({
  kind: 'component' as const,
  selector: '',
  reuse: 'none' as const,
})

function createDefaultAction(type: DasActionType): DasAction {
  switch (type) {
    case 'Browser':
      return {
        type: 'Browser',
        browser: 'Chromium',
        browserAction: 'pageLoad',
        applicationName: '',
        url: '',
      }
    case 'Windows':
      return {
        type: 'Windows',
        device: 'local',
        windowsAction: 'execute',
        executable: '',
      }
    case 'Click':
      return { type: 'Click', finder: emptyFinder(), clickCount: 1, button: 'left' }
    case 'ExtractValue':
      return {
        type: 'ExtractValue',
        finder: emptyFinder(),
        toVariable: '',
        attribute: 'text',
      }
    case 'EnterText':
      return { type: 'EnterText', finder: emptyFinder(), text: '' }
    case 'GuardedChoice':
      return {
        type: 'GuardedChoice',
        guards: [
          { type: 'locationFound', finder: emptyFinder(), steps: [] },
          { type: 'timeout', seconds: 60, steps: [] },
        ],
      }
    case 'ForEach':
      return {
        type: 'ForEach',
        scopeFinder: emptyFinder(),
        scopeFinderName: 'scope1',
        elementFinder: {
          kind: 'component',
          selector: '> listitem',
          reuse: 'none',
          scopeRef: 'scope1',
        },
        body: [],
      }
    case 'Loop':
      return { type: 'Loop', body: [] }
    case 'Break':
      return { type: 'Break' }
    case 'Continue':
      return { type: 'Continue' }
    case 'Return':
      return { type: 'Return' }
    case 'Throw':
      return { type: 'Throw', exception: 'TimeOutError' }
    case 'Condition':
      return { type: 'Condition', branches: [{ condition: 'true', steps: [] }] }
    case 'Group':
      return { type: 'Group', name: 'グループ', steps: [] }
    case 'Assign':
      return { type: 'Assign', variable: '', expression: '' }
    case 'TryCatch':
      return { type: 'TryCatch', trySteps: [], catches: [], finallySteps: [] }
    case 'WhileLoop':
      return { type: 'WhileLoop', condition: 'true', body: [] }
    default:
      // 型安全: DasActionType の全 variant を網羅したので never に落ちない
      return { type: 'Return' }
  }
}

// ---- カテゴリ見出しのアイコン ---------------------------------

const CATEGORY_ICONS: Record<string, string> = {
  '割り当てと変換': '=',
  '条件と制御': '◇',
  'ループ': '↻',
  'アプリケーション': '🖥',
  'データベース': '🗄',
  'ファイル システム': '📁',
  'JSON': '{ }',
  '出力値': '📤',
  '統合': '🔗',
  'リモート デバイス': '📡',
  '抽出': '🔎',
  'マウスとキーボード': '🖱',
  'その他': '⋯',
}

// ---- DasPalette 本体 -----------------------------------------

export default function DasPalette() {
  const addStep = useDasRobotStore((s) => s.addStep)

  return (
    <div className="border-t border-das-border overflow-y-auto">
      <div className="border-b border-das-border bg-das-panelAlt px-3 py-1.5 text-[12px] font-semibold text-das-text sticky top-0 z-10">
        パレット
        <span className="ml-1 text-[10px] font-normal text-das-textDim">（緑ロボット 2026.1）</span>
      </div>

      <div className="text-[10px] text-das-textDim px-3 py-1">
        クリックでステップを末尾に追加
      </div>

      {DAS_STEP_CATALOG.map((category) => (
        <details key={category.name} className="group">
          <summary
            className={[
              'flex cursor-pointer select-none items-center gap-1.5 px-2 py-1',
              'bg-das-panelAlt/60 border-b border-das-border/40',
              'text-[11px] font-medium text-das-text',
              'hover:bg-das-panelAlt list-none',
              'focus:outline-none focus:ring-1 focus:ring-das-accent2',
            ].join(' ')}
            role="button"
            aria-label={`${category.name} カテゴリを展開/折りたたむ`}
          >
            <span className="text-[12px] shrink-0">
              {CATEGORY_ICONS[category.name] ?? '▸'}
            </span>
            <span className="flex-1">{category.name}</span>
            <span className="text-[10px] text-das-textDim group-open:rotate-90 transition-transform">
              ▶
            </span>
          </summary>

          <ul role="list" aria-label={`${category.name} ステップ一覧`} className="py-0.5">
            {category.entries.map((entry) => {
              const isImplemented = entry.implemented && entry.actionType !== null
              const label = entry.label

              if (isImplemented && entry.actionType !== null) {
                // 実装済み: クリックでステップ追加
                return (
                  <li key={label} role="listitem">
                    <button
                      type="button"
                      onClick={() => {
                        const action = createDefaultAction(entry.actionType!)
                        addStep(action)
                      }}
                      className={[
                        'flex w-full items-center gap-1.5 px-3 py-1 text-left text-[11px]',
                        'hover:bg-das-accent2/10 hover:text-das-text text-das-text',
                        'focus:outline-none focus:ring-1 focus:ring-das-accent2',
                      ].join(' ')}
                      aria-label={`${label} ステップを追加`}
                    >
                      <span className="shrink-0 w-4 text-center text-das-accent2">▸</span>
                      <span className="flex-1 truncate">{label}</span>
                    </button>
                  </li>
                )
              } else {
                // 未実装: disabled 表示
                return (
                  <li key={label} role="listitem">
                    <div
                      className={[
                        'flex w-full items-center gap-1.5 px-3 py-1 text-[11px]',
                        'opacity-40 cursor-not-allowed text-das-textDim',
                      ].join(' ')}
                      aria-disabled="true"
                      title="この研修ラボでは未対応"
                      aria-label={`${label}（この研修ラボでは未対応）`}
                    >
                      <span className="shrink-0 w-4 text-center">·</span>
                      <span className="flex-1 truncate">{label}</span>
                    </div>
                  </li>
                )
              }
            })}
          </ul>
        </details>
      ))}
    </div>
  )
}
