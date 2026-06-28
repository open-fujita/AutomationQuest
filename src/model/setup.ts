// ============================================================
// セットアップミッション（S1）用の型定義
//
// DAS 接続設定の手順状態を保持する。
// ・DAS 側（Windows タスクトレイ→設定ダイアログ）の入力
// ・DS 側（オートメーションデバイスマッピング）の入力
// ・接続成否
// ============================================================

/** DAS 設定ダイアログで入力した状態 */
export interface DasDialogState {
  /** ホスト名（コンピュータ名 / IP）。空文字は未入力 */
  hostName: string
  /** シングルユーザーモードを有効化したか */
  singleUserEnabled: boolean
  /** シングルユーザータブに入力したトークン。空文字は未入力 */
  token: string
  /** 「保存して再起動」を実行したか */
  savedAndRestarted: boolean
}

/** DS 側のオートメーションデバイスマッピング入力状態 */
export interface DeviceMappingState {
  /** マッピング名（任意文字列）。空文字は未入力 */
  name: string
  /** 接続先ホスト名 / IP。空文字は未入力 */
  host: string
  /** コマンドポート番号。0 は未入力 */
  commandPort: number
  /** DS 側で指定したトークン。DAS 側 token と一致する必要がある */
  token: string
}

/** S1 セットアップミッション全体の状態 */
export interface SetupState {
  /** DAS 設定ダイアログの入力状態 */
  dasDialog: DasDialogState
  /** DS 側のデバイスマッピング入力状態 */
  mapping: DeviceMappingState
  /** 接続結果。null = 未試行 */
  connectionResult: ConnectionResult | null
}

/** 接続試行の結果 */
export interface ConnectionResult {
  ok: boolean
  /** 失敗時の理由。成功時は null */
  reason: ConnectionFailReason | null
}

/** 接続失敗の理由 */
export type ConnectionFailReason =
  | 'token_mismatch'      // DAS 側と DS 側のトークンが一致しない
  | 'host_empty'          // ホスト名が空
  | 'not_saved'           // 保存して再起動が未実行
  | 'single_user_disabled' // シングルユーザー未有効

/** SetupState の初期値 */
export const INITIAL_SETUP_STATE: SetupState = {
  dasDialog: {
    hostName: '',
    singleUserEnabled: false,
    token: '',
    savedAndRestarted: false,
  },
  mapping: {
    name: '',
    host: '',
    commandPort: 49998,
    token: '',
  },
  connectionResult: null,
}
