import type { Mission } from '../../model/mission'
import type { MockSite } from '../../model/site'
import type { SimResult } from '../../model/sim'
import {
  requireLoadPageUrl,
  requireForEach,
  requireComplexType,
  requireVariableOfComplexType,
  requireExtractCount,
  requireTestValue,
  requireMaxRecordCountEquals,
  requireNoErrors,
} from '../../engine/validator'

const SITE: MockSite = {
  id: 'portal-inquiries',
  url: 'https://portal.example.local/inquiries',
  title: '問い合わせ管理ポータル — 受付一覧',
  intro: 'カスタマーサポート部が毎日、未対応の問い合わせだけを目視で拾い出してリスト化しています。',
  table: {
    caption: '問い合わせ一覧（7 件）',
    columns: [
      { key: 'subject', label: '件名' },
      { key: 'status', label: '状態' },
      { key: 'assignee', label: '担当' },
    ],
    rows: [
      { id: 'r1', cells: { subject: '返金についての問い合わせ', status: '対応済', assignee: '佐藤' } },
      { id: 'r2', cells: { subject: 'ログインできない', status: '未対応', assignee: '' } },
      { id: 'r3', cells: { subject: '請求書の再発行', status: '未対応', assignee: '田中' } },
      { id: 'r4', cells: { subject: '納期の確認', status: '対応済', assignee: '鈴木' } },
      { id: 'r5', cells: { subject: '操作方法の質問', status: '未対応', assignee: '高橋' } },
      { id: 'r6', cells: { subject: '解約したい', status: '未対応', assignee: '' } },
      { id: 'r7', cells: { subject: '領収書がほしい', status: '対応済', assignee: '伊藤' } },
    ],
  },
  singles: [],
}

const MIKAITOU = 4 // 未対応の件数

// フィルタ後の最大変数レコードのうち、属性に空欄を含む件数（＝担当が空の放置案件）
function emptyFieldRecordCount(sim: SimResult): number {
  let best: Array<Record<string, string>> = []
  for (const recs of Object.values(sim.data)) if (recs.length > best.length) best = recs
  return best.filter((r) => Object.values(r).some((v) => (v ?? '').trim() === '')).length
}

export const M3: Mission = {
  id: 'm3',
  index: 3,
  title: '条件で仕分ける',
  client: { name: '高橋 サポート部', dept: 'カスタマーサポート部', portrait: '/img/portrait-support.png' },
  briefing:
    '問い合わせ一覧から、毎朝「未対応」のものだけを手で拾ってるんです。対応済みも混ざってて見落としが怖くて…。未対応だけを自動で仕分けられませんか？',
  manualMinutes: 25,
  robotSeconds: 4,
  deductions: [
    {
      id: 'm3-q1',
      question: '一覧には「未対応」と「対応済」が混在しています。未対応だけ残すには、ロボットに何をさせる？',
      options: ['全部そのまま取る', '「値判定」で状態が未対応の行だけを残す（条件で仕分け）', '担当者に電話する'],
      correctIndex: 1,
      insight: '条件で分けるのは「値判定（テストステップ）」。条件に合う行だけを残し、それ以外を落とします。',
    },
    {
      id: 'm3-q2',
      question: '「未対応だけ」を判定するには、どの情報を条件にする？',
      options: ['件名の文字数', '状態（未対応/対応済）の値', '行の色'],
      correctIndex: 1,
      insight: '判定は「状態」属性の値が『未対応』と等しいか、で行います。条件は抽出した属性に対してかけます。',
    },
  ],
  goals: [
    '複合型のタイプ（件名・状態・担当 など）と変数を用意する',
    '「ページを読み込む」→「要素の繰り返し」で各行をループし、件名・状態・担当を抽出する',
    '「値判定」を追加し、状態 が「未対応」と等しい行だけを残す',
    '［実行］して、未対応の 4 件だけがデータの状態に残ることを確認する',
  ],
  site: SITE,
  suggested: { typeName: '問い合わせ', attributes: ['件名', '状態', '担当'], variableName: '問い合わせ' },
  checks: [
    requireComplexType(2, '複合型のタイプを作る（属性 2 つ以上）', '🧩 「タイプを追加」で複合型を作り、状態を含む属性（件名・状態・担当 など）を追加してください。'),
    requireVariableOfComplexType('その複合型の変数を作る', '🧩 「変数を追加」で、作った複合型の変数を用意してください。'),
    requireLoadPageUrl(SITE.url, '問い合わせ一覧ページを読み込む', '📋 「ページを読み込む」で URL を設定してください。'),
    requireForEach('「要素の繰り返し」で各行をループする', '🖱 一覧の行を右クリック →「要素の繰り返し」を追加してください。'),
    requireExtractCount(2, '少なくとも 2 つの列（状態を含む）を抽出する', '🖱 状態の列を含め、列を右クリック →「抽出」で変数の属性に格納してください。'),
    requireTestValue('未対応', '「値判定」で「未対応」だけを残す', '📋 パレットから「値判定」を追加し、状態の属性が「未対応」と等しい条件にしてください。'),
    requireMaxRecordCountEquals(MIKAITOU, '未対応の 4 件だけに絞り込めている', '⚙ 値判定の条件を見直してください。全件（7 件）のままなら値判定が効いていません。状態属性に対して「未対応」と等しい、になっているか確認を。'),
    requireNoErrors('実行時にエラーが無い', '▶ ステータスビューのエラーを確認してください。'),
  ],
  reveal: (sim) => {
    let count = 0
    for (const recs of Object.values(sim.data)) if (recs.length > count) count = recs.length
    const empties = emptyFieldRecordCount(sim)
    const tail =
      empties > 0
        ? `\n\nしかも残った ${count} 件のうち ${empties} 件は担当が空欄＝まだ誰にも割り当てられていない相談を発見。条件で仕分けたからこそ、フォローすべき件がはっきり見えました。これも自動化の成果です。`
        : ''
    return `未対応の ${count} 件だけに仕分けられました。手作業 25 分 → ロボット 4 秒。${tail}`
  },
  glossary: ['testStep', 'branch', 'forEach', 'debug'],
  healthFocus: [3, 5],
}
