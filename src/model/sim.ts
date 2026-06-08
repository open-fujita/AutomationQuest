// ============================================================
// シミュレーション実行結果の型
// ============================================================

/** 抽出された 1 レコード（属性名 → 値） */
export type SimRecord = Record<string, string>

export interface SimLogEntry {
  stepId: string
  stepName: string
  status: 'ok' | 'skip' | 'error'
  message: string
}

export interface SimResult {
  /** 実行されたか（[実行] が押されたか） */
  ran: boolean
  /** 変数名 → 抽出レコード列（「データの状態」に表示） */
  data: Record<string, SimRecord[]>
  /** 実行ログ（ステータスビューに表示） */
  log: SimLogEntry[]
  /** 致命的エラー（赤表示） */
  errors: string[]
  /** 呼び出し元へ返した出力変数名（ReturnValue で記録） */
  returned: string[]
}

export const EMPTY_SIM: SimResult = { ran: false, data: {}, log: [], errors: [], returned: [] }
