// ============================================================
// ロボットモデル — BizRobo! Design Studio のロボット構造を踏襲
//
// 命名は bizrobo-analyzer-byDevin/scripts/SCHEMA.md の DTO
// (stepClass / stepType / ActionStep / TryStep / GroupStep 等) に準拠し、
// 将来の本物ロボット・健康度スコアとの整合を保つ。
// ============================================================

/** ステップ種別（ロボットビューでのアイコン形状を決める） */
export type StepKind =
  | 'start' // 開始ステップ
  | 'action' // アクションステップ
  | 'loop' // 要素の繰り返し（ループ）
  | 'test' // 条件（テスト / 値判定）
  | 'try' // トライ-キャッチ（トライステップ）
  | 'branch' // 分岐点（○ BranchPoint）
  | 'end' // 終了ステップ（⊗）

/**
 * ステップアクション（ステップアクション = StepAction）。
 * アクションステップが実際に行う 1 つの処理。
 */
export type StepAction =
  | { type: 'LoadPage'; url: string } // ページを読み込む（LoadPage2）
  | { type: 'ExtractText'; targetId: string; toVariable: string; toAttribute: string } // テキストを抽出（Extract）
  | { type: 'ExtractURL'; targetId: string; toVariable: string; toAttribute: string } // リンク URL を抽出（ExtractURL）
  | { type: 'Click'; targetId: string } // クリック
  | { type: 'EnterText'; targetId: string; text: string; fromVariable?: string; fromAttribute?: string } // テキストを入力（固定文字 or 変数から）
  | { type: 'ForEach'; targetId: string } // 要素の繰り返し（ForEachTag）
  | { type: 'TestValue'; toVariable: string; toAttribute: string; op: 'equals' | 'contains' | 'notEmpty'; value: string } // 値判定（TestTag）
  | { type: 'SaveFile'; fileName: string } // 仕上げ：ファイルに保存（WriteFile）
  | { type: 'ReturnValue'; variableName: string } // 値を返す（出力変数を呼び出し元へ・ReturnVariable）
  /**
   * ロボットを呼び出す（CallRobot）— 実機練習編 practice.ts で使う。
   * 実機 DS の「ロボットを呼び出す」アクションステップに相当。
   * プロパティペイン: アクション=「ロボットを呼び出す ▼」/ ロボット: <name> ▼ ＋「開く」ボタン
   * シミュレータ未実装（UI 表示・練習シェルの props として参照されるのみ）。
   */
  | {
      type: 'CallRobot'
      /** 呼び出す緑ロボット名（例: 'sub'）。「開く」ボタンで対応タブへジャンプする。 */
      robotName: string
    }

export type StepActionType = StepAction['type']

/** ロボットを構成する 1 ステップ */
export interface RobotStep {
  id: string
  kind: StepKind
  /** ステップ名（例: 「ページを読み込む」） */
  name: string
  /** DS 互換のステップクラス名（例: ActionStep / EndStep / LoopStep / TryStep） */
  stepClass: string
  /** kind が action/loop/test のとき、その処理内容 */
  action?: StepAction
  /** 有効化フラグ（DS の「ステップを一時的に無効化」に対応） */
  enabled: boolean
  /** グラフモード（分岐あり）での配置座標。線形モードでは未使用 */
  pos?: { x: number; y: number }
}

/** ステップ間のエッジ（from → to）。分岐点は複数の出力エッジを順に実行する。 */
export interface RobotEdge {
  from: string
  to: string
  /** ブランチのラベル（任意） */
  label?: string
}

/** タイプの属性（複合型が持つ名前付きフィールド） */
export interface TypeAttribute {
  name: string
}

/** タイプ（.type）。抽出データの入れ物・入出力の型。 */
export interface TypeDef {
  name: string
  /** simple = 簡易型 / complex = 複合型 */
  kind: 'simple' | 'complex'
  attributes: TypeAttribute[]
}

/** 変数（必ず 1 つのタイプを持つ） */
export interface Variable {
  name: string
  typeName: string
  /** 役割。input=呼び出し元から受け取る / output=呼び出し元へ返す / 未指定=一時（ローカル） */
  role?: 'input' | 'output'
}

/** ロボット全体（1 つの .robot に相当） */
export interface Robot {
  name: string
  steps: RobotStep[]
  variables: Variable[]
  types: TypeDef[]
  /**
   * 明示エッジ（グラフモード）。存在する場合、フロー＝有向グラフとして
   * 描画・実行される（分岐点・複数 End を表現）。未指定なら steps を線形に連結。
   */
  edges?: RobotEdge[]
}

/** ステップアクション種別ごとの日本語ラベル（パレット・UI 表示用） */
export const ACTION_LABELS: Record<StepActionType, string> = {
  LoadPage: 'ページを読み込む',
  ExtractText: 'テキストを抽出',
  ExtractURL: 'URL を抽出',
  Click: 'クリック',
  EnterText: 'テキストを入力',
  ForEach: '要素の繰り返し',
  TestValue: '値判定',
  SaveFile: '仕上げ（ファイルに保存）',
  ReturnValue: '値を返す',
  CallRobot: 'ロボットを呼び出す',
}

/** ステップアクション種別 → stepAction クラス名（実機 DS 準拠） */
export const ACTION_STEP_CLASS: Record<StepActionType, string> = {
  LoadPage: 'LoadPage2',
  ExtractText: 'Extract',
  ExtractURL: 'ExtractURL',
  Click: 'Click',
  EnterText: 'EnterText',
  ForEach: 'ForEachTag',
  TestValue: 'TestTag',
  SaveFile: 'WriteFile',
  ReturnValue: 'ReturnVariable',
  CallRobot: 'CallRobotStep',
}

/** ステップアクション種別 → ステップ種別（kind） */
export const ACTION_KIND: Record<StepActionType, StepKind> = {
  LoadPage: 'action',
  ExtractText: 'action',
  ExtractURL: 'action',
  Click: 'action',
  EnterText: 'action',
  ForEach: 'loop',
  TestValue: 'test',
  SaveFile: 'action',
  ReturnValue: 'action',
  CallRobot: 'action',
}

let _idCounter = 0
/** 安定した一意 ID を生成（Math.random は使わない） */
export function nextStepId(): string {
  _idCounter += 1
  return `step-${_idCounter}`
}

/** 新しい空ロボットを生成（開始ステップと終了ステップのみ） */
export function createEmptyRobot(name: string): Robot {
  return {
    name,
    steps: [
      { id: 'start', kind: 'start', name: '開始', stepClass: 'BlockBeginStep', enabled: true },
      { id: 'end', kind: 'end', name: '終了', stepClass: 'EndStep', enabled: true },
    ],
    variables: [],
    types: [],
  }
}
