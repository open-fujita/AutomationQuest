---
index: "[[INDEX]]"
---

# review.md

> 親 INDEX: [[INDEX]]

## 判定: APPROVE（条件付き）

コードレビュー全項目 PASS。typecheck / test は参謀長がシェル実行。

## 変更ファイル一覧と Before / After

### 1. `src/model/robot.ts` (line 30) — 型変更
| Before | After |
|---|---|
| `{ type: 'TestValue'; toVariable: string; toAttribute: string; op: ...; value: string }` | `{ type: 'TestValue'; targetId?: string; toVariable: string; toAttribute: string; op: ...; value: string }` |

### 2. `src/engine/simulator.ts` — エンジン変更（最大変更）

**新規追加**: `evalTest()` 共用ユーティリティ（条件評価）

**runLinear 全面リファクタ**:
| 項目 | Before | After |
|---|---|---|
| ForEach | `loopActive = true` フラグ | per-row イテレーション |
| Extract (ループ内) | `loopActive ? allRows : slice(0,1)` 一括読取 | `writeCell(var, writeIdx, attr, rows[ri].cells[ck])` 行単位 |
| Extract (ループ外) | 同上 | 先頭 1 件のみ（M2 教育挙動を維持） |
| TestValue (targetId あり, ループ内) | (なし) | DOM セルガード: 不一致行スキップ |
| TestValue (targetId なし, ループ外) | コレクション一括フィルタ | 同左（後方互換維持） |
| `loopActive` フラグ | あり | 完全除去 |

**runGraph**:
| 項目 | Before | After |
|---|---|---|
| `exec()` 戻り値 | `void` | `boolean` (false=ガード不一致) |
| TestValue (targetId あり, ループ内) | コレクションフィルタ | DOM セルガード + `return false` |
| TestValue (targetId なし) | コレクションフィルタ | 同左（後方互換維持） |
| `run()` 内 exec 呼出 | `exec(node)` | `if (!exec(node)) return` |

### 3. `src/data/missions/m3.ts` — goals/checks 更新
| Before | After |
|---|---|
| goals: 「ループ+抽出 → 値判定」 | goals: 「ループ → 値判定(ガード) → 抽出」 |
| checks: requireTestValue の前に requireExtractCount | checks: requireTestValue を requireExtractCount の前に移動 |

### 4. `src/data/missions/m6.ts` — goals/checks 更新
| Before | After |
|---|---|
| goals: 「ループ+抽出 → 二段値判定」 | goals: 「ループ → 二段値判定(ガード) → 抽出」 |
| checks: requireTestValue の前に requireExtractCount | checks: requireTestValue 2つを requireExtractCount の前に移動 |

### 5. `src/components/ds/BrowserView.tsx` (line 346)
| Before | After |
|---|---|
| `{ kind: 'action', label: 'テスト', action: () => {}, disabled: true }` | `{ kind: 'action', label: '値判定', action: () => { addAction('TestValue', { targetId, ... }); setMenu(null) } }` |

### 6. `src/components/ds/PropertiesPane.tsx` (line 283-310)
| Before | After |
|---|---|
| 常に変数+属性セレクト | targetId あり: 「テスト対象列」表示 / targetId なし: 従来の変数+属性セレクト |

### 7. `src/engine/engine.test.ts`
| 変更 | 内容 |
|---|---|
| M6 import 追加 | `import { M6 } from '../data/missions/m6'` |
| M3 テスト書換え | DOM ガードパターン（targetId 付き TestValue → Extract） |
| 新規: 後方互換テスト | targetId 無し TestValue が従来のコレクションフィルタとして動作 |
| 新規: 二段ガードテスト | M6 パターン（2つの DOM ガード → Extract → 3件） |

## コードレビュー チェックリスト

### targetId 有無での分岐整合（runLinear + runGraph）
- [x] runLinear: ループ本体スキャンで `t === 'TestValue' && s.action.targetId` のみをボディに含む。targetId 無しは post-loop でコレクションフィルタ
- [x] runGraph: `exec()` 内で `a.targetId && currentRow !== null` を判定。真なら DOM ガード、偽なら従来フィルタ
- [x] 両 simulator で `evalTest()` を共用

### 後方互換（targetId 無し = 従来フィルタ）
- [x] runLinear: TestValue 無 targetId はループ本体に含まれず、execOutside でコレクションフィルタ
- [x] runGraph: TestValue 無 targetId は従来のコレクションフィルタ分岐
- [x] テスト: 「後方互換」テストで 7→4 件フィルタを検証

### M6 修正完了
- [x] goals を二段ガードパターンに更新
- [x] checks の requireTestValue 2つを requireExtractCount の前に移動
- [x] テスト: 二段 DOM ガードで 3 件に絞り込みを検証

### per-row 化で M1/M2/M5 の挙動不変
- [x] M1: ForEach なし、単一要素抽出 → execOutside で処理、変更なし
- [x] M2: ForEach + Extract → per-row で全行抽出、writeIdx = 0..n-1 → 全行取得（結果不変）
- [x] M2 ループ無し: ForEach 前に Extract → execOutside で先頭 1 件のみ（結果不変）
- [x] M5: ForEach + Extract → per-row 全行抽出 + ReturnValue は post-loop → 結果不変
- [x] M4: runGraph 実行（edges あり）。TestValue 不使用 → exec の TestValue 分岐を通らない

### BrowserView の既存修正回帰なし
- [x] onClick 分岐ロジック（line 507）維持
- [x] overflow-visible（line 514）維持
- [x] action: doForEach 3箇所（line 261, 362, 416）維持

### スコープ遵守
- [x] glossary.ts 未変更
- [x] MissionBriefing / m1 / m5 / OfficeMapHome 未変更
- [x] コミット/プッシュ未実行

### 受け入れ条件
- [ ] `npm run typecheck` exit 0 -- **参謀長がシェル実行**
- [ ] `npm test` 253 以上、全 green -- **参謀長がシェル実行**
