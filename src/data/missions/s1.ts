// S1: セットアップ — DAS につなぐ
//
// 緑ロボット編（D1〜D5）の前に行う事前設定ミッション。
// DAS（Desktop Automation サービス）と DS（Design Studio）を接続する手順を体験する。
//
// フロー:
//   相談票 → 見立てクイズ（2問）→ セットアップ実践（DAS 設定 → DS マッピング → 接続テスト）
//
// SetupMissionCheck（6 件）を使い、初期状態は全チェック false。
// 操作に応じて SetupState が更新され、checks が true に変わる形骸化防止設計。

import type { Mission } from '../../model/mission'
import { buildSetupChecks } from '../../engine/setupChecks'

export const S1: Mission = {
  id: 's1',
  index: 6, // M5(5) の次、D1(7) の直前
  title: 'セットアップ: DAS につなぐ',
  missionKind: 'setup',

  client: {
    name: '橘 蓮',
    dept: '情報システム部',
    portrait: '/img/portrait-it.png',
  },

  briefing: `先日、Windows のデスクトップアプリも自動化できると聞きました。
「緑ロボット」というものを使うと良いそうですが、使い始める前に「Desktop Automation サービス（DAS）」というものを設定しなければならないと言われて……。
DAS の設定はどうやるんですか？ Design Studio からはどうやって接続するんでしょう？
一緒に設定していただけますか？`,

  manualMinutes: 0,
  robotSeconds: 0,

  deductions: [
    {
      id: 's1-q1',
      question: 'DAS の「トークン」は何のために設定するの？',
      options: [
        'パスワードの代わりにログイン認証するため',
        'DS と DAS が「正しい相手と通信している」と確認し合うための合言葉',
        '接続するポート番号を自動で決めるため',
      ],
      correctIndex: 1,
      insight:
        'トークンは DS 側（デバイスマッピング）と DAS 側（シングルユーザータブ）の両方に同じ値を設定することで、「見知らぬ DS から接続してきた」という誤接続を防ぎます。パスワードではなく「合言葉」のイメージです。',
    },
    {
      id: 's1-q2',
      question: '「シングルユーザー」モードはいつ使う？',
      options: [
        '複数の DS から同時に同じ DAS に接続するとき',
        'Design Studio から直接その DAS マシンに接続するとき',
        'RoboServer 経由でバッチ実行するとき',
      ],
      correctIndex: 1,
      insight:
        '「シングルユーザー」モードは Design Studio（開発者の PC）から DAS が動いているマシンへ直接つなぐときに選びます。RoboServer 経由の本番実行では Management Console 接続になります。',
    },
  ],

  goals: [
    'タスクトレイのロボットアイコンから「Desktop Automation サービス」を開く',
    'ホスト名にこのコンピュータのコンピュータ名を入力する',
    '「☑ シングル ユーザー」をオンにして、「シングル ユーザー」タブのトークンを設定する',
    '「保存して再起動」をクリックして設定を反映させる',
    'Design Studio の「ファイル → 新しいオートメーション デバイス マッピング」でマッピングを作成し、ホスト・ポート（49998）・トークン（DAS と同じ値）を入力する',
    '接続テストを実行して「オートメーション デバイス: 利用可能」になることを確認する',
  ],

  // セットアップ専用チェック（6件）
  setupChecks: buildSetupChecks(),

  setupReveal: (_state) => {
    return (
      `接続成功です！ これで Design Studio から DAS マシンを操作できるようになりました。\n\n` +
      `この「デバイスマッピング」が土台になるから、D1 以降の緑ロボットが動きます。\n\n` +
      `覚えておきたい作法: 緑ロボットは必ず「ベーシックエンジンロボット（青ロボット）」から\n` +
      `「ロボットを呼び出す」ステップで呼び出して使います。緑ロボット単体では実行できません。\n\n` +
      `【今回おぼえた用語】\n` +
      `・オートメーションデバイス … DAS が動いている操作対象のマシン\n` +
      `・デバイスマッピング … DS が DAS に接続するための設定（ホスト・ポート・トークン）\n` +
      `・シングルユーザー … DS から直接接続するモード\n` +
      `・トークン … DS と DAS が互いを確認する合言葉`
    )
  },

  glossary: ['deviceMapping', 'singleUser', 'dasToken', 'automationDevice'],

  // 青ロボット用フィールド（型の都合でダミー必須）
  site: {
    id: 's1-dummy',
    url: '',
    title: '',
    intro: '',
    singles: [],
  },
  checks: [],

  // reveal は setupReveal で代替するが型必須のためダミー
  reveal: (_sim) => '',
}
