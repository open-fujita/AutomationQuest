// ============================================================
// セットアップミッション（S1）チェックエンジン
//
// SetupState から 6 つの受け入れ条件を判定するビルダー群。
// DasMissionCheck と同形の SetupMissionCheck インターフェイスで
// QuestNavigator に流せる形にする。
//
// 6 チェック:
//   ① DAS のホスト名を設定
//   ② シングルユーザーを有効化
//   ③ トークンを設定（DAS 側）
//   ④ 保存して再起動を実行
//   ⑤ デバイスマッピングを作成（ホスト・ポート・トークン入力済み）
//   ⑥ 接続成功（トークン一致）
// ============================================================

import type { SetupMissionCheck, SetupMissionCheckCtx } from '../model/mission'
import type { SetupState, ConnectionResult } from '../model/setup'

// ---- 公開型 re-export -----------------------------------------

export type { SetupMissionCheck, SetupMissionCheckCtx }

// ---- ビルダーヘルパー ------------------------------------------

function makeCheck(
  id: string,
  label: string,
  test: (ctx: SetupMissionCheckCtx) => boolean,
  failHint: string,
): SetupMissionCheck {
  return { id, label, test, failHint }
}

// ---- 6 チェックビルダー ----------------------------------------

/**
 * ① DAS のホスト名を設定
 * dasDialog.hostName が空でないとき true
 */
export function checkDasHostName(): SetupMissionCheck {
  return makeCheck(
    'setup-hostname',
    'DAS のホスト名を設定した',
    (ctx) => ctx.state.dasDialog.hostName.trim() !== '',
    '「Desktop Automation サービス」ダイアログの「ホスト名」にこのコンピュータのコンピュータ名を入力してください。',
  )
}

/**
 * ② シングルユーザーを有効化
 * dasDialog.singleUserEnabled が true のとき true
 */
export function checkSingleUserEnabled(): SetupMissionCheck {
  return makeCheck(
    'setup-single-user',
    '「シングル ユーザー」を有効にした',
    (ctx) => ctx.state.dasDialog.singleUserEnabled,
    '「Desktop Automation サービス」ダイアログの「☑ シングル ユーザー」チェックボックスをオンにしてください。',
  )
}

/**
 * ③ トークンを設定（DAS 側）
 * dasDialog.token が空でないとき true
 */
export function checkDasToken(): SetupMissionCheck {
  return makeCheck(
    'setup-das-token',
    'DAS 側のトークンを設定した',
    (ctx) => ctx.state.dasDialog.token.trim() !== '',
    '「シングル ユーザー」タブの「トークン」フィールドに任意の名前（例: DA01）を入力してください。',
  )
}

/**
 * ④ 保存して再起動を実行
 * dasDialog.savedAndRestarted が true のとき true
 */
export function checkSavedAndRestarted(): SetupMissionCheck {
  return makeCheck(
    'setup-save-restart',
    '「保存して再起動」を実行した',
    (ctx) => ctx.state.dasDialog.savedAndRestarted,
    'ダイアログ下部の「保存して再起動」ボタンをクリックして設定を反映させてください。',
  )
}

/**
 * ⑤ デバイスマッピングを作成
 * mapping.name / host / token がすべて入力されており、commandPort が 0 でないとき true
 */
export function checkDeviceMappingCreated(): SetupMissionCheck {
  return makeCheck(
    'setup-mapping',
    'DS 側でデバイスマッピングを作成した（ホスト・ポート・トークン入力済み）',
    (ctx) => {
      const m = ctx.state.mapping
      return (
        m.name.trim() !== '' &&
        m.host.trim() !== '' &&
        m.commandPort > 0 &&
        m.token.trim() !== ''
      )
    },
    'Design Studio の「ファイル → 新しいオートメーション デバイス マッピング」からマッピングを作成し、ホスト名・ポート（49998）・トークンをすべて入力してください。',
  )
}

/**
 * ⑥ 接続成功（トークン一致）
 * connectionResult が { ok: true } のとき true
 */
export function checkConnected(): SetupMissionCheck {
  return makeCheck(
    'setup-connected',
    '接続に成功した（デバイスが「利用可能」になった）',
    (ctx) => ctx.state.connectionResult?.ok === true,
    '「接続テスト」を実行してください。DAS 側のトークンと DS 側のトークンが一致していないと接続できません。両方に同じトークンを設定してください。',
  )
}

// ---- デフォルトチェックセット ----------------------------------

/** S1 の全 6 チェックをデフォルト順で返す */
export function buildSetupChecks(): SetupMissionCheck[] {
  return [
    checkDasHostName(),
    checkSingleUserEnabled(),
    checkDasToken(),
    checkSavedAndRestarted(),
    checkDeviceMappingCreated(),
    checkConnected(),
  ]
}

// ---- 接続判定ロジック ------------------------------------------

/**
 * SetupState からトークン一致を判定して ConnectionResult を返す。
 *
 * 失敗理由の優先順:
 *   1. ホスト名未入力 → 'host_empty'
 *   2. 保存して再起動未実行 → 'not_saved'
 *   3. シングルユーザー未有効 → 'single_user_disabled'
 *   4. トークン不一致 → 'token_mismatch'
 */
export function connect(state: SetupState): ConnectionResult {
  const { dasDialog, mapping } = state

  if (dasDialog.hostName.trim() === '' || mapping.host.trim() === '') {
    return { ok: false, reason: 'host_empty' }
  }

  if (!dasDialog.savedAndRestarted) {
    return { ok: false, reason: 'not_saved' }
  }

  if (!dasDialog.singleUserEnabled) {
    return { ok: false, reason: 'single_user_disabled' }
  }

  const dasToken = dasDialog.token.trim()
  const dsToken = mapping.token.trim()

  if (dasToken === '' || dsToken === '' || dasToken !== dsToken) {
    return { ok: false, reason: 'token_mismatch' }
  }

  return { ok: true, reason: null }
}

// ---- バリデーション実行ユーティリティ -------------------------

export interface SetupValidationResult {
  pass: boolean
  outcomes: Array<{ id: string; label: string; pass: boolean; hint: string }>
  firstHint: string | null
}

/**
 * setupChecks 一覧に対して SetupState を評価し ValidationResult を返す。
 * DAS ミッションの validateDasMission と同形。
 */
export function validateSetupMission(
  ctx: SetupMissionCheckCtx,
  checks: SetupMissionCheck[],
): SetupValidationResult {
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
