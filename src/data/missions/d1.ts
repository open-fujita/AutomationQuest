// D1: はじめての緑ロボット
// 在庫管理システムを模擬アプリとして使い、Windows ステップでアプリ起動→クリック→値を抽出の
// 3ステップを体験する。緑ロボット（Desktop Automation）の基本操作を習得するミッション。
//
// 2026.1 リワーク: OpenWindow → Windows（デスクトップアプリなので Windows ステップを使う）

import type { Mission } from '../../model/mission'
import type { MockApp } from '../../model/mockApp'
import {
  requireWindows,
  requireDasAction,
  requireDasNoErrors,
} from '../../engine/dasValidator'

// 在庫管理システムの模擬アプリ（静的・タイムラインなし）
const MOCK_APP: MockApp = {
  id: 'stock-management',
  windowTitle: '在庫管理システム v2.1',
  widgets: [
    {
      id: 'main-window',
      type: 'window',
      attrs: { title: '在庫管理システム v2.1', name: '在庫管理システム v2.1' },
      visible: true,
      children: [
        // 検索エリア
        {
          id: 'label-code',
          type: 'label',
          attrs: { name: '品目コード', class: 'form-label' },
          text: '品目コード',
          visible: true,
          children: [],
        },
        {
          id: 'input-code',
          type: 'textfield',
          attrs: { name: '品目コード入力', value: 'ITEM-0042', class: 'form-input' },
          text: 'ITEM-0042',
          visible: true,
          enabled: true,
          children: [],
        },
        {
          id: 'btn-search',
          type: 'button',
          attrs: { name: '検索', class: 'btn-primary' },
          text: '検索',
          visible: true,
          enabled: true,
          children: [],
        },
        // 結果エリア
        {
          id: 'label-stock',
          type: 'label',
          attrs: { name: '在庫数', class: 'form-label' },
          text: '在庫数',
          visible: true,
          children: [],
        },
        {
          id: 'input-stock',
          type: 'textfield',
          attrs: { name: '在庫数表示', value: '128', class: 'form-output' },
          text: '128',
          visible: true,
          enabled: false,
          children: [],
        },
        {
          id: 'label-unit',
          type: 'label',
          attrs: { name: '単位', class: 'form-label' },
          text: '個',
          visible: true,
          children: [],
        },
      ],
    },
  ],
  // 静的アプリのためタイムラインなし
  timeline: [],
}

export const D1: Mission = {
  id: 'd1',
  index: 6, // M1〜M5 の次
  title: 'はじめての緑ロボット',
  client: { name: '西村 倉庫管理部', dept: '倉庫管理部', portrait: '/img/portrait-warehouse.png' },
  briefing:
    '在庫管理システムを毎朝開いて、品目コードを入力して検索して、在庫数をメモして……この確認作業、毎日 10 分かけてやっています。Windows アプリなので「青いロボット」ではできないと聞きました。緑のロボットで自動化できますか？',
  manualMinutes: 10,
  robotSeconds: 2,
  deductions: [
    {
      id: 'd1-q1',
      question: 'Windows アプリ（在庫管理システム）を操作するには、どちらのロボットを使う？',
      options: [
        '青ロボット（Basic Engine Robot）— Web ページを操作する',
        '緑ロボット（Robot / Desktop Automation）— Windows アプリを操作する',
        'どちらも同じなので、どちらでもよい',
      ],
      correctIndex: 1,
      insight:
        '緑ロボット（Robot / Desktop Automation）は Windows アプリ・Java アプリ・ターミナルなどを操作します。青ロボットが Web ページ専用なのに対し、緑ロボットはデスクトップアプリが対象です。',
    },
    {
      id: 'd1-q2',
      question: '緑ロボットで Windows アプリを起動するとき、使うステップは？',
      options: [
        'ブラウザ（ブラウザ経由で操作する）',
        'Windows（実行可能ファイルを指定してアプリを起動する）',
        'いきなりクリックや抽出を始める',
      ],
      correctIndex: 1,
      insight:
        '緑ロボットで Windows デスクトップアプリを起動するには「Windows」ステップを使います。実行可能ファイル（アプリ名）を指定してアプリを起動します。Web ブラウザには「ブラウザ」ステップ、デスクトップアプリには「Windows」ステップと使い分けます。',
    },
    {
      id: 'd1-q3',
      question: 'アプリの画面要素（ボタンやテキストフィールド）を操作するとき、要素をどうやって特定する？',
      options: [
        '画面座標（X, Y）で「ここをクリック」と指定する',
        'ファインダー（CSS 風セレクタ）で要素の属性を使って特定する',
        '目で見て確認して手動で操作する',
      ],
      correctIndex: 1,
      insight:
        'ファインダー（CSS 風セレクタ）を使うと、要素の名前や属性で特定できます。例: `button[name="検索"]`。座標指定は画面レイアウトが変わると壊れます。',
    },
  ],
  goals: [
    '「Windows」ステップで在庫管理システム（inventory.exe または在庫管理システム v2.1）を起動する',
    'レコーダービューで「検索」ボタンを右クリック →「クリック」を追加する',
    'レコーダービューで在庫数の入力欄を右クリック →「値を抽出」を追加し、変数に格納する',
    '実行して、在庫数（128）が変数に取り込まれることを確認する',
  ],
  // 模擬デスクトップアプリ定義
  mockApp: MOCK_APP,
  // 緑ロボット用ミッション
  robotType: 'das',
  // DAS 初期状態: 変数「在庫情報」を用意（単純型）
  dasSeed: (robot) => {
    robot.types.push({ name: '在庫情報', kind: 'simple', attributes: [] })
    robot.variables.push({ name: '在庫情報', typeName: '在庫情報' })
  },
  // 推奨ステップ構成ガイド
  dasSuggested: {
    actionSequence: ['Windows', 'Click', 'ExtractValue'],
    hint: 'Windows → クリック → 値を抽出、の 3 ステップが基本形です。Windows ステップで在庫管理システムを起動し、検索ボタンをクリックして、在庫数を値を抽出で取得します。',
  },
  // 受け入れ条件（構造ベース）
  dasChecks: [
    requireWindows(
      '在庫管理システム v2.1',
      '「Windows」ステップで在庫管理システムを起動する',
      '「Windows」ステップを追加し、実行可能ファイルに「在庫管理システム v2.1」を設定してください。',
    ),
    requireDasAction(
      'Click',
      '「クリック」で検索ボタンを操作する',
      'レコーダービューで「検索」ボタンを右クリック →「クリック」を追加してください。',
    ),
    requireDasAction(
      'ExtractValue',
      '「値を抽出」で在庫数を取り込む',
      'レコーダービューで在庫数のテキストフィールドを右クリック →「値を抽出」を追加し、変数に格納してください。',
    ),
    requireDasNoErrors(
      '実行時にエラーが無い',
      'ステータスビューのエラーを確認し、ステップの設定（ファインダーのセレクタ等）を見直してください。',
    ),
  ],
  // reveal: 実行結果から在庫数を読み取って表示
  reveal: (sim) => {
    // DAS ミッションでは sim は DasSimResult。data から在庫数を探す
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dasData = (sim as any).data as Record<string, Array<Record<string, string>>>
    const allValues = Object.values(dasData).flat()
    const stockValue = allValues.find((r) => r['value'] !== undefined || r['在庫数'] !== undefined)
    const stock =
      stockValue?.['value'] ?? stockValue?.['在庫数'] ??
      allValues[0]?.[Object.keys(allValues[0] ?? {})[0]] ??
      '128'

    return (
      `Windows アプリの自動化、初成功です。手作業 10 分 → ロボット 2 秒。\n\n` +
      `今回抽出した在庫数は「${stock}」。青ロボットが Web を読んだように、緑ロボットは Windows アプリの要素を直接読み取ります。\n\n` +
      `ポイントはファインダー（CSS 風セレクタ）。要素の名前や属性で特定するので、画面の位置が変わっても壊れません。次は「待つ」技術を覚えましょう。`
    )
  },
  // 解禁用語
  glossary: ['greenRobot', 'recorderView', 'dasClick', 'dasExtract'],
  // 青ロボット用フィールド（型の都合でダミー必須）
  site: {
    id: 'd1-dummy',
    url: '',
    title: '',
    intro: '',
    singles: [],
  },
  checks: [],
}
