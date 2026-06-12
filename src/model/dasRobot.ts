// ============================================================
// DAS ロボットモデル — 緑ロボット（Robot / Desktop Automation）の型定義
//
// 青ロボット（robot.ts）とは実行モデルが根本的に異なるため独立型として定義する。
// 「前方移動のみ」「ガードチョイス並行監視」「For Each スコープ＋相対セレクタ」
// を型レベルで正確に表現する。
//
// 2026.1 準拠リワーク:
//   - OpenWindow 廃止 → Browser / Windows に分離
//   - Return / Throw / Assign / TryCatch / WhileLoop 追加
//   - DasFinder に 2026.1 フォーム項目追加（alias / baseFinder / device / application / textMatch）
//   - DAS_STEP_CATALOG 定数追加（12 カテゴリ、約 70 エントリ）
//   - DAS_ACTION_LABELS 更新（2026.1 正式名称）
//   - GUARD_TYPE_DROPDOWN_LABELS 追加（UI ドロップダウン表示用）
// ============================================================

import type { Variable, TypeDef } from './robot'

// ---- DasFinder（ファインダー4階層）-----------------------------

/** ファインダー4階層の種別（公式: デバイス/アプリケーション/コンポーネント/イメージ） */
export type DasFinderKind = 'device' | 'application' | 'component' | 'image'

/** 緑ロボットのファインダー（CSS 風セレクタ＋再利用指定）
 *
 * 2026.1 コンポーネントファインダーフォーム準拠:
 *   エイリアス / ベース ファインダー / デバイス / アプリケーション / コンポーネント（セレクタ）/ □テキスト一致 (Regex)
 */
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

  // ---- 2026.1 追加フィールド（コンポーネントファインダーフォーム準拠） ----
  /** エイリアス（ファインダーの表示名） */
  alias?: string
  /** ベース ファインダー（'デバイスを再利用' 等） */
  baseFinder?: string
  /** デバイス（'local' 等） */
  device?: string
  /** アプリケーション（'cef' 等） */
  application?: string
  /** テキスト一致チェックボックス */
  textMatch?: boolean
  /** テキスト一致の正規表現文字列 */
  textMatchRegex?: string
  /**
   * □内部コンポーネント チェックボックス（実機 UI 2026.1 準拠）。
   * シミュレータはセレクタベースのまま。UI 表示用フィールド。
   */
  innerComponent?: boolean
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
//
// 2026.1 リワーク:
//   - OpenWindow 廃止
//   - Browser（ブラウザ: ページ読込/ページ生成/ダウンロードを待機）追加
//   - Windows（デスクトップアプリ起動: 実行）追加
//   - Return / Throw / Assign / TryCatch / WhileLoop 追加
//     （Throw/Return のみ実行実装あり。他は disabled ステップとして UI 表示のみ）

export type DasAction =
  | {
      type: 'Browser'
      /** ブラウザ種別（ゲームでは 'Chromium' 固定） */
      browser: 'Chromium'
      /**
       * アクション:
       *   pageLoad      = ページ読込
       *   pageCreate    = ページ生成
       *   waitDownload  = ダウンロードを待機
       */
      browserAction: 'pageLoad' | 'pageCreate' | 'waitDownload'
      applicationName: string
      url: string
      timeout?: number
    }
  | {
      type: 'Windows'
      /** デバイス（'local' 等） */
      device: string
      /** アクション（ゲームでは 'execute' = 実行 固定） */
      windowsAction: 'execute'
      /** 実行可能ファイルパス or プロセス名 */
      executable: string
      /** 作業ディレクトリ */
      workingDir?: string
      /** コマンドライン引数 */
      args?: string
      /** 最大化を開始 */
      startMaximized?: boolean
    }
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
  | { type: 'Return' }
  | {
      /** スロー: 例外を明示的に送出する（TimeOutError 等） */
      type: 'Throw'
      /** 例外種別（例: 'TimeOutError'） */
      exception: string
    }
  | {
      /** 割り当て: 変数への代入（シミュレータ未実装、UI 表示のみ） */
      type: 'Assign'
      variable: string
      expression: string
    }
  | {
      /** トライ-キャッチ（シミュレータ未実装、UI 表示のみ） */
      type: 'TryCatch'
      trySteps: DasStep[]
      catches: { exception: string; steps: DasStep[] }[]
      finallySteps: DasStep[]
    }
  | {
      /** 条件付きループ（シミュレータ未実装、UI 表示のみ） */
      type: 'WhileLoop'
      condition: string
      body: DasStep[]
    }

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

/**
 * DasAction 種別ごとの日本語ラベル（2026.1 公式用語準拠）。
 *
 * 公式名称の注意点:
 *   - GuardedChoice: 「ガード チョイス」（半角スペース入り）
 *   - ForEach: 「要素の繰り返し」（2026.1 正式名）
 *   - Browser: 「ブラウザ」
 *   - Windows: 「Windows」
 */
export const DAS_ACTION_LABELS: Record<DasActionType, string> = {
  Browser: 'ブラウザ',
  Windows: 'Windows',
  Click: 'クリック',
  ExtractValue: '値を抽出',
  EnterText: 'テキストを入力',
  GuardedChoice: 'ガード チョイス',
  ForEach: '要素の繰り返し',
  Loop: 'ループ',
  Break: 'ブレイク',
  Continue: 'コンテニュー',
  Condition: '条件',
  Group: 'グループ',
  Return: 'リターン',
  Throw: 'スロー',
  Assign: '割り当て',
  TryCatch: 'トライ-キャッチ',
  WhileLoop: '条件付きループ',
}

/** ガード種別ごとの日本語ラベル（公式用語準拠・フル名称） */
export const GUARD_TYPE_LABELS: Record<GuardType, string> = {
  timeout: '時間経過（Timeout）',
  locationFound: '該当するロケーション（Location Found）',
  locationNotFound: '該当しないロケーション（Location Not Found）',
  locationRemoved: '取り除かれたロケーション（Location Removed）',
  applicationFound: '該当するアプリケーション（Application Found）',
  applicationNotFound: '該当しないアプリケーション（Application Not Found）',
  treeStoppedChanging: 'ツリーの変更停止（Tree Stopped Changing）',
}

/**
 * ガード種別ドロップダウンの表示文字列（実機 UI 2026.1 準拠）。
 * 実機スクリーンショット（DS_3_guardedchoice_real.png）の正式表記に統一。
 */
export const GUARD_TYPE_DROPDOWN_LABELS: Record<GuardType, string> = {
  timeout: '時間経過',
  locationFound: '該当するロケーション',
  locationNotFound: '該当しないロケーション',
  locationRemoved: '取り除かれたロケーション',
  applicationFound: '該当するアプリケーション',
  applicationNotFound: '該当しないアプリケーション',
  treeStoppedChanging: 'ツリーの変更停止',
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

// ---- DAS_STEP_CATALOG（2026.1 c_dassteps.html 全カタログ）-----

/**
 * DAS ステップカタログの 1 エントリ。
 * DasPalette / 挿入メニューで使用する。
 */
export interface DasStepCatalogEntry {
  /** DasActionType（実装済みステップの type。未実装は null） */
  actionType: DasActionType | null
  /** カタログ上の表示名（2026.1 正式名） */
  label: string
  /** ゲーム内で実装済みか（false = disabled 表示: 淡色 ＋「この研修ラボでは未対応」ツールチップ） */
  implemented: boolean
}

/** DAS ステップカタログの 1 カテゴリ */
export interface DasStepCategory {
  name: string
  entries: DasStepCatalogEntry[]
}

/**
 * 2026.1 c_dassteps.html の全カタログ（12 カテゴリ、約 70 エントリ）。
 *
 * implemented: true のステップはパレットで有効、
 * implemented: false のステップは disabled（淡色 ＋「この研修ラボでは未対応」ツールチップ）。
 */
export const DAS_STEP_CATALOG: DasStepCategory[] = [
  {
    name: '割り当てと変換',
    entries: [
      { actionType: 'Assign', label: '割り当て', implemented: false },
      { actionType: null, label: '値の変換', implemented: false },
    ],
  },
  {
    name: '条件と制御',
    entries: [
      { actionType: 'Condition', label: '条件', implemented: true },
      { actionType: 'TryCatch', label: 'トライ-キャッチ', implemented: false },
      { actionType: 'Throw', label: 'スロー', implemented: true },
      { actionType: 'GuardedChoice', label: 'ガード チョイス', implemented: true },
      { actionType: 'Group', label: 'グループ', implemented: true },
      { actionType: 'Return', label: 'リターン', implemented: true },
    ],
  },
  {
    name: 'ループ',
    entries: [
      { actionType: 'Loop', label: 'ループ', implemented: true },
      { actionType: 'WhileLoop', label: '条件付きループ', implemented: false },
      { actionType: 'ForEach', label: '要素の繰り返し', implemented: true },
      { actionType: null, label: 'データベース照会', implemented: false },
      { actionType: null, label: '電子メールごとに', implemented: false },
      { actionType: null, label: 'ディレクトリの反復', implemented: false },
      { actionType: null, label: 'JSON ループ', implemented: false },
      { actionType: 'Break', label: 'ブレイク', implemented: true },
      { actionType: 'Continue', label: 'コンテニュー', implemented: true },
    ],
  },
  {
    name: 'アプリケーション',
    entries: [
      { actionType: 'Browser', label: 'ブラウザ', implemented: true },
      { actionType: 'Windows', label: 'Windows', implemented: true },
      { actionType: null, label: 'Excel', implemented: false },
      { actionType: null, label: 'ターミナル', implemented: false },
      { actionType: null, label: 'ツリー モード', implemented: false },
      { actionType: null, label: 'Document Transformation', implemented: false },
      { actionType: null, label: 'PDF', implemented: false },
      { actionType: null, label: '電子メール', implemented: false },
    ],
  },
  {
    name: 'データベース',
    entries: [
      { actionType: null, label: 'データベース照会', implemented: false },
      { actionType: null, label: 'データベース データ登録', implemented: false },
      { actionType: null, label: 'データベース データ抽出', implemented: false },
      { actionType: null, label: 'データベースから削除', implemented: false },
      { actionType: null, label: 'キーの計算', implemented: false },
      { actionType: null, label: 'SQL 実行', implemented: false },
    ],
  },
  {
    name: 'ファイル システム',
    entries: [
      { actionType: null, label: 'ファイルの読み込み', implemented: false },
      { actionType: null, label: 'ファイル出力', implemented: false },
      { actionType: null, label: 'ファイル システム アクション', implemented: false },
    ],
  },
  {
    name: 'JSON',
    entries: [
      { actionType: null, label: 'JSON オブジェクトを検索', implemented: false },
      { actionType: null, label: 'JSON ループ', implemented: false },
      { actionType: null, label: 'JSON を更新', implemented: false },
      { actionType: null, label: 'JSON の検索', implemented: false },
      { actionType: null, label: 'JSON 配列を並び替える', implemented: false },
    ],
  },
  {
    name: '出力値',
    entries: [
      { actionType: null, label: '出力値', implemented: false },
      { actionType: null, label: 'ファイル出力', implemented: false },
      { actionType: null, label: 'ログ出力', implemented: false },
    ],
  },
  {
    name: '統合',
    entries: [
      { actionType: null, label: 'TotalAgility', implemented: false },
      { actionType: null, label: 'クラウド AI', implemented: false },
      { actionType: null, label: 'カスタム アクション', implemented: false },
    ],
  },
  {
    name: 'リモート デバイス',
    entries: [
      { actionType: null, label: 'デバイスに接続', implemented: false },
      { actionType: null, label: 'デバイスからの切断', implemented: false },
      { actionType: null, label: 'リモート デバイス アクション', implemented: false },
      { actionType: null, label: 'RDP ログイン', implemented: false },
      { actionType: null, label: 'トリガー チョイス', implemented: false },
      { actionType: null, label: '通知', implemented: false },
      { actionType: null, label: 'クリップボードから抽出', implemented: false },
      { actionType: null, label: 'クリップボードへ割り当て', implemented: false },
    ],
  },
  {
    name: '抽出',
    entries: [
      { actionType: null, label: 'ツリーを XML として抽出', implemented: false },
      { actionType: null, label: '画像抽出', implemented: false },
      { actionType: null, label: '画像からテキスト抽出', implemented: false },
      { actionType: 'ExtractValue', label: '値を抽出', implemented: true },
    ],
  },
  {
    name: 'マウスとキーボード',
    entries: [
      { actionType: null, label: 'キープレス', implemented: false },
      { actionType: 'EnterText', label: 'テキストを入力', implemented: true },
      { actionType: null, label: 'マウス プレス', implemented: false },
      { actionType: null, label: 'マウス移動', implemented: false },
      { actionType: null, label: 'スクロール', implemented: false },
      { actionType: 'Click', label: 'クリック', implemented: true },
    ],
  },
  {
    name: 'その他',
    entries: [
      { actionType: null, label: 'ツリーの凍結', implemented: false },
      { actionType: null, label: 'REST Web サービス呼出', implemented: false },
      { actionType: null, label: 'シークレットの検索', implemented: false },
      { actionType: null, label: 'ロボットの呼び出し', implemented: false },
    ],
  },
]
