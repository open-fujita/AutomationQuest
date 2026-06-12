// ============================================================
// DAS ロボットモデル — 緑ロボット（Robot / Desktop Automation）の型定義
//
// 青ロボット（robot.ts）とは実行モデルが根本的に異なるため独立型として定義する。
// 「前方移動のみ」「ガードチョイス並行監視」「For Each スコープ＋相対セレクタ」
// を型レベルで正確に表現する。
// ============================================================

import type { Variable, TypeDef } from './robot'

// ---- DasFinder（ファインダー4階層）-----------------------------

/** ファインダー4階層の種別（公式: デバイス/アプリケーション/コンポーネント/イメージ） */
export type DasFinderKind = 'device' | 'application' | 'component' | 'image'

/** 緑ロボットのファインダー（CSS 風セレクタ＋再利用指定） */
export interface DasFinder {
  kind: DasFinderKind
  /**
   * コンポーネントセレクタ（CSS 風: 'button[name="OK"]' 等）。
   * 演算子: ^= 前方一致 / $= 後方一致 / *= 部分一致 / :nth-child(n) / E > F（子）
   * 座標固定の模擬: '[x="120"][y="48"]' 形式（D5 失敗体験用）
   */
  selector: string
  /**
   * 再利用方式:
   *  'none'   = 独立（コピー＆ペーストに相当）
   *  'prev'   = 「(直前の)ファインダーを参照」
   *  'named'  = 名前付きファインダー（aliasName を使う）
   */
  reuse: 'none' | 'prev' | 'named'
  /** reuse='named' のときのエイリアス名 */
  aliasName?: string
  /**
   * スコープファインダー名（For Each の "elementFinder の起点" を指す名前）。
   * elementFinder で相対セレクタ（例: '> DIV'）を使うとき、起点 Widget を特定するために使う。
   */
  scopeRef?: string
}

// ---- Guard（ガード7種）-----------------------------------------

/**
 * ガード種別（公式用語準拠）。
 * ガードチョイスでは複数ガードが「並行監視」され、最初に成立したガードの枝のみが排他実行される。
 */
export type GuardType =
  | 'timeout'              // 時間経過（Timeout）既定 60 秒
  | 'locationFound'        // 該当するロケーション（Location Found）
  | 'locationNotFound'     // 該当しないロケーション（Location Not Found）
  | 'locationRemoved'      // 取り除かれたロケーション（Location Removed）
  | 'applicationFound'     // 該当するアプリケーション（Application Found）
  | 'applicationNotFound'  // 該当しないアプリケーション（Application Not Found）
  | 'treeStoppedChanging'  // ツリーの変更停止（Tree Stopped Changing）

export interface Guard {
  /** ガード種別（公式用語準拠） */
  type: GuardType
  /** Location/Application 系はファインダー必須 */
  finder?: DasFinder
  /**
   * 時間経過（timeout）の秒数（既定 60）。
   * ツリーの変更停止（treeStoppedChanging）はミリ秒（ms フィールドを使う）。
   */
  seconds?: number
  /** treeStoppedChanging の静止判定ミリ秒 */
  ms?: number
  /** このガードが成立したときに実行する子ステップ列 */
  steps: DasStep[]
}

// ---- DasAction（DAS ステップアクション）-----------------------

export type DasAction =
  | { type: 'OpenWindow'; windowTitle: string; appName: string }
  | {
      type: 'Click'
      finder: DasFinder
      clickCount?: 1 | 2
      button?: 'left' | 'right' | 'middle'
    }
  | {
      type: 'ExtractValue'
      finder: DasFinder
      toVariable: string
      attribute: string
    }
  | {
      type: 'EnterText'
      finder: DasFinder
      text: string
      fromVariable?: string
      fromAttribute?: string
    }
  | {
      type: 'GuardedChoice'
      guards: Guard[]
    }
  | {
      type: 'ForEach'
      /** スコープファインダー（For Each の起点ノード。一意の名前必須） */
      scopeFinder: DasFinder
      scopeFinderName: string
      /** エレメントファインダー（scopeRef + 相対セレクタ。例: '> DIV'） */
      elementFinder: DasFinder
      body: DasStep[]
    }
  | { type: 'Loop'; body: DasStep[] }
  | { type: 'Break' }
  | { type: 'Continue' }
  | {
      type: 'Condition'
      /** 分岐リスト。最初に true の分岐のみ実行（他はスキップ） */
      branches: { condition: string; steps: DasStep[] }[]
    }
  | { type: 'Group'; name: string; steps: DasStep[] }

export type DasActionType = DasAction['type']

// ---- DasStep（緑ロボットの 1 ステップ）-----------------------

export interface DasStep {
  id: string
  name: string
  action: DasAction
  enabled: boolean
}

// ---- DasSuggestedConfig（推奨ステップ構成・UI ガイド用）------

export interface DasSuggestedConfig {
  /** 推奨の DasAction 型シーケンス（UI でハイライト表示） */
  actionSequence: DasActionType[]
  /** 推奨のガード種別（GuardedChoice を含む場合） */
  requiredGuards?: GuardType[]
  /** ガイドメッセージ */
  hint: string
}

// ---- DasRobot（緑ロボット全体）-------------------------------

export interface DasRobot {
  name: string
  /** トップレベルのステップ列（子ステップは action 内にネスト） */
  steps: DasStep[]
  /** 変数（青ロボットと同形式を再利用） */
  variables: Variable[]
  /** タイプ（青ロボットと同形式を再利用） */
  types: TypeDef[]
}

// ---- ヘルパー定数 ----------------------------------------------

/** DasAction 種別ごとの日本語ラベル（公式用語準拠） */
export const DAS_ACTION_LABELS: Record<DasActionType, string> = {
  OpenWindow: 'ウィンドウを開く',
  Click: 'クリック',
  ExtractValue: '値を抽出',
  EnterText: 'テキストを入力',
  GuardedChoice: 'ガードチョイス',
  ForEach: 'For Each（要素の繰り返し）',
  Loop: 'Loop（繰り返し）',
  Break: 'Break（ループ終了）',
  Continue: 'Continue（次の反復へ）',
  Condition: '条件',
  Group: 'グループ',
}

/** ガード種別ごとの日本語ラベル（公式用語準拠） */
export const GUARD_TYPE_LABELS: Record<GuardType, string> = {
  timeout: '時間経過（Timeout）',
  locationFound: '該当するロケーション（Location Found）',
  locationNotFound: '該当しないロケーション（Location Not Found）',
  locationRemoved: '取り除かれたロケーション（Location Removed）',
  applicationFound: '該当するアプリケーション（Application Found）',
  applicationNotFound: '該当しないアプリケーション（Application Not Found）',
  treeStoppedChanging: 'ツリーの変更停止（Tree Stopped Changing）',
}

/** 安定 ID 生成（Math.random を使わない） */
let _dasIdCounter = 0
export function nextDasStepId(): string {
  _dasIdCounter += 1
  return `das-step-${_dasIdCounter}`
}

/** 新しい空の緑ロボットを生成 */
export function createEmptyDasRobot(name: string): DasRobot {
  return { name, steps: [], variables: [], types: [] }
}
