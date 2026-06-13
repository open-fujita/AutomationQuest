import type { Mission } from '../../model/mission'
import type { MockSite } from '../../model/site'
import {
  requireLoadPageUrl,
  requireExtractInto,
  requireRecordCount,
  requireNoErrors,
} from '../../engine/validator'

const SITE: MockSite = {
  id: 'portal-news',
  url: 'https://portal.example.local/news',
  title: '社内ポータル — お知らせ',
  intro: '自動化推進室 研修環境（架空）。毎朝この見出しを手でコピーして全社展開しています。',
  singles: [
    {
      id: 'notice-title',
      label: 'お知らせ見出し',
      text: '【重要】6月の経費精算は 6/18 締めに前倒しします',
      role: 'heading',
    },
    {
      id: 'notice-date',
      label: '掲載日',
      text: '2026-06-07',
      role: 'paragraph',
    },
  ],
}

export const M1: Mission = {
  id: 'm1',
  index: 1,
  title: 'はじめての自動化',
  client: { name: '神崎 経理部主任', dept: '経理部', portrait: '/img/portrait-keiri.png' },
  briefing:
    '毎朝、社内ポータルのお知らせ見出しを手でコピーして全社メールに貼ってるんです…。たった1行なのに、確認して開いてコピーして、で毎回15分。これ、ロボットに任せられませんか？',
  manualMinutes: 15,
  robotSeconds: 3,
  deductions: [
    {
      id: 'm1-q1',
      question: 'この手作業を自動化するとき、ロボットが最初にやるべきことは？',
      options: ['お知らせのページを開く', 'いきなりメールを送る', 'プリンターで印刷する'],
      correctIndex: 0,
      insight: 'ロボットの第一歩は「ページを読み込む」。対象のページを開かないと何も始まりません。',
    },
    {
      id: 'm1-q2',
      question: 'ページを開いたあと、欲しい情報（お知らせ見出し）をどうやって取り込む？',
      options: ['スクリーンショットを撮る', '要素を「抽出」して変数に入れる', '手で入力し直す'],
      correctIndex: 1,
      insight: '欲しい情報は「抽出」で変数の属性に取り込みます。これがデータ収集の基本動作です。',
    },
  ],
  goals: [
    '「ページを読み込む」アクションステップを追加し、お知らせページの URL を設定する',
    'ブラウザビューでお知らせ見出しを右クリック →「抽出」し、変数 お知らせ.見出し に格納する',
    '［実行］して、データの状態に見出しが 1 件取り込まれることを確認する',
  ],
  site: SITE,
  seed: (robot) => {
    robot.types.push({ name: 'お知らせ', kind: 'complex', attributes: [{ name: '見出し' }] })
    robot.variables.push({ name: 'お知らせ', typeName: 'お知らせ' })
  },
  checks: [
    requireLoadPageUrl(
      SITE.url,
      '「ページを読み込む」でお知らせページを開く',
      '📋 まず「ページを読み込む」ステップを追加し、URL にお知らせページ（' + SITE.url + '）を設定してください。',
    ),
    requireExtractInto(
      'お知らせ',
      '見出し',
      'お知らせ見出しを 変数 お知らせ.見出し に抽出する',
      '🖱 ブラウザビューでお知らせ見出しを右クリック →「抽出」し、抽出先を お知らせ.見出し にしてください。',
    ),
    requireRecordCount('お知らせ', 1, '実行して 1 件取り込めている', '▶ ［実行］を押して、見出しが取り込めるか確かめましょう。'),
    requireNoErrors('実行時にエラーが無い', '▶ ステータスビューのエラーを確認し、ステップの順番や設定を見直してください。'),
  ],
  reveal: (sim) => {
    const headline = sim.data['お知らせ']?.[0]?.['見出し'] ?? ''
    return (
      `初めてのロボットが完成しました。手作業 15 分が、ロボットなら 3 秒。\n\n` +
      `…ところで抽出した見出し「${headline}」。先週の経理メールでは「6/25 締め」でした。締め日が 1 週間も前倒しになっている＝通知の更新漏れを早期に拾えた、ということ。手で見ていたら見落としがちな差分も、ロボットが毎朝そろえてくれるから気づけます。これも自動化の効果です。`
    )
  },
  glossary: ['robot', 'step', 'actionStep', 'loadPage', 'extract', 'variable', 'type', 'dataState', 'endStep'],
  healthFocus: [1, 3],
}
