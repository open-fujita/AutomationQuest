import { create } from 'zustand'
import {
  type Robot,
  type RobotStep,
  type StepAction,
  type StepActionType,
  type TypeDef,
  type Variable,
  type TypeAttribute,
  ACTION_LABELS,
  ACTION_STEP_CLASS,
  ACTION_KIND,
  nextStepId,
  createEmptyRobot,
} from '../model/robot'
import { ROW_TARGET } from '../model/site'
import type { SimResult } from '../model/sim'
import { EMPTY_SIM } from '../model/sim'
import type { Mission } from '../model/mission'

function makeDefaultAction(type: StepActionType): StepAction {
  switch (type) {
    case 'LoadPage':
      return { type: 'LoadPage', url: '' }
    case 'ExtractText':
      return { type: 'ExtractText', targetId: '', toVariable: '', toAttribute: '' }
    case 'ExtractURL':
      return { type: 'ExtractURL', targetId: '', toVariable: '', toAttribute: '' }
    case 'ForEach':
      return { type: 'ForEach', targetId: ROW_TARGET }
    case 'Click':
      return { type: 'Click', targetId: '' }
    case 'EnterText':
      return { type: 'EnterText', targetId: '', text: '' }
    case 'TestValue':
      return { type: 'TestValue', toVariable: '', toAttribute: '', op: 'notEmpty', value: '' }
    case 'SaveFile':
      return { type: 'SaveFile', fileName: '結果.xlsx' }
    case 'ReturnValue':
      return { type: 'ReturnValue', variableName: '' }
    case 'CallRobot':
      return { type: 'CallRobot', robotName: '' }
  }
}

interface RobotState {
  robot: Robot
  selectedStepId: string | null
  sim: SimResult

  loadMission: (mission: Mission) => void
  selectStep: (id: string | null) => void
  /** 終了ステップの前にアクションステップを挿入し、その ID を返す（追加分を選択状態にする） */
  addAction: (type: StepActionType, opts?: { targetId?: string }) => string
  updateStepName: (id: string, name: string) => void
  /** ステップのアクション種別を切り替える（「アクションを選択 ▼」） */
  setActionType: (id: string, type: StepActionType) => void
  /** アクションのプロパティを部分更新（StepAction はユニオンのため緩い型で受ける） */
  updateAction: (id: string, patch: Record<string, unknown>) => void
  toggleEnabled: (id: string) => void
  removeStep: (id: string) => void
  moveStep: (id: string, dir: -1 | 1) => void

  addType: (type: TypeDef) => void
  addAttribute: (typeName: string, attr: TypeAttribute) => void
  removeAttribute: (typeName: string, attrName: string) => void
  removeType: (typeName: string) => void
  addVariable: (variable: Variable) => void
  removeVariable: (varName: string) => void

  setSim: (sim: SimResult) => void
  resetSim: () => void

  /**
   * 練習編用: Robot を直接セット（loadMission を通さず任意の Robot を差し込む）。
   * 既存ミッション M1〜M5 は loadMission を使うので影響なし（後方互換 optional）。
   */
  setRobot: (robot: Robot) => void
}

export const useRobotStore = create<RobotState>((set, get) => ({
  robot: createEmptyRobot('robot1'),
  selectedStepId: null,
  sim: EMPTY_SIM,

  loadMission: (mission) => {
    const robot = createEmptyRobot('robot1')
    mission.seed?.(robot)
    set({ robot, selectedStepId: null, sim: EMPTY_SIM })
  },

  selectStep: (id) => set({ selectedStepId: id }),

  addAction: (type, opts) => {
    // グラフモード（分岐あり・ミッション提供）の構成は固定。ステップ追加を抑止。
    if (get().robot.edges && get().robot.edges!.length > 0) return ''
    const id = nextStepId()
    const action = makeDefaultAction(type)
    if (opts?.targetId && 'targetId' in action) {
      ;(action as { targetId: string }).targetId = opts.targetId
    }
    const step: RobotStep = {
      id,
      kind: ACTION_KIND[type],
      name: ACTION_LABELS[type],
      stepClass: ACTION_STEP_CLASS[type],
      action,
      enabled: true,
    }
    set((s) => {
      const steps = [...s.robot.steps]
      const endIdx = steps.findIndex((st) => st.kind === 'end')
      const insertAt = endIdx === -1 ? steps.length : endIdx
      steps.splice(insertAt, 0, step)
      return { robot: { ...s.robot, steps }, selectedStepId: id }
    })
    return id
  },

  updateStepName: (id, name) =>
    set((s) => ({
      robot: { ...s.robot, steps: s.robot.steps.map((st) => (st.id === id ? { ...st, name } : st)) },
    })),

  setActionType: (id, type) =>
    set((s) => ({
      robot: {
        ...s.robot,
        steps: s.robot.steps.map((st) =>
          st.id === id
            ? {
                ...st,
                kind: ACTION_KIND[type],
                stepClass: ACTION_STEP_CLASS[type],
                action: makeDefaultAction(type),
                // 名前が既定ラベルのままなら新ラベルに追従、ユーザー変更済みなら保持
                name: st.name === ACTION_LABELS[(st.action?.type ?? type)] ? ACTION_LABELS[type] : st.name,
              }
            : st,
        ),
      },
    })),

  updateAction: (id, patch) =>
    set((s) => ({
      robot: {
        ...s.robot,
        steps: s.robot.steps.map((st) =>
          st.id === id && st.action ? { ...st, action: { ...st.action, ...patch } as StepAction } : st,
        ),
      },
    })),

  toggleEnabled: (id) =>
    set((s) => ({
      robot: { ...s.robot, steps: s.robot.steps.map((st) => (st.id === id ? { ...st, enabled: !st.enabled } : st)) },
    })),

  removeStep: (id) =>
    set((s) => {
      const target = s.robot.steps.find((st) => st.id === id)
      if (!target || target.kind === 'start' || target.kind === 'end') return s
      return {
        robot: { ...s.robot, steps: s.robot.steps.filter((st) => st.id !== id) },
        selectedStepId: s.selectedStepId === id ? null : s.selectedStepId,
      }
    }),

  moveStep: (id, dir) =>
    set((s) => {
      const steps = [...s.robot.steps]
      const i = steps.findIndex((st) => st.id === id)
      if (i === -1) return s
      const j = i + dir
      // start(先頭) と end(末尾) の外には動かさない
      if (j <= 0 || j >= steps.length - 1) return s
      ;[steps[i], steps[j]] = [steps[j], steps[i]]
      return { robot: { ...s.robot, steps } }
    }),

  addType: (type) =>
    set((s) => {
      if (s.robot.types.some((t) => t.name === type.name)) return s
      return { robot: { ...s.robot, types: [...s.robot.types, type] } }
    }),

  addAttribute: (typeName, attr) =>
    set((s) => ({
      robot: {
        ...s.robot,
        types: s.robot.types.map((t) =>
          t.name === typeName && !t.attributes.some((a) => a.name === attr.name)
            ? { ...t, attributes: [...t.attributes, attr] }
            : t,
        ),
      },
    })),

  removeAttribute: (typeName, attrName) =>
    set((s) => ({
      robot: {
        ...s.robot,
        types: s.robot.types.map((t) =>
          t.name === typeName ? { ...t, attributes: t.attributes.filter((a) => a.name !== attrName) } : t,
        ),
      },
    })),

  removeType: (typeName) =>
    set((s) => ({
      robot: {
        ...s.robot,
        types: s.robot.types.filter((t) => t.name !== typeName),
        // そのタイプを使う変数も一緒に削除（不整合を防ぐ）
        variables: s.robot.variables.filter((v) => v.typeName !== typeName),
      },
    })),

  addVariable: (variable) =>
    set((s) => {
      if (s.robot.variables.some((v) => v.name === variable.name)) return s
      return { robot: { ...s.robot, variables: [...s.robot.variables, variable] } }
    }),

  removeVariable: (varName) =>
    set((s) => ({ robot: { ...s.robot, variables: s.robot.variables.filter((v) => v.name !== varName) } })),

  setSim: (sim) => set({ sim }),
  resetSim: () => set({ sim: EMPTY_SIM }),

  setRobot: (robot) => set({ robot, selectedStepId: null, sim: EMPTY_SIM }),
}))
