// ============================================================
// DAS バリデータ — 緑ロボットのミッション受け入れ条件チェックビルダー群。
//
// 設計思想（validator.ts と同じ）:
//   ・名前の完全一致を要求しない「構造ベース」チェック
//   ・ネスト構造（GuardedChoice 枝内 / ForEach body 内）を再帰的に検索
//   ・宣言的なチェックビルダーをミッション定義で組み合わせる
//
// 2026.1 リワーク:
//   ・requireOpenWindow → requireBrowser（Windows ステップ用の requireWindows も追加）
//   ・walkSteps に Return / Throw / Assign / TryCatch / WhileLoop の case 追加
// ============================================================

import type { DasRobot, DasStep, GuardType, DasActionType } from '../model/dasRobot'
import type { DasMissionCheck, DasMissionCheckCtx } from '../model/mission'
import type { DasSimResult, ForEachRunRecord } from './dasSimulator'
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
      case 'WhileLoop':
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
      case 'TryCatch':
        walkSteps(action.trySteps, visitor)
        for (const c of action.catches) {
          walkSteps(c.steps, visitor)
        }
        walkSteps(action.finallySteps, visitor)
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

/**
 * For Each ステップが実行時にスコープファインダーを実際に解決できた（D4）。
 *
 * 旧実装: scopeFinder.selector が空でなければ静的に true → どこでもクリア可能だった。
 * 新実装: sim.forEachRuns に scopeMatched=true のエントリが存在することを要求。
 *   - 未実行（sim.ran=false または forEachRuns が空）の場合は false → 「実行して確認」を促す。
 *   - 無関係なコンテナ（スコープファインダーが解決できない要素）にループを作っても false。
 */
export function requireForEachScope(
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: 'foreach-scope',
    label,
    failHint,
    test: (ctx) => {
      const sim = (ctx as { robot: DasRobot; sim: DasSimResult }).sim
      if (!sim.ran) return false
      return (sim.forEachRuns as ForEachRunRecord[]).some((r) => r.scopeMatched)
    },
  }
}

/**
 * For Each の elementFinder が相対セレクタ形式（'>' で始まる）かつ
 * 実行時に 2 件以上を反復できた（D4）。
 *
 * 旧実装: elementFinder.selector が '>' で始まるという書式チェックのみ →
 *   右クリック挿入で自動生成される '> type' があれば即 true。
 * 新実装: 書式チェック（'>' 始まり）AND 実行時 iterations >= 2 の両方を要求。
 *   - 未実行（sim.ran=false）のとき false。
 *   - 正しいリストコンテナ以外の要素（label 等）にループを作っても
 *     iterations が 1 以下になるため false。
 *   - コンテナが空（iterations=0）のときも false。
 */
export function requireRelativeSelector(
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: 'relative-selector',
    label,
    failHint,
    test: (ctx) => {
      const { robot, sim } = ctx as { robot: DasRobot; sim: DasSimResult }
      if (!sim.ran) return false
      const forEachSteps = findDasActions(robot, 'ForEach')
      return forEachSteps.some((step) => {
        if (step.action.type !== 'ForEach') return false
        // 書式チェック: '>' で始まる相対セレクタか
        if (!step.action.elementFinder.selector.trim().startsWith('>')) return false
        // 実行チェック: このステップが実際に 2 件以上反復できたか
        const run = (sim.forEachRuns as ForEachRunRecord[]).find(
          (r) => r.stepId === step.id,
        )
        return run !== undefined && run.scopeMatched && run.iterations >= 2
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

/**
 * Windows ステップが指定 executable で設定されている（D1 デスクトップアプリ起動確認）。
 * 旧 requireOpenWindow の 2026.1 版（Windows ステップ対応）。
 */
export function requireBrowser(
  applicationName: string,
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: `browser-${applicationName}`,
    label,
    failHint,
    test: (ctx) => {
      const robot = (ctx as { robot: DasRobot; sim: DasSimResult }).robot
      const browserSteps = findDasActions(robot, 'Browser')
      return browserSteps.some((step) => {
        if (step.action.type !== 'Browser') return false
        return step.action.applicationName === applicationName || applicationName === ''
      })
    },
  }
}

/**
 * Windows ステップが指定 executable で設定されている（D1 デスクトップアプリ起動確認）。
 * D1〜D5 はデスクトップアプリなので Windows ステップを使う。
 */
export function requireWindows(
  executable: string,
  label: string,
  failHint: string,
): DasMissionCheck {
  return {
    id: `windows-${executable}`,
    label,
    failHint,
    test: (ctx) => {
      const robot = (ctx as { robot: DasRobot; sim: DasSimResult }).robot
      const windowsSteps = findDasActions(robot, 'Windows')
      if (executable === '') return windowsSteps.length > 0
      return windowsSteps.some((step) => {
        if (step.action.type !== 'Windows') return false
        return step.action.executable === executable || step.action.executable.includes(executable)
      })
    },
  }
}

/**
 * @deprecated D1 では requireWindows を使うこと。
 * 旧 requireOpenWindow（OpenWindow ステップ用）— 後方互換のため残すが、
 * 実際には Windows ステップが設定されているかを確認するため requireWindows に委譲する。
 */
export function requireOpenWindow(
  windowTitle: string,
  label: string,
  failHint: string,
): DasMissionCheck {
  // テストとの互換性: OpenWindow 型のステップを探すが、型が変更されたため
  // Windows ステップで executable が windowTitle に一致するかも確認する
  return {
    id: `open-window-${windowTitle}`,
    label,
    failHint,
    test: (ctx) => {
      const robot = (ctx as { robot: DasRobot; sim: DasSimResult }).robot
      // Windows ステップで一致するものを探す
      const windowsSteps = findDasActions(robot, 'Windows')
      const windowsMatch = windowsSteps.some((step) => {
        if (step.action.type !== 'Windows') return false
        return step.action.executable === windowTitle ||
               step.action.executable.includes(windowTitle) ||
               windowTitle === ''
      })
      if (windowsMatch) return true

      // Browser ステップも確認（URL や applicationName でマッチ）
      const browserSteps = findDasActions(robot, 'Browser')
      return browserSteps.some((step) => {
        if (step.action.type !== 'Browser') return false
        return step.action.applicationName === windowTitle || windowTitle === ''
      })
    },
  }
}
