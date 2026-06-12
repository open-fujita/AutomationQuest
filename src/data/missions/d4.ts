// D4: 動くリストを数える
// 仕入れ一覧アプリで件数がシードで変動する。
// For Each ＋ スコープファインダー ＋ 相対セレクタで全件を集計する体験。
// 件数が変動しても壊れない汎用ロボットの作り方を学ぶミッション。

import type { Mission } from '../../model/mission'
import type { MockApp, AppWidget } from '../../model/mockApp'
import { createSeededRng } from '../../model/mockApp'
import {
  requireForEachScope,
  requireRelativeSelector,
  requireDasExtractCount,
  requireDasNoErrors,
} from '../../engine/dasValidator'

// シード乱数で仕入れ品目の件数を決定（5〜9 件）
const SEED = 2025
const rng = createSeededRng(SEED)
const ITEM_COUNT = 5 + rng.nextInt(5) // 5〜9 件

// 品目データ（シードで件数が変わる）
const ITEMS = [
  { id: 'ITEM-001', name: 'コピー用紙 A4', qty: '50', price: '2,800' },
  { id: 'ITEM-002', name: 'ボールペン 黒 10 本入り', qty: '20', price: '1,200' },
  { id: 'ITEM-003', name: 'クリアファイル 10 枚', qty: '15', price: '900' },
  { id: 'ITEM-004', name: 'ステープラー', qty: '5', price: '1,500' },
  { id: 'ITEM-005', name: 'のり スティック', qty: '30', price: '600' },
  { id: 'ITEM-006', name: 'ハサミ', qty: '8', price: '1,100' },
  { id: 'ITEM-007', name: 'マーカー 蛍光 5 色', qty: '12', price: '950' },
  { id: 'ITEM-008', name: 'クリップ 大 100 個', qty: '10', price: '500' },
  { id: 'ITEM-009', name: '付箋 75×75 3 色', qty: '25', price: '800' },
]

// 初期リスト（最初の 3 件のみ表示）
const INITIAL_ITEMS = ITEMS.slice(0, 3)
// タイムラインで追加される品目（tick ごとに 1 件追加）
const ADDED_ITEMS = ITEMS.slice(3, ITEM_COUNT)

// リストアイテムのウィジェット生成ヘルパー
function makeItemWidget(item: { id: string; name: string; qty: string; price: string }, index: number): AppWidget {
  return {
    id: `list-item-${index}`,
    type: 'listitem',
    attrs: {
      name: item.id,
      class: 'purchase-item',
      'item-id': item.id,
    },
    visible: true,
    children: [
      {
        id: `cell-id-${index}`,
        type: 'label',
        attrs: { name: '品目ID', col: '品目ID', value: item.id },
        text: item.id,
        visible: true,
        children: [],
      },
      {
        id: `cell-name-${index}`,
        type: 'label',
        attrs: { name: '品目名', col: '品目名', value: item.name },
        text: item.name,
        visible: true,
        children: [],
      },
      {
        id: `cell-qty-${index}`,
        type: 'label',
        attrs: { name: '発注数', col: '発注数', value: item.qty },
        text: item.qty,
        visible: true,
        children: [],
      },
    ],
  }
}

const MOCK_APP: MockApp = {
  id: 'purchase-list',
  windowTitle: '仕入れ管理システム',
  widgets: [
    {
      id: 'main-window',
      type: 'window',
      attrs: { title: '仕入れ管理システム', name: '仕入れ管理システム' },
      visible: true,
      children: [
        {
          id: 'label-title',
          type: 'label',
          attrs: { name: '今週の仕入れ一覧', class: 'section-title' },
          text: '今週の仕入れ一覧',
          visible: true,
          children: [],
        },
        // 仕入れ一覧コンテナ（スコープファインダーの起点）
        {
          id: 'list-container',
          type: 'table',
          attrs: { name: '仕入れ一覧', class: 'purchase-list' },
          visible: true,
          // 初期状態は最初の 3 件
          children: INITIAL_ITEMS.map((item, i) => makeItemWidget(item, i)),
        },
        {
          id: 'btn-refresh',
          type: 'button',
          attrs: { name: '更新', class: 'btn-secondary' },
          text: '更新',
          visible: true,
          enabled: true,
          children: [],
        },
        {
          id: 'label-count',
          type: 'label',
          attrs: { name: '件数表示', class: 'count-label' },
          text: `${INITIAL_ITEMS.length} 件`,
          visible: true,
          children: [],
        },
      ],
    },
  ],
  // タイムライン: 各 tick で品目を追加（シードで決まった件数になるまで）
  timeline: ADDED_ITEMS.map((item, i) => ({
    tick: (i + 1) * 3, // tick=3, 6, 9... で 1 件ずつ追加
    type: 'addListItem' as const,
    parentId: 'list-container',
    widget: makeItemWidget(item, INITIAL_ITEMS.length + i),
  })),
}

export const D4: Mission = {
  id: 'd4',
  index: 9,
  title: '動くリストを数える',
  client: { name: '藤原 購買管理課', dept: '購買管理課', portrait: '/img/portrait-purchasing2.png' },
  briefing:
    '仕入れ管理システムの一覧、週によって件数が変わるんですよ。3 件の週もあれば 9 件の週もあって。全件を集めるロボットを作ったんですが、件数が変わるたびに設定を直さないといけなくて。「今週は何件あるか分からないけど、あるだけ全部処理する」ロボットって作れますか？',
  manualMinutes: 20,
  robotSeconds: 3,
  deductions: [
    {
      id: 'd4-q1',
      question: '「件数が変わっても全件処理する」ロボットを作るには？',
      options: [
        '最大件数（9 件）ぶんのステップを事前に並べておく',
        'For Each ループで「一覧コンテナ内の全アイテムを繰り返す」',
        '件数を毎回手で数えてから設定する',
      ],
      correctIndex: 1,
      insight:
        'For Each ループは「対象の要素を全件反復」します。3 件でも 9 件でも、コンテナ内の全要素を自動的に処理します。件数をハードコードしないのが汎用ロボットの鉄則。',
    },
    {
      id: 'd4-q2',
      question: '緑ロボットの For Each を使うとき、「どこから繰り返すか」を決める設定は？',
      options: [
        '特に設定しない。自動で画面全体から探してくれる',
        'スコープファインダーで「繰り返しの起点（コンテナ要素）」を指定する',
        'テーブルの行番号を手動で指定する',
      ],
      correctIndex: 1,
      insight:
        'スコープファインダーで「どのコンテナを起点にするか」を指定します。例: 仕入れ一覧テーブルを指定すると、その中の全行を対象にループします。スコープがないと全画面から探してしまい、意図しない要素まで拾います。',
    },
    {
      id: 'd4-q3',
      question: 'For Each のエレメントファインダーに「> listitem」と設定する「>」の意味は？',
      options: [
        '「より大きい」という数値比較',
        '「スコープの直接の子要素」を表す相対セレクタ。スコープ（コンテナ）の 1 階層下だけを対象にする',
        'コメントを表す記号',
      ],
      correctIndex: 1,
      insight:
        '「>」は CSS セレクタの「直接の子」コンビネータです。スコープファインダーで指定したコンテナの、直接の子要素のみを反復します。ネストが深い要素を誤って拾うのを防ぎ、各反復で「スコープ内の 1 要素」を確実に処理できます。',
    },
  ],
  goals: [
    '一覧の行（listitem）を右クリックし「For Each ループ（各 [listitem] の兄弟）」を選択して For Each ステップを追加する',
    'スコープファインダーに仕入れ一覧テーブル（`table[name="仕入れ一覧"]`）が自動設定されていることを確認する',
    'エレメントファインダーに相対セレクタ（`> listitem`）が自動設定されていることを確認する',
    'For Each 本体に「値を抽出」を追加し、品目名を変数に格納する',
    '実行して、全件（シードによる件数）が変数に取り込まれることを確認する',
  ],
  mockApp: MOCK_APP,
  robotType: 'das',
  dasSeed: (robot) => {
    robot.types.push({
      name: '品目',
      kind: 'complex',
      attributes: [{ name: '品目名' }, { name: '発注数' }],
    })
    robot.variables.push({ name: '品目', typeName: '品目' })
  },
  dasSuggested: {
    actionSequence: ['Windows', 'ForEach', 'ExtractValue'],
    hint: 'For Each のスコープファインダーに仕入れ一覧テーブルを指定し、エレメントファインダーに「> listitem」（テーブルの直接の子）を設定します。body 内で品目名を抽出します。',
  },
  dasChecks: [
    requireForEachScope(
      'For Each を実行してスコープ（コンテナ）を正しく特定できた',
      '仕入れ一覧テーブル（`table[name="仕入れ一覧"]`）の行（listitem）を右クリックし「For Each ループ（各 [listitem] の兄弟）」を選択してください。タイトルラベルやボタンなど一覧以外の要素にループを作ってもスコープが解決できずクリアになりません。',
    ),
    requireRelativeSelector(
      'エレメントファインダーに相対セレクタ（「> ...」形式）を設定し、実行で 2 件以上を反復できた',
      'For Each のエレメントファインダーに相対セレクタ（例: `> listitem`）が自動設定されています。実行して仕入れ一覧の全行が処理されることを確認してください。行を右クリックして「For Each ループ（各 [listitem] の兄弟）」を使うと scope = table・element = `> listitem` が正しく生成されます。',
    ),
    requireDasExtractCount(
      '品目',
      3,
      '品目変数に 3 件以上の抽出結果がある',
      'For Each の body 内で「値を抽出」を追加してください。手順: ① ワークフローの「要素の繰り返し」カード右側にある「(body が空)」の部分をクリックすると body が挿入先（点線ハイライト）になります。② レコーダービューで仕入れ一覧の行テキストを右クリック →「値を抽出」を選択すると、body 内に追加されます。③ 実行して 3 件以上取れているか確認してください。',
    ),
    requireDasNoErrors(
      '実行時にエラーが無い',
      'ステータスビューのエラーを確認してください。For Each のスコープファインダーやエレメントファインダーのセレクタが正しく設定されているか確認してください。',
    ),
  ],
  reveal: (sim) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dasSim = sim as any
    const data = dasSim.data as Record<string, Array<Record<string, string>>>
    // 最も件数の多い変数を探す
    let count = 0
    for (const recs of Object.values(data)) {
      if (recs.length > count) count = recs.length
    }

    return (
      `${count} 件、まるごと収集できました。手作業 20 分 → ロボット 3 秒。\n\n` +
      `ポイントは 2 段構造: スコープファインダーで「どのコンテナを繰り返すか」を決め、エレメントファインダーの「> listitem」で「コンテナ直下の各要素を反復する」と宣言します。\n\n` +
      `件数は今週 ${ITEM_COUNT} 件でしたが、来週 3 件でも 9 件でもロボットの設定変更は不要。アプリ状態（コンテナの件数）に追従する汎用ロボットが完成しました。次は「列が入れ替わっても壊れない」ファインダーの作り方を学びましょう。`
    )
  },
  glossary: ['dasForEach', 'scopeFinder', 'relativeSelector'],
  healthFocus: [5, 6],
  site: { id: 'd4-dummy', url: '', title: '', intro: '', singles: [] },
  checks: [],
}
