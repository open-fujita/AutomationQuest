// ============================================================
// StepCardForms — ステップカード内インラインフォーム群
//
// ステップカード展開時に、カード内にインライン表示される。
// 各フォームは対応するアクションの設定フィールドを表示・編集する。
//
// 対象ステップ:
//   Browser / Windows / Click / ExtractValue / EnterText / ForEach /
//   Loop / Return / Throw / Condition / Group / GuardedChoice（GuardLane 経由）
// アクセシビリティ: label 関連付け、全入力に aria-label
// ============================================================

import type { DasStep, DasAction, DasFinder } from '../../model/dasRobot'
import { useDasRobotStore } from '../../store/dasRobotStore'
import { FinderForm } from './FinderForm'

// ---- ネスト更新ヘルパー ----------------------------------------

/** ステップを ID で再帰検索して updater で更新する（純粋関数）*/
export function mapStepById(
  steps: DasStep[],
  id: string,
  updater: (s: DasStep) => DasStep,
): DasStep[] {
  return steps.map((step) => {
    if (step.id === id) return updater(step)
    const action = step.action
    switch (action.type) {
      case 'GuardedChoice':
        return {
          ...step,
          action: {
            ...action,
            guards: action.guards.map((g) => ({ ...g, steps: mapStepById(g.steps, id, updater) })),
          },
        }
      case 'ForEach':
        return { ...step, action: { ...action, body: mapStepById(action.body, id, updater) } }
      case 'Loop':
        return { ...step, action: { ...action, body: mapStepById(action.body, id, updater) } }
      case 'Group':
        return { ...step, action: { ...action, steps: mapStepById(action.steps, id, updater) } }
      case 'Condition':
        return {
          ...step,
          action: {
            ...action,
            branches: action.branches.map((b) => ({ ...b, steps: mapStepById(b.steps, id, updater) })),
          },
        }
      default:
        return step
    }
  })
}

/** 選択中ステップをネスト構造から再帰的に探す */
export function findStepById(steps: DasStep[], id: string): DasStep | null {
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

// ---- 共通スタイル -------------------------------------------

const inputCls =
  'w-full rounded border border-ds-border bg-ds-bg px-2 py-1 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none'
const labelCls = 'block text-[10px] text-ds-textDim mb-0.5'
const fieldWrap = 'mb-2'

// ---- Browser フォーム ----------------------------------------

interface BrowserFormProps {
  step: DasStep
  action: Extract<DasAction, { type: 'Browser' }>
}

export function BrowserForm({ step, action }: BrowserFormProps) {
  const updateField = (field: string, value: string) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, [field]: value } as DasAction,
        })),
      },
    }))
  }

  return (
    <div className="space-y-2">
      <div className={fieldWrap}>
        <label htmlFor={`br-browser-${step.id}`} className={labelCls}>
          ブラウザ
        </label>
        <select
          id={`br-browser-${step.id}`}
          value={action.browser}
          className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-1 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          disabled
          aria-label="ブラウザ種別"
        >
          <option value="Chromium">Chromium</option>
        </select>
      </div>
      <div className={fieldWrap}>
        <label htmlFor={`br-action-${step.id}`} className={labelCls}>
          アクション
        </label>
        <select
          id={`br-action-${step.id}`}
          value={action.browserAction}
          onChange={(e) => updateField('browserAction', e.target.value)}
          className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-1 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          aria-label="ブラウザ アクション"
        >
          <option value="pageLoad">ページ読込</option>
          <option value="pageCreate">ページ生成</option>
          <option value="waitDownload">ダウンロードを待機</option>
        </select>
      </div>
      <div className={fieldWrap}>
        <label htmlFor={`br-appname-${step.id}`} className={labelCls}>
          アプリケーション名
        </label>
        <input
          id={`br-appname-${step.id}`}
          type="text"
          value={action.applicationName}
          onChange={(e) => updateField('applicationName', e.target.value)}
          className={inputCls}
          placeholder="ブラウザウィンドウ名"
          aria-label="アプリケーション名"
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor={`br-url-${step.id}`} className={labelCls}>
          URL
        </label>
        <input
          id={`br-url-${step.id}`}
          type="text"
          value={action.url}
          onChange={(e) => updateField('url', e.target.value)}
          className={`${inputCls} font-mono`}
          placeholder="https://..."
          aria-label="URL"
        />
      </div>
    </div>
  )
}

// ---- Windows フォーム ----------------------------------------

interface WindowsFormProps {
  step: DasStep
  action: Extract<DasAction, { type: 'Windows' }>
}

export function WindowsForm({ step, action }: WindowsFormProps) {
  const updateField = (field: string, value: string | boolean) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, [field]: value } as DasAction,
        })),
      },
    }))
  }

  return (
    <div className="space-y-2">
      <div className={fieldWrap}>
        <label htmlFor={`win-device-${step.id}`} className={labelCls}>
          デバイス
        </label>
        <input
          id={`win-device-${step.id}`}
          type="text"
          value={action.device}
          onChange={(e) => updateField('device', e.target.value)}
          className={inputCls}
          placeholder="local"
          aria-label="デバイス"
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor={`win-action-${step.id}`} className={labelCls}>
          アクション
        </label>
        <select
          id={`win-action-${step.id}`}
          value={action.windowsAction}
          className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-1 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          disabled
          aria-label="Windows アクション"
        >
          <option value="execute">実行</option>
        </select>
      </div>
      <div className={fieldWrap}>
        <label htmlFor={`win-exe-${step.id}`} className={labelCls}>
          実行可能
        </label>
        <input
          id={`win-exe-${step.id}`}
          type="text"
          value={action.executable}
          onChange={(e) => updateField('executable', e.target.value)}
          className={`${inputCls} font-mono`}
          placeholder="notepad.exe"
          aria-label="実行可能ファイルパス"
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor={`win-args-${step.id}`} className={labelCls}>
          引数
        </label>
        <input
          id={`win-args-${step.id}`}
          type="text"
          value={action.args ?? ''}
          onChange={(e) => updateField('args', e.target.value)}
          className={`${inputCls} font-mono`}
          placeholder=""
          aria-label="コマンドライン引数"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`win-maxim-${step.id}`}
          type="checkbox"
          checked={action.startMaximized ?? false}
          onChange={(e) => updateField('startMaximized', e.target.checked)}
          className="accent-ds-accent2"
          aria-label="最大化を開始"
        />
        <label htmlFor={`win-maxim-${step.id}`} className="text-[10px] text-ds-textDim cursor-pointer">
          最大化を開始
        </label>
      </div>
    </div>
  )
}

// ---- Click フォーム -----------------------------------------

interface ClickFormProps {
  step: DasStep
  action: Extract<DasAction, { type: 'Click' }>
}

export function ClickForm({ step, action }: ClickFormProps) {
  const updateFinder = (finder: DasFinder) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, finder } as DasAction,
        })),
      },
    }))
  }

  const updateField = (field: string, value: number | string) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, [field]: value } as DasAction,
        })),
      },
    }))
  }

  return (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] text-ds-textDim mb-1">コンポーネント（ファインダー）</div>
        <FinderForm
          finder={action.finder}
          onChange={updateFinder}
          idPrefix={`click-${step.id}`}
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor={`click-count-${step.id}`} className={labelCls}>
            カウント
          </label>
          <select
            id={`click-count-${step.id}`}
            value={action.clickCount ?? 1}
            onChange={(e) => updateField('clickCount', Number(e.target.value))}
            className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
            aria-label="クリック回数"
          >
            <option value={1}>1（シングル）</option>
            <option value={2}>2（ダブル）</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor={`click-btn-${step.id}`} className={labelCls}>
            ボタン
          </label>
          <select
            id={`click-btn-${step.id}`}
            value={action.button ?? 'left'}
            onChange={(e) => updateField('button', e.target.value)}
            className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
            aria-label="マウスボタン"
          >
            <option value="left">左</option>
            <option value="right">右</option>
            <option value="middle">中央</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ---- ExtractValue フォーム -----------------------------------

interface ExtractValueFormProps {
  step: DasStep
  action: Extract<DasAction, { type: 'ExtractValue' }>
}

export function ExtractValueForm({ step, action }: ExtractValueFormProps) {
  const updateFinder = (finder: DasFinder) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, finder } as DasAction,
        })),
      },
    }))
  }

  const updateField = (field: string, value: string) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, [field]: value } as DasAction,
        })),
      },
    }))
  }

  return (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] text-ds-textDim mb-1">コンポーネント</div>
        <FinderForm
          finder={action.finder}
          onChange={updateFinder}
          idPrefix={`ev-${step.id}`}
        />
      </div>
      <div>
        <label htmlFor={`ev-type-${step.id}`} className={labelCls}>
          抽出タイプ
        </label>
        <select
          id={`ev-type-${step.id}`}
          value={action.attribute}
          onChange={(e) => updateField('attribute', e.target.value)}
          className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          aria-label="抽出タイプ"
        >
          <option value="text">テキスト</option>
          <option value="value">属性</option>
          <option value="extended">拡張属性</option>
        </select>
      </div>
      <div>
        <label htmlFor={`ev-var-${step.id}`} className={labelCls}>
          現在のインを保存（格納先変数）
        </label>
        <input
          id={`ev-var-${step.id}`}
          type="text"
          value={action.toVariable}
          onChange={(e) => updateField('toVariable', e.target.value)}
          className={inputCls}
          placeholder="変数名"
          aria-label="格納先の変数名"
        />
      </div>
    </div>
  )
}

// ---- EnterText フォーム -------------------------------------

interface EnterTextFormProps {
  step: DasStep
  action: Extract<DasAction, { type: 'EnterText' }>
}

export function EnterTextForm({ step, action }: EnterTextFormProps) {
  const updateFinder = (finder: DasFinder) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, finder } as DasAction,
        })),
      },
    }))
  }

  const updateText = (text: string) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, text } as DasAction,
        })),
      },
    }))
  }

  return (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] text-ds-textDim mb-1">ファインダー</div>
        <FinderForm
          finder={action.finder}
          onChange={updateFinder}
          idPrefix={`et-${step.id}`}
        />
      </div>
      <div>
        <label htmlFor={`et-text-${step.id}`} className={labelCls}>
          テキスト（= で変数参照: =変数名）
        </label>
        <input
          id={`et-text-${step.id}`}
          type="text"
          value={action.text}
          onChange={(e) => updateText(e.target.value)}
          className={inputCls}
          placeholder="入力テキスト または =変数名"
          aria-label="入力テキスト"
        />
      </div>
    </div>
  )
}

// ---- ForEach フォーム ----------------------------------------

interface ForEachFormProps {
  step: DasStep
  action: Extract<DasAction, { type: 'ForEach' }>
}

export function ForEachForm({ step, action }: ForEachFormProps) {
  const updateScopeFinder = (finder: DasFinder) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, scopeFinder: finder } as DasAction,
        })),
      },
    }))
  }

  const updateElementFinder = (finder: DasFinder) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, elementFinder: finder } as DasAction,
        })),
      },
    }))
  }

  const updateScopeName = (scopeFinderName: string) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, scopeFinderName } as DasAction,
        })),
      },
    }))
  }

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={`fe-name-${step.id}`} className={labelCls}>
          スコープ ファインダー名（一意）
        </label>
        <input
          id={`fe-name-${step.id}`}
          type="text"
          value={action.scopeFinderName}
          onChange={(e) => updateScopeName(e.target.value)}
          className={inputCls}
          placeholder="scope1"
          aria-label="スコープ ファインダー名"
        />
      </div>
      <div>
        <div className="text-[10px] text-ds-textDim mb-1">スコープ ファインダー（起点ノード）</div>
        <FinderForm
          finder={action.scopeFinder}
          onChange={updateScopeFinder}
          idPrefix={`fe-scope-${step.id}`}
        />
      </div>
      <div>
        <div className="text-[10px] text-ds-textDim mb-1">
          要素ファインダー（相対セレクター: &apos;&gt; タグ&apos; 形式）
        </div>
        <FinderForm
          finder={action.elementFinder}
          onChange={updateElementFinder}
          idPrefix={`fe-elem-${step.id}`}
        />
      </div>
      <div className="rounded bg-ds-panelAlt p-1.5 text-[10px] text-ds-textDim">
        💡 要素ファインダーは <code className="font-mono">&gt; listitem</code> のような相対セレクターで。
        スコープファインダーと結合され <code className="font-mono">window &gt; listitem</code> 形になります。
      </div>
    </div>
  )
}

// ---- Throw フォーム ------------------------------------------

interface ThrowFormProps {
  step: DasStep
  action: Extract<DasAction, { type: 'Throw' }>
}

export function ThrowForm({ step, action }: ThrowFormProps) {
  const updateException = (exception: string) => {
    useDasRobotStore.setState((s) => ({
      robot: {
        ...s.robot,
        steps: mapStepById(s.robot.steps, step.id, (st) => ({
          ...st,
          action: { ...st.action, exception } as DasAction,
        })),
      },
    }))
  }

  return (
    <div>
      <label htmlFor={`throw-exc-${step.id}`} className={labelCls}>
        例外
      </label>
      <input
        id={`throw-exc-${step.id}`}
        type="text"
        value={action.exception}
        onChange={(e) => updateException(e.target.value)}
        className={inputCls}
        placeholder="TimeOutError"
        aria-label="スローする例外"
      />
    </div>
  )
}

// ---- Return フォーム -----------------------------------------

export function ReturnForm() {
  return (
    <div className="text-[11px] text-ds-textDim italic p-1">
      ↵ ロボットを終了し、呼び出し元に戻ります。
    </div>
  )
}

// ---- ステップ名編集 + 有効/無効トグル（共通ヘッダ部品）--------

interface StepNameEditorProps {
  step: DasStep
}

export function StepNameEditor({ step }: StepNameEditorProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex-1">
        <label htmlFor={`step-name-${step.id}`} className={labelCls}>
          ステップ名
        </label>
        <input
          id={`step-name-${step.id}`}
          type="text"
          value={step.name}
          onChange={(e) => {
            const name = e.target.value
            useDasRobotStore.setState((s) => ({
              robot: {
                ...s.robot,
                steps: mapStepById(s.robot.steps, step.id, (st) => ({ ...st, name })),
              },
            }))
          }}
          className={inputCls}
          aria-label="ステップ名"
        />
      </div>
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <label htmlFor={`step-enabled-${step.id}`} className="text-[9px] text-ds-textDim">有効</label>
        <button
          id={`step-enabled-${step.id}`}
          type="button"
          onClick={() => {
            useDasRobotStore.setState((s) => ({
              robot: {
                ...s.robot,
                steps: mapStepById(s.robot.steps, step.id, (st) => ({ ...st, enabled: !st.enabled })),
              },
            }))
          }}
          className={[
            'h-5 w-9 rounded-full transition-colors',
            step.enabled ? 'bg-ds-ok' : 'bg-ds-textDim/40',
          ].join(' ')}
          role="switch"
          aria-checked={step.enabled}
          aria-label="ステップを有効/無効に切り替え"
        >
          <span
            className={[
              'block h-4 w-4 rounded-full bg-white shadow transition-transform',
              step.enabled ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
      </div>
    </div>
  )
}
