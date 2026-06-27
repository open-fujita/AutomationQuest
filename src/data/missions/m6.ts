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

// 出典: Eラーニング 6-1-3「ロボットのフローを学ぼう②ー条件分岐」/
//       CAMPUS!! 第1回 DS条件分岐編 — 「値判定」を重ねて二段で絞り込む応用。
const SITE: MockSite = {
  id: 'portal-expenses',
  url: 'https://portal.example.local/expenses',
  title: '経費申請ポータル — 申請一覧',
  intro:
    '経理部が毎月、申請一覧から「まだ承認されていない」かつ「高額（役員承認が要る）」案件だけを手で拾い出し、役員回付リストを作っています。',
  table: {
    caption: '経費申請一覧（8 件）',
    columns: [
      { key: 'subject', label: '件名' },
      { key: 'status', label: '承認状態' },
      { key: 'rank', label: '金額区分' },
    ],
    rows: [
      { id: 'r1', cells: { subject: '出張旅費（大阪）', status: '未承認', rank: '高額' } },
      { id: 'r2', cells: { subject: '技術書の購入', status: '承認済', rank: '通常' } },
      { id: 'r3', cells: { subject: '接待交際費', status: '未承認', rank: '高額' } },
      { id: 'r4', cells: { subject: '文具の補充', status: '未承認', rank: '通常' } },
      { id: 'r5', cells: { subject: 'セミナー受講料', status: '承認済', rank: '高額' } },
      { id: 'r6', cells: { subject: 'サーバ増設費', status: '未承認', rank: '高額' } },
      { id: 'r7', cells: { subject: '消耗品の補充', status: '承認済', rank: '通常' } },
      { id: 'r8', cells: { subject: '外注委託費', status: '未承認', rank: '通常' } },
    ],
  },
  singles: [],
}

// 未承認 = r1,r3,r4,r6,r8 の 5 件 / そのうち高額 = r1,r3,r6 の 3 件
const KAIFU = 3 // 未承認 かつ 高額 の件数（役員回付対象）

export const M6: Mission = {
  id: 'm6',
  index: 6,
  title: '二段で絞り込む',
  client: { name: '神崎 経理部主任', dept: '経理部', portrait: '/img/portrait-keiri.png' },
  briefing:
    '申請一覧から、毎月「まだ承認されていない」案件のうち「高額」のものだけを拾って役員に回しているんです。状態と金額、二つの条件で目視チェックするので時間も読み間違いも…。この二段の仕分け、ロボットにできませんか？',
  manualMinutes: 30,
  robotSeconds: 5,
  deductions: [
    {
      id: 'm6-q1',
      question: '「未承認」かつ「高額」の二つの条件で絞り込みたい。ロボットにはどう組ませる？',
      options: [
        '一覧をそのまま全部取って、あとで人が見る',
        '「値判定」を二つ重ね、未承認で絞った結果をさらに高額で絞る',
        '件名の文字数で並べ替える',
      ],
      correctIndex: 1,
      insight:
        '条件は「値判定」で掛けます。複数条件は値判定を重ねるのが基本。一段目の結果に二段目を掛けることで「AかつB」を表現できます。',
    },
    {
      id: 'm6-q2',
      question: '二つの値判定は、それぞれ何の属性に対して条件を掛ける？',
      options: [
        '両方とも「件名」に掛ける',
        '一段目は「承認状態」、二段目は「金額区分」と、属性ごとに分けて掛ける',
        '条件は行番号に対して掛ける',
      ],
      correctIndex: 1,
      insight:
        '値判定は属性単位で条件を掛けます。承認状態＝未承認、金額区分＝高額、と別々の属性に一段ずつ掛けることで二条件の重ね掛けになります。',
    },
  ],
  goals: [
    '複合型のタイプ（件名・承認状態・金額区分）と変数を用意する',
    '「ページを読み込む」→「テーブル行繰り返し」で各行をループし、承認状態と金額区分を抽出する',
    '一段目の「値判定」で 承認状態 が「未承認」の行だけを残す',
    '二段目の「値判定」で さらに 金額区分 が「高額」の行だけを残す',
    '［実行］して、未承認かつ高額の 3 件だけが残ることを確認する',
  ],
  site: SITE,
  suggested: { typeName: '経費申請', attributes: ['件名', '承認状態', '金額区分'], variableName: '経費申請' },
  checks: [
    requireComplexType(2, '複合型のタイプを作る（属性 2 つ以上）', '🧩 「タイプを追加」で複合型を作り、承認状態と金額区分を含む属性を追加してください。'),
    requireVariableOfComplexType('その複合型の変数を作る', '🧩 「変数を追加」で、作った複合型の変数を用意してください。'),
    requireLoadPageUrl(SITE.url, '経費申請一覧ページを読み込む', '📋 「ページを読み込む」で URL を設定してください。'),
    requireForEach('「テーブル行繰り返し」で各行をループする', '🖱 テーブルを右クリック →「ループ → テーブル行繰り返し → 最初の行を除外」を選んでください。'),
    requireExtractCount(2, '承認状態と金額区分の 2 列を抽出する', '🖱 青枠（現在反復行）内のセルを右クリック →「抽出 → テキスト」で承認状態と金額区分を変数の属性に格納してください。'),
    requireTestValue('未承認', '一段目の「値判定」で「未承認」だけを残す', '📋 パレットから「値判定」を追加し、承認状態の属性が「未承認」と等しい条件にしてください。'),
    requireTestValue('高額', '二段目の「値判定」で「高額」だけを残す', '📋 もう一つ「値判定」を追加し、金額区分の属性が「高額」と等しい条件にしてください。一段目の後ろに置きます。'),
    requireMaxRecordCountEquals(KAIFU, '未承認かつ高額の 3 件だけに絞り込めている', '⚙ 二つの値判定の条件と順番を見直してください。5 件なら二段目（高額）が、8 件なら両方が効いていません。'),
    requireNoErrors('実行時にエラーが無い', '▶ ステータスビューのエラーを確認してください。'),
  ],
  reveal: (sim: SimResult) => {
    let count = 0
    for (const recs of Object.values(sim.data)) if (recs.length > count) count = recs.length
    return (
      `未承認かつ高額の ${count} 件だけに絞り込めました。手作業 30 分 → ロボット 5 秒。\n\n` +
      `ポイントは「値判定を重ねた」こと。一つ目で承認状態、二つ目で金額区分、と条件を一段ずつ掛けることで「AかつB」を表現できます。条件が増えても、値判定を足していけば同じ考え方で仕分けられます。`
    )
  },
  glossary: ['testStep', 'branch', 'forEach'],
  healthFocus: [3, 5],
}
