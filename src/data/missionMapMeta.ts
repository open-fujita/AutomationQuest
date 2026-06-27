// ============================================================
// missionMapMeta.ts — すごろくMAP（OfficeMapHome）の表示専用メタ
//
// ミッション本体（src/data/missions/*.ts）は編集せず、MAP の見せ方
// （獲得XP・習得スキル名・デスク詳細の一言）だけをここに分離する。
// 各値は対応ミッションの briefing / glossary / healthFocus に基づく。
// 新ミッション追加時はここに 1 エントリ足すだけ。未登録 id は
// DEFAULT_MAP_META でフォールバックする。
// ============================================================

export interface MissionMapMeta {
  /** クリアで得られる XP（レベル算出に使用） */
  xp: number
  /** このミッションで習得する DS/DAS スキルの短い名前 */
  skill: string
  /** デスク詳細モーダルに出す一言（相談の要約） */
  mapBlurb: string
}

export const MISSION_MAP_META: Record<string, MissionMapMeta> = {
  m1: {
    xp: 100,
    skill: 'ロボット起動・抽出',
    mapBlurb:
      '毎朝、社内ポータルのお知らせ見出しを手でコピー。まずはページを読み込み、要素を抽出してロボットの第一歩を踏み出そう。',
  },
  m2: {
    xp: 140,
    skill: 'テーブル一括抽出（要素の繰り返し）',
    mapBlurb:
      'Web の一覧を 1 行ずつコピペしている総務さん。複合型と要素の繰り返しで、テーブルをまるごと一括抽出しよう。',
  },
  m3: {
    xp: 120,
    skill: '値判定（条件で仕分け）',
    mapBlurb:
      '問い合わせ一覧から「未対応」だけを目視で拾うサポート部。値判定で条件に合う行だけを残す仕分けを覚えよう。',
  },
  m4: {
    xp: 160,
    skill: 'ループと仕上げ処理',
    mapBlurb:
      '複数データを集めて締める受注課。繰り返し処理と、保存などの「仕上げ」をセットで組み立てよう。',
  },
  m5: {
    xp: 130,
    skill: '入力・出力変数の受け渡し',
    mapBlurb:
      '値を受け取って結果を返す。入力変数・出力変数を使い、部品のように呼び出せるロボットに仕立てよう。',
  },
  m6: {
    xp: 150,
    skill: '値判定の重ね掛け（二段フィルタ）',
    mapBlurb:
      '「未承認 かつ 高額」だけを役員に回したい経理部。値判定を二段重ねて、ほしいデータにギュッと絞り込もう。',
  },
  s1: {
    xp: 80,
    skill: 'DAS 接続・デバイスマッピング',
    mapBlurb:
      '緑ロボット編のはじまり。Desktop Automation サービス（DAS）につなぎ、デスクトップ操作の自動化を始める準備をしよう。',
  },
  d1: {
    xp: 110,
    skill: '画面操作の自動化（クリック・抽出）',
    mapBlurb:
      '在庫管理システムの画面をロボットが直接操作。Windows アプリのクリック・入力・抽出をそのまま自動化しよう。',
  },
  d2: {
    xp: 120,
    skill: 'ガード（Location Found）で待つ',
    mapBlurb:
      '「何秒待てば押せる」か分からないボタン。固定秒待ちの脆さを知り、ガードで状態をつかんで確実に待とう。',
  },
  d3: {
    xp: 130,
    skill: 'Application Found ガードで割り込み対応',
    mapBlurb:
      'バラバラのタイミングで出る通知ウィンドウ。Application Found ガードで割り込みを捌き、止まらないロボットに。',
  },
  d4: {
    xp: 150,
    skill: 'For Each ＋ 相対セレクタ',
    mapBlurb:
      '週ごとに件数が変わる一覧。For Each とスコープ／相対セレクタで「あるだけ全部」反復する作りにしよう。',
  },
  d5: {
    xp: 140,
    skill: '属性セレクタで堅牢化',
    mapBlurb:
      '列の順番が変わると壊れる座標頼みのロボット。属性ベースのセレクタに直して、変化に強い形へ。',
  },
}

export const DEFAULT_MAP_META: MissionMapMeta = {
  xp: 120,
  skill: '自動化',
  mapBlurb: 'この部署の相談をロボットで解決しよう。',
}

/** 既定のレベルあたり XP */
export const XP_PER_LEVEL = 300

export function getMapMeta(id: string): MissionMapMeta {
  return MISSION_MAP_META[id] ?? DEFAULT_MAP_META
}
