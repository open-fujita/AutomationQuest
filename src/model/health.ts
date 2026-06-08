// ============================================================
// ロボット健康度スコア（6 軸）
// bizrobo-analyzer-byDevin/scripts/SCHEMA.md・weights.json に準拠。
// 初版（M1・M2）では型と表示枠のみ用意し、判定ロジックは M7 で拡張する。
// ============================================================

export type ScoreAxis =
  | 'security' // セキュリティ
  | 'maintainability' // 保守性
  | 'robustness' // 堅牢性
  | 'compatibility' // 互換性
  | 'dependency' // 依存健全性
  | 'scale' // 規模

export const AXIS_LABELS: Record<ScoreAxis, string> = {
  security: 'セキュリティ',
  maintainability: '保守性',
  robustness: '堅牢性',
  compatibility: '互換性',
  dependency: '依存健全性',
  scale: '規模',
}

/** 各軸の重み（weights.json と一致） */
export const AXIS_WEIGHTS: Record<ScoreAxis, number> = {
  security: 0.25,
  maintainability: 0.15,
  robustness: 0.2,
  compatibility: 0.2,
  dependency: 0.1,
  scale: 0.1,
}

export interface AxisScore {
  score: number
  weight: number
  deductions: string[]
}

export interface HealthScore {
  overall: number
  axes: Record<ScoreAxis, AxisScore>
}

export type HealthGrade = 'A' | 'B' | 'C' | 'D'

/** スコア → A〜D 判定（SCHEMA.md の基準） */
export function gradeOf(score: number): HealthGrade {
  if (score >= 80) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

export const GRADE_MEANING: Record<HealthGrade, string> = {
  A: '健全（問題なし）',
  B: '要注意（中優先問題に対応推奨）',
  C: '要改善（近期対応が必要）',
  D: '要緊急対応（リスクが高い）',
}
