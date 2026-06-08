import type { Mission } from '../../model/mission'
import type { MockSite } from '../../model/site'
import {
  requireLoadPageUrl,
  requireForEach,
  requireUsesInput,
  requireReturnsOutput,
  requireRoleRecordCount,
  requireVariableRole,
  requireNoErrors,
} from '../../engine/validator'

const SITE: MockSite = {
  id: 'portal-secure',
  url: 'https://portal.example.local/secure',
  title: '社内システム（要ログイン）— 取引先一覧',
  intro: 'ログインが必要な社内システム。ID とパスワードは呼び出し元から入力変数で受け取ります（直書きしない）。',
  singles: [
    { id: 'login-id', label: 'ID', text: '', role: 'input' },
    { id: 'login-pw', label: 'パスワード', text: '', role: 'input' },
    { id: 'login-btn', label: 'ログイン', text: 'ログイン', role: 'button' },
  ],
  table: {
    caption: '取引先一覧（5 件）',
    columns: [
      { key: 'company', label: '会社名' },
      { key: 'contact', label: '担当者' },
      { key: 'tel', label: '電話番号' },
    ],
    rows: [
      { id: 's1', cells: { company: '青葉商事', contact: '佐藤 一郎', tel: '03-1111-2221' } },
      { id: 's2', cells: { company: '霧島工業', contact: '田中 花子', tel: '03-1111-2222' } },
      { id: 's3', cells: { company: '白川物産', contact: '鈴木 次郎', tel: '03-1111-2223' } },
      { id: 's4', cells: { company: '東雲ロジ', contact: '伊藤 四郎', tel: '03-1111-2225' } },
      { id: 's5', cells: { company: '南風テック', contact: '渡辺 五郎', tel: '03-1111-2226' } },
    ],
  },
}

export const M5: Mission = {
  id: 'm5',
  index: 5,
  title: '受け取って、返す（入力変数と出力変数）',
  client: { name: '橘 情報システム部', dept: '情報システム部' },
  briefing:
    'このロボットは他の業務から呼び出して使い回す部品にしたいんです。ログインID/パスワードはロボットに直書きせず、呼び出し元から受け取って使ってほしい。そして集めた一覧は呼び出し元に返してください。',
  manualMinutes: 20,
  robotSeconds: 4,
  deductions: [
    {
      id: 'm5-q1',
      question: 'ログインID/パスワードをロボットにどう持たせるのが良い？',
      options: [
        'ロボットに直接書き込む（ハードコード）',
        '入力変数で呼び出し元から受け取る',
        '毎回キーボードで手入力する',
      ],
      correctIndex: 1,
      insight: 'ID/パスワードは「入力変数」で外部から受け取ります。直書きしないことで安全・再利用しやすくなります。',
    },
    {
      id: 'm5-q2',
      question: '集めた一覧を「呼び出し元に返す」には？',
      options: ['出力変数に入れて「値を返す」', '画面に表示するだけ', 'ファイル名を変える'],
      correctIndex: 0,
      insight: '結果は「出力変数」に格納し、「値を返す」で呼び出し元へ返します。入力も出力も、その"形"を決めるのがタイプ＝契約です。',
    },
    {
      id: 'm5-q3',
      question: '入力変数・出力変数に使えるタイプは？',
      options: ['簡易型（単一の値）だけ', '複合型（属性を持つタイプ）', 'タイプは不要'],
      correctIndex: 1,
      insight: '入力・出力に使えるのは複合型のみ。複合型が「どんな項目をやり取りするか」という入出力の契約になります。',
    },
  ],
  goals: [
    '出力変数「取引先」（複合型・出力）を用意する（推奨構成ボタンが使えます）',
    'ページを読み込み、ID 欄・パスワード欄に「テキストを入力」→ 入力変数 ログイン情報 から値を使う',
    'ログインをクリックし、「要素の繰り返し」で各行を 取引先 に抽出する',
    '「値を返す」で出力変数 取引先 を呼び出し元へ返し、［実行］で確認する',
  ],
  site: SITE,
  // 入力変数（＝呼び出し元からの契約）は最初から用意されている。出力は推奨構成で作る。
  seed: (robot) => {
    robot.types = [{ name: 'ログイン情報', kind: 'complex', attributes: [{ name: 'ID' }, { name: 'パスワード' }] }]
    robot.variables = [{ name: 'ログイン情報', typeName: 'ログイン情報', role: 'input' }]
  },
  inputs: { ログイン情報: { ID: 'staff01', パスワード: '••••••' } },
  suggested: { typeName: '取引先', attributes: ['会社名', '担当者', '電話'], variableName: '取引先', variableRole: 'output' },
  checks: [
    requireVariableRole('output', '出力変数（複合型）を作る', '「変数を追加」で役割「出力」の変数を作るか、推奨構成ボタンを使ってください。'),
    requireLoadPageUrl(SITE.url, 'ログインページを読み込む', '「ページを読み込む」で URL を設定してください。'),
    requireUsesInput('入力変数 ログイン情報 をテキスト入力で使う', 'ID 欄を右クリック →「テキストを入力」→ アクションで「入力変数から」を選び ログイン情報.ID を使ってください。'),
    requireForEach('「要素の繰り返し」で各行をループする', '一覧の行を右クリック →「要素の繰り返し」を追加してください。'),
    requireRoleRecordCount('output', 5, '出力変数に 5 件集まる', '出力変数（取引先）に 3 列を抽出し、5 件取れているか確認してください。'),
    requireReturnsOutput('「値を返す」で出力変数を返す', 'パレットの「値を返す」を追加し、出力変数（取引先）を選んでください。'),
    requireNoErrors('実行時にエラーが無い', 'ステータスビューのエラーを確認してください。'),
  ],
  reveal: (sim) => {
    let count = 0
    for (const recs of Object.values(sim.data)) if (recs.length > count) count = recs.length
    const returned = sim.returned.length > 0 ? sim.returned.join('、') : 'なし'
    return (
      `入力（ログイン情報）を受け取って使い、出力変数を呼び出し元へ返せました（返した変数: ${returned}）。手作業 20 分 → ロボット 4 秒。\n\n` +
      `このロボットは ID を直書きしていないので、別のログイン情報でもそのまま使い回せます。入力＝受け取る・出力＝返す、その"形"を決めるのがタイプ（契約）。型と変数が別概念であることが、ここで効いてきます。`
    )
  },
  glossary: ['type', 'variable', 'attribute', 'dataState'],
}
