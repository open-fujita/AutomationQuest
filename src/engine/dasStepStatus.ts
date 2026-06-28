// ============================================================
// DAS ステップの設定不備判定（ロボットビューの警告バッジ相当）。
// 実機 DS の「黄色い警告バッジ」を DAS 版で再現する。
// stepStatus.ts の設計思想を DAS ステップ構造に合わせて踏襲。
//
// 2026.1 リワーク:
//   ・OpenWindow case を Browser / Windows に分割
//   ・Return / Throw / Assign / TryCatch / WhileLoop の case 追加
// ============================================================

import type { DasStep, DasAction } from '../model/dasRobot'

export const DAS_ANON_STEP_NAME = '(名前がありません)'

/** DAS ステップの表示名（空なら「(名前がありません)」） */
export function dasDisplayName(step: DasStep): string {
  return step.name.trim() === '' ? DAS_ANON_STEP_NAME : step.name
}

/** DAS ステップの名前が無いか */
export function dasIsAnonymous(step: DasStep): boolean {
  return step.name.trim() === ''
}

/**
 * DAS ステップの設定不備を返す（無ければ null）。
 * 各 DasAction 種別ごとの未設定項目を検出する。
 */
export function dasStepIssue(step: DasStep): string | null {
  return checkAction(step.action)
}

function checkAction(action: DasAction): string | null {
  switch (action.type) {
    case 'Windows':
      if (!action.executable.trim()) return '実行可能ファイル（executable）が未設定です'
      return null

    case 'Browser':
      if (!action.applicationName.trim() && !action.url.trim()) return 'アプリケーション名または URL が未設定です'
      return null

    case 'Click':
      if (!action.finder.selector.trim()) return 'クリック対象が未設定です'
      return null

    case 'ExtractValue':
      if (!action.finder.selector.trim()) return '抽出対象のセレクタが未設定です'
      if (!action.toVariable.trim()) return '格納先の変数が未設定です'
      if (!action.attribute.trim()) return '格納先の属性が未設定です'
      return null

    case 'EnterText':
      if (!action.finder.selector.trim()) return '入力対象が未設定です'
      if (!action.fromVariable && !action.text.trim()) return '入力するテキストが未設定です'
      return null

    case 'GuardedChoice':
      if (action.guards.length === 0) return 'ガードが未設定です'
      // 各ガードの設定を確認
      for (const guard of action.guards) {
        if (
          (guard.type === 'locationFound' ||
            guard.type === 'locationNotFound' ||
            guard.type === 'locationRemoved' ||
            guard.type === 'applicationFound' ||
            guard.type === 'applicationNotFound') &&
          !guard.finder?.selector.trim()
        ) {
          return `「${guard.type}」ガードのファインダーが未設定です`
        }
      }
      return null

    case 'ForEach':
      if (!action.scopeFinder.selector.trim()) return 'スコープファインダーが未設定です'
      if (!action.scopeFinderName.trim()) return 'スコープファインダー名が未設定です'
      if (!action.elementFinder.selector.trim()) return 'エレメントファインダーが未設定です'
      if (action.body.length === 0) return '要素の繰り返しの本体（body）が空です'
      // 再帰的に body ステップも確認
      for (const bodyStep of action.body) {
        const issue = dasStepIssue(bodyStep)
        if (issue) return `要素の繰り返し内の「${bodyStep.name || DAS_ANON_STEP_NAME}」: ${issue}`
      }
      return null

    case 'Loop':
      if (action.body.length === 0) return 'ループの本体（body）が空です'
      return null

    case 'Break':
    case 'Continue':
    case 'Return':
      return null

    case 'Throw':
      if (!action.exception.trim()) return '例外種別が未設定です'
      return null

    case 'Assign':
      if (!action.variable.trim()) return '割り当て先の変数が未設定です'
      if (!action.expression.trim()) return '式（expression）が未設定です'
      return null

    case 'Condition':
      if (action.branches.length === 0) return '条件分岐が未設定です'
      return null

    case 'Group':
      if (!action.name.trim()) return 'グループ名が未設定です'
      return null

    case 'TryCatch':
      if (action.trySteps.length === 0) return 'Try ブロックが空です'
      return null

    case 'WhileLoop':
      if (!action.condition.trim()) return 'ループ条件が未設定です'
      if (action.body.length === 0) return '条件付きループの本体（body）が空です'
      return null

    default:
      return null
  }
}
