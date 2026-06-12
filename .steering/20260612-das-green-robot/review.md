---
index: "[[INDEX]]"
tags: [type/review]
created: 2026-06-12
---

# review.md — 第2弾 DAS 緑ロボット編 レビュー報告

> 親 INDEX: [[INDEX]]

## 総合判定

- [x] **APPROVE**
- [ ] CHANGES_REQUESTED
- [ ] BLOCKED

第1弾を壊さず、緑ロボット編 D1〜D5 を後方互換で追加できている。静的チェック 3 種すべてグリーン、受け入れ条件はコードリーディングとユニットテストで充足を確認、ガードチョイス意味論・For Each・正規日本語用語の仕様忠実性も満たす。必須修正なし。

---

## 静的チェック結果（Reviewer が独立再実行）

| チェック | コマンド | 結果 |
|---|---|---|
| 型チェック | `npx tsc -b` | ✅ エラー 0 件（exit 0、出力なし） |
| テスト | `npx vitest run` | ✅ 2 ファイル / **77 passed**（既存 `engine.test.ts` 12 + 新規 `das.engine.test.ts` 65） |
| ビルド | `npm run build` | ✅ `tsc -b && vite build` 成功（243 modules、8.56s） |

- バンドルサイズ警告（542.96 kB）は `@xyflow/react` 由来の既存事象であり今回追加分とは無関係。受け入れ条件は `npm run typecheck && npm run build && npm run test` の 0 エラーであり、警告は判定に影響しない。
- `package.json` の scripts は `typecheck`=`tsc -b` / `test`=`vitest run` を確認（要件 L38 のコマンドと一致）。

---

## 受け入れ条件チェック

### 全 D 相談共通

| # | 条件 | 結果 | 備考 |
|---|---|---|---|
| 1 | ホームに「緑ロボット編」が表示され標準フローでプレイ可能 | ✅ | `HomeScreen.tsx:163-200` で `robotType==='das'` グループ表示。`App.tsx` が `mission.robotType==='das'` で `DasWorkspaceLayout` に分岐 |
| 2 | M1〜M5 のリグレッションなし | ✅ | `git diff HEAD` で `robot.ts`/`simulator.ts`/`validator.ts`/`stepStatus.ts`/`m1〜m5.ts`/`engine.test.ts` が**無変更**。既存 12 テスト全 pass |
| 3 | クリア時 glossary 登録・localStorage 進捗記録 | ✅ | D1〜D5 全 glossary キーが `glossary.ts` に存在（スクリプトで突合、欠落なし）。進捗は既存 `gameStore` の completedSet 機構を共用 |
| 4 | `typecheck && build && test` が 0 件 | ✅ | 上表のとおり 3 種すべてグリーン |

### D1「はじめての緑ロボット」

| # | 条件 | 結果 | 備考 |
|---|---|---|---|
| D1-1 | OpenWindow/レコーダー/Click/ExtractValue で目標値抽出・成功 | ✅ | `d1.ts` MockApp（在庫管理システム v2.1、在庫数 128）+ `dasChecks`=requireOpenWindow/Click/ExtractValue/NoErrors。`das.engine.test.ts` requireOpenWindow 境界テストで検証 |
| D1-2 | 構造ベース判定（名前完全一致を要求しない） | ✅ | `dasValidator.ts` の `requireDasAction`/`requireOpenWindow` はアクション種別・windowTitle で判定、ステップ名に非依存 |

### D2「待ち方を覚える」

| # | 条件 | 結果 | 備考 |
|---|---|---|---|
| D2-1 | 固定秒（timeout のみ）で遅いシードで失敗 | ✅ | `das.engine.test.ts:314` 「Timeout のみ（短い待ち）で組むと遅いシードで失敗」: timeout 成立後 Click で `errors>0` |
| D2-2 | LocationFound+Timeout の 2 本構成で遅短どちらも成功 | ✅ | `das.engine.test.ts:341` で `errors===0`、locationFound が winner |
| D2-3 | 並行監視・最初成立・排他実行・Timeout 既定60秒 | ✅ | `dasSimulator.ts:404-453` で各 tick 全ガード並行評価→最初成立で break→winner.steps のみ実行。既定 `defaultTimeoutTick=60`（L93/388）。`das.engine.test.ts:436,1076` で 60tick フォールバックと排他実行を検証 |

### D3「不意の来客」

| # | 条件 | 結果 | 備考 |
|---|---|---|---|
| D3-1 | ApplicationFound なし構成で通知出現試行が失敗扱い | ✅ | `d3.ts` の `dasChecks` に requireApplicationFoundGuard を含むため未設定だと判定 false。`das.engine.test.ts:485` で検証 |
| D3-2 | ApplicationFound で通知を閉じる枝→成功 | ✅ | `das.engine.test.ts:506` で applicationFound が tick=15 成立、閉じる Click 実行、`errors===0` |

### D4「動くリストを数える」

| # | 条件 | 結果 | 備考 |
|---|---|---|---|
| D4-1 | For Each＋スコープ＋相対セレクタで全件一致・成功 | ✅ | `das.engine.test.ts:608` で itemCount(5) 件を全件抽出。`dasSimulator.ts:529-636`（scopeFinder→collectElements '> ' 相対）で実装 |
| D4-2 | For Each なし/スコープ未設定で 1 件のみ or ミスマッチ失敗 | ✅ | `das.engine.test.ts:586` で For Each なしは 1 件のみ。`d4.ts` の requireDasExtractCount('品目',3) で件数判定 |

### D5「要素を見失わない」

| # | 条件 | 結果 | 備考 |
|---|---|---|---|
| D5-1 | 座標固定で列順変動時に誤値取得→失敗体験 | ✅ | `dasSimulator.ts:326` `isCoordinateSelector`、`mockApp.ts:169` shuffleColumns で列順入替。`das.engine.test.ts:816` で requireSelectorMatch が座標固定に false |
| D5-2 | CSS 風属性セレクタで列順変動後も正値取得・成功 | ✅ | `das.engine.test.ts:780` で shuffle 後 `[col="商品名"]` が正値取得、`errors===0` |

---

## 仕様忠実性（das-spec-notes 照合）

- **ガードチョイス意味論**（§3.4）: ✅ 並行監視（全ガードを各 tick 評価）/ 最初成立（`break` で最小 tick の winner 確定）/ 排他実行（`winner.steps` のみ実行・他枝は未評価）/ Timeout 既定 60 秒（`defaultTimeoutTick=60`）をすべて `dasSimulator.ts:execGuardedChoice` で実装。ガード7種すべてに `evaluateGuard` 分岐あり（locationRemoved/treeStoppedChanging 含む）。
- **For Each（スコープ＋相対セレクタ）**（§3.5）: ✅ `scopeFinder` で起点特定 → `elementFinder` の `'> '` 相対セレクタで子を収集 → body を反復。`resolveWidget` が forEachStack の currentElement を scope に使い、反復ごとに相対参照になる設計を踏襲。
- **正規日本語用語**（§3.4 / §6）: ✅ `GUARD_TYPE_LABELS`（該当するロケーション/ツリーの変更停止 等 7 種）、`DAS_ACTION_LABELS`、ミッション文言・glossary（レコーダービュー/ファインダー/ガードチョイス/スコープファインダー 等）すべて公式表記。独自造語の混入は確認されず。

---

## 設計遵守

- ✅ **新規作成ファイル**は design.md §変更コンポーネントの一覧と一致（`dasRobot.ts`/`mockApp.ts`/`dasSimulator.ts`/`dasValidator.ts`/`dasStepStatus.ts`/`dasRobotStore.ts`/`components/das/*` 7 点/`d1〜d5.ts`）。
- ✅ **変更ファイル**は設計の許可範囲（`mission.ts` optional 4 フィールド＝実装は 5 つだが `dasSuggested` も設計の API 一覧に記載済み / `index.ts` / `App.tsx` / `glossary.ts`）＋ tasklist 明記の `HomeScreen.tsx`・`README.md`。`git diff` で**設計外の変更（M1〜M5・既存エンジン）は皆無**。
- ✅ 採用アーキテクチャ（tick カウンタ / 純 DOM ツリー / DasRobot 独立型）どおりに実装。
- ⚠️（軽微・許容）`design.md` は `mission.ts` 追加を「optional 4 つ」と記すが実装は `robotType/mockApp/dasSeed/dasChecks/dasSuggested` の 5 つ。`dasSuggested` は設計の API 一覧・tasklist T3 に含まれ整合しており、本文カウントの表記揺れにすぎない。修正不要。

---

## セキュリティ／品質レビュー

- **依存追加**: ✅ 該当なし。`package.json` の dependencies/devDependencies は既存のまま（React18/TS/Vite6/@xyflow/react/Tailwind/Zustand/Vitest）。`npm install -g` 痕跡なし。
- **XSS**: ✅ 該当なし。`dangerouslySetInnerHTML`/`innerHTML`/`eval` の使用は全ソースで 0 件（grep 確認）。MockApp は静的データのみで外部入力なし。
- **決定性**: ✅ `Math.random`/`Date.now` の実使用なし（ヒットはコメントのみ）。乱数は LCG `createSeededRng` でシード決定的。`applyTimeline` は cloneWidget による純粋関数で、テスト（immutable 検証）で担保。
- **デッドコード／デバッグ痕**: ✅ `components/das/` に `console.*`/`TODO`/`FIXME` なし。
- **暴走防止**: ✅ `maxTick`(120)・Loop の guard カウンタ(10000)・guard 評価上限あり。
- **型安全**: ⚠️（推奨）`mission.ts:36` の `DasMissionCheckCtx.sim: any` は循環参照回避のための意図的措置（コメントあり）。`dasValidator.ts` 側が実型を付与し、ctx は内部で型アサーションされている。教育プロジェクトの規模では許容範囲。将来 `unknown` + 型ガードに置換すると更に堅牢。

---

## 指摘事項

### 必須修正（CHANGES_REQUESTED の根拠）

なし。

### 推奨修正（任意・将来）

- `src/model/mission.ts:36` — `DasMissionCheckCtx.sim: any` を `unknown` に変更し利用側で絞り込むと型安全性が向上（現状は循環参照回避のための意図的措置でコメントあり、機能影響なし）。
- `design.md` 本文の「optional フィールド 4 つ」表記 — 実装の 5 フィールドに合わせて文言更新すると将来の読み手の混乱を防げる（API 一覧・tasklist は既に 5 つで整合）。

---

## 藤田さんへの依頼事項（手動確認推奨）

自動チェック（型／テスト／ビルド／コードリーディング）はすべて充足。以下は自動では確認不能な体験品質のため、ブラウザでの目視確認を推奨（いずれも APPROVE を妨げない任意確認）:

1. **D1〜D5 の実プレイ通し**: 相談票→見立てクイズ→ワークフロー組み立て（パレット／レコーダービュー右クリック挿入）→実行→判定→クリア reveal の一連が UI 上で破綻なく流れるか。
2. **緑ロボット UI の視認性**: 縦ワークフローツリーのガード枝インデント・成立枝の緑ハイライト、模擬 Windows アプリ（タイトルバー／通知の黄帯）の見栄え。
3. **D2/D3 の失敗→成功体験**: 固定秒待ち（timeout のみ）構成で実際に失敗表示が出て、Location Found / Application Found 追加で成功に転じる学習導線が直感的か。
4. **進捗解放**: M5 クリア後に D1 が解放され、D1→D5 が直列に解放される動線（`isUnlocked` は配列順依存のため M5 未クリア状態で D1 がロックされる挙動）が意図どおりか。

---

## 2026.1 忠実化リワーク レビュー（2026-06-12 追補）

藤田さん差し戻し（「画面・オプションが実機と全然違う」）を受けた忠実化リワークを独立検証した。`das-spec-notes.md §5.5 A〜C` および公式画像 2 枚（`GuardedChoiceLocation.png` / `add_guard2.png`）と実装を 1 項目ずつ突合。

### 総合判定（リワーク）

- [x] **APPROVE** ✅
- [ ] CHANGES_REQUESTED
- [ ] BLOCKED

差し戻し 6 点すべて解消を確認。静的チェック 3 種グリーン、第1弾リグレッションなし。**必須修正なし。**

### 静的チェック（Reviewer 独立再実行）

| チェック | コマンド | 結果 |
|---|---|---|
| 型チェック | `npx tsc -b` | ✅ exit 0、出力なし |
| テスト | `npx vitest run` | ✅ 2 ファイル / **87 passed**（`engine.test.ts` 12 + `das.engine.test.ts` 75。前回 65 → 75 に増加、退行なし） |
| ビルド | `npm run build` | ✅ `tsc -b && vite build` 成功（**247 modules**、9.06s。DasPropertiesPane/DasStatusView 削除でモジュール構成更新） |

- バンドル警告（559.97 kB）は既存事象（`@xyflow/react` 由来）で判定に影響しない。

### §5.5 A〜C 突合

**A. ワークフロー描画（横方向フロー）** — ✅ 充足
- `DasWorkflowView.tsx:33-105` の `HorizontalFlow` が `○—[StepCard]—○` を `flex items-start`（左→右）で描画。`FlowPoint`/`FlowLine` で青の接続線・フローポイントを再現。`overflow-x-auto`（L134）でスクロール可。**縦ツリーは完全撤去**。
- 折りたたみ⇔展開: `StepCard.tsx:207-223`（折りたたみ=アイコン＋名前＋▼）/ `L226-249`（展開=アイコン＋タイトル＋^＋?）。展開時は**カード内インラインフォーム**（`L251-304`、StepCardForms 各種）。右プロパティペインでの編集ではない（`DasPropertiesPane.tsx` を削除済み、git diff で確認）。
- ⚠ バッジ: `StepCard.tsx:176-185`（`dasStepIssue` 連動、カード右上）。選択中の緑枠: `L137`（`ring-2 ring-green-500`）。
- 画面全体構成: `DasWorkspaceLayout.tsx` 左=`MyProjectsPane`＋`DasPalette`（L134-141）/ 中央上=デザイン・デバッグ＋ロボットファイルタブ（L146-154 ＋ `DasWorkflowView.tsx:122-130`）/ 中央=キャンバス（L157-159）/ **下=`RecorderView`（L162-167）** / 右=`DasStatePane`（状態＝変数パネル、L194-196）。検索結果・コメントは省略（共通前提で許容）。

**B. ステップカタログ（2026.1 c_dassteps.html 忠実）** — ✅ 充足
- `dasRobot.ts:335-468` の `DAS_STEP_CATALOG` が §5.5 B の **全 13 カテゴリ**（割り当てと変換／条件と制御／ループ／アプリケーション／データベース／ファイル システム／JSON／出力値／統合／リモート デバイス／抽出／マウスとキーボード／その他）をカテゴリ名・ステップ名とも正確な日本語表記で網羅。スポット照合（例: 「要素の繰り返し」「ガード チョイス」「コンテニュー」「ツリーの凍結」「REST Web サービス呼出」）一致。
- パレットは `DasPalette.tsx` がカタログを data-driven で表示。`implemented:false`/`actionType:null` は `opacity-40 cursor-not-allowed`＋`title="この研修ラボでは未対応"`（L189-204）で disabled 表示。**全カタログ表示＋未対応淡色化**の不変条件を満たす。
- `DAS_ACTION_LABELS`（`dasRobot.ts:251-269`）も 2026.1 正式名（ブラウザ／要素の繰り返し／ガード チョイス 等）。独自造語の混入なし。

**C. 主要ステップのフィールド構成** — ✅ 充足
- **コンポーネント ファインダー**（`FinderForm.tsx`）: エイリアス／ベース ファインダー（「デバイスを再利用」「前のファインダーを参照」）／デバイス（local）／アプリケーション（cef）／コンポーネント（セレクタ）／□テキスト一致 (Regex) ＝ **公式画像 `GuardedChoiceLocation.png` のフォームと完全一致**。
- ブラウザ（`StepCardForms.tsx:104-178`）: アクション＝ページ読込／ページ生成／ダウンロードを待機。Windows（L188-273）: デバイス／アクション(実行)／実行可能／引数／最大化を開始。クリック（L283-352）: ファインダー／カウント(1/2)／ボタン(左/右/中央)。値を抽出（L362-428）: コンポーネント／抽出タイプ(テキスト/属性/拡張属性)／現在のインを保存。テキストを入力（L438-488）: ファインダー／テキスト(=変数参照)。要素の繰り返し（L498-574）: スコープ ファインダー名／スコープ ファインダー／要素ファインダー(相対セレクター)。スロー（L584-612）: 例外。リターン（L617-622）。いずれも §5.5 C どおり。

### 公式画像 ⇄ ガードチョイスカード構造の整合（最重要）

`GuardedChoiceLocation.png` / `add_guard2.png` を Read で実視し、`StepCard.tsx:306-332` ＋ `GuardLane.tsx` と突合:

| 公式画像の要素 | 実装 | 判定 |
|---|---|---|
| ヘッダ 🖐＋「ガード チョイス」＋^＋? | `ACTION_ICONS.GuardedChoice='🖐'`（StepCard.tsx:44）＋展開ヘッダ ^/?（L232-248） | ✅ |
| カード内にガードレーンが縦並び | `StepCard.tsx:314-328` で `action.guards` を `space-y-1` で縦配置 | ✅ |
| 各レーン=種別ドロップダウン＋インライン設定 | `GuardLane.tsx:108-174`（select＋timeout 秒/ファインダーフォーム） | ✅ |
| ドロップダウン表示「ロケーション...」「秒が経過した...」 | `GUARD_TYPE_DROPDOWN_LABELS`（dasRobot.ts:286-294）＝画像表記と一致 | ✅ |
| 枝: → ○ → 枝ステップカード（例 ❗スロー TimeOutError）→ ○ | `GuardLane.tsx:177-195`（FlowLine→FlowPoint→`renderBranchSteps`→FlowPoint） | ✅ |
| レーン間に破線＋緑 ⊕ で追加 | `AddGuardButton`（GuardLane.tsx:206-242、`border-dashed border-green-500`＋緑丸 +） | ✅ |
| timeout 既定 60 秒 | `GuardLane.tsx:153`（`guard.seconds ?? 60`）＋ catalog 既定 60（DasPalette.tsx:63） | ✅ |
| 例外フィールド「TimeOutError」 | `ThrowForm`（StepCardForms.tsx:584-612）／既定 exception='TimeOutError' | ✅ |

ガードチョイスカードは公式画像 2 枚の構造（縦レーン＋破線⊕＋枝の横フロー＋例外スロー枝）と整合する。

### 差し戻し 6 点の解消判定

| # | 差し戻し点 | 解消 | 根拠 |
|---|---|---|---|
| 1 | 縦ツリー → 横フロー | ✅ | `DasWorkflowView.tsx` HorizontalFlow（左右配置）。縦ツリー撤去 |
| 2 | 右ペイン編集 → カード内インライン展開 | ✅ | `StepCard.tsx` 展開時インラインフォーム。`DasPropertiesPane.tsx` 削除 |
| 3 | 独自ラベル → 2026.1 カタログ忠実 | ✅ | `DAS_STEP_CATALOG`（13 カテゴリ全網羅、正式日本語名） |
| 4 | ガードレーン縦並び＋破線緑⊕ | ✅ | `GuardLane.tsx` ＋ `AddGuardButton`（公式画像整合） |
| 5 | 下=レコーダービュー／右=状態パネル | ✅ | `DasWorkspaceLayout.tsx:162-167`（下 Recorder）/ `L194-196`（右 状態） |
| 6 | ファインダー項目（エイリアス〜Regex） | ✅ | `FinderForm.tsx`（公式画像と完全一致） |

### 第1弾リグレッション（git diff 確認）

`git diff --stat HEAD` で第1弾コア（`src/engine/simulator.ts` / `validator.ts` / `stepStatus.ts` / `model/robot.ts` / `engine.test.ts` / `m1〜m5.ts` / `components/ds/`）が **全て無変更**であることを確認。既存 `engine.test.ts` 12 テスト全 pass。D2〜D5 ミッションの差分は `actionSequence` の `OpenWindow → Windows` リネーム（2026.1 カタログ整合）のみで挙動不変。

### 命名移行の健全性

`OpenWindow` アクション種別は 2026.1 の `Windows` に統一（model/simulator/palette/missions すべて移行済み）。`requireOpenWindow` は後方互換 shim としてバリデータに残置（コメント明記）し、テストで `requireWindows` と shim 両方を検証（`das.engine.test.ts:897-917`）。残存 `OpenWindow` 参照はコメント・テスト・shim のみで、実コードパスは `Windows` に一本化。良好。

### セキュリティ／品質（リワーク差分）

- **依存追加**: ✅ なし（`package.json` 不変）。
- **XSS**: ✅ 新規 `components/das/*` に `dangerouslySetInnerHTML`/`innerHTML`/`eval` なし。FinderForm のセレクタ等は全て制御された input（React 既定エスケープ）。MockApp は静的データ。
- **決定性**: ✅ `nextDasStepId` はカウンタ（`Math.random` 不使用、dasRobot.ts:296-301）。シミュレータは tick 駆動の純粋関数を維持。
- **不要コード**: ✅ 旧 `DasPropertiesPane.tsx`/`DasStatusView.tsx` を削除（ビルド 247 modules でツリーシェイク済み、参照残存なし）。

### 指摘事項（リワーク）

**必須修正**: なし。

**推奨修正（任意・将来）**:
- `StepCard.tsx:309-312` — `GuardedChoice` のガード 0 件警告は `⊕ボタンから追加` を促すが、デフォルトアクション生成（`DasPalette.tsx:57-64`）は locationFound＋timeout の 2 レーンを初期投入するため、パレット経由では 0 件状態は通常発生しない。レコーダー右クリック等で 0 件になる経路のみのフォールバックであり機能上問題なし。文言は現状で妥当。
- `DasWorkspaceLayout.tsx:113` — `sim as unknown as SimResult`（ResultPanel 共用のための型ブリッジ）。第1弾 ResultPanel 再利用のための意図的措置でコメント可。将来 ResultPanel を das 対応の判別共用型にすると更に堅牢（機能影響なし）。

### 藤田さんへの依頼事項（手動確認・APPROVE を妨げない）

自動チェック（型／テスト／ビルド／コードリーディング／公式画像突合）はすべて充足。以下は体験品質のためブラウザ目視推奨:

1. **横フローの見栄え**: `○—[カード]—○` の連結線・フローポイントが実機 DS の横フローと体感的に一致するか。展開時にカードが縦に伸び後続カードが押し出される挙動が破綻しないか。
2. **ガードチョイスカード**: 公式画像（縦レーン＋破線緑⊕＋枝の横フロー）と並べて見たとき違和感がないか。⊕ クリックでのレーン追加、種別ドロップダウン切替時のファインダー/秒フォーム出し分けが直感的か。
3. **ファインダーフォーム**: エイリアス〜Regex の項目配置が `GuardedChoiceLocation.png` と見た目一致するか。
4. **パレットの未対応淡色化**: 全カタログがカテゴリ折りたたみで表示され、未対応ステップが淡色＋ツールチップで明示されるか。
5. **D1〜D5 通しプレイ**: 横フロー UI 上でレコーダー右クリック挿入→展開編集→実行→判定→クリアが破綻なく流れるか。

---

## 健康なロボット10か条 統合レビュー（2026-06-13 追補）

藤田さんの新要望「プレイヤーが健康なロボットを意識するようにしたい」を受けて実装された **ロボット健康診断機能** を独立検証した。RPA Technologies「健康なロボットのための10か条」（V1.0.0 2020.02.20）出典 PDF と実装を 1 条ずつ突合し、診断ロジックの教育方向性・著作権配慮・第1/2弾リグレッションを確認した。

### 総合判定（健康診断機能）

- [x] **APPROVE** ✅
- [ ] CHANGES_REQUESTED
- [ ] BLOCKED

統括確定の設計方針（クリア時健康診断 / 常設リファレンス / 青緑両対応 / 構造判定可能な条のみ自動診断 / 既存非破壊）をすべて満たす。10条の内容は出典と整合し誤要約・捏造なし、診断ロジックの判定向きは各条の趣旨どおり、出典明記あり・長文転載なし。静的チェック 3 種グリーン、第1/2弾リグレッションなし。**必須修正なし。**

### 静的チェック（Reviewer 独立再実行）

| チェック | コマンド | 結果 |
|---|---|---|
| 型チェック | `npx tsc -b` | ✅ exit 0、出力なし |
| テスト | `npx vitest run` | ✅ 3 ファイル / **102 passed**（前回 87 + 新規 `healthCheck.test.ts` 15 = 102。退行なし） |
| ビルド | `npm run build` | ✅ `tsc -b && vite build` 成功（**250 modules**、5.28s） |

- バンドル警告（577.42 kB）は既存事象（`@xyflow/react` 由来）で判定に影響しない。

### 10条の出典整合（TEN_RULES と突合）

`healthRules.ts:HEALTH_RULES`（10 条）を共通前提の TEN_RULES と 1 条ずつ照合:

| 条 | タイトル整合 | 解説の忠実性 | 判定 |
|---|---|---|---|
| 1 | ✅ コンパクトに保つ | 「100〜200 以内／全体が見渡せる」を要約 | ✅ |
| 2 | ✅ 単一の処理に集中 | 「単純に分解／エラー時の影響を小さく」を要約 | ✅ |
| 3 | ✅ 業務処理の骨格が明確 | 「初見でわかる名前／グループ化」を要約 | ✅ |
| 4 | ✅ 補助処理と本処理を区別 | 「前処理と本処理を分けて配置／データかプロセスか判別」を要約 | ✅ |
| 5 | ✅ 同一・類似処理を複数存在させない | 「Snippet 化／変数で一元管理」を要約 | ✅ |
| 6 | ✅ 用途・内容ごとにデータ整理 | 「Type で整理／データの棚卸し」を要約 | ✅ |
| 7 | ✅ 案内・コメントを適所に | 「Group で区切り／業務内容コメント／簡易マニュアル」を要約 | ✅ |
| 8 | ✅ 処理経路がトレースできるログ出力 | 「Write Log でパンくず／キー情報をログに」を要約 | ✅ |
| 9 | ✅ 例外はログと通知を重視、自動回復は最低限 | 「例外を確実に捉えログ・通知／自動回復は極力含めない」を要約 | ✅ |
| 10 | ✅ 環境変数値は外部情報の読み込みで切り替え | 「ファイルパス/URL/アカウントは外部設定／直書きはテスト品質を無効化」を要約 | ✅ |

- **タイトルは10条すべて出典原文どおり**（独自言い換えなし）。**解説は括弧内を自分の言葉で短く要約**しており、PDF 本文の長文転載は確認されず（著作権配慮 OK）。捏造・存在しない条の追加もなし。

### 診断ロジックの教育方向性（趣旨整合・最重要）

統括確定の「構造判定可能な条のみ自動診断、判定不能な条は診断に出さない」を `diagnose()`（`healthCheck.ts:348-394`）で確認:

| 条 | 自動診断 | 判定ロジック | 趣旨整合 |
|---|---|---|---|
| 1 | ✅ | ステップ数 ≤ 12 → ○ / 超過 → △「役割ごとに分割」 | ✅ コンパクト推奨どおり |
| 3 | ✅ | 無名ステップ 0 → ○ / 残存 → △「初見でわかる名前を」 | ✅ 命名推奨どおり（青は start/end/branch を命名対象外に正しく除外、緑は再帰フラット化で全葉を走査） |
| 5 | ✅ | 同一アクション種別＋同一セレクタ/URL/targetId が 2 件以上 → △ | ✅ 重複排除推奨どおり |
| 6 | ✅ | types ≥ 1 かつ variables ≥ 1 → ○ | ✅ データ整理推奨どおり |
| 9 | ✅（緑のみ） | ガードチョイス**存在時のみ**判定。Timeout ガード or Throw あり → ○ / Timeout 無し → △「例外として捉えてフォールバックを追加」 | ✅ **逆向きでない**。例外を顕在化させる方向の指導であり、「自動回復を増やせ」とは教えていない。むしろ Timeout で時間切れを例外化＝条文「例外を確実にとらえる／自動回復は最低限」と整合 |
| 10 | ✅ | 入力変数/変数あり時のみ判定。変数参照あり → ○ / 直書き → △「変数で外部化を」 | ✅ 外部化推奨どおり |
| 2,4,7,8 | ❌ 診断に出さない | `candidates` 配列に未投入。`diagnosable:false` | ✅ 設計方針どおり（構造判定困難なため非診断、リファレンスには全10条掲載） |

- **第9条の方向性が最重要の検証ポイントだったが問題なし**。条文「自動回復は最低限」を逆に「自動回復を増やせ」と教える危険を回避し、Timeout/Throw による**例外の顕在化**を ○ とする設計。教材として正しい向き。
- **前提条件ガード**が適切: 第9条はガードチョイス非存在時 `null`、第10条は入力変数/変数非存在時 `null` を返し「判定対象外」として診断に出さない（`healthCheck.ts:257-259, 282-284, 311-313`）。判定不能を△と誤表示しない設計で、統括方針「判定不能な条は診断リストに出さない」に忠実。
- **トーン**: 全 △ メッセージが前向き（「〜しましょう」形）。説教臭さなし。allGood 時は「健康なロボットです！」と称揚（`ResultPanel.tsx:53-56`）。フォーカス条を「今回のポイント」として上部強調（`ResultPanel.tsx:59-73`）も設計方針どおり。

### 出典明記・著作権配慮

- **出典 URL**: ✅ `HEALTH_RULES_SOURCE_URL = 'https://rpa-technologies.com/catalog/10RulesOfHealthyRobots.pdf'`（共通前提の URL と完全一致）。`HealthRulesPanel.tsx:93-103` で `target="_blank" rel="noopener noreferrer"` 付きリンク表示。出典ラベルも「RPA Technologies【入門】V1.0.0 2020.02.20」と版数明記。
- **長文転載なし**: ✅ リファレンスパネルはタイトル列挙＋1〜2 文の自作解説に留まる。PDF 本文の段落転載は確認されず。glossary の「健康なロボット」エントリも要約のみ。

### 青・緑両対応

- ✅ `diagnose(robot: Robot | DasRobot, mission)` が `mission.robotType==='das'` で分岐。青は `checkRule10Blue`、緑は `flattenDasSteps` による再帰展開＋`checkRule9Das`/`checkRule10Das`。両モデルを受理する設計方針どおり。
- ✅ 緑の `flattenDasSteps`/`flattenDasAction`（`healthCheck.ts:24-56`）は GuardedChoice/ForEach/Loop/Condition/Group/TryCatch/WhileLoop の全ネスト構造を再帰展開。ガードチョイス枝・For Each body 内のステップも漏れなくカウントされる。

### 配線確認（全コードパス）

| コードパス | 確認内容 |
|---|---|
| クリア → 診断（青） | `App.tsx:67-68` で `phase==='result'` 時のみ `diagnose(robot, mission)` を useMemo 実行 → `ResultPanel` に `healthFindings` 渡し（`App.tsx:182`） |
| クリア → 診断（緑） | `DasWorkspaceLayout.tsx:86-87` で同様に `phase==='result'` 時 `diagnose(robot, mission)` → `ResultPanel`（`L221`） |
| 診断表示 | `ResultPanel.tsx:172-177` で `healthFindings.length > 0` 時に `HealthDiagnosis` 描画。フォーカス条を上部強調 |
| リファレンス（ホーム） | `HomeScreen.tsx:48` ボタン → `L255` `HealthRulesPanel` モーダル |
| リファレンス（ツールバー・青） | `Toolbar.tsx:51-52` 「🩺 10か条」→ `App.tsx:113` `onOpenHealthRules` → `L187` モーダル |
| リファレンス（ツールバー・緑） | `DasWorkspaceLayout.tsx:113`（onOpenHealthRules 配線）→ `L233` モーダル |
| 体験済みバッジ | `HealthRulesPanel.tsx:26-28` で `completedMissions` × `MISSION_HEALTH_FOCUS` から体験済み条を導出。クリア済みミッションのフォーカス条にバッジ表示 |

useMemo の deps を `[phase, mission]` に限定（robot 変更を意図的に追従しない）し、result フェーズ突入時のスナップショットを診断する設計はコメントで明示済み。教材用途では妥当。

### 第1・第2弾リグレッション（git diff 確認）

`git diff --stat HEAD` で変更範囲を精査:

- **コアエンジン無変更**: `src/engine/simulator.ts` / `validator.ts` / `stepStatus.ts` / `dasSimulator.ts` / `dasValidator.ts` / `dasStepStatus.ts` は diff に**出現せず**（無変更）。既存挙動非破壊。
- **ミッション変更は healthFocus 1 行のみ**: m1〜m5 / d1〜d5 はいずれも `healthFocus: [...]` の追加 1 行のみ（`git diff` で確認）。actionSequence・checks・reveal 等の挙動は不変。
- **mission.ts**: optional `healthFocus?: number[]` の追加のみ（後方互換、既存ミッション影響なし）。
- 既存テスト（`engine.test.ts` 12 / `das.engine.test.ts` 75）全 pass、退行ゼロ。

### セキュリティ／品質（健康診断差分）

- **依存追加**: ✅ なし（`package.json` 不変、`npm install -g` 痕跡なし）。設計方針「新規依存なし」を満たす。
- **XSS**: ✅ `HealthRulesPanel`/`ResultPanel` の HealthDiagnosis に `dangerouslySetInnerHTML`/`innerHTML`/`eval` なし。診断メッセージは静的テンプレート文字列＋数値埋め込みのみで外部入力を含まない。出典リンクは `rel="noopener noreferrer"` 付き。
- **純粋関数性**: ✅ `diagnose()` および全 `checkRuleN` は副作用なしの純粋関数。`Math.random`/`Date.now` 不使用。
- **型安全**: ✅ `HealthFinding`/`HealthRule` 型を `model/health.ts` に定義。`diagnose` の戻り値・分岐とも型整合（tsc 0 エラー）。

### 指摘事項（健康診断機能）

**必須修正**: なし。

**推奨修正（任意・将来）**:
- `healthRules.ts:103-117` の `MISSION_HEALTH_FOCUS` と各ミッションファイルの `healthFocus` フィールドは**同じ値を二重定義**している（例: m1 が両所で `[1,3]`）。現状は全件一致を確認済みで実害なしだが、将来どちらか一方を変更し片方を忘れると診断（mission.healthFocus 参照）とリファレンスの体験済みバッジ（MISSION_HEALTH_FOCUS 参照）が食い違う。単一ソース化（ミッション定義から `MISSION_HEALTH_FOCUS` を導出、または逆）すると保守性が向上。
- `healthCheck.ts:282-307` の青 第10条は `EnterText.fromVariable` のみを変数参照とみなす。将来 LoadPage の URL を変数化する設計が入った場合は判定軸の追加を検討（現状の M5 想定では問題なし）。
- 第8条（ログ出力）は緑にログ出力ステップが未実装のため現状 `diagnosable:false`。共通前提では「緑にログ出力ステップがあるので第8条は加点式にしてもよい」とあるが、現状の DAS_STEP_CATALOG でログ出力ステップが `implemented:false` のため非診断は妥当。将来ログ出力ステップ実装時に加点式診断（第8条 ○）の追加余地あり。

### 藤田さんへの依頼事項（手動確認・APPROVE を妨げない）

自動チェック（型／テスト／ビルド／コードリーディング／出典突合）はすべて充足。以下は体験品質のためブラウザ目視推奨:

1. **クリア時の健康診断表示**: M1〜M5 / D1〜D5 をクリアし、ResultPanel に「🩺 ロボット健康診断」が出て、フォーカス条が「今回のポイント」として上部強調、○/△ アイコンと前向きアドバイスが読みやすく表示されるか。
2. **△ の出方が説教臭くないか**: わざと無名ステップやステップ数超過で組んだとき、△ メッセージが前向きトーンで学習意欲を削がないか。
3. **リファレンスパネル**: ホーム／ツールバー（青・緑両方）から「🩺 10か条」を開き、10条全件＋出典リンクが表示され、クリア済みミッションのフォーカス条に「体験済み ✓」バッジが付くか。
4. **第9条の学習導線**: D2/D3 でガードチョイスに Timeout を入れずクリアした場合に △「時間切れも例外として捉えよう」が出て、Timeout 追加後に ○ に転じる体験が、条文の趣旨（例外を確実に捉える）と矛盾なく伝わるか。
