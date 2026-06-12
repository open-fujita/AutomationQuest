// ============================================================
// DAS バリデータ — 緑ロボットのミッション受け入れ条件チェックビルダー群。
//
// 設計思想（validator.ts と同じ）:
//   ・名前の完全一致を要求しない「構造ベース」チェック
//   ・ネスト構造（GuardedChoice 枝内 / ForEach body 内）を再帰的に検索
//   ・宣言的なチェックビルダーをミッション定義で組み合わせる
// ============================================================

import type { DasRobot, DasStep, GuardType, DasActionType } from '../model/dasRobot'
import type { DasMissionCheck, DasMissionCheckCtx } from '../model/mission'
import type { DasSimResult } from './dasSimulator'
import type { ValidationResult } from './validator'

// ---- 公開型定義 -----------------------------------------------

export type { DasMissionCheck, DasMissionCheckCtx }

// ---- validateDasMission ---------------------------------------

export function validateDasMission(
  ctx: DasMissionCheckCtx,
  checks: DasMissionCheck[],
): ValidationResult {
  const outcomes = checks.map((c) => {
    let pass = false
    try {
      pass = c.test(ctx)
    } catch {
      pass = false
    }
    return { id: c.id, label: c.label, pass, hint: c.failHint }
  })
  const failed = outcomes.filter((o) => !o.pass)
  return {
    pass: failed.length === 0,
    outcomes,
    firstHint: failed.length > 0 ? failed[0].hint : null,
  }
}

// ---- ネスト再帰検索ヘルパー -----------------------------------

/** DasRobot の全ステップを再帰的に走査してコールバックを呼ぶ */
function walkSteps(steps: DasStep[], visitor: (step: DasStep) => void): void {
  for (const step of steps) {
    visitor(step)
    const action = step.action
    switch (action.type) {
      case 'GuardedChoice':
        for (const guard of action.guards) {
          walkSteps(guard.steps, visitor)
        }
        break
      case 'ForEach':
        walkSteps(action.body, visitor)
        break
      case 'Loop':
        walkSteps(action.body, visitor)
        break
      case 'Condition':
        for (const branch of action.branches) {
          walkSteps(branch.steps, visitor)
        }
        break
      case 'Group':
        walkSteps(action.steps, visitor)
        break
      default:
        break
    }
  }
}

/** ロボット全体から特定アクション種別のステップを全件取得 */
function findDasActions(robot: DasRobot, type: DasActionType): DasStep[] {
  const results: DasStep[] = []
  walkSteps(robot.steps, (step) => {
    if (step.enabled && step.action.type === type) results.push(step)
  })
  return results
}

/** ロボット全体のガードチョイスから特定種別のガードを全件取得 */
function findGuards(robot: DasRobot, type: GuardType): { stepId: string }[] {
  const results: { stepId: string }[] = []
  walkSteps(robot.steps, (step) => {
    if (!step.enabled) return
    if (step.action.type === 'GuardedChoice') {
      for (const guard of step.action.guards) {
        if (guard.type === type) results.push({ stepId: step.id })
      }
    }
  })
  return results
}

// ---- チェックビルダー群 ----------------------------------------

/** 指定 DasAction 種別のステップが（ネスト含め）存在する */
export function requireDasAction(
  type: DasActionType,
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: `das-action-${type}`,
    label,
    failHint,
    test: (ctx) => findDasActions((ctx as { robot: DasRobot; sim: DasSimResult }).robot, type).length > 0,
  }
}

/** ガードチョイスが存在し、指定ガード種別の枝を持つ */
export function requireGuardOfType(
  guardType: GuardType,
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: `guard-type-${guardType}`,
    label,
    failHint,
    test: (ctx) => findGuards((ctx as { robot: DasRobot; sim: DasSimResult }).robot, guardType).length > 0,
  }
}

/** Location Found ガードが存在する（D2 の「状態待ち」体験確認） */
export function requireLocationFoundGuard(
  label: string,
  failHint: string,
): DasMissionCheck {
  return requireGuardOfType('locationFound', label, failHint)
}

/** Application Found ガードが存在する（D3 の「不意の来客」確認） */
export function requireApplicationFoundGuard(
  label: string,
  failHint: string,
): DasMissionCheck {
  return requireGuardOfType('applicationFound', label, failHint)
}

/**
 * Timeout ガード単独構成を禁止する（D2 の「固定秒待ちは脆い」体験後の確認）。
 * ガードチョイスが timeout のみで組まれている場合 false を返す。
 */
export function forbidTimeoutOnly(
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: 'forbid-timeout-only',
    label,
    failHint,
    test: (ctx) => {
      const robot = (ctx as { robot: DasRobot; sim: DasSimResult }).robot
      let hasGuardedChoice = false
      let allAreTimeoutOnly = false

      walkSteps(robot.steps, (step) => {
        if (!step.enabled) return
        if (step.action.type === 'GuardedChoice') {
          hasGuardedChoice = true
          const guards = step.action.guards
          if (guards.length > 0 && guards.every((g) => g.type === 'timeout')) {
            allAreTimeoutOnly = true
          }
        }
      })

      if (!hasGuardedChoice) return true  // ガードチョイスなしは問題なし
      return !allAreTimeoutOnly           // timeout 単独でなければ OK
    },
  }
}

/** For Each ステップが存在し、scopeFinder が設定されている（D4） */
export function requireForEachScope(
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: 'foreach-scope',
    label,
    failHint,
    test: (ctx) => {
      const robot = (ctx as { robot: DasRobot; sim: DasSimResult }).robot
      const forEachSteps = findDasActions(robot, 'ForEach')
      return forEachSteps.some((step) => {
        if (step.action.type !== 'ForEach') return false
        return step.action.scopeFinder.selector.trim() !== ''
      })
    },
  }
}

/** For Each の elementFinder が相対セレクタ形式（'> ' で始まる）を使っている（D4） */
export function requireRelativeSelector(
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: 'relative-selector',
    label,
    failHint,
    test: (ctx) => {
      const robot = (ctx as { robot: DasRobot; sim: DasSimResult }).robot
      const forEachSteps = findDasActions(robot, 'ForEach')
      return forEachSteps.some((step) => {
        if (step.action.type !== 'ForEach') return false
        return step.action.elementFinder.selector.trim().startsWith('>')
      })
    },
  }
}

/**
 * ExtractValue ステップが属性ベースのセレクタ（'[' を含む）を使っている（D5）。
 * 座標固定（selector に 'x=' / 'y=' を含む）の場合は false。
 */
export function requireSelectorMatch(
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: 'selector-match',
    label,
    failHint,
    test: (ctx) => {
      const robot = (ctx as { robot: DasRobot; sim: DasSimResult }).robot
      const extractSteps = findDasActions(robot, 'ExtractValue')
      if (extractSteps.length === 0) return false
      return extractSteps.some((step) => {
        if (step.action.type !== 'ExtractValue') return false
        const sel = step.action.finder.selector
        // 属性セレクタを持ち、かつ座標固定でない
        const hasAttr = sel.includes('[')
        const isCoord = /\[x="|y="/.test(sel)
        return hasAttr && !isCoord
      })
    },
  }
}

/** 実行結果として、指定変数に min 件以上のレコードが取れている */
export function requireDasExtractCount(
  variable: string,
  min: number,
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: `das-count-${variable}-${min}`,
    label,
    failHint,
    test: (ctx) => {
      const sim = (ctx as { robot: DasRobot; sim: DasSimResult }).sim
      return (sim.data[variable]?.length ?? 0) >= min
    },
  }
}

/** 実行ログに 'guard-matched' エントリが指定 guardType で存在する（ガードが実際に成立した） */
export function requireGuardMatched(
  guardType: GuardType,
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: `guard-matched-${guardType}`,
    label,
    failHint,
    test: (ctx) => {
      const sim = (ctx as { robot: DasRobot; sim: DasSimResult }).sim
      return sim.guardResults.some(
        (gr: { stepId: string; winnerGuardType: GuardType; tick: number }) =>
          gr.winnerGuardType === guardType,
      )
    },
  }
}

/** 実行時にエラーが無い */
export function requireDasNoErrors(label: string, failHint: string): DasMissionCheck {
  return {
    id: 'das-no-errors',
    label,
    failHint,
    test: (ctx) => {
      const sim = (ctx as { robot: DasRobot; sim: DasSimResult }).sim
      return sim.ran && sim.errors.length === 0
    },
  }
}

/** OpenWindow ステップが指定 windowTitle で設定されている（D1） */
export function requireOpenWindow(
  windowTitle: string,
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: `open-window-${windowTitle}`,
    label,
    failHint,
    test: (ctx) => {
      const robot = (ctx as { robot: DasRobot; sim: DasSimResult }).robot
      const openWindowSteps = findDasActions(robot, 'OpenWindow')
      return openWindowSteps.some((step) => {
        if (step.action.type !== 'OpenWindow') return false
        return step.action.windowTitle === windowTitle
      })
    },
  }
}
