import type { Mission } from '../../model/mission'
import type { MockSite } from '../../model/site'
import {
  requireLoadPageUrl,
  requireForEach,
  requireComplexType,
  requireVariableOfComplexType,
  requireExtractCount,
  requireAnyRecordCount,
  requireRecordsFilled,
  requireNoErrors,
} from '../../engine/validator'
import type { SimResult } from '../../model/sim'

const SITE: MockSite = {
  id: 'portal-partners',
  url: 'https://portal.example.local/partners',
  title: '取引先ポータル — 取引先一覧',
  intro: '架空の取引先マスタ。総務部が毎週、全行を 1 件ずつ Excel に転記しています。',
  table: {
    caption: '取引先一覧（6 件）',
    columns: [
      { key: 'company', label: '会社名' },
      { key: 'contact', label: '担当者' },
      { key: 'tel', label: '電話番号' },
    ],
    rows: [
      { id: 'r1', cells: { company: '青葉商事', contact: '佐藤 一郎', tel: '03-1111-2221' } },
      { id: 'r2', cells: { company: '霧島工業', contact: '田中 花子', tel: '03-1111-2222' } },
      { id: 'r3', cells: { company: '白川物産', contact: '鈴木 次郎', tel: '03-1111-2223' } },
      { id: 'r4', cells: { company: '青葉商事', contact: '高橋 三郎', tel: '03-9999-0000' } },
      { id: 'r5', cells: { company: '東雲ロジ', contact: '伊藤 四郎', tel: '03-1111-2225' } },
      { id: 'r6', cells: { company: '南風テック', contact: '渡辺 五郎', tel: '03-1111-2226' } },
    ],
  },
  singles: [],
}

// 変数名・属性名に依存せず、最も件数の多い変数から「値が重複している属性」を探す。
function findDuplicateValues(sim: SimResult): string[] {
  const recordSets = Object.values(sim.data)
  let best: Array<Record<string, string>> = []
  for (const recs of recordSets) if (recs.length > best.length) best = recs
  if (best.length === 0) return []
  const attrs = Object.keys(best[0])
  for (const a of attrs) {
    const counts = new Map<string, number>()
    for (const r of best) {
      const v = r[a] ?? ''
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    const dups = [...counts.entries()].filter(([v, n]) => n >= 2 && v.trim() !== '').map(([v]) => v)
    if (dups.length > 0) return dups
  }
  return []
}

export const M2: Mission = {
  id: 'm2',
  index: 2,
  title: '一覧をまるごと',
  client: { name: '大友 総務部', dept: '総務部', portrait: '/img/portrait-soumu.png' },
  briefing:
    '取引先ポータルの一覧、毎週ぜんぶ手で Excel に写してるんです。6 件ならまだしも、本番は数百件…。1 件だけじゃなくて、ぜんぶ取れるロボットってできますか？',
  manualMinutes: 40,
  robotSeconds: 5,
  deductions: [
    {
      id: 'm2-q1',
      question: '一覧の各行に対して、あなたは同じ操作（会社名・担当者・電話を写す）を繰り返しています。これをロボットで表すと？',
      options: ['1 行ぶんだけ抽出すれば十分', '「要素の繰り返し」で各行に同じ抽出を回す', 'ページを何度も開き直す'],
      correctIndex: 1,
      insight: '繰り返し作業は「要素の繰り返し（ForEach）」で表現します。これが無いと先頭 1 件しか取れません。',
    },
    {
      id: 'm2-q2',
      question: '1 行ごとに変わる情報（会社名・担当者・電話）は、どこに入れる？',
      options: ['毎回ステップ名を変える', '複合型タイプの属性を持つ変数に入れる', '入れずに画面で見るだけ'],
      correctIndex: 1,
      insight: '変動データは「複合型タイプ」の属性（会社名/担当者/電話）として定義し、変数に格納します。',
    },
    {
      id: 'm2-q3',
      question: '「タイプ」と「変数」の関係として正しいのは？',
      options: [
        'タイプと変数は同じもので、違いはない',
        'タイプ＝データの設計図（どんな属性を持つか）、変数＝その設計図で作った実際の入れ物（データが入る）',
        '変数が設計図で、タイプが実際のデータを持つ',
      ],
      correctIndex: 1,
      insight:
        'タイプ＝構造の定義（属性の集まり）、変数＝そのタイプに従って実際の値を保持する入れ物。例: タイプ「取引先」が 会社名/担当者/電話 を定義 → 変数「取引先」に各社が 1 行ずつ入り、取引先.会社名 のように参照します。',
    },
  ],
  goals: [
    'タイプ 取引先（複合型）に 会社名 / 担当者 / 電話 の属性を作り、同名の変数を用意する',
    '「ページを読み込む」で取引先一覧ページを開く',
    '「要素の繰り返し」で各行をループし、3 つの列を 取引先 の各属性に抽出する',
    '［実行］して、6 件すべてがデータの状態に並ぶことを確認する',
  ],
  site: SITE,
  suggested: { typeName: '取引先', attributes: ['会社名', '担当者', '電話'], variableName: '取引先' },
  // 受け入れ条件は「構造」で判定する（タイプ名・属性名・変数名の完全一致は要求しない）。
  checks: [
    requireComplexType(3, '複合型のタイプを作る（属性 3 つ以上）', '「タイプを追加」で複合型を作り、3 つの属性（会社名・担当者・電話 など、名前は自由）を追加してください。'),
    requireVariableOfComplexType('その複合型の変数を作る', 'データの状態で「変数を追加」し、いま作った複合型の変数を作ってください。'),
    requireLoadPageUrl(SITE.url, '取引先一覧ページを読み込む', '「ページを読み込む」で URL に ' + SITE.url + ' を設定してください（「このページの URL を使う」ボタンが便利）。'),
    requireForEach('「要素の繰り返し」で各行をループする', '「要素の繰り返し」が無いと先頭 1 件しか取れません。一覧の行を右クリックして繰り返しを追加してください。'),
    requireExtractCount(3, '3 つの列を抽出する', '会社名・担当者・電話の各列を右クリック →「抽出」し、変数の属性に格納してください（3 ステップ）。'),
    requireAnyRecordCount(6, '6 件すべて取れている', 'まだ全件取れていません。「要素の繰り返し」の中で抽出しているか確認してください（ループ外だと 1 件だけになります）。'),
    requireRecordsFilled(3, 6, '各行の 3 属性がすべて埋まっている', '3 つの列すべてを抽出していますか？ 不足している列がないか確認してください。'),
    requireNoErrors('実行時にエラーが無い', 'ステータスビューのエラーを確認してください。'),
  ],
  reveal: (sim) => {
    const recordSets = Object.values(sim.data)
    let count = 0
    for (const recs of recordSets) if (recs.length > count) count = recs.length
    const dups = findDuplicateValues(sim)
    if (dups.length > 0) {
      return (
        `全 ${count} 件、まるごと収集できました。手作業 40 分 → ロボット 5 秒。\n\n` +
        `…ロボットが並べたデータをよく見ると、「${dups.join('、')}」が 2 件ずつ登録されています。担当者も電話も違う＝同じ会社が二重に登録されている、台帳の重複を発見。整理すれば請求ミスを防げます。全件そろえたからこそ気づけた改善ポイント。これも自動化の成果です。`
      )
    }
    return `全 ${count} 件を収集できました。手作業 40 分 → ロボット 5 秒。`
  },
  glossary: ['forEach', 'type', 'variable', 'attribute', 'extract', 'dataState', 'branch'],
  healthFocus: [6],
}
