---
index: "[[INDEX]]"
---

# review — 受け入れ条件チェックと品質確認

> 親 INDEX: [[INDEX]]

## 自動チェック結果
| 項目 | コマンド | 結果 |
|---|---|---|
| 型チェック | `npm run typecheck` (tsc --noEmit) | ✅ エラー 0 |
| 本番ビルド | `npm run build` (tsc -b && vite build) | ✅ 221 modules / dist 出力 |
| 公開アセット | dist/img | ✅ portrait-keiri.png / portrait-soumu.png コピー確認 |
| 単体テスト | `npm test` (vitest) | ✅ 5 / 5 passed |
| dev 配信 | `npm run dev` + HTTP プローブ | ✅ HTTP 200 / モジュール変換 OK |

## 受け入れ条件の対応（requirements §受け入れ条件）
1. 4 領域 UI + ツールバー表示 … ✅（App レイアウト / dev 配信確認）
2. Mission 1 通し … ✅（engine.test.ts: 正常系で受け入れ条件全達成）
3. Mission 2 通し … ✅（engine.test.ts: ループ有りで 6 件・全達成）
4. 誤操作の的確な指摘 … ✅（抽出欠如→「抽出」ヒント / ループ欠如→1 件・「繰り返し」ヒント）
5. 進捗 localStorage 永続 … ✅（gameStore persist, name=ds-master-progress）
6. BizRobo 正規用語の自然な登場 … ✅（UI ラベル + 用語集 14 語）
7. build / typecheck 通過 … ✅

## テストで担保した核心挙動
- 「要素の繰り返し」が無いと先頭 1 件しか取れない（M2 の学習の肝）を異常系テストで固定。
- 推理オチが二重登録（青葉商事）を検出することを確認。

## 実機準拠フィデリティ改修（2026-06-07 追補）
実機 DS（`ds-real-ui-notes.md`）に合わせて UI を改修。型/テスト/ビルドは全て継続グリーン（typecheck エラー0 / vitest 5件 / build 成功）。
- 右パネルを **プロパティ(上)＋データの状態(下)** に入替。ステップビュー→**「プロパティ」4タブ（基本/ファインダー/アクション/エラー処理）＋「アクションを選択 ▼」** に再構成（`PropertiesPane.tsx`、旧 `StepView.tsx` 削除）。
- ステップ描画を実機風に（`StepNode.tsx`）: **アイコン上・名前下**、開始＝左マーカー、**終了＝⊗**、無名＝**「(名前がありません)」**、設定不備＝**黄色警告バッジ**（`engine/stepStatus.ts`）。
- 中央に **デザイン/デバッグ＋ファイルタブ**、ブラウザ見出しを **「アプリケーション（ブラウザビュー）」** に。用語を正規化。
- `robotStore.setActionType` 追加（アクション種別の切替）。
- 残: ○分岐/End戻り/ファインダー(nodePath)/抽出種別(Extract/ExtractURL/ExtractCell) の忠実モデルは M4 以降で段階導入。

## UX 改善 + M3 追加（2026-06-07 第2追補）
藤田さんフィードバック対応＋条件分岐ミッション追加。typecheck エラー0 / vitest **8件** / build 成功 / dev HTTP 200。
- **属性・タイプ・変数の削除**を実装（`robotStore` に removeAttribute/removeType/removeVariable、`DataStatePane` に削除ボタン）。
- **名前の完全一致をやめ、受け入れ条件を構造ベースに**（`validator` に requireComplexType / requireVariableOfComplexType / requireExtractCount / requireAnyRecordCount / requireRecordsFilled を追加し M2 を全面置換）。タイプ名・属性名・変数名が自由でも構造が正しければ合格。推理オチも汎用重複検出に変更。
- **M3「条件で仕分ける」**追加（`m3.ts`）: 値判定(TestValue)で「未対応」だけ残すフィルタ教材。validator に requireTestValue / requireMaxRecordCountEquals 追加。依頼者ポートレート(portrait-support.png)を gpt-image-2 で生成。
- テスト追加: M2「名前非一致でも構造で合格」、M3 正常系（4件に絞れて合格）／異常系（値判定なしで7件のまま未達）。

## B/C + 線修正（2026-06-07 第3追補）
typecheck（`tsc -b` に是正）/ vitest **10件** / build 成功 / dev HTTP 200。
- **フロー線の安定化**：ハンドル Y を全ノードで統一、エッジを `smoothstep`＋矢印（MarkerType.ArrowClosed）に。ふにゃふにゃ解消。
- **C 抽出種別の作り分け**：`ExtractURL` 追加（パレット/右クリック/プロパティ）。stepClass を実機名（LoadPage2 / Extract / ExtractURL / ForEachTag / TestTag / WriteFile）に。**ファインダータブに nodePath 表示**（例 `.*.tbody.tr.td[2]`）。
- **B ○分岐/End戻りの忠実グラフモデル**：
  - モデルに `branch` 種別・`RobotEdge`・`Robot.edges?`・`RobotStep.pos?`・`SaveFile` アクションを追加。
  - **グラフ・シミュレータ**（`simulator.runGraph`）：分岐点＝出力エッジを上から順に実行 / End＝呼び出し元（分岐点の次ブランチ or ループの次反復）へ戻る / ループ本体＝ループ〜End を各行反復。線形は従来通り（`runLinear`）でディスパッチ。
  - ロボットビューがグラフ（座標＋エッジ）描画に対応。`StepNode` に分岐（○）描画。
  - **Mission #4「集めて、仕上げる」**：実機 `データ抽出.robot` と同型（○分岐→ループ枝で全件抽出→⊗ ＋ 仕上げ枝で保存→⊗）。構成はシード提供、プレイヤーは理解＋URL設定＋実行（グラフ時は構造編集を抑止）。
  - テスト追加：M4 グラフ実行（ループ5件＋保存1回）、URL未設定で未達。
- **使い勝手**：属性/タイプ/変数の削除、検証の構造ベース化（名前完全一致の撤廃）も反映済み（第2追補）。

## 世界観リトーン：相談解決型クエスト化（2026-06-08）
「事件/探偵/推理」のミステリー要素を除去し、**自動化推進室への相談解決型クエスト**に統一。
**dynamic workflow（Workflow ツール）で実施**：棚卸し（scan）→ ファイル別に並列リトーン（13ファイル）→ 検証、の3フェーズ・15エージェント。
- 用語: 事件→相談 / 事件簿→クエストボード / 案件ファイル→相談票 / 推理→見立て / 探偵設定削除 / 製品名「オートメーション探偵」→「自動化推進室クエスト」。
- トーン: 犯罪・ミステリー表現（改ざん/二重請求の疑い/宙に浮いた/炙り出す）を**前向きな業務改善の発見**に（例: 二重登録→台帳の重複を発見、整理で請求ミス防止）。
- 不変厳守: コード識別子・ロジック・テスト参照（m2 reveal の青葉商事 dups 展開等）・check id・mission id を変更せず。
- **参謀長による独立検証**: ランタイム(src/index.html)に旧語の残存ゼロ、新語 10 ファイルに反映、typecheck(`tsc -b`)/vitest 10件/build すべてグリーン、dev HTTP 200。
- 追加修正: package.json description・tailwind コメントの「探偵」語も除去。`.steering/` 旧記録は当時の履歴として保持。

## トップページ＋プレイヤー別進捗＋推奨名ガイド（2026-06-08）
typecheck(`tsc -b`)/ vitest 10件 / build 成功 / dev HTTP 200。
- **トップページ（HomeScreen）**：プレイヤー選択 →「相談ボード」で「続きから／最初から」＋相談を選んで開始。`gameStore` に `screen: home/play` を追加し App が画面分岐。Toolbar に「🏠 ホーム」。
- **複数人が非同期で利用**：`gameStore` を persist ミドルウェアから**プロフィール別の手動 localStorage 保存**へ刷新。`ds-master-profiles`（名簿）＋ `ds-master-progress::<名前>`（進捗）。同一ブラウザでも各自の続きから再開可。プレイヤー削除可。
- **初心者向け推奨名ガイド**：`mission.suggested`（typeName/attributes/variableName）を追加（M2=取引先、M3=問い合わせ）。DataStatePane に推奨構成の案内＋「推奨構成をまとめて作成」ワンクリック＋追加フォームのプリフィル。受け入れ条件は構造ベースのまま（別名でも合格）。

## タイプと変数の役割理解を強化（2026-06-08・公式準拠）
公式ドキュメント（Tungsten RPA 2026.1 ja「Variables and Types」）を確認のうえ実装。要点: タイプ＝データ構造の設計図（簡易型=単一値/属性なし・入出力不可、複合型=名前付き属性・入出力可）、変数＝タイプに基づき値を保持する入れ物（必ず1タイプ、複合型は 変数名.属性 で参照）。
- 用語集を公式準拠に刷新（type/variable を「設計図／入れ物」で再定義、`attribute`（属性）を新設、M2 で解禁）。
- データの状態ペインに**常時表示の解説**「タイプ＝設計図／変数＝入れ物（例: 取引先が会社名/担当者/電話を定義→変数取引先に各社が1行ずつ）」を追加。
- 抽出結果の見出しを「変数 X（タイプ: T）」＋「列＝タイプの属性／行＝抽出した値」に。型と変数の対応を可視化。
- M2 の見立てクイズに「タイプと変数の関係」を1問追加（設計図＝タイプ／入れ物＝変数）。
- typecheck/test(10)/build/dev すべてグリーン。

## 相談#5「入力変数と出力変数」＝型は入出力の契約（2026-06-08）
公式の「入出力に使えるのは複合型のみ」を体験する、ログインID/PWを入力変数で受け取り→使い→結果を出力変数で返す相談を追加。
- エンジン拡張: `Variable.role`(input/output)、`Mission.inputs`（呼び出し元入力値）、`ReturnValue` アクション、`EnterText` の `fromVariable/fromAttribute`（変数から入力）、`SimResult.returned`。runRobot(robot, site, inputs) に変更し linear/graph 両対応。
- UI: 変数追加に役割（一時/入力/出力）セレクタ、変数一覧に役割バッジ、ブラウザの入力欄(role:input)で「テキストを入力」、プロパティの EnterText「入力変数から」/ReturnValue 設定、Palette「値を返す」、データの状態に「入力値（呼び出し元から）」表示。推奨構成に variableRole。
- validator: requireVariableRole / requireUsesInput / requireReturnsOutput / requireRoleRecordCount を追加。
- テスト: 入力使用＋出力5件＋返却で合格、ReturnValue 無しで未達（計 12 件 green）。typecheck(`tsc -b`)/build/dev も green。
- 教育意図: 入力＝受け取る・出力＝返す、その"形"を決めるのがタイプ＝契約。型と変数が別概念である理由（再利用・入出力契約）を体験で理解。

## 残課題・申し送り
- UI のインタラクション（React Flow 描画 / 右クリック / モーダル遷移）は型・ビルド・配信で健全性を確認済みだが、
  ブラウザ自動操作による E2E（Playwright 等）は未導入。次フェーズで M1/M2 通しの E2E を追加するのが望ましい。
- 健康度スコア（6 軸）は型・表示枠のみ。判定ロジックは M7 実装時に追加。
- 依存に dev 用 vitest 経由の脆弱性警告あり（dev 限定・本番バンドル非混入）。継続監視。
- バンドル 385KB（gzip 124KB）。React Flow が主因。必要なら手動 chunk 分割を検討。
