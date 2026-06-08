---
index: "[[INDEX]]"
---

# ds-real-ui-notes — 実機 Design Studio の画面学習メモ

> 親 INDEX: [[INDEX]]

実機 BizRobo! Design Studio（BizRobo Basic 11.5.0.5 / Tungsten RPA 2025.2.1.0、起動中の `main_1.robot`）の
ウィンドウを `tools/capture-ds.ps1` でキャプチャ（`.capture/ds-real.png`）し、実画面から学んだ正規レイアウトと用語を記録する。
ゲームの忠実度を上げるための一次情報。

## 全体レイアウト（実機）
```
┌ タイトルバー: Design Studio - <プロジェクト> - <robotパス> - スマート再実行 (フル) ────────────┐
├ メニュー: ファイル(F) 編集(E) 表示(V) デバッグ(D) ツール(T) 設定(S) ウィンドウ(W) ヘルプ(H) ┤
├ ツールバー: [開く/保存/全保存] [取消/やり直し] [切取/コピー/貼付/削除] [ステップ挿入系] …    ┤
│              [デバッグ系] …                          右側 → [🔍 検索ボックス] < >  Aa  ✕       │
├───────────────┬──────────────────────────────────────────────┬──────────────────────────────┤
│ マイ プロジェクト │ [デザイン] [デバッグ]  ← モード切替タブ          │ プロパティ                    │
│  Local         │ [🏠紹介 ✕][main_1.robot* ✕] ← ファイルタブ      │  [基本][ファインダー]          │
│   connector    │                                                │  [アクション][エラー処理]      │
│    Difi…connector│   ┌── ロボットビュー（フローキャンバス）──┐    │  アクションを選択 ▼            │
│    main_1.robot*│   │  ▸(開始) → [⬛(名前がありません)⚠]      │    │  （アクション設定の大エリア）  │
│    sub.robot    │   │            → [▥ Call sub] → ⊗(終了)    │    │                              │
│   Design Studio │   │  （アイコンが上・名前が下・横向き矢印）  │    ├──────────────────────────────┤
│    データベース  │   └────────────────────────────────────┘    │ データの状態                  │
│  Management Con.│                                                │  [変数][フレーム]              │
│  windows_mc     │                                  100% ⌄        │  （左:変数リスト｜右:値）       │
│  tmp(...)       │                                                │  ＋ － ▲ ▼ 🗑                  │
├───────────────┴──────────────────────────────────────────────┴──────────────────────────────┤
│ [▸アプリケーション]                              ステータス: 準備が完了しました。        ● 緑 │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 実機から判明した正規仕様（重要）
1. **右パネルは上が「プロパティ」、下が「データの状態」**。プロパティは 4 タブ＝**基本 / ファインダー / アクション / エラー処理**。
   - ステップのアクションは「**アクションを選択 ▼**」ドロップダウンから選ぶ（カタログ式）。
2. **中央上部にモード切替タブ「デザイン / デバッグ」**、その下に**ファイルタブ**（紹介・各 .robot、`*` は未保存）。
3. **ステップ描画**: アイコンが上・**ステップ名が下**、**横向き矢印**で連結。開始＝左端の小マーカー、終了＝**⊗（×丸）**。
   無名ステップは「**(名前がありません)**」と表示。設定不備は**黄色の警告バッジ**がアイコンに重なる。
4. **ブラウザ/対象アプリは常時表示ではなく、左下「アプリケーション」タブ**で切り替える（このロボットは web を持たないため非表示）。
5. **マイ プロジェクト**は Local 配下にプロジェクト・**.connector（コネクタ/デバイス）**・robot・**Design Studio データベース**、さらに **Management Console 接続**（localhost / windows_mc / tmp）まで含む。
6. **ツールバーが主操作系**（保存・取消/やり直し・切取/コピー/貼付・ステップ挿入・デバッグ）。右端に検索（Aa＝大小区別）。
7. 下部に**ステータスバー**（「準備が完了しました。」）と緑の稼働インジケータ。ズームは canvas 右下「100% ⌄」。
8. 「**Call sub**」＝別ロボット呼び出しステップ（box アイコン）。

## ゲーム（現状）との差分
| 観点 | 実機 DS | 現状ゲーム | 対応方針 |
|---|---|---|---|
| 右パネル順 | 上=プロパティ / 下=データの状態 | 上=データの状態 / 下=ステップビュー | **上下を入替**し名称を「プロパティ」に |
| プロパティ構造 | 基本/ファインダー/アクション/エラー処理 の 4 タブ + 「アクションを選択 ▼」 | 単一のステップビューに直接フィールド | **4 タブ化**＋アクション選択ドロップダウン化 |
| ステップ描画 | アイコン上・名前下・横矢印・開始小マーカー・終了⊗ | カード型ノード（名前+要約） | 開始/終了の見た目とアイコン上/名前下に寄せる |
| モード切替 | デザイン/デバッグ タブ | デバッグはツールバーのボタン | デザイン/デバッグ タブを追加検討 |
| ブラウザ表示 | 「アプリケーション」タブで切替（常時ではない） | 常時 4 領域に表示 | 学習簡素化のため常時表示は許容（差分として明記） |
| マイプロジェクト | コネクタ/DB/MC 接続まで | プロジェクト+robot+型 | 学習に不要な範囲は簡略可（雰囲気は寄せる） |
| 用語 | 「プロパティ」「アクションを選択」「データの状態」「(名前がありません)」 | 一部独自 | 正規文言に合わせる |

## 追加で撮りたい画面（さらなる忠実度のため）
- web スクレイピング系ロボットを開いた状態（**アプリケーション/ブラウザビュー + 抽出**の見え方）
- 「**アクションを選択 ▼**」を開いたアクションカタログ（ステップアクションの正式名称一覧）
- **デバッグ**モードの画面（実行中の変数値・ハイライト）
- **データの状態**に変数が入った状態（変数/フレームの表示）

> 再キャプチャ: `pwsh -File tools/capture-ds.ps1 <出力名.png>`（DS を起動しておく）

---

## 実ロボット XML から学んだ正規のステップアクション体系・フローモデル
出典: `C:\RPA\My Robots\DPC一覧取得ロボ\Library\` の実 .robot / .type（BizRobo 11.4）を直読。

### フローモデル（最重要・実機の本質）
- ロボットは `Transition`（=ステップ）と `BranchPoint`（=分岐点 ○）と `End`（=終了 ×）を `TransitionEdge`（from→to）でつないだ**有向グラフ**。
- **BranchPoint（○）は複数の出力エッジ＝複数ブランチに分岐**し、各ブランチは**上から順に実行**される。
  例（データ抽出.robot）: `Open Excel → Load Page → ○分岐 →（A）For Each Tag…ループ →（B）Write File`。
  Aブランチが End に達するまで実行 → 次にBブランチ（Write File）が実行される。
- **End（×）はロボット終了ではなく「直近の分岐点の次ブランチ or 直近ループの次イテレーションへ制御を戻す」**。これが DS 初心者の最難関。
- **ループ本体＝ループステップの後ろ〜End まで**。End に達するとループ先頭に戻り次の行を処理。
  → ゲームの「ForEach 以降の抽出が各行に作用」モデルは実機と整合（設計の妥当性を確認）。

### 実在するステップアクション（class 名＝正規）
| 分類 | stepAction class | 役割 / 備考 |
|---|---|---|
| Web | `LoadPage2` | ページを読み込む。URL は固定値(ValueURLProvider2) or 変数(AttributeURLProvider2) |
| Web 抽出 | `Extract` | DOM テキスト抽出 → 変数属性（例 `取得情報.dpc_name`） |
| Web 抽出 | `ExtractURL` | リンク URL を抽出 |
| Web ループ | `ForEachTag` | タグ（tag="tr" 等）を繰り返す。finder で対象範囲（tbody 等）を指定 |
| Web 条件 | `TestTag` | タグ内容を正規表現判定。errorHandler.controlFlow=`NextIteration` で「条件一致なら次の行へスキップ」＝フィルタリング |
| Web | `SetNamedTag` | DOM 要素に名前付きタグを付与（後続 finder の基点に） |
| 変数 | `AssignVariable` | 変数に式を代入。式は `+` 連結・変数参照・文字列リテラル。空代入で「初期化」 |
| 変数 | `ReturnVariable` | 戻り値（return-variables）を返す |
| Excel | `LoadFile` | ファイル（xlsx）を変数に読み込む |
| Excel | `OpenVariable` | 変数（Excel）を開く |
| Excel ループ | `LoopInExcel` | Excel 行/列ループ（loopDirection=ROWS/COLUMNS） |
| Excel 抽出 | `ExtractCell` | セルを抽出。finder=ExcelElementFinder（列 offset 指定） |
| Excel 書込 | `InsertRows` / `SetContentOfRow` / `SetContentOfCell` | 行挿入 / 行に変数を書込 / セルに書込 |
| ファイル | `WriteFile` | 変数内容をファイル保存（encoding=windows-31j 等） |
| ウィンドウ | `SetCurrentWindow` | 操作対象ウィンドウ（ブラウザ/Excel）を切替 |

### ファインダー（ファインダータブの実体）
各ステップは `elementFinders` で対象を特定する。
- **DOM**: `DefaultNamedElementAwareDOMElementFinder` … `nodePath`（例 `.*.div.table.tbody` / `.*.td[2]` / `.*.a`）、`tagRelation=InTagRelation`（ループ中タグ基準）、`attributeName`/`attributeValue`（id=table_fuku 等）。
- **Excel**: `ExcelElementFinder` … `SpecifiedRangeCellFinderDetail`(range "Sheet!") / `NamedRangeCellFinderDetail`(ColumnFromRange + 列 offset)。

### タイプ（.type）
`Type > attributes[]`。各属性 = name + type（`StringAttributeType` / `TextAttributeType`）+ recordFieldType(Text)。
例 取得情報.type: dpc_code / dpc_name / search_words / tmp_word / url。
変数は `typed-variable name=型名`、戻り値は `return-variables`、Excel は simpleTypeId=150 の簡易型 `excel`（global=true）。

### ゲームへの示唆（追補）
- **正規アクション名で統一**: 抽出は対象により `Extract`(DOMテキスト) / `ExtractURL` / `ExtractCell`(Excel)。ページは `LoadPage`。ループは web=`ForEachTag` / Excel=`LoopInExcel`。
- **分岐点 ○ と End の意味**（分岐＝複数ブランチ順次実行、End＝分岐点/ループへ戻る）は M4 以降の中核教材にすると実機理解に直結。
- **テスト＝条件一致で NextIteration（次の行へスキップ）** という挙動はフィルタリングの典型。M4 の設計に反映可。
- ゲームの線形＋ForEach モデルは初学者向けに妥当。忠実度は「用語・画面レイアウト・ステップ描画・プロパティ4タブ」を優先的に寄せるのが費用対効果が高い。
