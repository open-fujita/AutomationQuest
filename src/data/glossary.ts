// ============================================================
// BizRobo! / Design Studio 用語集
// プレイ中に出会った用語が「用語集」に貯まっていく。
// ============================================================

export interface GlossaryEntry {
  key: string
  term: string
  reading?: string
  /** 英語原語（Kapow 由来） */
  en?: string
  desc: string
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  robot: {
    key: 'robot',
    term: 'ロボット',
    en: 'Robot',
    desc: '自動化処理の一単位（.robot ファイル）。ステップの連なり（フロー）として定義する。',
  },
  step: {
    key: 'step',
    term: 'ステップ',
    en: 'Step',
    desc: 'フローを構成する最小の処理ノード。ロボットビューにアイコンで表示され、左→右に連結される。',
  },
  actionStep: {
    key: 'actionStep',
    term: 'アクションステップ',
    en: 'Action Step',
    desc: '最も一般的なステップ。1 つのステップアクション（ページ読込・抽出・クリック等）を実行する。',
  },
  loadPage: {
    key: 'loadPage',
    term: 'ページを読み込む',
    en: 'Load Page',
    desc: '対象 URL のページをブラウザビューに読み込むステップアクション。多くのロボットの起点になる。',
  },
  extract: {
    key: 'extract',
    term: '抽出',
    en: 'Extract',
    desc: 'ページ上の要素（タグ）からテキスト等を取り出し、変数の属性に格納する操作。',
  },
  type: {
    key: 'type',
    term: 'タイプ',
    en: 'Type',
    desc:
      'データ構造の設計図（テンプレート）。どんな属性（項目）を持つかを定義する。複数の名前付き属性を持つ「複合型」と、属性を持たず単一の値だけの「簡易型」がある。入力・出力に使えるのは複合型のみ。',
  },
  variable: {
    key: 'variable',
    term: '変数',
    en: 'Variable',
    desc:
      'タイプに基づいて実際の値を保持する入れ物。必ず 1 つのタイプを持つ。複合型の変数は「変数名.属性」で各値を指す（例: 取引先.会社名）。タイプが設計図、変数がその設計図で作った実体。',
  },
  attribute: {
    key: 'attribute',
    term: '属性',
    en: 'Attribute',
    desc: '複合型タイプが持つ名前付きの項目（フィールド）。表でいう「列」に当たる。完全修飾名「変数名.属性名」で値にアクセスする（例: 取引先.電話）。',
  },
  forEach: {
    key: 'forEach',
    term: '要素の繰り返し',
    en: 'For Each',
    desc: '一覧の各行（タグの集合）に同じ処理を繰り返すループ。これが無いと先頭 1 件しか処理できない。',
  },
  dataState: {
    key: 'dataState',
    term: 'データの状態',
    en: 'Variables View',
    desc: '変数の一覧と実行時の値を表示・管理するビュー。抽出結果がここに現れる。',
  },
  endStep: {
    key: 'endStep',
    term: '終了ステップ',
    en: 'End Step',
    desc: 'ブランチ/フローの末端（×）。新しいステップは終了ステップの前に挿入していく。',
  },
  branch: {
    key: 'branch',
    term: 'ブランチ',
    en: 'Branch',
    desc: '1 つのステップから複数の実行経路を出す分岐。条件やエラーで経路を分ける。',
  },
  testStep: {
    key: 'testStep',
    term: '値判定',
    en: 'Test Step',
    desc: '条件を評価し、満たすかどうかで処理を分けるステップ。一覧の絞り込みに使う。',
  },
  tryStep: {
    key: 'tryStep',
    term: 'トライ-キャッチ',
    en: 'Try-Catch',
    desc: '複数の代替手段を順に試す分岐点。あるやり方が失敗したら次を試す、エラー耐性の中核。',
  },
  snippet: {
    key: 'snippet',
    term: 'スニペット',
    en: 'Snippet',
    desc: '複数ステップを部品化して複数ロボットで共有する機能（.snippet）。共通処理の再利用に使う。',
  },
  debug: {
    key: 'debug',
    term: 'デバッグ / ステップ実行',
    en: 'Debug / Single Step',
    desc: 'ロボットを 1 ステップずつ進めて挙動を確認する実行モード。',
  },
}
