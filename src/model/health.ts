// ============================================================
// ロボット健康度 — 「健康なロボットのための10か条」に基づく診断型
// （旧 6 軸スコアを置換。旧コードは git 履歴で保全）
// ============================================================

/** 診断結果のステータス */
export type HealthStatus = 'good' | 'improve'

/** 1 つの条に対する診断結果 */
export interface HealthFinding {
  /** 条の ID（'rule-1' 〜 'rule-10'） */
  ruleId: string
  /** 条の番号（1〜10） */
  ruleNumber: number
  /** 判定結果 */
  status: HealthStatus
  /** プレイヤー向けメッセージ（前向きなトーン） */
  message: string
}

/** 10 か条の 1 つ（定義データ側で使う） */
export interface HealthRule {
  /** 条の ID（'rule-1' 〜 'rule-10'） */
  id: string
  /** 条の番号（1〜10） */
  number: number
  /** タイトル（例: 「ロボットのサイズはコンパクトに保つこと」） */
  title: string
  /** 短い解説（PDF の括弧内を自分の言葉で簡潔に） */
  description: string
  /** 自動診断可能か */
  diagnosable: boolean
}
