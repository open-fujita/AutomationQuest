// D2: 待ち方を覚える
// 受付システムの「送信」ボタンが N tick 後に有効化される。
// 時間経過ガード（Timeout）だけでは遅い環境で失敗し、
// Location Found ガードで「状態を待つ」パターンの優位性を体験するミッション。

import type { Mission } from '../../model/mission'
import type { MockApp } from '../../model/mockApp'
import { createSeededRng } from '../../model/mockApp'
import {
  requireLocationFoundGuard,
  forbidTimeoutOnly,
  requireGuardMatched,
  requireDasNoErrors,
} from '../../engine/dasValidator'

// シード乱数でボタン有効化の遅延を決定（教育用: シードで「遅い環境」を再現）
// seed=42 → 遅いシードで enableTick=35（Timeout=20 tick だと失敗）
const SEED = 42
const rng = createSeededRng(SEED)
// 20〜40 tick の範囲でボタン有効化タイミングをランダム決定
const ENABLE_TICK = 20 + rng.nextInt(21) // 20〜40

const MOCK_APP: MockApp = {
  id: 'reception-form',
  windowTitle: '受付申請システム',
  widgets: [
    {
      id: 'main-window',
      type: 'window',
      attrs: { title: '受付申請システム', name: '受付申請システム' },
      visible: true,
      children: [
        {
          id: 'label-name',
          type: 'label',
          attrs: { name: '申請者名', class: 'form-label' },
          text: '申請者名',
          visible: true,
          children: [],
        },
        {
          id: 'input-name',
          type: 'textfield',
          attrs: { name: '申請者名入力', value: '山田 太郎', class: 'form-input' },
          text: '山田 太郎',
          visible: true,
          enabled: true,
          children: [],
        },
        {
          id: 'label-reason',
          type: 'label',
          attrs: { name: '申請理由', class: 'form-label' },
          text: '申請理由',
          visible: true,
          children: [],
        },
        {
          id: 'input-reason',
          type: 'textfield',
          attrs: { name: '申請理由入力', value: '備品購入申請', class: 'form-input' },
          text: '備品購入申請',
          visible: true,
          enabled: true,
          children: [],
        },
        // 送信ボタン: tick=0 では enabled:false（システム検証中）
        {
          id: 'btn-submit',
          type: 'button',
          // enabled: false（tick=0 の初期状態。タイムラインで有効化）
          attrs: { name: '送信', class: 'btn-primary' },
          text: '送信',
          visible: true,
          enabled: false,
          children: [],
        },
        {
          id: 'label-status',
          type: 'label',
          attrs: { name: 'ステータス', class: 'status-label' },
          text: 'システム検証中...',
          visible: true,
          children: [],
        },
        // 送信完了ラベル（最初は非表示）
        {
          id: 'label-done',
          type: 'label',
          attrs: { name: '送信完了', class: 'success-label' },
          text: '申請を受け付けました',
          visible: false,
          children: [],
        },
      ],
    },
  ],
  timeline: [
    // ENABLE_TICK で送信ボタンを有効化（システム検証完了）
    { tick: ENABLE_TICK, type: 'enableWidget', widgetId: 'btn-submit' },
    // 有効化後に「準備完了」ラベルを表示
    { tick: ENABLE_TICK, type: 'showWidget', widgetId: 'label-done' },
  ],
}

export const D2: Mission = {
  id: 'd2',
  index: 7,
  title: '待ち方を覚える',
  client: { name: '高田 総務受付', dept: '総務部受付係', portrait: '/img/portrait-reception.png' },
  briefing:
    '受付申請システムの送信ボタン、フォームを開いてすぐは押せないんです。システムが検証中で、しばらく待つと有効になります。「何秒待てばいい」か分からなくて毎回ドキドキしています。ロボットにもこの「待ち」をうまく教えられますか？',
  manualMinutes: 8,
  robotSeconds: 2,
  deductions: [
    {
      id: 'd2-q1',
      question: '「送信ボタンが有効になるまで 5 秒待つ」とロボットに教えたとします。ネットワークが遅い日に送信ボタンの準備に 8 秒かかったら？',
      options: [
        'ロボットは 5 秒待って送信ボタンを押す（成功する）',
        'ロボットは 5 秒後にボタンがまだ無効のまま押そうとする（エラー）',
        '自動的に 8 秒待ってくれる',
      ],
      correctIndex: 1,
      insight:
        '時間経過ガード（固定秒待ち）は、待機時間が短すぎると「まだ準備できていない要素」を操作してエラーになります。環境やシステム負荷で変わる待機時間に固定秒数は対応できません。',
    },
    {
      id: 'd2-q2',
      question: '「送信ボタンが有効になった瞬間に進む」をロボットで実現するには？',
      options: [
        '最大限の秒数（999 秒）を待ってから進む',
        'ガードチョイスで「該当するロケーション（Location Found）」ガードを使う',
        '何度もクリックを繰り返してタイミングを合わせる',
      ],
      correctIndex: 1,
      insight:
        '「該当するロケーション（Location Found）」ガードは、指定した要素が見つかった瞬間に成立します。ボタンが有効化されてファインダーで検出できるようになった瞬間に次のステップへ進みます。固定秒数より速く、かつ壊れにくい。',
    },
    {
      id: 'd2-q3',
      question: 'ガードチョイスに「Location Found（送信ボタンが有効）」と「時間経過 Timeout（60 秒）」の 2 つを設定するのはなぜ？',
      options: [
        '2 つ設定するとより速く動くから',
        'Location Found が主役で Timeout はフォールバック（万が一見つからなくてもエラーにせず続行）',
        'Timeout の方が確実だから、Location Found は飾り',
      ],
      correctIndex: 1,
      insight:
        'ガードチョイスは「最初に成立したガードの枝だけ」を実行します。Location Found が主役で、例外的に長時間待ってもボタンが有効にならなかった場合の保険として Timeout を置きます。推奨パターン: 本命ガード + Timeout の 2 本構成。',
    },
  ],
  goals: [
    '「ガードチョイス」ステップを追加する',
    'ガードに「該当するロケーション（Location Found）」を追加し、送信ボタンのファインダーを設定する',
    '保険として「時間経過（Timeout）」ガードを追加する（既定 60 秒）',
    'Location Found が成立したら「クリック」で送信ボタンを押す処理を組む',
    '実行して、ボタンが有効化されたタイミングで自動的にクリックされることを確認する',
  ],
  // 模擬アプリ
  mockApp: MOCK_APP,
  robotType: 'das',
  dasSeed: (robot) => {
    robot.types.push({ name: '申請結果', kind: 'simple', attributes: [] })
    robot.variables.push({ name: '申請結果', typeName: '申請結果' })
  },
  dasSuggested: {
    actionSequence: ['Windows', 'GuardedChoice', 'Click'],
    requiredGuards: ['locationFound', 'timeout'],
    hint: 'ガードチョイスに「該当するロケーション」（送信ボタンが有効化されるのを待つ）と「時間経過」（フォールバック）を設定し、成立したら「クリック」で送信します。',
  },
  dasChecks: [
    requireLocationFoundGuard(
      '「該当するロケーション（Location Found）」ガードで状態を待つ',
      'ガードチョイスに「該当するロケーション（Location Found）」ガードを追加してください。送信ボタンのファインダーを設定することで、ボタンが有効化されるのを検出できます。',
    ),
    forbidTimeoutOnly(
      '時間経過（Timeout）のみの構成にしない',
      'ガードチョイスに「時間経過（Timeout）」だけ設定しています。これは固定秒待ちと同じで、遅い環境では失敗します。「該当するロケーション（Location Found）」を追加してください。',
    ),
    requireGuardMatched(
      'locationFound',
      '実行時に「該当するロケーション」ガードが成立する',
      '実行してみましょう。Location Found ガードが送信ボタンを検出したとき成立します。ファインダーのセレクタが正しく設定されているか確認してください。',
    ),
    requireDasNoErrors(
      '実行時にエラーが無い',
      'ステータスビューのエラーを確認してください。ガードチョイスの設定（ファインダーのセレクタ等）を見直してください。',
    ),
  ],
  reveal: (sim) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dasSim = sim as any
    const guardResults = dasSim.guardResults ?? []
    const locationFoundResult = guardResults.find(
      (gr: { winnerGuardType: string; tick: number }) => gr.winnerGuardType === 'locationFound',
    )
    const waitedTick = locationFoundResult ? locationFoundResult.tick : ENABLE_TICK

    return (
      `送信ボタンが有効になった瞬間（tick=${waitedTick}）を捉えて、自動的にクリックできました。手作業 8 分 → ロボット 2 秒。\n\n` +
      `ポイントは「固定秒待ち」から「状態待ち（Location Found）」への転換です。今回のボタンは tick=${ENABLE_TICK} で有効化されました。固定秒数を短く設定すると有効化前にクリックしてエラー。長く設定すると無駄に待ちすぎる。\n\n` +
      `「ガードチョイス ＋ Location Found ＋ Timeout（フォールバック）」の組み合わせは、緑ロボットで最もよく使う安定化パターンです。次は「不意のウィンドウ」の対処法を覚えましょう。`
    )
  },
  glossary: ['guard', 'guardedChoice', 'timeout', 'locationFound'],
  site: { id: 'd2-dummy', url: '', title: '', intro: '', singles: [] },
  checks: [],
}
