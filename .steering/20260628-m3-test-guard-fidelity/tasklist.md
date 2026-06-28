---
index: "[[INDEX]]"
---

# tasklist.md

> 親 INDEX: [[INDEX]]

## 概要

M3/M6 の値判定を行ガード（案 A: DOM セル直接テスト）に忠実化する。エンジン・型・UI・ミッションデータ・テストの横断変更。

### 完了条件
- `npm run typecheck` exit 0
- `npm test` 253 以上、全 green
- M1/M2/M5 の既存挙動が不変（回帰なし）

## ロール別タスク分解

### backend 担当（エンジン・型・バリデータ）

- [ ] T1: `robot.ts` — TestValue 型に `targetId?: string` 追加 -- 依存: なし
- [ ] T2: `simulator.ts` — runLinear の ForEach を per-row 化（Extract は行単位、TestValue+targetId は DOM ガード、TestValue-targetId なしは従来コレクションフィルタを post-loop で維持） -- 依存: T1
- [ ] T3: `simulator.ts` — runGraph の TestValue を DOM ガード対応（targetId あり+ループ内で条件不一致時 return） -- 依存: T1
- [ ] T4: `validator.ts` — requireTestValue を targetId 対応（既存互換維持） -- 依存: T1

### data 担当（ミッションデータ）

- [ ] T5: `m3.ts` — goals/checks を「ループ → 値判定(ガード) → 抽出」に更新 -- 依存: T2
- [ ] T6: `m6.ts` — goals/checks を二段ガードパターンに更新 -- 依存: T2

### frontend 担当（UI）

- [ ] T7: `BrowserView.tsx` — テーブルセル右クリックに「値判定」追加 -- 依存: T1
- [ ] T8: `PropertiesPane.tsx` — targetId あり時に「テスト対象列」表示 -- 依存: T1

### tester 担当

- [ ] T9: `engine.test.ts` — M3 テストを新パターン（DOM ガード）に更新 -- 依存: T2, T5
- [ ] T10: `engine.test.ts` — 新規: 後方互換テスト（targetId なし = 従来フィルタ） -- 依存: T2
- [ ] T11: `engine.test.ts` — 新規: 二段ガードテスト（M6 パターン） -- 依存: T2, T6
- [ ] T12: `engine.test.ts` — 新規: runGraph ガードテスト -- 依存: T3
- [ ] T13: 回帰確認 — M1/M2/M4/M5 の既存テストが全 green -- 依存: T2

## 並列実行可能なタスク群

| グループ | タスク | 並列可 |
|---|---|---|
| 1 (型基盤) | T1 | 単独先行 |
| 2 (エンジン) | T2, T3, T4 | T1 完了後、並列 OK |
| 3 (データ+UI) | T5, T6, T7, T8 | T2 完了後、並列 OK |
| 4 (テスト) | T9-T13 | T5, T6 完了後 |
