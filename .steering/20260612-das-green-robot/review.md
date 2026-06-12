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
