// ============================================================
// バリデータ — 組んだロボットをミッションの受け入れ条件と照合し、
// 未達なら「何が足りないか」を的確に指摘する。
//
// ミッション定義（data/missions/*.ts）はここの check ビルダーを
// 宣言的に組み合わせて受け入れ条件を表現する。
// ============================================================

import type { StepActionType } from '../model/robot'
import type { MissionCheck, MissionCheckCtx } from '../model/mission'

export interface CheckOutcome {
  id: string
  label: string
  pass: boolean
  hint: string
}

export interface ValidationResult {
  pass: boolean
  outcomes: CheckOutcome[]
  /** 未達チェックの最初のヒント（ガイド表示用） */
  firstHint: string | null
}

export function validateMission(ctx: MissionCheckCtx, checks: MissionCheck[]): ValidationResult {
  const outcomes: CheckOutcome[] = checks.map((c) => {
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

// ---- check ビルダー群 ----------------------------------------

const hasAction = (ctx: MissionCheckCtx, type: StepActionType): boolean =>
  ctx.robot.steps.some((s) => s.enabled && s.action?.type === type)

/** 指定アクション種別のステップが存在する */
export function requireAction(type: StepActionType, label: string, failHint: string): MissionCheck {
  return { id: `action-${type}`, label, failHint, test: (ctx) => hasAction(ctx, type) }
}

/** 「ページを読み込む」が指定 URL で設定されている */
export function requireLoadPageUrl(url: string, label: string, failHint: string): MissionCheck {
  return {
    id: 'loadpage-url',
    label,
    failHint,
    test: (ctx) =>
      ctx.robot.steps.some((s) => s.enabled && s.action?.type === 'LoadPage' && s.action.url === url),
  }
}

/** 指定の変数・属性へ抽出するステップがある */
export function requireExtractInto(
  variable: string,
  attribute: string,
  label: string,
  failHint: string,
): MissionCheck {
  return {
    id: `extract-${variable}-${attribute}`,
    label,
    failHint,
    test: (ctx) =>
      ctx.robot.steps.some(
        (s) =>
          s.enabled &&
          s.action?.type === 'ExtractText' &&
          s.action.toVariable === variable &&
          s.action.toAttribute === attribute,
      ),
  }
}

/** 「要素の繰り返し」（ループ）がある */
export function requireForEach(label: string, failHint: string): MissionCheck {
  return { id: 'foreach', label, failHint, test: (ctx) => hasAction(ctx, 'ForEach') }
}

/** 指定の変数を持っている */
export function requireVariable(variable: string, label: string, failHint: string): MissionCheck {
  return {
    id: `var-${variable}`,
    label,
    failHint,
    test: (ctx) => ctx.robot.variables.some((v) => v.name === variable),
  }
}

/** 指定タイプを持っている */
export function requireType(typeName: string, label: string, failHint: string): MissionCheck {
  return {
    id: `type-${typeName}`,
    label,
    failHint,
    test: (ctx) => ctx.robot.types.some((t) => t.name === typeName),
  }
}

/** 実行結果として、指定変数に min 件以上のレコードが取れている */
export function requireRecordCount(variable: string, min: number, label: string, failHint: string): MissionCheck {
  return {
    id: `count-${variable}-${min}`,
    label,
    failHint,
    test: (ctx) => (ctx.sim.data[variable]?.length ?? 0) >= min,
  }
}

/** 実行結果のレコードが、指定属性をすべて埋めている（少なくとも先頭行で） */
export function requireAttributesFilled(
  variable: string,
  attributes: string[],
  label: string,
  failHint: string,
): MissionCheck {
  return {
    id: `attrs-${variable}`,
    label,
    failHint,
    test: (ctx) => {
      const recs = ctx.sim.data[variable] ?? []
      if (recs.length === 0) return false
      return recs.every((r) => attributes.every((a) => (r[a] ?? '').trim() !== ''))
    },
  }
}

/** 実行時にエラーが無い */
export function requireNoErrors(label: string, failHint: string): MissionCheck {
  return { id: 'no-errors', label, failHint, test: (ctx) => ctx.sim.ran && ctx.sim.errors.length === 0 }
}

// ---- 構造ベース（名前非依存）の寛容な check ビルダー -------------------
// タイプ名・属性名・変数名の「完全一致」を要求せず、構造が正しければ合格にする。

/** minAttrs 個以上の属性を持つ複合型が存在する */
export function requireComplexType(minAttrs: number, label: string, failHint: string): MissionCheck {
  return {
    id: `complex-type-${minAttrs}`,
    label,
    failHint,
    test: (ctx) => ctx.robot.types.some((t) => t.kind === 'complex' && t.attributes.length >= minAttrs),
  }
}

/** 複合型（属性 1 つ以上）の変数が存在する */
export function requireVariableOfComplexType(label: string, failHint: string): MissionCheck {
  return {
    id: 'var-of-complex',
    label,
    failHint,
    test: (ctx) =>
      ctx.robot.variables.some((v) => {
        const t = ctx.robot.types.find((tt) => tt.name === v.typeName)
        return !!t && t.kind === 'complex' && t.attributes.length > 0
      }),
  }
}

/** 設定の揃った抽出ステップ（対象・変数・属性すべて設定済み）が min 個以上 */
export function requireExtractCount(min: number, label: string, failHint: string): MissionCheck {
  return {
    id: `extract-count-${min}`,
    label,
    failHint,
    test: (ctx) =>
      ctx.robot.steps.filter(
        (s) =>
          s.enabled &&
          s.action?.type === 'ExtractText' &&
          s.action.targetId !== '' &&
          s.action.toVariable !== '' &&
          s.action.toAttribute !== '',
      ).length >= min,
  }
}

/** いずれかの変数に min 件以上のレコードが取れている（変数名不問） */
export function requireAnyRecordCount(min: number, label: string, failHint: string): MissionCheck {
  return {
    id: `any-count-${min}`,
    label,
    failHint,
    test: (ctx) => Object.values(ctx.sim.data).some((recs) => recs.length >= min),
  }
}

/** min 件以上のレコードを持つ変数があり、その各レコードが minAttrs 個以上の属性を埋めている */
export function requireRecordsFilled(minAttrs: number, min: number, label: string, failHint: string): MissionCheck {
  return {
    id: `records-filled-${minAttrs}-${min}`,
    label,
    failHint,
    test: (ctx) =>
      Object.values(ctx.sim.data).some(
        (recs) =>
          recs.length >= min &&
          recs.every((r) => Object.values(r).filter((v) => (v ?? '').trim() !== '').length >= minAttrs),
      ),
  }
}

/** 値判定（TestValue）ステップが存在し、条件値に value を含む（条件で仕分けたか） */
export function requireTestValue(value: string, label: string, failHint: string): MissionCheck {
  return {
    id: `testvalue-${value}`,
    label,
    failHint,
    test: (ctx) =>
      ctx.robot.steps.some(
        (s) =>
          s.enabled &&
          s.action?.type === 'TestValue' &&
          s.action.toAttribute !== '' &&
          (s.action.op === 'equals' || s.action.op === 'contains') &&
          s.action.value.includes(value),
      ),
  }
}

/** 指定の役割（input/output）の変数が存在する */
export function requireVariableRole(role: 'input' | 'output', label: string, failHint: string): MissionCheck {
  return { id: `var-role-${role}`, label, failHint, test: (ctx) => ctx.robot.variables.some((v) => v.role === role) }
}

/** 入力変数を使う「テキストを入力」ステップがある（入力変数の値をページに渡している） */
export function requireUsesInput(label: string, failHint: string): MissionCheck {
  return {
    id: 'uses-input',
    label,
    failHint,
    test: (ctx) =>
      ctx.robot.steps.some((s) => {
        const a = s.action
        if (!s.enabled || a?.type !== 'EnterText' || !a.fromVariable) return false
        return ctx.robot.variables.find((v) => v.name === a.fromVariable)?.role === 'input'
      }),
  }
}

/** 出力変数を返す「値を返す」ステップがある */
export function requireReturnsOutput(label: string, failHint: string): MissionCheck {
  return {
    id: 'returns-output',
    label,
    failHint,
    test: (ctx) =>
      ctx.robot.steps.some((s) => {
        const a = s.action
        if (!s.enabled || a?.type !== 'ReturnValue' || !a.variableName) return false
        return ctx.robot.variables.find((v) => v.name === a.variableName)?.role === 'output'
      }),
  }
}

/** 指定役割の変数に min 件以上のレコードが取れている */
export function requireRoleRecordCount(role: 'input' | 'output', min: number, label: string, failHint: string): MissionCheck {
  return {
    id: `role-count-${role}-${min}`,
    label,
    failHint,
    test: (ctx) =>
      ctx.robot.variables.filter((v) => v.role === role).some((v) => (ctx.sim.data[v.name]?.length ?? 0) >= min),
  }
}

/** 実行後、最も件数の多い変数のレコード数がちょうど n 件（＝正しく絞り込めた） */
export function requireMaxRecordCountEquals(n: number, label: string, failHint: string): MissionCheck {
  return {
    id: `max-count-eq-${n}`,
    label,
    failHint,
    test: (ctx) => {
      let max = 0
      for (const recs of Object.values(ctx.sim.data)) if (recs.length > max) max = recs.length
      return max === n
    },
  }
}
