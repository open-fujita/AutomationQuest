// ============================================================
// DasPropertiesPane — 選択中 DasStep のプロパティ編集ペイン
//
// ・GuardedChoice 選択時: ガード一覧テーブル + 緑の「＋ガード追加」+ タイムアウト秒数編集
// ・ForEach 選択時: スコープファインダーのセレクタ input + エレメントファインダーの相対セレクタ input
// ・その他ステップ: ファインダーセレクタ + 基本設定
// ・CSS 風セレクタを font-mono で表示（実機感）
// アクセシビリティ: form/label 関連付け、セレクト・input に aria-label
// ============================================================

import { useState } from 'react'
import type { DasStep, DasAction, Guard, GuardType, DasFinder } from '../../model/dasRobot'
import { DAS_ACTION_LABELS, GUARD_TYPE_LABELS } from '../../model/dasRobot'
import { useDasRobotStore } from '../../store/dasRobotStore'
import PanelFrame from '../ds/PanelFrame'

// ---- ガード種別セレクタ（7種）--------------------------------

const GUARD_TYPES: GuardType[] = [
  'locationFound',
  'locationNotFound',
  'locationRemoved',
  'applicationFound',
  'applicationNotFound',
  'treeStoppedChanging',
  'timeout',
]

// ---- ファインダー表示 ----------------------------------------

interface FinderDisplayProps {
  label: string
  finder: DasFinder
  onChange?: (selector: string) => void
  id: string
}

function FinderDisplay({ label, finder, onChange, id }: FinderDisplayProps) {
  return (
    <div className="mb-2">
      <label htmlFor={id} className="mb-0.5 block text-[11px] text-ds-textDim">
        {label}
      </label>
      <input
        id={id}
        value={finder.selector}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={!onChange}
        spellCheck={false}
        className={[
          'w-full rounded border border-ds-border bg-ds-bg px-2 py-1 font-mono text-[11px] text-ds-accent2',
          'focus:border-ds-accent2 focus:outline-none',
          !onChange ? 'opacity-70' : '',
        ].join(' ')}
        placeholder="セレクタ未設定"
        aria-label={label}
      />
      {finder.reuse === 'prev' && (
        <span className="text-[10px] text-ds-textDim">（直前のファインダーを参照）</span>
      )}
      {finder.reuse === 'named' && finder.aliasName && (
        <span className="text-[10px] text-ds-textDim">名前付き: {finder.aliasName}</span>
      )}
    </div>
  )
}

// ---- ガード行コンポーネント -----------------------------------

interface GuardRowProps {
  guard: Guard
  guardIndex: number
  stepId: string
}

function GuardRow({ guard, guardIndex, stepId }: GuardRowProps) {
  const removeGuard = useDasRobotStore((s) => s.removeGuard)
  const updateGuardTimeout = useDasRobotStore((s) => s.updateGuardTimeout)

  const handleTypeChange = (newType: GuardType) => {
    const robot = useDasRobotStore.getState().robot
    const targetStep = robot.steps.find((s) => s.id === stepId)
    if (targetStep && targetStep.action.type === 'GuardedChoice') {
      const guards = targetStep.action.guards.map((g, i) =>
        i === guardIndex ? { ...g, type: newType } : g,
      )
      // 型の重複を避けるため guards だけを渡す
      useDasRobotStore.setState((s) => ({
        robot: {
          ...s.robot,
          steps: updateGuardTypeInSteps(s.robot.steps, stepId, guardIndex, newType),
        },
      }))
      void guards // suppress unused warning
    }
  }

  return (
    <tr className="border-b border-ds-border/40">
      {/* ガード種別セレクタ */}
      <td className="py-1 pr-1">
        <select
          value={guard.type}
          onChange={(e) => handleTypeChange(e.target.value as GuardType)}
          className="w-full rounded border border-ds-border bg-ds-panelAlt px-1 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          aria-label={`ガード ${guardIndex + 1} の種別`}
        >
          {GUARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {GUARD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </td>

      {/* ファインダー情報 */}
      <td className="py-1 pr-1">
        {guard.finder ? (
          <span className="block truncate font-mono text-[10px] text-ds-accent2" title={guard.finder.selector}>
            {guard.finder.selector || '(未設定)'}
          </span>
        ) : (
          <span className="text-[10px] text-ds-textDim">—</span>
        )}
      </td>

      {/* タイムアウト秒数 */}
      <td className="py-1 pr-1 text-center">
        {guard.type === 'timeout' ? (
          <input
            type="number"
            min={1}
            max={300}
            value={guard.seconds ?? 60}
            onChange={(e) => updateGuardTimeout(stepId, guardIndex, Number(e.target.value))}
            className="w-16 rounded border border-ds-border bg-ds-panelAlt px-1 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
            aria-label="タイムアウト秒数"
          />
        ) : guard.type === 'treeStoppedChanging' ? (
          <span className="text-[10px] text-ds-textDim">{guard.ms ?? 500}ms</span>
        ) : (
          <span className="text-[10px] text-ds-textDim">—</span>
        )}
      </td>

      {/* 削除ボタン */}
      <td className="py-1">
        <button
          onClick={() => removeGuard(stepId, guardIndex)}
          className="rounded px-1.5 py-0.5 text-[11px] text-ds-textDim hover:text-ds-err"
          aria-label={`ガード ${guardIndex + 1} を削除`}
          title="ガードを削除"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

// ---- GuardedChoice プロパティ --------------------------------

interface GuardedChoicePropsProps {
  step: DasStep
  action: Extract<DasAction, { type: 'GuardedChoice' }>
}

function GuardedChoiceProps({ step, action }: GuardedChoicePropsProps) {
  const [newGuardType, setNewGuardType] = useState<GuardType>('locationFound')
  const addGuard = useDasRobotStore((s) => s.addGuard)

  const handleAddGuard = () => {
    const guard: Guard = {
      type: newGuardType,
      steps: [],
      ...(newGuardType === 'timeout' ? { seconds: 60 } : {
        finder: { kind: 'component', selector: '', reuse: 'none' } as DasFinder
      }),
    }
    addGuard(step.id, guard)
  }

  return (
    <div>
      <div className="mb-3">
        <div className="mb-1 text-[11px] font-semibold text-ds-text">ガード一覧</div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-ds-border text-ds-textDim">
              <th className="py-0.5 pr-1 text-left font-normal">種別</th>
              <th className="py-0.5 pr-1 text-left font-normal">ファインダー</th>
              <th className="py-0.5 pr-1 text-center font-normal">タイムアウト</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {action.guards.map((guard, i) => (
              <GuardRow
                key={i}
                guard={guard}
                guardIndex={i}
                stepId={step.id}
              />
            ))}
          </tbody>
        </table>

        {action.guards.length === 0 && (
          <div className="mt-1 rounded border border-ds-warn/30 bg-ds-warn/5 p-2 text-[11px] text-ds-warn">
            ⚠ ガードが未設定です。緑の＋ボタンから追加してください。
          </div>
        )}
      </div>

      {/* ガード追加 */}
      <div className="flex items-center gap-2">
        <select
          value={newGuardType}
          onChange={(e) => setNewGuardType(e.target.value as GuardType)}
          className="flex-1 rounded border border-ds-border bg-ds-panelAlt px-1.5 py-1 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          aria-label="追加するガードの種別を選択"
        >
          {GUARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {GUARD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddGuard}
          className="flex shrink-0 items-center gap-1 rounded border border-green-500/60 bg-green-500/20 px-2.5 py-1 text-[12px] text-green-300 hover:bg-green-500/30"
          aria-label="ガードを追加"
        >
          ＋ ガードを追加
        </button>
      </div>

      <div className="mt-2 rounded bg-ds-panelAlt p-2 text-[10px] text-ds-textDim">
        💡 複数のガードが「並行監視」され、最初に成立したガードの枝のみが実行されます（排他実行）。
        Timeout ガードはフォールバック用に最後に配置するのが定石です（既定 60 秒）。
      </div>
    </div>
  )
}

// ---- ForEach プロパティ --------------------------------------

interface ForEachPropsProps {
  step: DasStep
  action: Extract<DasAction, { type: 'ForEach' }>
}

function ForEachProps({ step, action }: ForEachPropsProps) {
  return (
    <div>
      <div className="mb-2">
        <label htmlFor={`fe-scope-name-${step.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
          スコープファインダー名
        </label>
        <input
          id={`fe-scope-name-${step.id}`}
          value={action.scopeFinderName}
          onChange={(e) => {
            useDasRobotStore.setState((s) => ({
              robot: { ...s.robot, steps: updateForEachField(s.robot.steps, step.id, 'scopeFinderName', e.target.value) },
            }))
          }}
          className="w-full rounded border border-ds-border bg-ds-bg px-2 py-1 font-mono text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          placeholder="scope1"
          aria-label="スコープファインダー名"
        />
      </div>

      <FinderDisplay
        id={`fe-scope-${step.id}`}
        label="スコープファインダー（起点ノード）"
        finder={action.scopeFinder}
        onChange={(selector) => {
          useDasRobotStore.setState((s) => ({
            robot: {
              ...s.robot,
              steps: updateForEachSelector(s.robot.steps, step.id, 'scopeFinder', selector),
            },
          }))
        }}
      />

      <FinderDisplay
        id={`fe-element-${step.id}`}
        label="エレメントファインダー（相対セレクタ: '> type' 等）"
        finder={action.elementFinder}
        onChange={(selector) => {
          useDasRobotStore.setState((s) => ({
            robot: {
              ...s.robot,
              steps: updateForEachSelector(s.robot.steps, step.id, 'elementFinder', selector),
            },
          }))
        }}
      />

      <div className="mt-1 rounded bg-ds-panelAlt p-2 text-[10px] text-ds-textDim">
        💡 エレメントファインダーは <code className="font-mono">&gt; タグ名</code> のような
        相対セレクタ形式で記述します。スコープファインダーで特定した起点ノードの直接の子を反復します。
      </div>
    </div>
  )
}

// ---- OpenWindow プロパティ -----------------------------------

interface OpenWindowPropsProps {
  step: DasStep
  action: Extract<DasAction, { type: 'OpenWindow' }>
}

function OpenWindowProps({ step, action }: OpenWindowPropsProps) {
  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={`ow-title-${step.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
          ウィンドウタイトル
        </label>
        <input
          id={`ow-title-${step.id}`}
          value={action.windowTitle}
          onChange={(e) => {
            useDasRobotStore.setState((s) => ({
              robot: {
                ...s.robot,
                steps: updateOpenWindowField(s.robot.steps, step.id, 'windowTitle', e.target.value),
              },
            }))
          }}
          className="w-full rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          placeholder="アプリのタイトルバー文字列"
          aria-label="ウィンドウタイトル"
        />
      </div>
      <div>
        <label htmlFor={`ow-app-${step.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
          アプリ名（実行ファイル名）
        </label>
        <input
          id={`ow-app-${step.id}`}
          value={action.appName}
          onChange={(e) => {
            useDasRobotStore.setState((s) => ({
              robot: {
                ...s.robot,
                steps: updateOpenWindowField(s.robot.steps, step.id, 'appName', e.target.value),
              },
            }))
          }}
          className="w-full rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          placeholder="notepad.exe 等"
          aria-label="アプリ名"
        />
      </div>
    </div>
  )
}

// ---- Click プロパティ ----------------------------------------

interface ClickPropsProps {
  step: DasStep
  action: Extract<DasAction, { type: 'Click' }>
}

function ClickProps({ step, action }: ClickPropsProps) {
  return (
    <div>
      <FinderDisplay
        id={`click-finder-${step.id}`}
        label="クリック対象セレクタ"
        finder={action.finder}
        onChange={(selector) => {
          useDasRobotStore.setState((s) => ({
            robot: {
              ...s.robot,
              steps: updateClickFinderSelector(s.robot.steps, step.id, selector),
            },
          }))
        }}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor={`click-count-${step.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
            クリック回数
          </label>
          <select
            id={`click-count-${step.id}`}
            value={action.clickCount ?? 1}
            onChange={(e) => {
              useDasRobotStore.setState((s) => ({
                robot: {
                  ...s.robot,
                  steps: updateClickCount(s.robot.steps, step.id, Number(e.target.value) as 1 | 2),
                },
              }))
            }}
            className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-1 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
            aria-label="クリック回数"
          >
            <option value={1}>シングルクリック</option>
            <option value={2}>ダブルクリック</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor={`click-btn-${step.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
            ボタン
          </label>
          <select
            id={`click-btn-${step.id}`}
            value={action.button ?? 'left'}
            onChange={(e) => {
              useDasRobotStore.setState((s) => ({
                robot: {
                  ...s.robot,
                  steps: updateClickButton(s.robot.steps, step.id, e.target.value as 'left' | 'right' | 'middle'),
                },
              }))
            }}
            className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-1 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
            aria-label="マウスボタン"
          >
            <option value="left">左</option>
            <option value="right">右</option>
            <option value="middle">中</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ---- ExtractValue プロパティ ---------------------------------

interface ExtractValuePropsProps {
  step: DasStep
  action: Extract<DasAction, { type: 'ExtractValue' }>
}

function ExtractValueProps({ step, action }: ExtractValuePropsProps) {
  return (
    <div>
      <FinderDisplay
        id={`ev-finder-${step.id}`}
        label="抽出対象セレクタ"
        finder={action.finder}
        onChange={(selector) => {
          useDasRobotStore.setState((s) => ({
            robot: {
              ...s.robot,
              steps: updateExtractValueFinder(s.robot.steps, step.id, selector),
            },
          }))
        }}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor={`ev-var-${step.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
            格納先の変数
          </label>
          <input
            id={`ev-var-${step.id}`}
            value={action.toVariable}
            onChange={(e) => {
              useDasRobotStore.setState((s) => ({
                robot: {
                  ...s.robot,
                  steps: updateExtractValueVariable(s.robot.steps, step.id, e.target.value),
                },
              }))
            }}
            className="w-full rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-text focus:border-ds-accent2 focus:outline-none"
            placeholder="変数名"
            aria-label="格納先の変数名"
          />
        </div>
        <div className="flex-1">
          <label htmlFor={`ev-attr-${step.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
            取得する属性
          </label>
          <input
            id={`ev-attr-${step.id}`}
            value={action.attribute}
            onChange={(e) => {
              useDasRobotStore.setState((s) => ({
                robot: {
                  ...s.robot,
                  steps: updateExtractValueAttribute(s.robot.steps, step.id, e.target.value),
                },
              }))
            }}
            className="w-full rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-text focus:border-ds-accent2 focus:outline-none"
            placeholder="text / value / name 等"
            aria-label="取得する属性名"
          />
        </div>
      </div>
    </div>
  )
}

// ---- DasPropertiesPane 本体 -----------------------------------

/** 選択中ステップをネスト構造から再帰的に探す */
function findStepById(steps: DasStep[], id: string): DasStep | null {
  for (const step of steps) {
    if (step.id === id) return step
    const action = step.action
    if (action.type === 'GuardedChoice') {
      for (const guard of action.guards) {
        const found = findStepById(guard.steps, id)
        if (found) return found
      }
    }
    if (action.type === 'ForEach') {
      const found = findStepById(action.body, id)
      if (found) return found
    }
    if (action.type === 'Loop') {
      const found = findStepById(action.body, id)
      if (found) return found
    }
    if (action.type === 'Group') {
      const found = findStepById(action.steps, id)
      if (found) return found
    }
    if (action.type === 'Condition') {
      for (const branch of action.branches) {
        const found = findStepById(branch.steps, id)
        if (found) return found
      }
    }
  }
  return null
}

export default function DasPropertiesPane() {
  const robot = useDasRobotStore((s) => s.robot)
  const selectedStepId = useDasRobotStore((s) => s.selectedStepId)
  const removeStep = useDasRobotStore((s) => s.removeStep)

  const selectedStep = selectedStepId ? findStepById(robot.steps, selectedStepId) : null

  if (!selectedStep) {
    return (
      <PanelFrame title="プロパティペイン" hint="ステップを選択して編集">
        <div className="flex h-full flex-col items-center justify-center p-4 text-center text-[12px] text-ds-textDim">
          <div className="mb-2 text-[24px]">⚙</div>
          ロボットビューでステップを選択すると
          <br />
          プロパティが表示されます
        </div>
      </PanelFrame>
    )
  }

  const action = selectedStep.action

  return (
    <PanelFrame title="プロパティペイン" hint={DAS_ACTION_LABELS[action.type]}>
      <div className="p-3">
        {/* ステップ名 */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor={`step-name-${selectedStep.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
              ステップ名
            </label>
            <input
              id={`step-name-${selectedStep.id}`}
              value={selectedStep.name}
              onChange={(e) => {
                useDasRobotStore.setState((s) => ({
                  robot: { ...s.robot, steps: updateStepName(s.robot.steps, selectedStep.id, e.target.value) },
                }))
              }}
              className="w-full rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-text focus:border-ds-accent2 focus:outline-none"
              aria-label="ステップ名"
            />
          </div>
          {/* 有効/無効トグル */}
          <div className="flex flex-col items-center gap-0.5">
            <label htmlFor={`step-enabled-${selectedStep.id}`} className="text-[10px] text-ds-textDim">有効</label>
            <button
              id={`step-enabled-${selectedStep.id}`}
              onClick={() => {
                useDasRobotStore.setState((s) => ({
                  robot: { ...s.robot, steps: toggleStepEnabled(s.robot.steps, selectedStep.id) },
                }))
              }}
              className={[
                'h-5 w-9 rounded-full transition-colors',
                selectedStep.enabled ? 'bg-ds-ok' : 'bg-ds-textDim/40',
              ].join(' ')}
              role="switch"
              aria-checked={selectedStep.enabled}
              aria-label="ステップを有効/無効に切り替え"
            >
              <span
                className={[
                  'block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  selectedStep.enabled ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
          </div>
        </div>

        {/* アクション種別バッジ */}
        <div className="mb-3 inline-block rounded bg-ds-panelAlt px-2 py-0.5 text-[11px] text-ds-accent2">
          {DAS_ACTION_LABELS[action.type]}
        </div>

        {/* アクション種別ごとのプロパティ */}
        {action.type === 'GuardedChoice' && (
          <GuardedChoiceProps step={selectedStep} action={action} />
        )}
        {action.type === 'ForEach' && (
          <ForEachProps step={selectedStep} action={action} />
        )}
        {action.type === 'OpenWindow' && (
          <OpenWindowProps step={selectedStep} action={action} />
        )}
        {action.type === 'Click' && (
          <ClickProps step={selectedStep} action={action} />
        )}
        {action.type === 'ExtractValue' && (
          <ExtractValueProps step={selectedStep} action={action} />
        )}
        {action.type === 'EnterText' && (
          <div>
            <FinderDisplay
              id={`et-finder-${selectedStep.id}`}
              label="入力対象セレクタ"
              finder={action.finder}
              onChange={(selector) => {
                useDasRobotStore.setState((s) => ({
                  robot: {
                    ...s.robot,
                    steps: updateEnterTextFinder(s.robot.steps, selectedStep.id, selector),
                  },
                }))
              }}
            />
            <div>
              <label htmlFor={`et-text-${selectedStep.id}`} className="mb-0.5 block text-[11px] text-ds-textDim">
                入力テキスト
              </label>
              <input
                id={`et-text-${selectedStep.id}`}
                value={action.text}
                onChange={(e) => {
                  useDasRobotStore.setState((s) => ({
                    robot: {
                      ...s.robot,
                      steps: updateEnterTextValue(s.robot.steps, selectedStep.id, e.target.value),
                    },
                  }))
                }}
                className="w-full rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-text focus:border-ds-accent2 focus:outline-none"
                placeholder="入力するテキスト"
                aria-label="入力テキスト"
              />
            </div>
          </div>
        )}

        {/* ステップ削除（トップレベルのみ） */}
        <div className="mt-4 border-t border-ds-border/40 pt-3">
          <button
            onClick={() => removeStep(selectedStep.id)}
            className="w-full rounded border border-ds-err/40 px-2 py-1.5 text-[11px] text-ds-err hover:bg-ds-err/10"
            aria-label="ステップを削除"
          >
            ✕ ステップを削除
          </button>
        </div>
      </div>
    </PanelFrame>
  )
}

// ============================================================
// ストア直接更新ヘルパー（コンポーネント外ユーティリティ）
// すべて純粋関数でステップツリーを immutable 更新する。
// ============================================================

/** ステップを ID で再帰検索して updater で更新する */
function mapStepById(steps: DasStep[], id: string, updater: (s: DasStep) => DasStep): DasStep[] {
  return steps.map((step) => {
    if (step.id === id) return updater(step)
    const action = step.action
    switch (action.type) {
      case 'GuardedChoice':
        return { ...step, action: { ...action, guards: action.guards.map((g) => ({ ...g, steps: mapStepById(g.steps, id, updater) })) } }
      case 'ForEach':
        return { ...step, action: { ...action, body: mapStepById(action.body, id, updater) } }
      case 'Loop':
        return { ...step, action: { ...action, body: mapStepById(action.body, id, updater) } }
      case 'Group':
        return { ...step, action: { ...action, steps: mapStepById(action.steps, id, updater) } }
      case 'Condition':
        return { ...step, action: { ...action, branches: action.branches.map((b) => ({ ...b, steps: mapStepById(b.steps, id, updater) })) } }
      default:
        return step
    }
  })
}

function updateStepName(steps: DasStep[], id: string, name: string): DasStep[] {
  return mapStepById(steps, id, (s) => ({ ...s, name }))
}

function toggleStepEnabled(steps: DasStep[], id: string): DasStep[] {
  return mapStepById(steps, id, (s) => ({ ...s, enabled: !s.enabled }))
}

function updateGuardTypeInSteps(steps: DasStep[], stepId: string, guardIndex: number, newType: GuardType): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'GuardedChoice') return step
    const guards = step.action.guards.map((g, i) => i === guardIndex ? { ...g, type: newType } : g)
    return { ...step, action: { ...step.action, guards } }
  })
}

function updateForEachField(steps: DasStep[], stepId: string, field: 'scopeFinderName', value: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'ForEach') return step
    return { ...step, action: { ...step.action, [field]: value } }
  })
}

function updateForEachSelector(steps: DasStep[], stepId: string, field: 'scopeFinder' | 'elementFinder', selector: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'ForEach') return step
    const current = step.action[field]
    return { ...step, action: { ...step.action, [field]: { ...current, selector } } }
  })
}

function updateOpenWindowField(steps: DasStep[], stepId: string, field: 'windowTitle' | 'appName', value: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'OpenWindow') return step
    return { ...step, action: { ...step.action, [field]: value } }
  })
}

function updateClickFinderSelector(steps: DasStep[], stepId: string, selector: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'Click') return step
    return { ...step, action: { ...step.action, finder: { ...step.action.finder, selector } } }
  })
}

function updateClickCount(steps: DasStep[], stepId: string, clickCount: 1 | 2): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'Click') return step
    return { ...step, action: { ...step.action, clickCount } }
  })
}

function updateClickButton(steps: DasStep[], stepId: string, button: 'left' | 'right' | 'middle'): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'Click') return step
    return { ...step, action: { ...step.action, button } }
  })
}

function updateExtractValueFinder(steps: DasStep[], stepId: string, selector: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'ExtractValue') return step
    return { ...step, action: { ...step.action, finder: { ...step.action.finder, selector } } }
  })
}

function updateExtractValueVariable(steps: DasStep[], stepId: string, toVariable: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'ExtractValue') return step
    return { ...step, action: { ...step.action, toVariable } }
  })
}

function updateExtractValueAttribute(steps: DasStep[], stepId: string, attribute: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'ExtractValue') return step
    return { ...step, action: { ...step.action, attribute } }
  })
}

function updateEnterTextFinder(steps: DasStep[], stepId: string, selector: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'EnterText') return step
    return { ...step, action: { ...step.action, finder: { ...step.action.finder, selector } } }
  })
}

function updateEnterTextValue(steps: DasStep[], stepId: string, text: string): DasStep[] {
  return mapStepById(steps, stepId, (step) => {
    if (step.action.type !== 'EnterText') return step
    return { ...step, action: { ...step.action, text } }
  })
}
