---
index: "[[INDEX]]"
---

# design.md

> 親 INDEX: [[INDEX]]

## 1. 忠実な行ガードの意味論

### 目標動作
ループ内で TestValue が「現在行」の値を評価し、条件に合わない行はスキップ（その行の残りの抽出・格納を中断）する。ループ外では既存の一括フィルタを維持。

### runGraph の設計（行単位イテレーション済み）

runGraph のループ（line 345-358）は既に行単位で実行:
```typescript
for (let i = 0; i < rows.length; i++) {
  rowStack.push(i)
  run(body, depth + 1)  // 各行ごとに本体を実行
  rowStack.pop()
}
```

`run()` は `while` ループでノードを辿る（line 333-365）。TestValue ノードに到達したとき:
- 条件を評価
- 不一致なら `return`（= `run()` から戻る = この行の残りノードをスキップ）
- 一致なら `id = next(node.id)` で次ノードへ（通常通り）

**実装**: `exec(node)` の TestValue 分岐で、ガードモード判定時に `return false` を返し、`run()` 内で `if (node.kind !== 'start' && exec(node) === false) return` とする。または `exec` に `skipRow` フラグを設ける。

### runLinear の設計（行単位イテレーション化が必要）

現状の runLinear は ForEach で `loopActive=true` を設定するだけで行単位イテレーションをしない。ExtractText が全行一括読み取り。この構造では TestValue を行ガードにできない。

**改修方針**: ForEach ステップ以降のループ内ステップ（= ForEach から次の ForEach/End/ファイル末尾まで）を特定し、各行ごとに実行する構造に変更。

```typescript
case 'ForEach': {
  // ... (既存のエラーチェック)
  const loopBodyStart = stepIdx + 1
  const loopBodyEnd = findLoopBodyEnd(steps, loopBodyStart) // 次のForEach等まで
  const bodySteps = steps.slice(loopBodyStart, loopBodyEnd)
  for (let rowIdx = 0; rowIdx < site.table.rows.length; rowIdx++) {
    let skipRow = false
    for (const bodyStep of bodySteps) {
      if (skipRow) break
      // bodyStep を currentRow=rowIdx で実行
      // TestValue ガードが false → skipRow = true
    }
  }
  // stepIdx を loopBodyEnd に進めてループ本体をスキップ
}
```

**影響**: ExtractText のループ内動作も変更。`loopActive` で全行一括読み取りから、`currentRow` で 1 行ずつ読み取りに。runGraph の ExtractText（line 282-292）と同じ per-row 方式に統一。

## 2. 値判定が「何を」テストするか — 2案比較

### 案 A（推奨）: DOM セル直接テスト（targetId 追加）

**概要**: TestValue アクション型に optional `targetId` を追加。ループ内で `targetId` が指定されていれば、DOM セル（`site.table.rows[currentRow].cells[colKey]`）の値を直接テストする。抽出前にテスト可能。

**型変更**:
```typescript
// Before
| { type: 'TestValue'; toVariable: string; toAttribute: string;
    op: 'equals' | 'contains' | 'notEmpty'; value: string }

// After
| { type: 'TestValue'; targetId?: string; toVariable: string; toAttribute: string;
    op: 'equals' | 'contains' | 'notEmpty'; value: string }
```

**動作フロー（M3 の場合）**:
1. ループ開始
2. TestValue（targetId=`col::status`）→ DOM セルの「状態」を読み、`== '未対応'` を評価
3. 不一致 → この行をスキップ（抽出しない）
4. 一致 → 件名・状態・担当を抽出
5. 次の行へ

**UI 変更の要否と範囲**:
- **BrowserView.tsx**: テーブルセル右クリックメニューに「値判定」を追加（「抽出」の隣）。クリック時に `addAction('TestValue', { targetId: colTarget(colKey), toVariable: '', toAttribute: '', op: 'equals', value: '' })` を発行
- **PropertiesPane.tsx**: `targetId` がある場合は「テスト対象列」を表示。変数・属性の選択は任意（表示用メタ情報として残す or 省略可に）
- **robotStore.ts**: TestValue のデフォルト初期化に `targetId` 追加（optional なので既存パス不変）

**利点**:
- ユーザーの操作フロー「セル右クリック → 値判定」が直感的
- 「テスト → 抽出」の順序が自然
- 実機 DS の「テストステップが対象要素を持つ」概念に近い
- DOM 値を使うため、変数への事前抽出が不要

**欠点**:
- UI 変更が 2 ファイル（BrowserView + PropertiesPane）に及ぶ
- TestValue の概念が「変数テスト」と「DOM テスト」の 2 モードになる（複雑化）

### 案 B: 先行抽出 + 変数属性テスト（targetId 不要）

**概要**: TestValue の型は変更しない。ユーザーがガード列（状態）を先に抽出し、TestValue で抽出済み値をテストする。条件不一致なら当該行のレコードを削除してスキップ。

**動作フロー（M3 の場合）**:
1. ループ開始
2. ExtractText（状態列 → 変数.状態）→ 現在行の状態を抽出
3. TestValue（変数.状態 == '未対応'）→ 抽出済み値をテスト
4. 不一致 → 現在行のレコードを data から削除、残りステップをスキップ
5. 一致 → 件名・担当を抽出
6. 次の行へ

**型変更**: なし

**UI 変更の要否**: **なし**（既存 UI をそのまま使用）

**利点**:
- 型変更なし、UI 変更なし
- TestValue が一貫して「変数属性をテスト」する概念を維持
- 実装がシンプル（エンジン変更のみ）

**欠点**:
- 教え方が「状態だけ先に抽出 → テスト → 残りを抽出」と 2 段階になり複雑
- goals の文面が長くなる（「まず状態を抽出して、値判定で…、それから残りを…」）
- ユーザーが抽出順序を間違えると（件名を先に抽出 → 状態を抽出 → テスト）、テストは動くが不一致行に件名レコードが残ってしまう（部分レコード問題）
- 「テスト前に抽出」という操作が必要なのは、「テストが行ガード」の直感に反する

### 比較表

| 観点 | 案 A (DOM テスト) | 案 B (先行抽出) |
|---|---|---|
| 型変更 | `targetId?: string` 追加 | なし |
| UI 変更 | BrowserView + PropertiesPane (2 ファイル) | なし |
| 教え方 | 「セル右クリック → 値判定 → 抽出」（直感的） | 「状態抽出 → 値判定 → 残り抽出」（やや複雑） |
| 部分レコード問題 | なし（テスト前に抽出しない） | あり（ガード前に抽出した属性が残る） |
| 実機 DS との近さ | 実機のテストステップが対象要素を持つ概念に近い | 実機の「変数属性をテスト」概念に近い |
| エンジン変更量 | 中（per-row 化 + DOM 読み取り追加） | 中（per-row 化 + レコード削除ロジック追加） |
| M6 への適用 | 自然（2 列を 2 つの TestValue で DOM テスト） | やや複雑（2 列を先行抽出 → 2 段テスト） |

### 推奨: 案 A（DOM セル直接テスト）

理由:
1. ユーザーの操作フロー「テスト → 抽出」が自然で、学習ゲームとして直感的
2. 部分レコード問題を構造的に回避
3. M6 の二段重ねにも自然に適用可能
4. UI 変更は BrowserView の右クリックメニューに 1 項目追加 + PropertiesPane の条件分岐 1 つで済む

## 3. M4 / M6 への影響

### M4（集めて、仕上げる）

**影響なし**。M4 は TestValue を一切使用していない（実読で確認済み）。グラフの分岐/ループ/保存/抽出のみ。エンジン変更は M4 の動作に影響しない。

### M6（二段で絞り込む）

**影響あり。M3 と同パターンで修正が必要。**

M6 の現状:
- goals: 「ループ＋抽出 → 一段目の値判定(未承認) → 二段目の値判定(高額)」
- checks: `requireTestValue('未承認')` + `requireTestValue('高額')` + `requireMaxRecordCountEquals(3)`
- サイトデータ: 10 行の経費精算テーブル（承認状態列 + 金額区分列）

修正後（案 A の場合）:
- goals: 「ループ → 一段目の値判定(承認状態列で未承認をテスト) → 二段目の値判定(金額区分列で高額をテスト) → 抽出」
- 二段ガード: 1 行ごとに 2 つの TestValue を通過しないと抽出されない = AND 条件
- checks: `requireTestValue` のバリデーションは既存のまま使える（ステップの存在と条件値を確認するだけ）
- `requireMaxRecordCountEquals(3)` も結果件数チェックなのでそのまま

### 互換戦略

- ループ内 TestValue: 新しい行ガード動作（per-row、targetId で DOM テスト）
- ループ外 TestValue: 既存の一括フィルタ動作を維持（`targetId` がない場合）
- `targetId` の有無で分岐するため、旧形式（targetId なし）のロボットも動く

## 4. m3 の新 goals / checks / hints 案

### 新 goals
```
1. 複合型のタイプ（件名・状態・担当 など）と変数を用意する
2. 「ページを読み込む」→「要素の繰り返し」で各行をループする
3. 状態セルを右クリック →「値判定」で、状態 が「未対応」と等しい行だけを残す（条件に合わない行はスキップ）
4. 件名・状態・担当のセルを「抽出」して変数に格納する
5. ［実行］して、未対応の 4 件だけがデータの状態に残ることを確認する
```

### 新 checks（案）
```typescript
requireComplexType(2, ...),
requireVariableOfComplexType(...),
requireLoadPageUrl(SITE.url, ...),
requireForEach(...),
requireTestValue('未対応', ...),  // 既存バリデータ: ステップ存在+条件値確認
// 新規: TestValue が ExtractText より前にあることを確認（任意）
// requireTestBeforeExtract('未対応', ...),
requireExtractCount(2, ...),
requireMaxRecordCountEquals(MIKAITOU, ...),
requireNoErrors(...),
```

### 順序チェック（validator 追加案）

新しい validator `requireTestBeforeExtract(value, label, hint)`:
- ロボットのステップ列で、`TestValue(value)` が `ExtractText` より前にあることを確認
- 「抽出の前にガードを置く」パターンを強制
- 必須ではない（ガードが後でも動作はする。ただし教育効果が薄れる）

## 5. テスト方針

### 既存テストの修正

`engine.test.ts` line 131-147 の M3 テスト:
- 現在: 「抽出 → TestValue」の順で 4 件になることを確認
- 修正後: 「TestValue(targetId) → 抽出」の順に変更。4 件の結果は同じ

具体的には `buildBase()` の構成を変更:
```typescript
// Before: LoadPage → ForEach → 件名抽出 → 状態抽出 → 担当抽出 (→ 後からTestValue追加)
// After:  LoadPage → ForEach → TestValue(targetId=col::status, op=equals, value='未対応')
//         → 件名抽出 → 状態抽出 → 担当抽出
```

### 新規テスト追加案

1. **行ガード: ループ内 TestValue で不一致行がスキップされる**
   - ForEach → TestValue(status=='未対応') → ExtractText → assert 4件
   - 不一致行（対応済の 3 行）のレコードが data に存在しないことを確認

2. **後方互換: ループ外 TestValue で一括フィルタが維持される**
   - ForEach → ExtractText(全行) → TestValue(変数属性, targetId なし) → assert 4件
   - 既存の一括フィルタ動作が壊れていないことを確認

3. **二段ガード: M6 パターン（2 つの TestValue が AND 条件）**
   - ForEach → TestValue(承認状態=='未承認') → TestValue(金額区分=='高額') → Extract → assert 3件

4. **runGraph でのガード動作**
   - グラフモードでも TestValue ガードが同様に動作することを確認

### 253 テスト維持方針

- 既存テストの修正: M3 テストのステップ構成を変更（件数は同じ）
- 新規テスト追加: 上記 2-4 を追加（テスト数は増加）
- 他ミッションのテスト: M4 のテストは TestValue 不使用なので影響なし

## 残論点（参謀長レビューで確認が必要）

1. **案 A vs 案 B の最終決定**: 推奨は案 A（DOM テスト）だが、UI 変更を最小化したい場合は案 B も viable
2. **runLinear の per-row 化の影響範囲**: ForEach の `loopActive` フラグ方式を廃止するか、行ガード用の別経路を追加するか
3. **M6 の goals/checks 書き換えの詳細**: M3 が確定してから M6 を同パターンで修正
4. **BrowserView の右クリックメニュー**: テーブルセル → 「値判定」の追加位置と文言（「テスト」「値判定」「条件」のどれが直感的か）
5. **PropertiesPane**: targetId がある TestValue と targetId がない TestValue で UI をどう切り替えるか（列名表示 / 変数選択の要否）
