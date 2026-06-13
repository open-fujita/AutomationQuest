// ============================================================
// ステップの表示名・設定不備の判定（ロボットビューの警告バッジ／
// プロパティの注意表示に使う）。実機 DS の「(名前がありません)」「黄色警告」を再現。
// ============================================================

import type { RobotStep } from '../model/robot'

export const ANON_STEP_NAME = '(名前がありません)'

/** ステップの表示名（空なら「(名前がありません)」） */
export function displayName(step: RobotStep): string {
  return step.name.trim() === '' ? ANON_STEP_NAME : step.name
}

/** 名前が無いか */
export function isAnonymous(step: RobotStep): boolean {
  return step.name.trim() === ''
}

/**
 * ステップの設定不備を返す（無ければ null）。
 * 実機 DS の「黄色い警告バッジ」に相当する未設定検出。
 */
export function stepIssue(step: RobotStep): string | null {
  const a = step.action
  if (step.kind === 'start' || step.kind === 'end' || step.kind === 'branch') return null
  if (!a) return 'アクションが未設定です'
  switch (a.type) {
    case 'LoadPage':
      return a.url.trim() === '' ? 'URL が未設定です' : null
    case 'ExtractText':
    case 'ExtractURL':
      if (!a.targetId) return '抽出対象が未設定です（ブラウザビューで右クリック→抽出）'
      if (!a.toVariable) return '格納先の変数が未設定です'
      if (!a.toAttribute) return '格納先の属性が未設定です'
      return null
    case 'ForEach':
      return a.targetId ? null : '繰り返す対象が未設定です'
    case 'TestValue':
      if (!a.toVariable) return '判定する変数が未設定です'
      if (!a.toAttribute) return '判定する属性が未設定です'
      return null
    case 'Click':
      return a.targetId ? null : 'クリック対象が未設定です'
    case 'EnterText':
      if (!a.targetId) return '入力対象が未設定です'
      return null
    case 'SaveFile':
      return a.fileName.trim() === '' ? '保存ファイル名が未設定です' : null
    case 'ReturnValue':
      return a.variableName ? null : '返す変数が未設定です'
    case 'CallRobot':
      return a.robotName.trim() === '' ? '呼び出すロボットが未設定です' : null
  }
}
