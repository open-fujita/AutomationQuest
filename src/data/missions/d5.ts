// D5: 要素を見失わない
// 売上レポートアプリで列順がシードごとに入れ替わる。
// 座標固定セレクタ（[x="120"][y="48"]）は列入れ替え後に誤った値を取得し失敗。
// 属性セレクタ（`tablecell[col="売上金額"]`）は列順に依存せず成功する体験。

import type { Mission } from '../../model/mission'
import type { MockApp } from '../../model/mockApp'
import { createSeededRng } from '../../model/mockApp'
import {
  requireSelectorMatch,
  requireDasNoErrors,
} from '../../engine/dasValidator'

// シード乱数で列の並び順を決定
const SEED = 888
const rng = createSeededRng(SEED)

// 元の列順
const ALL_COLUMNS = ['部門', '売上金額', '前期比', '達成率']
// シードで列をシャッフル
function shuffleArray<T>(arr: T[], r: typeof rng): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = r.nextInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
const SHUFFLED_COLUMNS = shuffleArray(ALL_COLUMNS, rng)

// 売上データ
const SALES_DATA = [
  { dept: '東日本営業部', amount: '12,450,000', ratio: '108%', achievement: '98%' },
  { dept: '西日本営業部', amount: '9,870,000', ratio: '95%', achievement: '92%' },
  { dept: 'オンライン営業', amount: '5,320,000', ratio: '125%', achievement: '115%' },
  { dept: '法人営業部', amount: '18,960,000', ratio: '103%', achievement: '105%' },
]

// 初期テーブル（元の列順）
function makeTableRows(colOrder: string[]) {
  return SALES_DATA.map((row, rowIdx) => ({
    id: `row-${rowIdx}`,
    type: 'tablerow' as const,
    attrs: { name: `行${rowIdx + 1}` },
    visible: true,
    children: colOrder.map((col, colIdx) => {
      let value = ''
      // 座標はデフォルト列順でのみ正しい位置になる（D5 の失敗体験）
      // x: 各列の固定座標（列インデックスで決まる）
      const x = String(120 + colIdx * 150)
      const y = String(48 + rowIdx * 24)
      switch (col) {
        case '部門': value = row.dept; break
        case '売上金額': value = row.amount; break
        case '前期比': value = row.ratio; break
        case '達成率': value = row.achievement; break
      }
      return {
        id: `cell-${rowIdx}-${col}`,
        type: 'tablecell' as const,
        attrs: {
          name: col,
          col: col,
          value: value,
          // 座標属性（ISA ツリーモードを模擬）
          x,
          y,
        },
        text: value,
        visible: true,
        children: [],
      }
    }),
  }))
}

const MOCK_APP: MockApp = {
  id: 'sales-report',
  windowTitle: '売上レポート v3.5',
  widgets: [
    {
      id: 'main-window',
      type: 'window',
      attrs: { title: '売上レポート v3.5', name: '売上レポート v3.5' },
      visible: true,
      children: [
        {
          id: 'label-title',
          type: 'label',
          attrs: { name: 'タイトル', class: 'report-title' },
          text: '今月の売上レポート',
          visible: true,
          children: [],
        },
        {
          id: 'sales-table',
          type: 'table',
          attrs: { name: '売上テーブル', class: 'sales-table' },
          visible: true,
          // 初期状態は元の列順
          children: makeTableRows(ALL_COLUMNS),
        },
        {
          id: 'btn-print',
          type: 'button',
          attrs: { name: '印刷', class: 'btn-secondary' },
          text: '印刷',
          visible: true,
          enabled: true,
          children: [],
        },
      ],
    },
  ],
  // タイムライン: tick=1 で列順をシャッフル（「起動のたびに列が変わる」を再現）
  timeline: [
    {
      tick: 1,
      type: 'shuffleColumns',
      tableId: 'sales-table',
      order: SHUFFLED_COLUMNS,
    },
  ],
}

export const D5: Mission = {
  id: 'd5',
  index: 10,
  title: '要素を見失わない',
  client: { name: '中村 営業企画', dept: '営業企画部', portrait: '/img/portrait-sales.png' },
  briefing:
    '売上レポートのシステム、バージョンアップしてから列の順番が変わってしまって。以前のロボットが「座標でクリック」してたんですが、列が移動したせいで違う列の値を取ってきてしまって。「列が変わっても正しい値を取れる」ロボットに直せますか？',
  manualMinutes: 15,
  robotSeconds: 2,
  deductions: [
    {
      id: 'd5-q1',
      question: '「座標（X, Y 座標）で要素を特定する」方法の問題点は？',
      options: [
        '座標は絶対に変わらないので問題ない',
        '画面レイアウトや列順が変わると、座標が指す要素が変わってしまう（別の列を取る）',
        '座標の方が速いので常に座標を使うべき',
      ],
      correctIndex: 1,
      insight:
        '座標固定は「今の画面上の位置」を指定します。列が入れ替わると「売上金額があった位置」に「前期比」が来てしまい、間違った列の値を取得します。位置が変わりうるものに座標を使うと壊れます。',
    },
    {
      id: 'd5-q2',
      question: '列が入れ替わっても正しく「売上金額」列を特定するには？',
      options: [
        '毎回列の位置を目で確認して座標を更新する',
        'ファインダーに「`tablecell[col="売上金額"]`」のような属性セレクタを使う',
        'テーブルを使うのをやめる',
      ],
      correctIndex: 1,
      insight:
        '属性セレクタ `tablecell[col="売上金額"]` は「col 属性が"売上金額"の tablecell を探す」という意味です。列が何番目にあるかに依存しないので、列順が変わっても正しく対象を見つけられます。',
    },
    {
      id: 'd5-q3',
      question: 'CSS 風セレクタで「値に"部門"を含む」（部分一致）を表すには？',
      options: [
        '`tablecell[col=="部門"]`（== を使う）',
        '`tablecell[col*="部門"]`（`*=` は部分一致）',
        '`tablecell[col~="部門"]`（`~=` は部分一致）',
      ],
      correctIndex: 1,
      insight:
        'CSS 風セレクタの演算子: `=`（完全一致）/ `^=`（前方一致）/ `$=`（後方一致）/ `*=`（部分一致）。`tablecell[col*="部門"]` は col 属性に「部門」を含む tablecell を検索します。',
    },
  ],
  goals: [
    '「値を抽出」ステップを追加する',
    'ファインダーに属性セレクタ（`tablecell[col="売上金額"]`）を設定する（座標固定ではなく属性で特定）',
    '抽出した値を変数に格納する',
    '実行して、列順が変わっても正しく売上金額が取れることを確認する',
  ],
  mockApp: MOCK_APP,
  robotType: 'das',
  dasSeed: (robot) => {
    robot.types.push({
      name: '売上',
      kind: 'complex',
      attributes: [{ name: '売上金額' }, { name: '部門' }],
    })
    robot.variables.push({ name: '売上', typeName: '売上' })
  },
  dasSuggested: {
    actionSequence: ['Windows', 'ExtractValue'],
    hint: '「値を抽出」のファインダーに `tablecell[col="売上金額"]` のような属性セレクタを設定します。座標（`[x=...][y=...]`）ではなく、要素の属性名・値で特定するのがポイントです。',
  },
  dasChecks: [
    requireSelectorMatch(
      '属性セレクタ（「[attr=...]」形式）でファインダーを設定している',
      '⚙ 「値を抽出」のファインダーに属性セレクタ（例: `tablecell[col="売上金額"]`）を設定してください。座標固定（`[x="..."][y="..."]`）は列が変わると壊れます。',
    ),
    requireDasNoErrors(
      '実行時にエラーが無い',
      '▶ ステータスビューのエラーを確認してください。ファインダーのセレクタが正しい形式か確認してください（属性名のスペルミス等）。',
    ),
  ],
  reveal: (sim) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dasSim = sim as any
    const data = dasSim.data as Record<string, Array<Record<string, string>>>
    const allValues = Object.values(data).flat()
    const firstRecord = allValues[0]
    const extractedValue = firstRecord
      ? Object.values(firstRecord)[0] ?? ''
      : ''

    // シャッフル後の列順を文字列で表示
    const shuffledOrder = SHUFFLED_COLUMNS.join(' → ')

    return (
      `列順が「${shuffledOrder}」に変わっていても、属性セレクタで正しく値を取れました。手作業 15 分 → ロボット 2 秒。\n\n` +
      `取得した値: 「${extractedValue}」\n\n` +
      `ファインダー（CSS 風セレクタ）の威力を体験できました。座標固定は「今の位置」を記憶しますが、属性セレクタは「要素の性質」で追跡します。業務システムのアップデートやレイアウト変更にも耐える、壊れにくいロボットの作り方です。\n\n` +
      `D1〜D5 で学んだこと: ウィンドウを開く / 状態を待つ（Location Found）/ 通知を捌く（Application Found）/ 動くリストを反復（For Each）/ 要素を属性で追跡（CSS 風セレクタ）。これが緑ロボットの基本パターンです。`
    )
  },
  glossary: ['componentFinder', 'cssSelector', 'finder4layers'],
  healthFocus: [10],
  site: { id: 'd5-dummy', url: '', title: '', intro: '', singles: [] },
  checks: [],
}
