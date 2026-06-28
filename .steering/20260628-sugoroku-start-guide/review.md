---
index: "[[INDEX]]"
---

# review.md

> 親 INDEX: [[INDEX]]

## 判定: APPROVE（条件付き）

コードレビュー全項目 PASS。**typecheck/test のシェル実行はこのセッションにシェルツールが割り当てられていないため未実行。参謀長に実行を委ねる。** 前回の反省（テスト未実行で red を見逃した）を踏まえ、未実行であることを正直に報告する。

## 変更サマリ

| 箇所 | 変更 |
|---|---|
| `buildDepts` 返り値 | `start: [number, number, number]` 追加 |
| START 座標 | `[-100, 740, 0]`（左下前景・対角線始点） |
| GOAL 座標 | `[700, -80, Z_BASE+n*Z_STEP]`（右上奥・対角線終点。旧 serpentine 計算から明示座標に変更） |
| `computeFit` 引数 | `startPos` 追加。START タイル 4 コーナー + ラベル矩形を ext() に含む |
| `scene()` | START タイル SVG（box 90x90 + テキスト "START"）追加。ルート dPath を START 中心から開始 |
| コンポーネント state | `showGuide` state 追加 |
| HTML オーバーレイ | 「START / 進め方ガイド」ラベル（onClick → setShowGuide(true)、fit.dx/dy 補正済み） |
| ガイドモーダル | 4 ステップ＋「STEP 表示を見ながら」コツ＋ STEP バーのビジュアル |

## コードレビュー チェックリスト

- [x] START タイルが左下前景に配置（[-100, 740, 0]）
- [x] GOAL タイルが右上奥に配置（[700, -80, Z_BASE+n*Z_STEP]。旧 serpentine → 明示座標）
- [x] ルートが START → depts[0..11] → GOAL で自然につながる
- [x] scene() に START タイル SVG 追加（box + text、GOAL と区別できる緑系配色）
- [x] ルートの dPath が START 中心から開始（M → L ... → L goal）
- [x] HTML ラベルに onClick={setShowGuide(true)} + fit.dx/dy 補正
- [x] ガイドモーダルに 4 ステップ + 「STEP 表示を見ながら」のコツ + STEP バービジュアル
- [x] computeFit に START タイル 4 コーナー + ラベル矩形を追加（見切れ防止）
- [x] 10 か条モーダルのパターン踏襲（fixed, z-2000, 背景クリックで閉じる）
- [x] 既存修正（サブメニュー/MissionBriefing/m1/m5/フレームフィット/M3M6ガード）に回帰なし
- [x] glossary.ts 未変更
- [ ] `npm run typecheck` exit 0 -- **シェル未割当のため未実行**
- [ ] `npm test` 全 green -- **シェル未割当のため未実行**
