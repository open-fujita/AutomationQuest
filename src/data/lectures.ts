// ============================================================
// 実機練習編 レクチャーデータ
//
// 「各アクションのマニュアル代わりに WEB アプリで操作方法を習得できるもの」
// アクション単位のレクチャー集。各 Lecture は:
//   - 概要説明: das-spec-notes.md の公式用語・意味論に厳密準拠（捏造禁止）
//   - steps: 3〜6 ステップの操作指示 + done 述語（段階的判定・形骸化禁止）
//
// robotType: 'das' = 緑ロボット（sub.robot で体験）
//            'ds'  = 青ロボット（main_1.robot で体験）
//
// 初期 7 本:
//   緑: ① ブラウザ（ページを開く）② クリック ③ 値を抽出
//        ④ テキストを入力 ⑤ 要素の繰り返し ⑥ ガード チョイス
//   青: ⑦ ロボットを呼び出す（main_1.robot タブで体験）
//
// 「準備中」レクチャーの宣言:
//   アクション名のみ持ち、overview='' / steps=[] で宣言。
//   UI は一覧に名前を出し「準備中」バッジを表示する（マニュアル目次として機能）。
// ============================================================

import type { DasRobot, DasStep, DasAction } from '../model/dasRobot'
import type { Robot, RobotStep } from '../model/robot'

// ---- 型定義 ---------------------------------------------------

/** レクチャー対象のロボット種別 */
export type LectureRobotType = 'das' | 'ds'

/**
 * レクチャーの 1 ステップ。
 * instruction: プレイヤーへの操作指示文（具体的な UI 操作）
 * done: practice 中のロボット状態から完了を判定する純関数。
 *       引数は現在のロボット状態（das or ds）。完了なら true。
 *       形骸化禁止 — 「追加しただけで全部 ✓」にならない段階的判定にすること。
 * hint: 詰まったときのヒント（省略可）
 */
export interface LectureStep {
  id: string
  instruction: string
  /**
   * 完了判定述語。
   * robotType='das' のとき: robot は DasRobot
   * robotType='ds'  のとき: robot は Robot
   * done が null のステップは「操作のみ・判定なし」（読み物系の説明ステップ）。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  done: ((robot: any) => boolean) | null
  hint?: string
}

export interface Lecture {
  id: string
  /**
   * アクションの正式名称（2026.1 公式表記）。
   * DAS_ACTION_LABELS / パレット表示と一致させる。
   */
  actionLabel: string
  /** 対象ロボット種別 */
  robotType: LectureRobotType
  /**
   * 概要説明（das-spec-notes.md の公式用語・意味論に厳密準拠）。
   * 空文字列のとき「準備中」扱い。
   */
  overview: string
  /** 操作手順（3〜6 ステップ）。空配列のとき「準備中」扱い。 */
  steps: LectureStep[]
  /**
   * カタログカテゴリ名（DAS_STEP_CATALOG の name に対応）。
   * 一覧のカテゴリ見出しとして使う。
   * 青ロボット（ds）アクションは 'その他'（ロボットを呼び出す）に対応。
   */
  category: string
}

// ---- ヘルパー関数（done 述語の中で使う） ----------------------

// ---- NOTE: hasDasAction（ネスト含む再帰走査）は現在 done 述語でトップレベル検索のみ使用中のため未使用。
// 将来ネスト内判定が必要になった時点で復活させる。

/** DasRobot から指定型のステップを全件返す（トップレベルのみ） */
function getTopDasSteps(robot: DasRobot, type: DasAction['type']): DasStep[] {
  return robot.steps.filter((s) => s.action.type === type)
}

/** DasRobot にトップレベルステップが存在するか */
function hasDasTopStep(robot: DasRobot, type: DasAction['type']): boolean {
  return robot.steps.some((s) => s.action.type === type)
}

/** 青ロボット（Robot）のトップレベルアクションを探す */
function hasDsAction(robot: Robot, type: string): boolean {
  return robot.steps.some((s) => s.action?.type === type)
}

/** 青ロボット（Robot）から指定アクション型のステップを返す（トップレベルのみ） */
function getDsSteps(robot: Robot, type: string): RobotStep[] {
  return robot.steps.filter((s) => s.action?.type === type)
}

// ---- ガードチョイス判定ヘルパー ------------------------------

/**
 * DasRobot にトップレベルの GuardedChoice ステップがあり、
 * timeout 以外のガード種別が 1 つ以上含まれているか。
 */
function hasGuardedChoiceWithNonTimeout(robot: DasRobot): boolean {
  const gcSteps = getTopDasSteps(robot, 'GuardedChoice')
  for (const step of gcSteps) {
    if (step.action.type !== 'GuardedChoice') continue
    const hasNonTimeout = step.action.guards.some((g) => g.type !== 'timeout')
    if (hasNonTimeout) return true
  }
  return false
}

// ---- NOTE: hasGuardOfType（ネスト含む再帰走査）は現在トップレベルの GuardedChoice のみ
// 対象にしているため未使用。ネスト内ガード判定が必要になった時点で復活させる。

// ---- 7 レクチャーの定義 ---------------------------------------

/**
 * 初期 7 レクチャー。
 *
 * 緑ロボット（DAS）系 6 本:
 *   lec-browser, lec-click, lec-extract, lec-entertext,
 *   lec-foreach, lec-guardedchoice
 *
 * 青ロボット（DS）系 1 本:
 *   lec-callrobot
 */
export const LECTURES: Lecture[] = [
  // ================================================================
  // ① ブラウザ（ページを開く）
  // ================================================================
  {
    id: 'lec-browser',
    actionLabel: 'ブラウザ',
    robotType: 'das',
    category: 'アプリケーション',
    overview: [
      '「ブラウザ」ステップは、緑ロボット（Desktop Automation）で組み込み Chromium ブラウザを開いて',
      '指定した URL のページを読み込むためのステップです。',
      '（公式: 「ブラウザ（組み込み Chromium）」- c_das_browsestep.html）',
      '',
      'フィールド:',
      '  ブラウザ: Chromium（固定）',
      '  アクション: ページ読込 / ページ生成 / ダウンロードを待機',
      '  アプリケーション名: ブラウザウィンドウの識別名（例: web）',
      '  URL: 開きたいページのアドレス',
      '',
      'このステップで開いたブラウザは、後続の「クリック」「値を抽出」「テキストを入力」',
      '「要素の繰り返し」などのステップで操作します。',
    ].join('\n'),
    steps: [
      {
        id: 'lec-browser-s1',
        instruction:
          'パレットの「アプリケーション」カテゴリから「ブラウザ」をクリックして、キャンバスにステップを追加してください。',
        done: (robot: DasRobot) => hasDasTopStep(robot, 'Browser'),
        hint: '左パネルの「アプリケーション」カテゴリを開くと「ブラウザ」が見つかります。',
      },
      {
        id: 'lec-browser-s2',
        instruction:
          '追加された「ブラウザ」ステップカードをクリックして展開し、「アクション」を「ページ読込」に設定してください。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'Browser')
          return steps.some(
            (s) => s.action.type === 'Browser' && s.action.browserAction === 'pageLoad',
          )
        },
        hint: 'カードの▼をクリックすると展開します。アクションのドロップダウンから「ページ読込」を選んでください。',
      },
      {
        id: 'lec-browser-s3',
        instruction:
          '「アプリケーション名」に「web」と入力し、「URL」に開きたいアドレスを入力してください（例: https://example.com）。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'Browser')
          return steps.some(
            (s) =>
              s.action.type === 'Browser' &&
              s.action.applicationName.trim().length > 0 &&
              s.action.url.trim().length > 0,
          )
        },
        hint:
          '「アプリケーション名」はロボット内でこのブラウザウィンドウを識別する名前です。「URL」は開きたいページのアドレスです。',
      },
    ],
  },

  // ================================================================
  // ② クリック
  // ================================================================
  {
    id: 'lec-click',
    actionLabel: 'クリック',
    robotType: 'das',
    category: 'マウスとキーボード',
    overview: [
      '「クリック」ステップは、アプリの画面要素（ボタン・リンク・チェックボックス等）を',
      'クリック操作するためのステップです。',
      '（公式: c_dasclickstep.html）',
      '',
      '要素を特定するには「コンポーネント ファインダー」（CSS 風セレクタ）を使います。',
      '例: button[name="検索"] — name 属性が「検索」のボタン要素',
      '',
      'フィールド:',
      '  コンポーネント: どの要素をクリックするか（ファインダーで指定）',
      '  ボタン: 左クリック（既定）/ 中央 / 右',
      '  カウント: クリック回数（1=シングル / 2=ダブルクリック）',
      '  修飾子: Shift / Ctrl / Alt キーとの組み合わせ',
      '  オフセット: 9 基準点＋X/Y ピクセルのクリック位置調整',
    ].join('\n'),
    steps: [
      {
        id: 'lec-click-s1',
        instruction:
          'パレットの「マウスとキーボード」カテゴリから「クリック」をクリックして、キャンバスにステップを追加してください。',
        done: (robot: DasRobot) => hasDasTopStep(robot, 'Click'),
        hint: '左パネルの「マウスとキーボード」カテゴリを開くと「クリック」が見つかります。',
      },
      {
        id: 'lec-click-s2',
        instruction:
          '「クリック」ステップカードを展開し、コンポーネントのセレクタに要素を指定してください（例: button[name="検索"]）。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'Click')
          return steps.some(
            (s) =>
              s.action.type === 'Click' && s.action.finder.selector.trim().length > 0,
          )
        },
        hint:
          'CSS 風セレクタで要素を指定します。例: button[name="検索"] — name 属性が「検索」のボタン。要素の属性はレコーダービューの要素ツリーで確認できます。',
      },
      {
        id: 'lec-click-s3',
        instruction:
          'ボタンが「左クリック」、カウントが 1 になっていることを確認してください（既定値を確認する）。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'Click')
          // セレクタが設定済み＆ボタン種別はデフォルト左（undefined または 'left'）
          return steps.some(
            (s) =>
              s.action.type === 'Click' &&
              s.action.finder.selector.trim().length > 0 &&
              (s.action.button === undefined || s.action.button === 'left') &&
              (s.action.clickCount === undefined || s.action.clickCount === 1),
          )
        },
        hint: '既定では「左クリック・1回」です。特に変更が不要なら、このまま次へ進んでください。',
      },
    ],
  },

  // ================================================================
  // ③ 値を抽出
  // ================================================================
  {
    id: 'lec-extract',
    actionLabel: '値を抽出',
    robotType: 'das',
    category: '抽出',
    overview: [
      '「値を抽出」ステップは、アプリの要素から情報を取り出して変数に格納するステップです。',
      '（公式: c_dasextractvalue.html）',
      '',
      '抽出タイプ:',
      '  属性    : 要素の特定属性値を取り出す（例: value 属性でテキストフィールドの内容）',
      '  拡張属性: DAS 拡張属性（der_ 接頭辞なしで指定）',
      '  テキスト: 要素の表示テキスト（子要素含む or 含まない を選択）',
      '',
      'エクスプレッションを評価: 取り出した値を式で変換できます（例: $initial.integer()）。',
      '現在のインを保存: 抽出した値を格納する変数を指定します。複数保存も可能です。',
    ].join('\n'),
    steps: [
      {
        id: 'lec-extract-s1',
        instruction:
          'パレットの「抽出」カテゴリから「値を抽出」をクリックして、キャンバスにステップを追加してください。',
        done: (robot: DasRobot) => hasDasTopStep(robot, 'ExtractValue'),
        hint: '左パネルの「抽出」カテゴリを開くと「値を抽出」が見つかります。',
      },
      {
        id: 'lec-extract-s2',
        instruction:
          '「値を抽出」ステップカードを展開し、コンポーネントのセレクタに抽出元の要素を指定してください（例: textfield[name="在庫数表示"]）。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'ExtractValue')
          return steps.some(
            (s) =>
              s.action.type === 'ExtractValue' && s.action.finder.selector.trim().length > 0,
          )
        },
        hint: 'セレクタ例: textfield[name="在庫数表示"] — name 属性が「在庫数表示」のテキストフィールド。',
      },
      {
        id: 'lec-extract-s3',
        instruction:
          '「現在のインを保存」（格納先変数）に変数名を入力してください（例: 在庫情報）。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'ExtractValue')
          return steps.some(
            (s) =>
              s.action.type === 'ExtractValue' &&
              s.action.finder.selector.trim().length > 0 &&
              s.action.toVariable.trim().length > 0,
          )
        },
        hint:
          '変数名はロボット内で自由に決められます。ここでは「在庫情報」と入力してみましょう。',
      },
    ],
  },

  // ================================================================
  // ④ テキストを入力
  // ================================================================
  {
    id: 'lec-entertext',
    actionLabel: 'テキストを入力',
    robotType: 'das',
    category: 'マウスとキーボード',
    overview: [
      '「テキストを入力」ステップは、アプリのテキストフィールドや入力欄に文字列を',
      '送り込むためのステップです。',
      '（公式: c_dasentertextstep.html）',
      '',
      'テキストフィールド:',
      '  ・直接入力: テキスト欄に入力したい文字列をそのまま書く',
      '  ・変数参照: 等号プレフィックス（= ）で変数から取得する（例: =InputVariable）',
      '',
      'ファインダーで入力先の要素（テキストフィールド等）を CSS 風セレクタで指定します。',
      '',
      '使い所: フォームへの入力、検索ボックスへのキーワード入力など。',
    ].join('\n'),
    steps: [
      {
        id: 'lec-entertext-s1',
        instruction:
          'パレットの「マウスとキーボード」カテゴリから「テキストを入力」をクリックして、キャンバスにステップを追加してください。',
        done: (robot: DasRobot) => hasDasTopStep(robot, 'EnterText'),
        hint: '左パネルの「マウスとキーボード」カテゴリを開くと「テキストを入力」が見つかります。',
      },
      {
        id: 'lec-entertext-s2',
        instruction:
          '「テキストを入力」ステップカードを展開し、ファインダーのセレクタに入力先の要素を指定してください（例: textfield[name="品目コード入力"]）。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'EnterText')
          return steps.some(
            (s) =>
              s.action.type === 'EnterText' && s.action.finder.selector.trim().length > 0,
          )
        },
        hint:
          'セレクタ例: textfield[name="品目コード入力"] — name 属性が「品目コード入力」のテキストフィールド。',
      },
      {
        id: 'lec-entertext-s3',
        instruction:
          '「テキスト」欄に入力したい文字列を入力してください（例: ITEM-0042）。または「=変数名」形式で変数参照も試してみましょう。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'EnterText')
          return steps.some(
            (s) =>
              s.action.type === 'EnterText' &&
              s.action.finder.selector.trim().length > 0 &&
              s.action.text.trim().length > 0,
          )
        },
        hint:
          '固定文字列の例: ITEM-0042。変数参照の例: =QueryVariable（= で始めると変数から取得）。',
      },
    ],
  },

  // ================================================================
  // ⑤ 要素の繰り返し（For Each）
  // ================================================================
  {
    id: 'lec-foreach',
    actionLabel: '要素の繰り返し',
    robotType: 'das',
    category: 'ループ',
    overview: [
      '「要素の繰り返し」ステップ（For Each）は、アプリのツリーにある複数の要素を',
      '1 件ずつ反復処理するためのステップです。',
      '（公式: c_foreachloopstep.html）',
      '',
      '2 段構造のファインダー:',
      '  スコープ ファインダー: 反復の起点となるコンテナ要素（テーブル・リスト等）を特定する。',
      '                        ステップ内で一意の名前が必要。',
      '  要素ファインダー    : スコープ内の反復対象を特定する相対セレクタ（例: > DIV）。',
      '                        スコープと結合されると DIV[class="someClass"] > DIV のようになる。',
      '',
      'ループ本体（body）内のファインダーは検出要素からの相対参照になるため、',
      '反復ごとに堅牢な動作をします。',
      '',
      '注意: 反復中にツリーが変化して新要素が出た場合、現在位置との相対位置次第で',
      '反復に含まれたり含まれなかったりします。',
    ].join('\n'),
    steps: [
      {
        id: 'lec-foreach-s1',
        instruction:
          'パレットの「ループ」カテゴリから「要素の繰り返し」をクリックして、キャンバスにステップを追加してください。',
        done: (robot: DasRobot) => hasDasTopStep(robot, 'ForEach'),
        hint: '左パネルの「ループ」カテゴリを開くと「要素の繰り返し」が見つかります。',
      },
      {
        id: 'lec-foreach-s2',
        instruction:
          '「要素の繰り返し」ステップカードを展開し、「スコープ ファインダー」のコンポーネントセレクタに起点コンテナの要素を指定してください（例: listview[name="仕入れ一覧"]）。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'ForEach')
          return steps.some(
            (s) =>
              s.action.type === 'ForEach' &&
              s.action.scopeFinder.selector.trim().length > 0,
          )
        },
        hint:
          'スコープファインダーは「反復の起点となる親要素」を特定します。リストやテーブルのコンテナ要素を指定してください。',
      },
      {
        id: 'lec-foreach-s3',
        instruction:
          '「要素ファインダー」の相対セレクタに反復したい子要素のセレクタを入力してください（例: > listitem）。「> 」で始めると相対セレクタになります。',
        done: (robot: DasRobot) => {
          const steps = getTopDasSteps(robot, 'ForEach')
          return steps.some(
            (s) =>
              s.action.type === 'ForEach' &&
              s.action.scopeFinder.selector.trim().length > 0 &&
              s.action.elementFinder.selector.trim().startsWith('>'),
          )
        },
        hint:
          '相対セレクタは「> 」で始めます（例: > listitem）。スコープの直接子ノードを反復対象にします。',
      },
    ],
  },

  // ================================================================
  // ⑥ ガード チョイス
  // ================================================================
  {
    id: 'lec-guardedchoice',
    actionLabel: 'ガード チョイス',
    robotType: 'das',
    category: '条件と制御',
    overview: [
      '「ガード チョイス」ステップは、複数のガード（条件）を並行監視して、',
      '最初に成立したガードの枝だけを排他実行するステップです。',
      '（公式: c_dasguardedchoicestep.html、das-spec-notes.md §3.4）',
      '',
      'ガード 7 種（公式用語）:',
      '  時間経過（Timeout）                  : 指定秒数の経過で成立（既定 60 秒）',
      '  該当するロケーション（Location Found）: ファインダーが要素を検出したら成立',
      '  該当しないロケーション（Location Not Found）: 要素が見つからない場合に成立',
      '  取り除かれたロケーション（Location Removed）: 要素検出後、それが除去されたら成立',
      '  該当するアプリケーション（Application Found）: アプリが見つかるまで待機して成立',
      '  該当しないアプリケーション（Application Not Found）: アプリ未検出で成立',
      '  ツリーの変更停止（Tree Stopped Changing）: 指定ミリ秒間のツリー静止で成立',
      '',
      '推奨パターン: 「本命ガード（例: 該当するロケーション）＋ 時間経過（Timeout）」の 2 本構成。',
      '時間経過のみだと遅い日に壊れる（「固定秒待ちは脆い」）。状態を待つほうが堅牢。',
    ].join('\n'),
    steps: [
      {
        id: 'lec-guardedchoice-s1',
        instruction:
          'パレットの「条件と制御」カテゴリから「ガード チョイス」をクリックして、キャンバスにステップを追加してください。',
        done: (robot: DasRobot) => hasDasTopStep(robot, 'GuardedChoice'),
        hint: '左パネルの「条件と制御」カテゴリを開くと「ガード チョイス」が見つかります。',
      },
      {
        id: 'lec-guardedchoice-s2',
        instruction:
          '「ガード チョイス」ステップカードを展開して確認してください。既定で「時間経過（60秒）」ガードが 1 本入っています。「時間経過のみ」は遅い日に壊れるパターンです。',
        // 展開確認のみ（UI 確認ステップ）— GuardedChoice が存在すれば次へ進める
        done: (robot: DasRobot) => hasDasTopStep(robot, 'GuardedChoice'),
        hint: 'カードの▼をクリックして展開してください。ガード一覧が縦に並んで表示されます。',
      },
      {
        id: 'lec-guardedchoice-s3',
        instruction:
          'カード内の「＋」（ガードを追加）をクリックして、「時間経過」以外のガード（例: 該当するロケーション）を追加してください。',
        done: (robot: DasRobot) => hasGuardedChoiceWithNonTimeout(robot),
        hint:
          '「＋」ボタンがガードレーン間に表示されます。追加後、ドロップダウンで「該当するロケーション（Location Found）」を選んでください。',
      },
      {
        id: 'lec-guardedchoice-s4',
        instruction:
          '「該当するロケーション」ガードのコンポーネントファインダーにセレクタを入力してください（例: button[name="完了"]）。これで「ボタンが現れたら」という条件になります。',
        done: (robot: DasRobot) => {
          const gcSteps = getTopDasSteps(robot, 'GuardedChoice')
          for (const step of gcSteps) {
            if (step.action.type !== 'GuardedChoice') continue
            const foundGuard = step.action.guards.find(
              (g) =>
                g.type === 'locationFound' &&
                g.finder !== undefined &&
                g.finder.selector.trim().length > 0,
            )
            if (foundGuard) return true
          }
          return false
        },
        hint:
          '「該当するロケーション」ガードにはファインダーが必須です。待ちたい要素を CSS 風セレクタで指定してください。',
      },
    ],
  },

  // ================================================================
  // ⑦ ロボットを呼び出す（青ロボット・main_1.robot タブで体験）
  // ================================================================
  {
    id: 'lec-callrobot',
    actionLabel: 'ロボットを呼び出す',
    robotType: 'ds',
    category: 'その他',
    overview: [
      '「ロボットを呼び出す」ステップは、青ロボット（Basic Engine Robot）から',
      '緑ロボット（Desktop Automation Robot）を呼び出すためのアクションステップです。',
      '（公式: ロボット構築の概要 c_intro_robot_building.html）',
      '',
      '青ロボットと緑ロボットの連携:',
      '  青ロボットは Web ページの自動化が得意で、緑ロボットは Windows アプリや',
      '  デスクトップの自動化が得意です。両者を組み合わせることで、',
      '  Web → Windows アプリ → Web の複合的な自動化が実現できます。',
      '',
      'プロパティペイン（アクションタブ）:',
      '  アクション: ロボットを呼び出す ▼',
      '  ロボット: 呼び出す緑ロボット名を選択 ▼',
      '  「開く」ボタン: 対象の緑ロボットを別タブで開く',
      '  入力値: 緑ロボットに渡す入力値の一覧（⊕⊖↑↓で追加・削除・並べ替え）',
      '',
      '実機 main_1.robot は「Call sub」という 1 ステップで sub.robot を呼び出しています。',
    ].join('\n'),
    steps: [
      {
        id: 'lec-callrobot-s1',
        instruction:
          'タブバーの「main_1.robot」タブをクリックして、青ロボットエディタに切り替えてください。「Call sub」ステップが表示されます。',
        // main_1 には既に CallRobot ステップが存在する（シードで設定済み）— 確認ステップ
        done: (robot: Robot) => hasDsAction(robot, 'CallRobot'),
        hint: 'ファイルタブの「main_1.robot」をクリックしてください。',
      },
      {
        id: 'lec-callrobot-s2',
        instruction:
          '「Call sub」ステップをクリックして選択し、右の「プロパティ」ペインで「アクション」タブを確認してください。「ロボットを呼び出す」アクションと「ロボット: sub ▼」が表示されています。',
        // CallRobot ステップの robotName が 'sub' — プロパティを確認
        done: (robot: Robot) => {
          const steps = getDsSteps(robot, 'CallRobot')
          return steps.some(
            (s) => s.action?.type === 'CallRobot' && s.action.robotName === 'sub',
          )
        },
        hint:
          '「Call sub」ステップをクリックすると、右ペインに「ロボットを呼び出す」プロパティが表示されます。',
      },
      {
        id: 'lec-callrobot-s3',
        instruction:
          'プロパティペインの「開く」ボタンをクリックして、sub.robot のタブを開いてください。緑ロボットのキャンバスに切り替わります。',
        // 「開く」ボタンを押してタブが切り替わる — ロボット状態では判定が難しいため
        // CallRobot ステップが存在する＝このレクチャー完了とみなす
        done: (robot: Robot) => hasDsAction(robot, 'CallRobot'),
        hint:
          'プロパティペインの「ロボット: sub」の右にある「開く」ボタンをクリックしてください。sub.robot タブが開きます（またはフォーカスが移動します）。',
      },
    ],
  },
]

// ---- 準備中レクチャー（マニュアル目次として一覧に表示）--------

/**
 * 未実装レクチャーの宣言リスト。
 * overview / steps が空なので UI では「準備中」バッジを表示する。
 * アクション名とカテゴリだけ定義することで、マニュアル目次として機能する。
 */
export const LECTURES_COMING_SOON: Pick<Lecture, 'id' | 'actionLabel' | 'robotType' | 'category'>[] = [
  // 緑ロボット系
  { id: 'lec-windows',        actionLabel: 'Windows',           robotType: 'das', category: 'アプリケーション' },
  { id: 'lec-loop',           actionLabel: 'ループ',            robotType: 'das', category: 'ループ' },
  { id: 'lec-condition',      actionLabel: '条件',              robotType: 'das', category: '条件と制御' },
  { id: 'lec-group',          actionLabel: 'グループ',          robotType: 'das', category: '条件と制御' },
  { id: 'lec-throw',          actionLabel: 'スロー',            robotType: 'das', category: '条件と制御' },
  { id: 'lec-return',         actionLabel: 'リターン',          robotType: 'das', category: '条件と制御' },
  { id: 'lec-assign',         actionLabel: '割り当て',          robotType: 'das', category: '割り当てと変換' },
  { id: 'lec-trycatch',       actionLabel: 'トライ-キャッチ',   robotType: 'das', category: '条件と制御' },
  { id: 'lec-whileloop',      actionLabel: '条件付きループ',    robotType: 'das', category: 'ループ' },
  { id: 'lec-break',          actionLabel: 'ブレイク',          robotType: 'das', category: 'ループ' },
  { id: 'lec-continue',       actionLabel: 'コンテニュー',      robotType: 'das', category: 'ループ' },
]

// ---- ヘルパー --------------------------------------------------

/** レクチャー ID からレクチャーを返す */
export function getLecture(id: string): Lecture | undefined {
  return LECTURES.find((l) => l.id === id)
}

/** カテゴリ名でグループ化して返す（DAS_STEP_CATALOG のカテゴリ順に準拠） */
export function getLecturesByCategory(): Map<string, Lecture[]> {
  const map = new Map<string, Lecture[]>()
  for (const lec of LECTURES) {
    const arr = map.get(lec.category) ?? []
    arr.push(lec)
    map.set(lec.category, arr)
  }
  return map
}

/**
 * レクチャーが「準備中」かどうかを返す。
 * overview が空文字列 または steps が空配列のとき「準備中」。
 */
export function isComingSoon(lec: Lecture): boolean {
  return lec.overview.trim().length === 0 || lec.steps.length === 0
}

/**
 * 指定ステップの完了判定を呼び出す。
 * done が null のステップは常に true（操作のみのステップ）。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function checkLectureStep(step: LectureStep, robot: any): boolean {
  if (step.done === null) return true
  try {
    return step.done(robot)
  } catch {
    return false
  }
}
