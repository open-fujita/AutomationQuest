// ============================================================
// ミッション定義モデル — データ駆動。M3〜M7 はファイル追加で増やせる。
// ============================================================

import type { Robot } from './robot'
import type { MockSite } from './site'
import type { SimResult } from './sim'

/** 観察 → 見立てクイズの 1 問 */
export interface DeductionQuestion {
  id: string
  /** 自動化思考を引き出す問い */
  question: string
  options: string[]
  correctIndex: number
  /** 正解時に明かす自動化の気づき（どの DS 機能につながるか） */
  insight: string
}

export interface MissionCheckCtx {
  robot: Robot
  sim: SimResult
}

/** 受け入れ条件 1 件 */
export interface MissionCheck {
  id: string
  /** 受け入れ条件の説明（達成すべきこと） */
  label: string
  test: (ctx: MissionCheckCtx) => boolean
  /** 未達時の指摘（プレイヤーへのヒント） */
  failHint: string
}

export interface Mission {
  id: string
  index: number
  title: string
  /** 依頼者（部署担当者） */
  client: { name: string; dept: string; portrait?: string }
  /** 依頼文（相談票） */
  briefing: string
  /** 手作業の所要時間（分/回・効果測定用） */
  manualMinutes: number
  /** ロボット実行の所要秒数（演出用） */
  robotSeconds: number
  /** 観察 → 見立てクイズ */
  deductions: DeductionQuestion[]
  /** プレイヤーに見せる目標 */
  goals: string[]
  /** このミッションで使う模擬サイト */
  site: MockSite
  /** 初期ロボット状態を作る（タイプ・変数のシードなど） */
  seed?: (robot: Robot) => void
  /**
   * 初心者向けの推奨構成（タイプ名・属性名・変数名の指定）。
   * 指定があると DataStatePane が案内＋ワンクリック作成＋入力欄プリフィルを行う。
   * 受け入れ条件は構造ベースなので、別名で作っても合格はする（あくまで指針）。
   */
  suggested?: { typeName: string; attributes: string[]; variableName: string; variableRole?: 'input' | 'output' }
  /**
   * 呼び出し元から渡される入力値（入力変数のシミュレーション）。
   * varName → { 属性: 値 }。実行時にその変数へ初期セットされる。
   */
  inputs?: Record<string, Record<string, string>>
  /** 受け入れ条件 */
  checks: MissionCheck[]
  /** クリア時に明かす気づき／成果（実行結果から動的生成可） */
  reveal: (sim: SimResult) => string
  /** このミッションで解禁される用語集キー */
  glossary: string[]
}
