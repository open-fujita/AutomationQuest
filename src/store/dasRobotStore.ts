// ============================================================
// DAS ロボットストア — 緑ロボット（Desktop Automation）の状態管理
//
// Zustand を使い、DasRobot のステップ編集・ステップ選択・シミュレーション結果を管理する。
// ネスト構造（GuardedChoice 枝 / ForEach body）の immutable 更新に対応する。
// ============================================================

import { create } from 'zustand'
import {
  type DasRobot,
  type DasStep,
  type DasAction,
  type Guard,
  createEmptyDasRobot,
  nextDasStepId,
} from '../model/dasRobot'
import type { Mission } from '../model/mission'
import type { DasSimResult } from '../engine/dasSimulator'
import { EMPTY_DAS_SIM } from '../engine/dasSimulator'

// ---- ネスト更新ヘルパー ----------------------------------------

/**
 * トップレベルのステップ列からステップ ID を再帰検索し、
 * updater で更新したツリーを返す（immutable）。
 */
function updateStepById(
  steps: DasStep[],
  id: string,
  updater: (step: DasStep) => DasStep,
): DasStep[] {
  return steps.map((step) => {
    if (step.id === id) return updater(step)

    // ネスト構造を再帰的に探索
    const action = step.action
    switch (action.type) {
      case 'GuardedChoice': {
        const newGuards = action.guards.map((guard) => ({
          ...guard,
          steps: updateStepById(guard.steps, id, updater),
        }))
        if (newGuards === action.guards) return step
        return { ...step, action: { ...action, guards: newGuards } }
      }
      case 'ForEach': {
        const newBody = updateStepById(action.body, id, updater)
        if (newBody === action.body) return step
        return { ...step, action: { ...action, body: newBody } }
      }
      case 'Loop': {
        const newBody = updateStepById(action.body, id, updater)
        if (newBody === action.body) return step
        return { ...step, action: { ...action, body: newBody } }
      }
      case 'Condition': {
        const newBranches = action.branches.map((branch) => ({
          ...branch,
          steps: updateStepById(branch.steps, id, updater),
        }))
        return { ...step, action: { ...action, branches: newBranches } }
      }
      case 'Group': {
        const newSteps = updateStepById(action.steps, id, updater)
        if (newSteps === action.steps) return step
        return { ...step, action: { ...action, steps: newSteps } }
      }
      default:
        return step
    }
  })
}

/**
 * GuardedChoice ステップの指定ガードインデックスを更新する。
 */
function updateGuardInStep(
  steps: DasStep[],
  stepId: string,
  guardIndex: number,
  updater: (guard: Guard) => Guard,
): DasStep[] {
  return updateStepById(steps, stepId, (step) => {
    if (step.action.type !== 'GuardedChoice') return step
    const guards = step.action.guards.map((g, i) => (i === guardIndex ? updater(g) : g))
    return { ...step, action: { ...step.action, guards } }
  })
}

/**
 * ForEach ステップの body にステップを追加する。
 */
function addStepToForEachBody(
  steps: DasStep[],
  forEachStepId: string,
  newStep: DasStep,
): DasStep[] {
  return updateStepById(steps, forEachStepId, (step) => {
    if (step.action.type !== 'ForEach') return step
    return { ...step, action: { ...step.action, body: [...step.action.body, newStep] } }
  })
}

// ---- ストアの型定義 -------------------------------------------

interface DasRobotState {
  robot: DasRobot
  selectedStepId: string | null
  /** 選択中ステップへのパス（ネスト対応: ['das-step-1', 'guard-0-step-2'] 等） */
  selectedPath: string[]
  sim: DasSimResult

  /** ミッション切り替え時にロボットを初期化（dasSeed 適用） */
  loadMission: (mission: Mission) => void

  /** トップレベルにステップを追加。生成 ID を返す */
  addStep: (action: DasAction) => string

  /** 選択ステップの更新（action 部分更新） */
  updateStep: (id: string, patch: Partial<DasAction>) => void

  /** ガードチョイスのガードを追加（GuardedChoice ステップに対して） */
  addGuard: (stepId: string, guard: Guard) => void

  /** ガードチョイスのガードを削除 */
  removeGuard: (stepId: string, guardIndex: number) => void

  /** ガードの timeout 秒数を更新 */
  updateGuardTimeout: (stepId: string, guardIndex: number, seconds: number) => void

  /** For Each の body にステップを追加 */
  addForEachBodyStep: (forEachStepId: string, action: DasAction) => string

  /** ステップ削除（トップレベルのみ） */
  removeStep: (id: string) => void

  /** ステップ選択 */
  selectStep: (id: string | null) => void

  /** 実行結果をセット */
  setSim: (sim: DasSimResult) => void
  resetSim: () => void
}

// ---- ストア実装 -----------------------------------------------

export const useDasRobotStore = create<DasRobotState>((set, get) => ({
  robot: createEmptyDasRobot('das-robot'),
  selectedStepId: null,
  selectedPath: [],
  sim: EMPTY_DAS_SIM,

  loadMission: (mission) => {
    const robot = createEmptyDasRobot(mission.id)
    if (mission.robotType === 'das' && mission.dasSeed) {
      mission.dasSeed(robot)
    }
    set({ robot, selectedStepId: null, selectedPath: [], sim: EMPTY_DAS_SIM })
  },

  addStep: (action) => {
    const id = nextDasStepId()
    // アクション種別に応じたデフォルト名を設定
    const name = getDefaultStepName(action)
    const step: DasStep = { id, name, action, enabled: true }
    set((s) => ({ robot: { ...s.robot, steps: [...s.robot.steps, step] }, selectedStepId: id }))
    return id
  },

  updateStep: (id, patch) => {
    set((s) => ({
      robot: {
        ...s.robot,
        steps: updateStepById(s.robot.steps, id, (step) => {
          // patch はアクション union への部分適用なので型を緩めて受ける
          const newAction = { ...step.action, ...patch } as DasAction
          return { ...step, action: newAction }
        }),
      },
    }))
  },

  addGuard: (stepId, guard) => {
    set((s) => ({
      robot: {
        ...s.robot,
        steps: updateStepById(s.robot.steps, stepId, (step) => {
          if (step.action.type !== 'GuardedChoice') return step
          return {
            ...step,
            action: { ...step.action, guards: [...step.action.guards, guard] },
          }
        }),
      },
    }))
  },

  removeGuard: (stepId, guardIndex) => {
    set((s) => ({
      robot: {
        ...s.robot,
        steps: updateStepById(s.robot.steps, stepId, (step) => {
          if (step.action.type !== 'GuardedChoice') return step
          const guards = step.action.guards.filter((_, i) => i !== guardIndex)
          return { ...step, action: { ...step.action, guards } }
        }),
      },
    }))
  },

  updateGuardTimeout: (stepId, guardIndex, seconds) => {
    set((s) => ({
      robot: {
        ...s.robot,
        steps: updateGuardInStep(s.robot.steps, stepId, guardIndex, (guard) => ({
          ...guard,
          seconds,
        })),
      },
    }))
  },

  addForEachBodyStep: (forEachStepId, action) => {
    const id = nextDasStepId()
    const name = getDefaultStepName(action)
    const step: DasStep = { id, name, action, enabled: true }
    set((s) => ({
      robot: {
        ...s.robot,
        steps: addStepToForEachBody(s.robot.steps, forEachStepId, step),
      },
    }))
    return id
  },

  removeStep: (id) => {
    set((s) => {
      // トップレベルのみ削除（ネスト内のステップは削除しない）
      const newSteps = s.robot.steps.filter((step) => step.id !== id)
      return {
        robot: { ...s.robot, steps: newSteps },
        selectedStepId: s.selectedStepId === id ? null : s.selectedStepId,
      }
    })
  },

  selectStep: (id) => {
    const path = id ? [id] : []
    set({ selectedStepId: id, selectedPath: path })
  },

  setSim: (sim) => set({ sim }),
  resetSim: () => {
    const currentRobot = get().robot
    set({ sim: EMPTY_DAS_SIM, robot: { ...currentRobot } })
  },
}))

// ---- ヘルパー: アクション種別の既定ステップ名 ----------------

import { DAS_ACTION_LABELS } from '../model/dasRobot'

function getDefaultStepName(action: DasAction): string {
  return DAS_ACTION_LABELS[action.type] ?? action.type
}
