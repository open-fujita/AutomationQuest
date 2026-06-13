// D3: 不意の来客
// 作業進捗ダッシュボードで業務中に通知ウィンドウがランダムに出現する。
// Application Found ガードで「通知が来たら閉じる」処理を組み込み、
// 不測の割り込みに対処するミッション。

import type { Mission } from '../../model/mission'
import type { MockApp } from '../../model/mockApp'
import { createSeededRng } from '../../model/mockApp'
import {
  requireApplicationFoundGuard,
  requireGuardMatched,
  requireDasNoErrors,
} from '../../engine/dasValidator'

// シード乱数で通知ウィンドウの出現タイミングを決定
// 教育用: 毎回同じ tick で出現するが、ゲームとしてランダム感を演出
const SEED = 73
const rng = createSeededRng(SEED)
// 10〜25 tick の間で通知が出現（業務の途中で突然来る感じ）
const NOTIFY_TICK = 10 + rng.nextInt(16) // 10〜25

const MOCK_APP: MockApp = {
  id: 'work-dashboard',
  windowTitle: '作業進捗ダッシュボード',
  widgets: [
    // メインウィンドウ
    {
      id: 'main-window',
      type: 'window',
      attrs: { title: '作業進捗ダッシュボード', name: '作業進捗ダッシュボード' },
      visible: true,
      children: [
        {
          id: 'label-title',
          type: 'label',
          attrs: { name: 'タイトル', class: 'section-title' },
          text: '本日の作業進捗',
          visible: true,
          children: [],
        },
        {
          id: 'table-tasks',
          type: 'table',
          attrs: { name: 'タスク一覧', class: 'task-table' },
          visible: true,
          children: [
            {
              id: 'row-1',
              type: 'tablerow',
              attrs: { name: '行1' },
              visible: true,
              children: [
                {
                  id: 'cell-task-1',
                  type: 'tablecell',
                  attrs: { name: '在庫確認', col: 'タスク名' },
                  text: '在庫確認',
                  visible: true,
                  children: [],
                },
                {
                  id: 'cell-status-1',
                  type: 'tablecell',
                  attrs: { name: '完了', col: '状態' },
                  text: '完了',
                  visible: true,
                  children: [],
                },
              ],
            },
            {
              id: 'row-2',
              type: 'tablerow',
              attrs: { name: '行2' },
              visible: true,
              children: [
                {
                  id: 'cell-task-2',
                  type: 'tablecell',
                  attrs: { name: '発注処理', col: 'タスク名' },
                  text: '発注処理',
                  visible: true,
                  children: [],
                },
                {
                  id: 'cell-status-2',
                  type: 'tablecell',
                  attrs: { name: '処理中', col: '状態' },
                  text: '処理中',
                  visible: true,
                  children: [],
                },
              ],
            },
            {
              id: 'row-3',
              type: 'tablerow',
              attrs: { name: '行3' },
              visible: true,
              children: [
                {
                  id: 'cell-task-3',
                  type: 'tablecell',
                  attrs: { name: '報告書作成', col: 'タスク名' },
                  text: '報告書作成',
                  visible: true,
                  children: [],
                },
                {
                  id: 'cell-status-3',
                  type: 'tablecell',
                  attrs: { name: '未着手', col: '状態' },
                  text: '未着手',
                  visible: true,
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: 'btn-export',
          type: 'button',
          attrs: { name: 'CSV出力', class: 'btn-primary' },
          text: 'CSV出力',
          visible: true,
          enabled: true,
          children: [],
        },
      ],
    },
    // 通知ウィンドウ（最初は非表示。タイムラインで出現）
    {
      id: 'notification-window',
      type: 'notification',
      attrs: {
        title: 'お知らせ',
        name: 'お知らせ',
        class: 'notification-popup',
      },
      text: 'システムメンテナンスのお知らせ\n明日 22:00〜24:00 はシステムメンテナンスを実施します。',
      visible: false,
      children: [
        {
          id: 'btn-close-notify',
          type: 'button',
          attrs: { name: '閉じる', class: 'btn-close' },
          text: '閉じる',
          visible: true,
          enabled: true,
          children: [],
        },
      ],
    },
  ],
  timeline: [
    // NOTIFY_TICK で通知ウィンドウを表示
    { tick: NOTIFY_TICK, type: 'showWidget', widgetId: 'notification-window' },
    // 通知の閉じるボタンがクリックされた想定（tick+5 で非表示にする演出）
    // 実際にはシミュレータが Click ステップを検出した後 hideWidget が走る
    // ここでは通知が自然消滅しない（閉じる処理をロボットが行う必要がある）
  ],
}

export const D3: Mission = {
  id: 'd3',
  index: 9,
  title: '不意の来客',
  client: { name: '橋本 購買部', dept: '購買部', portrait: '/img/portrait-purchasing.png' },
  briefing:
    '作業中にいきなり「お知らせ」ウィンドウが出てくるんです。出るタイミングは毎回バラバラで。手で「閉じる」を押せばいいんですが、ロボットが動いているときに割り込まれると処理が止まってしまいます。ロボットに「通知が来たら自動で閉じる」処理を組み込めませんか？',
  manualMinutes: 5,
  robotSeconds: 1,
  deductions: [
    {
      id: 'd3-q1',
      question: '「通知ウィンドウが出たら閉じる」をロボットで表現するには？',
      options: [
        '固定 tick 待って閉じるボタンをクリックする（時間経過のみ）',
        'ガードチョイスで「該当するアプリケーション（Application Found）」ガードを使う',
        '通知ウィンドウのことは無視して処理を続ける',
      ],
      correctIndex: 1,
      insight:
        '「該当するアプリケーション（Application Found）」ガードは、指定したウィンドウ（アプリケーション）が画面に現れた瞬間に成立します。通知ウィンドウの出現という「イベント」を待ち受け、出たら対処する——これが Application Found ガードの用途です。',
    },
    {
      id: 'd3-q2',
      question: '通知ウィンドウが「出るかもしれないし、出ないかもしれない」場合、ガードチョイスをどう設計する？',
      options: [
        'Application Found だけ設定する（出ないときは永遠に待ち続ける）',
        'Application Found ＋ Timeout（時間経過）を並行監視する。どちらが先に成立してもよい',
        '毎回通知ウィンドウを手動確認してからロボットを起動する',
      ],
      correctIndex: 1,
      insight:
        'ガードチョイスに「Application Found（通知が来たら閉じる）」と「Timeout（通知なしで続行）」を組み合わせます。通知があれば Application Found が先に成立、なければ Timeout が成立——どちらに転んでも処理が続きます。',
    },
    {
      id: 'd3-q3',
      question: 'ガードチョイスでガードが成立すると、他のガードはどうなる？',
      options: [
        '他のガードも続けて実行される',
        '最初に成立したガードの枝だけが実行され、他は評価対象外になる（排他実行）',
        '全てのガードが順番に実行される',
      ],
      correctIndex: 1,
      insight:
        'ガードチョイスの核心: 複数のガードを「並行監視」し、最初に成立したガードの枝だけを「排他実行」します。Timeout と Application Found を並べると、どちらが先に成立してもそちらの処理だけが動きます。',
    },
  ],
  goals: [
    '「ガードチョイス」ステップを追加する',
    '「該当するアプリケーション（Application Found）」ガードを追加し、通知ウィンドウのファインダーを設定する',
    'Application Found 枝に通知ウィンドウの「閉じる」ボタンを「クリック」するステップを追加する',
    '「時間経過（Timeout）」ガードも追加し、通知なしのケースに対応する',
    '実行して、通知ウィンドウが出現したタイミングで自動的に閉じられることを確認する',
  ],
  mockApp: MOCK_APP,
  robotType: 'das',
  dasSeed: (robot) => {
    robot.types.push({ name: '進捗結果', kind: 'simple', attributes: [] })
    robot.variables.push({ name: '進捗結果', typeName: '進捗結果' })
  },
  dasSuggested: {
    actionSequence: ['Windows', 'GuardedChoice', 'Click'],
    requiredGuards: ['applicationFound', 'timeout'],
    hint: 'ガードチョイスに「該当するアプリケーション」（通知ウィンドウを待つ）と「時間経過」（通知なし時のフォールバック）を設定。Application Found が成立したら「閉じる」ボタンをクリックします。',
  },
  dasChecks: [
    requireApplicationFoundGuard(
      '「該当するアプリケーション（Application Found）」ガードで通知を待ち受ける',
      '⚙ ガードチョイスに「該当するアプリケーション（Application Found）」ガードを追加してください。通知ウィンドウ（お知らせ）のファインダーを設定することで、ウィンドウの出現を検出できます。',
    ),
    requireGuardMatched(
      'applicationFound',
      '実行時に「該当するアプリケーション」ガードが成立する',
      '▶ 実行してみましょう。通知ウィンドウが出現した tick で Application Found ガードが成立します。ファインダーのセレクタが正しく設定されているか確認してください。',
    ),
    requireDasNoErrors(
      '実行時にエラーが無い',
      '▶ ステータスビューのエラーを確認してください。通知ウィンドウの「閉じる」ボタンのセレクタ（`button[name="閉じる"]`）が正しく設定されているか確認してください。',
    ),
  ],
  reveal: (sim) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dasSim = sim as any
    const guardResults = dasSim.guardResults ?? []
    const appFoundResult = guardResults.find(
      (gr: { winnerGuardType: string; tick: number }) => gr.winnerGuardType === 'applicationFound',
    )
    const matchedTick = appFoundResult ? appFoundResult.tick : NOTIFY_TICK

    return (
      `通知ウィンドウが tick=${matchedTick} に出現し、自動で閉じられました。手作業 5 分 → ロボット 1 秒。\n\n` +
      `「不意の来客」への対処ができました。ポイントは「Application Found ガード」——アプリ（ウィンドウ）の出現を待ち受け、来たら対処する。来なければ Timeout で素通りする。\n\n` +
      `このパターンは SAP や業務システムで多用されます。D2 の「Location Found（要素の出現待ち）」と D3 の「Application Found（ウィンドウの出現待ち）」——どちらを使うかは、待ちたいのが「要素」か「ウィンドウ全体」かで決まります。`
    )
  },
  glossary: ['applicationFound', 'applicationNotFound', 'notification'],
  healthFocus: [9],
  site: { id: 'd3-dummy', url: '', title: '', intro: '', singles: [] },
  checks: [],
}
