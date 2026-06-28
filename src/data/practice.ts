// ============================================================
// 実機練習編（アクション別レクチャー）— シードデータ
//
// 画像一次情報: .capture/docs2026/full_BER_real.png / full_Robot_real.png
//
// プロジェクトツリー（左ペイン「マイ プロジェクト」）:
//   Local
//   └ connector
//     ├ DifyConnector  connector
//     ├ info.type
//     ├ main_1  robot
//     └ sub  robot*
//   デモ_薬剤部情報収集業務
//   Design Studio データベース
//   Management Console (localhost)
//   windows_mc (localhost)
//   tmp (mini.bizrobo.com)
//
// main_1.robot: start → [Call sub] → end（「ロボットを呼び出す」アクション）
// sub.robot: 空（ステップなし）— 藤田さん指示で実機のステップ列は再現不要
// info.type: 属性定義（DifyConnector の入出力型）
// ============================================================

import type { Robot, RobotStep } from '../model/robot'
import type { DasRobot } from '../model/dasRobot'
import { createEmptyDasRobot } from '../model/dasRobot'

// ---- プロジェクトツリーノード型 ---------------------------------

/** プロジェクトツリーの 1 ノード種別 */
export type TreeNodeKind =
  | 'project'      // プロジェクト（ルートグループ）
  | 'robot'        // .robot ファイル（青 or 緑）
  | 'type'         // .type ファイル
  | 'connector'    // connector
  | 'server'       // Management Console / RoboServer 接続先
  | 'local'        // Local グループ

export interface PracticeTreeNode {
  id: string
  /** 表示ラベル（画像の文字列に一致させる） */
  label: string
  kind: TreeNodeKind
  /**
   * ファイルタブを開けるノードかどうか。
   * true のとき「ダブルクリック or 右クリック→開く」でファイルタブが追加される。
   */
  openable?: boolean
  /**
   * 開いたときに表示するタブ ID。
   * 'intro'=紹介, 'main1'=main_1.robot, 'sub'=sub.robot, 'infotype'=info.type
   */
  tabId?: PracticeTabId
  children?: PracticeTreeNode[]
  /** アスタリスク表示（変更済みを示す。画像では sub robot* のように表示）*/
  modified?: boolean
}

// ---- ファイルタブ型 -------------------------------------------

/** 練習シェルのファイルタブ ID */
export type PracticeTabId = 'intro' | 'main1' | 'sub' | 'infotype'

export interface PracticeTab {
  id: PracticeTabId
  /** タブに表示するラベル（画像の表記に一致） */
  label: string
  /** タブアイコン（絵文字 or テキスト） */
  icon?: string
  /** 閉じることができるか */
  closable: boolean
}

// ---- info.type の属性定義 ------------------------------------

/**
 * info.type の属性定義（DifyConnector の入出力型）。
 * 実機画像の「info.type」タブで確認できる属性名リスト。
 * 画像からは属性の詳細が読み取れないため、公式 DifyConnector の典型的な構成を参照。
 */
export interface InfoTypeAttribute {
  name: string
  /** 属性のデータ型（DS 型システム準拠: string / integer / boolean 等） */
  typeName: string
  /** 説明（練習編の説明パネル用） */
  description: string
}

export const INFO_TYPE_ATTRIBUTES: InfoTypeAttribute[] = [
  { name: 'query', typeName: 'string', description: 'Dify への入力クエリ文字列' },
  { name: 'response', typeName: 'string', description: 'Dify から返ってくる応答テキスト' },
  { name: 'conversation_id', typeName: 'string', description: '会話セッション ID（複数ターン対応）' },
  { name: 'status', typeName: 'string', description: '実行ステータス（success / error）' },
]

// ---- プロジェクトツリーデータ ---------------------------------

/**
 * 実機練習編で表示するプロジェクトツリー（「マイ プロジェクト」ペイン）。
 * 画像（full_BER_real.png / full_Robot_real.png）の正式ラベルに一致させる。
 */
export const PRACTICE_TREE: PracticeTreeNode[] = [
  {
    id: 'local',
    label: 'Local',
    kind: 'local',
    children: [
      {
        id: 'connector-project',
        label: 'connector',
        kind: 'project',
        children: [
          {
            id: 'difyconnector-connector',
            label: 'DifyConnector',
            kind: 'connector',
            // connector ノードは openable なし（実機でもクリックで展開するだけ）
            children: [],
          },
          {
            id: 'info-type',
            label: 'info.type',
            kind: 'type',
            openable: true,
            tabId: 'infotype',
            children: [],
          },
          {
            id: 'main1-robot',
            label: 'main_1',
            kind: 'robot',
            openable: true,
            tabId: 'main1',
            children: [],
          },
          {
            id: 'sub-robot',
            label: 'sub',
            kind: 'robot',
            openable: true,
            tabId: 'sub',
            modified: true, // 画像では "sub  robot*"（アスタリスク付き）
            children: [],
          },
        ],
      },
      {
        id: 'demo-yakuzaibu',
        label: 'デモ_薬剤部情報収集業務',
        kind: 'project',
        children: [],
      },
      {
        id: 'ds-database',
        label: 'Design Studio データベース',
        kind: 'project',
        children: [],
      },
    ],
  },
  {
    id: 'mc-localhost',
    label: 'Management Console (localhost)',
    kind: 'server',
    children: [],
  },
  {
    id: 'windows-mc-localhost',
    label: 'windows_mc (localhost)',
    kind: 'server',
    children: [],
  },
  {
    id: 'tmp-mini',
    label: 'tmp (mini.bizrobo.com)',
    kind: 'server',
    children: [],
  },
]

// ---- デフォルトのファイルタブ構成 ----------------------------

/**
 * 実機練習編シェルの初期タブ列。
 * 画像: 「🏠紹介 ✕ / sub.robot* ✕ / main_1.robot ✕ / info.type ✕」
 * ※紹介タブは閉じ不可（実機同様）
 */
export const DEFAULT_PRACTICE_TABS: PracticeTab[] = [
  { id: 'intro',    label: '紹介',         icon: '🏠', closable: false },
  { id: 'sub',      label: 'sub.robot',    icon: '',    closable: true },
  { id: 'main1',    label: 'main_1.robot', icon: '',    closable: true },
  { id: 'infotype', label: 'info.type',    icon: '',    closable: true },
]

// ---- main_1.robot シード （青ロボット）-----------------------

/**
 * main_1.robot の初期状態（青ロボット）。
 * 実機画像（full_BER_real.png）の「Call sub」アクションステップを再現。
 *
 * フロー: start → [Call sub] → end
 *   - 「Call sub」= 「ロボットを呼び出す」アクション、ロボット: sub
 *   - プロパティペイン（アクションタブ）: 「ロボットを呼び出す ▼」「ロボット: sub ▼」「開く」ボタン
 */
export function createMain1Robot(): Robot {
  const steps: RobotStep[] = [
    {
      id: 'start',
      kind: 'start',
      name: '開始',
      stepClass: 'BlockBeginStep',
      enabled: true,
    },
    {
      id: 'call-sub',
      kind: 'action',
      name: 'Call sub',
      stepClass: 'CallRobotStep',
      action: {
        type: 'CallRobot',
        robotName: 'sub',
      },
      enabled: true,
    },
    {
      id: 'end',
      kind: 'end',
      name: '終了',
      stepClass: 'EndStep',
      enabled: true,
    },
  ]

  return {
    name: 'main_1',
    steps,
    variables: [],
    types: [],
  }
}

// ---- sub.robot シード（緑ロボット）--------------------------

/**
 * sub.robot の初期状態（緑ロボット・空）。
 * 藤田さん指示: 「ステップ列は再現しなくてよい。空の緑ロボット（ステップなしの初期キャンバス）」
 * プレイヤーが自由にステップを追加できる。
 */
export function createSubRobot(): DasRobot {
  return createEmptyDasRobot('sub')
}

// ---- 実機練習編の初期ロボット状態コンテナ -------------------

/** 実機練習編で管理する 2 つのロボットの初期スナップショット */
export interface PracticeRobots {
  /** main_1.robot（青ロボット）— 「Call sub」ステップを持つ */
  main1: Robot
  /** sub.robot（緑ロボット）— 空キャンバス */
  sub: DasRobot
}

/** 実機練習編のロボット初期状態を生成する */
export function createPracticeRobots(): PracticeRobots {
  return {
    main1: createMain1Robot(),
    sub: createSubRobot(),
  }
}
