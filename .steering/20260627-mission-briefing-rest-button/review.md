---
index: "[[INDEX]]"
---

# review.md

> 親 INDEX: [[INDEX]]

## 判定: APPROVE（条件付き）

コードレビュー全項目 PASS。typecheck / test の実行は参謀長に委ねる。

## 変更サマリ（Before / After）

| # | ファイル | 行番号 | Before | After | 検証 |
|---|---|---|---|---|---|
| 1 | `MissionBriefing.tsx` | 5-8 | `Props { mission, onAccept }` | `Props { mission, onAccept, onRest }` | 実読確認 OK |
| 2 | `MissionBriefing.tsx` | 11 | `{ mission, onAccept }` | `{ mission, onAccept, onRest }` | 実読確認 OK |
| 3 | `MissionBriefing.tsx` | 34 | `justify-end` + onAccept ボタンのみ | `justify-between` + 「← 休憩する」ボタン（左）+ 「相談を受ける →」（右） | 実読確認 OK |
| 4 | `App.tsx` | 197 | `onAccept={() => setPhase('deduction')}` のみ | `+ onRest={goHome}` | 実読確認 OK |
| 5 | `DasWorkspaceLayout.tsx` | 222 | `onAccept={() => setPhase('deduction')}` のみ | `+ onRest={goHome}` | 実読確認 OK |
| 6 | `SetupWorkspace.tsx` | 1119 | `onAccept={() => setPhase('deduction')}` のみ | `+ onRest={goHome}` | 実読確認 OK |

## コードレビュー チェックリスト

### Props 設計
- [x] `onRest` は必須プロップ（`onRest: () => void`）。配線漏れは型エラーで検出
- [x] 3 箇所全てで `onRest={goHome}` が配線されている（Grep で確認: App.tsx / DasWorkspaceLayout.tsx / SetupWorkspace.tsx）
- [x] `goHome` は 3 箇所全てで `useGameStore((s) => s.goHome)` として既に取得済み（追加 import 不要）

### レイアウト
- [x] `justify-end` → `justify-between` でボタンが左右に分かれる
- [x] 「← 休憩する」が左、「相談を受ける →」が右（矢印方向が対称的）
- [x] 「← 休憩する」は副次的スタイル（白背景、枠線、落ち着いた文字色）で primary と視覚的に区別

### スタイル整合性
- [x] 「← 休憩する」のスタイル（`background: '#fff'`, `border: '1px solid #E5D9C8'`, `color: '#8a7a5a'`）は明テーマの配色と調和
- [x] `rounded-lg px-5 py-2.5 text-[14px] font-bold` は既存ボタンと同じサイズ感
- [x] 既存「相談を受ける →」のスタイルは変更なし

### スコープ遵守
- [x] 変更ファイルは 4 つのみ（MissionBriefing.tsx / App.tsx / DasWorkspaceLayout.tsx / SetupWorkspace.tsx）
- [x] `BrowserView.tsx`（先のサブメニュー修正）に変更なし
- [x] `glossary.ts` 未変更
- [x] コミット/プッシュ未実行

### 受け入れ条件
- [x] AC1: コード上、`justify-between` + 2 ボタン配置で左「← 休憩する」右「相談を受ける →」
- [x] AC2: コード上、`onClick={onRest}` → `goHome` → ホーム画面への遷移動線が確立
- [x] AC3: 既存「相談を受ける →」の `onClick={onAccept}` は変更なし
- [ ] AC4: `npm run typecheck` exit 0 -- **参謀長がシェル実行**
- [ ] AC5: `npm test` 253 passed -- **参謀長がシェル実行**
