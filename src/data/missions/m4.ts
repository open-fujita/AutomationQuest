import type { Mission } from '../../model/mission'
import type { MockSite } from '../../model/site'
import { colTarget, ROW_TARGET } from '../../model/site'
import { requireLoadPageUrl, requireAnyRecordCount, requireNoErrors } from '../../engine/validator'

const SITE: MockSite = {
  id: 'portal-orders',
  url: 'https://portal.example.local/orders',
  title: '受注管理ポータル — 受注一覧',
  intro: '受注一覧を全件集めて、最後に 1 ファイルへ書き出す——という典型業務です。',
  table: {
    caption: '受注一覧（5 件）',
    columns: [
      { key: 'no', label: '注文番号' },
      { key: 'amount', label: '金額' },
      { key: 'customer', label: '顧客' },
    ],
    rows: [
      { id: 'o1', cells: { no: 'A-001', amount: '12,000', customer: '青葉商事' } },
      { id: 'o2', cells: { no: 'A-002', amount: '8,500', customer: '霧島工業' } },
      { id: 'o3', cells: { no: 'A-003', amount: '46,200', customer: '白川物産' } },
      { id: 'o4', cells: { no: 'A-004', amount: '3,300', customer: '東雲ロジ' } },
      { id: 'o5', cells: { no: 'A-005', amount: '21,800', customer: '南風テック' } },
    ],
  },
  singles: [],
}

export const M4: Mission = {
  id: 'm4',
  index: 4,
  title: '集めて、仕上げる（分岐と終了）',
  client: { name: '森 受注課', dept: '受注課' },
  briefing:
    '受注一覧を毎日ぜんぶ集めて、最後にまとめて1ファイルに保存しています。集める部分と保存する部分、ロボットだとどう分かれるんでしょう？ できあがりは用意したので、動きを理解して実行してほしいんです。',
  manualMinutes: 30,
  robotSeconds: 5,
  deductions: [
    {
      id: 'm4-q1',
      question: '分岐点（○）から出る 2 本のブランチ「ループ枝（各行を集める）」と「仕上げ枝（保存）」は、どう実行される？',
      options: [
        '同時に並行して実行される',
        '上から順に実行される（ループ枝が全部終わってから仕上げ枝）',
        '仕上げ枝だけが実行される',
      ],
      correctIndex: 1,
      insight: '分岐点（○）は複数のブランチを「上から順に」実行します。1 本目が終わってから 2 本目へ進みます。',
    },
    {
      id: 'm4-q2',
      question: 'ループ枝の終了（⊗）に到達すると、何が起きる？',
      options: ['ロボット全体が停止する', '次の行の処理に戻る（ループが続く）', 'いきなり仕上げ枝へ飛ぶ'],
      correctIndex: 1,
      insight: '終了（⊗）はロボット終了ではありません。直近のループの「次の行」へ戻ります。全行を終えて初めて、分岐点の次ブランチ（仕上げ）へ進みます。これが DS 最大のつまずきどころです。',
    },
  ],
  goals: [
    'フロー（開始 → ページ読込 → ○分岐 →〔ループ枝〕各行を抽出 → ⊗ /〔仕上げ枝〕保存 → ⊗）の意味を理解する',
    '「ページを読み込む」を選び、URL を設定する（このページの URL を使う）',
    '［実行］して、ループ枝で 5 件集めたあと、仕上げ枝の保存が 1 回だけ走ることをステータスビューで確認する',
  ],
  site: SITE,
  // グラフ（分岐）構成をまるごとシード。プレイヤーは読んで理解し、URL を入れて実行する。
  seed: (robot) => {
    robot.types = [{ name: '受注', kind: 'complex', attributes: [{ name: '注文番号' }, { name: '金額' }] }]
    robot.variables = [{ name: '受注', typeName: '受注' }]
    robot.steps = [
      { id: 'start', kind: 'start', name: '開始', stepClass: 'BlockBeginStep', enabled: true, pos: { x: 0, y: 0 } },
      { id: 'load', kind: 'action', name: 'ページを読み込む', stepClass: 'LoadPage2', enabled: true, pos: { x: 150, y: 0 }, action: { type: 'LoadPage', url: '' } },
      { id: 'br', kind: 'branch', name: '分岐', stepClass: 'BranchPoint', enabled: true, pos: { x: 300, y: 0 } },
      // ループ枝（上）
      { id: 'loop', kind: 'loop', name: '要素の繰り返し', stepClass: 'ForEachTag', enabled: true, pos: { x: 440, y: -70 }, action: { type: 'ForEach', targetId: ROW_TARGET } },
      { id: 'e1', kind: 'action', name: '注文番号を抽出', stepClass: 'Extract', enabled: true, pos: { x: 590, y: -70 }, action: { type: 'ExtractText', targetId: colTarget('no'), toVariable: '受注', toAttribute: '注文番号' } },
      { id: 'e2', kind: 'action', name: '金額を抽出', stepClass: 'Extract', enabled: true, pos: { x: 740, y: -70 }, action: { type: 'ExtractText', targetId: colTarget('amount'), toVariable: '受注', toAttribute: '金額' } },
      { id: 'endA', kind: 'end', name: '終了', stepClass: 'EndStep', enabled: true, pos: { x: 890, y: -70 } },
      // 仕上げ枝（下）
      { id: 'save', kind: 'action', name: '仕上げ：保存', stepClass: 'WriteFile', enabled: true, pos: { x: 440, y: 90 }, action: { type: 'SaveFile', fileName: '受注一覧.xlsx' } },
      { id: 'endB', kind: 'end', name: '終了', stepClass: 'EndStep', enabled: true, pos: { x: 590, y: 90 } },
    ]
    robot.edges = [
      { from: 'start', to: 'load' },
      { from: 'load', to: 'br' },
      { from: 'br', to: 'loop', label: 'ループ枝' },
      { from: 'loop', to: 'e1' },
      { from: 'e1', to: 'e2' },
      { from: 'e2', to: 'endA' },
      { from: 'br', to: 'save', label: '仕上げ枝' },
      { from: 'save', to: 'endB' },
    ]
  },
  checks: [
    requireLoadPageUrl(SITE.url, '「ページを読み込む」の URL を設定する', '開始の次の「ページを読み込む」を選び、アクションタブで「このページの URL を使う」を押してください。'),
    requireAnyRecordCount(5, 'ループ枝で 5 件すべて集まる', '［実行］してください。ループ枝が各行を回って 5 件集めます。'),
    requireNoErrors('実行時にエラーが無い', 'ステータスビューのエラーを確認してください。'),
  ],
  reveal: (sim) => {
    let count = 0
    for (const recs of Object.values(sim.data)) if (recs.length > count) count = recs.length
    const saved = sim.log.some((l) => l.message.includes('保存しました'))
    return (
      `受注 ${count} 件を集め、最後に保存${saved ? 'が 1 回だけ走りました' : ''}。手作業 30 分 → ロボット 5 秒。\n\n` +
      `ポイントは流れ方です。○分岐から「ループ枝」が動き、各行で⊗終了に達するたびに次の行へ戻って ${count} 回くり返す。全行を終えて初めて分岐点に戻り、「仕上げ枝」の保存が 1 度だけ実行される——⊗は“終わり”ではなく“戻り”。これが腑に落ちれば、DS のフローは自在に読めます。`
    )
  },
  glossary: ['branch', 'endStep', 'forEach', 'snippet'],
  healthFocus: [1],
}
