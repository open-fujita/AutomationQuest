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

  // ---- 緑ロボット（Desktop Automation / DAS）用語 ----------------

  greenRobot: {
    key: 'greenRobot',
    term: '緑ロボット',
    en: 'Robot / Desktop Automation',
    desc: 'Desktop Automation サービス（DAS）で動くロボット。Windows アプリ・Java アプリ・ターミナル・Citrix 等を対象とする。青ロボットと異なり「前方移動のみ」の実行モデルで動作し、ガードチョイスで非同期な状態変化を待機する。',
  },
  das: {
    key: 'das',
    term: 'DAS',
    en: 'Desktop Automation Service',
    desc: '自動化対象（オートメーションデバイス）の Windows マシンにインストールするサービス。Design Studio / RoboServer からデバイスマッピングで接続し、ネイティブ Windows アプリを操作する。',
  },
  automationDevice: {
    key: 'automationDevice',
    term: 'オートメーションデバイス',
    en: 'Automation Device',
    desc: '緑ロボットが操作する対象の Windows マシン。DAS サービスがインストールされており、Design Studio から接続してアプリ要素ツリーを取得・操作する。',
  },
  recorderView: {
    key: 'recorderView',
    term: 'レコーダービュー',
    en: 'Recorder View',
    desc: '緑ロボットのエディタ画面。アプリ画面のライブ表示と利用可能なエレメントのツリーをタブ表示する。要素を右クリック → ステップ挿入（クリック / 値を抽出 / For Each 等）でファインダーが自動生成される。',
  },
  finder: {
    key: 'finder',
    term: 'ファインダー',
    en: 'Finder',
    desc: '緑ロボットが操作対象の要素を特定するための検索条件。4 階層（デバイス / アプリケーション / コンポーネント / イメージ）があり、CSS 風セレクタ（button[name="OK"]、^= 前方一致 / $= 後方一致 / *= 部分一致）で要素を指定する。',
  },
  guard: {
    key: 'guard',
    term: 'ガード',
    en: 'Guard',
    desc: 'ガードチョイスに設定する条件の 1 本。7 種類ある（時間経過 / 該当するロケーション / 該当しないロケーション / 取り除かれたロケーション / 該当するアプリケーション / 該当しないアプリケーション / ツリーの変更停止）。',
  },
  guardedChoice: {
    key: 'guardedChoice',
    term: 'ガードチョイス',
    en: 'Guarded Choice',
    desc: '複数のガード（条件）と関連アクションを設定し、並行監視して最初に成立したガードの枝のみを排他実行する制御フロー。「固定秒待ち（時間経過のみ）」より堅牢な同期処理を実現する。',
  },
  locationFound: {
    key: 'locationFound',
    term: '該当するロケーション（Location Found）',
    en: 'Location Found',
    desc: 'ファインダーが指定した要素をアプリ要素ツリー内で検出したときに成立するガード。ボタンが有効化されるのを待つ等、UI の状態変化に同期する際に使う。固定秒待ち（時間経過）より遅延耐性が高い。',
  },
  applicationFound: {
    key: 'applicationFound',
    term: '該当するアプリケーション（Application Found）',
    en: 'Application Found',
    desc: '指定したアプリケーション（ウィンドウ）が検出されたときに成立するガード。ランダムに出現する通知ウィンドウや別プロセスの起動を待つ用途に使う。',
  },
  treeStoppedChanging: {
    key: 'treeStoppedChanging',
    term: 'ツリーの変更停止',
    en: 'Tree Stopped Changing',
    desc: 'アプリ要素ツリーが指定ミリ秒間変化しなくなったときに成立するガード。描画が完了した「静止」を検出して後続処理を進める。',
  },
  scopeFinder: {
    key: 'scopeFinder',
    term: 'スコープファインダー',
    en: 'Scope Finder',
    desc: 'For Each ループの起点となるツリー部分を特定するファインダー。一意の名前が必須。エレメントファインダーはこのスコープを基点に相対セレクタ（例: "> DIV"）で各子要素を反復する。',
  },
  forEachDas: {
    key: 'forEachDas',
    term: 'For Each（緑ロボット）',
    en: 'For Each Loop',
    desc: '緑ロボットのループ構造。スコープファインダーで起点を特定し、エレメントファインダーの相対セレクタで反復対象の子要素を列挙する。反復中のファインダーは現在要素からの相対参照になり、ツリー変化にも堅牢。',
  },
  treeMode: {
    key: 'treeMode',
    term: 'ツリーモード',
    en: 'Tree Mode',
    desc: 'DAS がアプリ要素ツリーを生成する方法。ISA（インテリジェント スクリーン オートメーション: 画面認識ベース、Citrix/RDP 向け）と Windows オートメーション API（既定）から選択できる。',
  },

  // ---- D1〜D5 で参照する追加用語 --------------------------------

  dasClick: {
    key: 'dasClick',
    term: 'クリック [DAS 版]',
    en: 'Click',
    desc: '緑ロボットで UI 要素（ボタン等）をクリックするステップ。ファインダーで特定した要素を左クリック（既定）/ 右クリック / ダブルクリックできる。対象が enabled:false（無効）の場合はエラーになるため、ガードチョイスでボタンが有効化されてから実行するのが定石。',
  },
  dasExtract: {
    key: 'dasExtract',
    term: '値を抽出 [DAS 版]',
    en: 'Extract Value',
    desc: '緑ロボットで要素の属性値やテキストを変数に格納するステップ。ファインダーで特定した要素から属性（name / value 等）やテキストを取り出す。青ロボットの「抽出」に相当するが、ファインダーが CSS 風セレクタで指定される点が異なる。',
  },
  timeout: {
    key: 'timeout',
    term: '時間経過（Timeout）',
    en: 'Timeout',
    desc: 'ガードチョイスのガード種別のひとつ。指定した秒数（既定 60 秒）が経過したときに成立する。他のガードが成立しなかった場合のフォールバックとして使う。Timeout だけのガードチョイスは「固定秒待ち」と同じで、環境によっては壊れる。',
  },
  applicationNotFound: {
    key: 'applicationNotFound',
    term: '該当しないアプリケーション（Application Not Found）',
    en: 'Application Not Found',
    desc: 'ガードチョイスのガード種別のひとつ。指定したアプリケーション（ウィンドウ）が存在しない場合に成立する。Application Found と組み合わせて「ウィンドウがある場合 / ない場合」の条件分岐を表現できる。',
  },
  notification: {
    key: 'notification',
    term: '通知（ウィンドウ）',
    en: 'Notification',
    desc: '業務システムが不定タイミングで表示するポップアップウィンドウ。出現のタイミングが予測できないため、ガードチョイスの「該当するアプリケーション（Application Found）」ガードで出現を待ち受け、現れたら「閉じる」ボタンをクリックするパターンが定石。',
  },
  dasForEach: {
    key: 'dasForEach',
    term: 'For Each（緑ロボット）[DAS 版]',
    en: 'For Each',
    desc: '緑ロボットのループステップ。スコープファインダーで起点コンテナを特定し、エレメントファインダーの相対セレクタ（例: `> listitem`）で反復対象の各子要素を指定して body を繰り返す。件数が変動するリストや動的に追加される要素にも対応できる。',
  },
  relativeSelector: {
    key: 'relativeSelector',
    term: '相対セレクタ',
    en: 'Relative Selector',
    desc: 'スコープファインダーで指定した起点要素からの相対的な位置でウィジェットを特定するセレクタ形式。「>」で始まり（例: `> listitem`）、起点の直接の子のみを対象にする。For Each のエレメントファインダーで使い、各反復で 1 要素を確実に処理できる。',
  },
  componentFinder: {
    key: 'componentFinder',
    term: 'コンポーネントファインダー',
    en: 'Component Finder',
    desc: 'ファインダー4階層のひとつで最も一般的。ボタン・テキストフィールド・テーブルセル等の UI 要素を CSS 風セレクタで特定する。属性に基づくため、画面の位置（座標）に依存せずレイアウト変更に強い。',
  },
  cssSelector: {
    key: 'cssSelector',
    term: 'CSS 風セレクタ',
    en: 'CSS-like Selector',
    desc: 'ファインダーで要素を特定する記法。`elementName[attr="value"]` の形式で属性を指定する。演算子: `=`（完全一致）/ `^=`（前方一致）/ `$=`（後方一致）/ `*=`（部分一致）/ `>`（直接の子）/ `:nth-child(n)`（位置）。複数属性 AND: `button[visible="true"][name^="Save"]`。',
  },

  // ---- セットアップ（S1）用語 ------------------------------------

  deviceMapping: {
    key: 'deviceMapping',
    term: 'デバイスマッピング',
    en: 'Device Mapping',
    desc: 'Design Studio が DAS（Desktop Automation サービス）に接続するための設定。接続先ホスト名 / IP・コマンドポート（既定 49998）・トークンを指定する。「ファイル → 新しいオートメーション デバイス マッピング」から作成し、シングルユーザーモードではトークンが DAS 側と一致している必要がある。',
  },
  singleUser: {
    key: 'singleUser',
    term: 'シングルユーザー（モード）',
    en: 'Single User Mode',
    desc: 'DAS の接続方式のひとつ。Design Studio（開発者マシン）から DAS が動いているマシンに直接接続する。「Desktop Automation サービス」ダイアログで「☑ シングル ユーザー」をオンにし、「シングル ユーザー」タブのトークンを設定する。RoboServer 経由の本番実行では Management Console 接続になるため不要。',
  },
  dasToken: {
    key: 'dasToken',
    term: 'トークン（DAS 接続）',
    en: 'Token',
    desc: 'DS と DAS が互いを確認するための合言葉。DAS 側（「シングル ユーザー」タブ）と DS 側（デバイスマッピング）の両方に同じ文字列を設定する必要がある。不一致の場合は接続が拒否される。パスワードではなく識別子として使われる。例: DA01 / test / MyToken。',
  },
  healthyRobot: {
    key: 'healthyRobot',
    term: '健康なロボット',
    en: 'Healthy Robot',
    desc: 'RPA Technologies が提唱する「健康なロボットのための10か条」に基づく設計基準を満たしたロボット。コンパクトさ・命名・データ整理・例外処理・環境値の外部化などの観点で保守性と堅牢性を高めたロボットのこと。',
  },
  finder4layers: {
    key: 'finder4layers',
    term: 'ファインダー（4 階層）',
    en: 'Finder (4 Layers)',
    desc: '緑ロボットの要素特定の 4 階層。①デバイスファインダー（接続先マシン）②アプリケーションファインダー（対象ウィンドウ）③コンポーネントファインダー（UI 要素。最も一般的）④イメージファインダー（見た目で検索）。ほとんどのケースでコンポーネントファインダーを使う。',
  },
}
