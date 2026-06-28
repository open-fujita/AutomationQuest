---
index: "[[INDEX]]"
---

# review.md

> 親 INDEX: [[INDEX]]

## 判定: APPROVE（条件付き）

コードレビュー全項目 PASS。typecheck / test は参謀長がシェル実行。

## 変更サマリ（Before / After）

### 定数 (line 33-42)
| 定数 | Before | After |
|---|---|---|
| SCALE | 0.88 | 0.82 |
| CANVAS_W | 1300 | (除去、fit.fitW で代替) |
| CANVAS_H | 940 | (除去、fit.fitH で代替) |
| Z_BASE | (なし、16 がインライン) | 16 (新設) |
| Z_STEP | (なし、22 がインライン) | 14 (新設、36%縮小) |
| ROW_Y_START | (なし) | 560 (新設) |
| ROW_GAP | (なし、210 がインライン) | 160 (新設、24%縮小) |
| FIT_PAD | (なし) | 40 (新設) |

### 関数・ロジック
| 箇所 | Before | After |
|---|---|---|
| ROWS_Y (line 87) | `[560,350,140,-70]` 固定配列 | `rowY(row)` 関数（`ROW_Y_START - row * ROW_GAP`）|
| buildDepts z 算出 | `16 + i * 22` | `Z_BASE + i * Z_STEP` |
| buildDepts y 算出 | `ROWS_Y[row] ?? -70 - (row-3)*210` | `rowY(row)` |
| goal z 算出 | `16 + n * 22` | `Z_BASE + n * Z_STEP` |
| computeFit | (なし) | 新設（bbox 算出、約35行） |
| fit 算出 | (なし) | `const fit = computeFit(depts, goal, ma)` |
| SVG viewBox/dims | `CANVAS_W x CANVAS_H` | `fit.fitW x fit.fitH` |
| SVG children | 直接 | `<g translate(dx,dy)>` でラップ |
| deptCard left/top | `np[0]-W/2`, `np[1]-cardH` | `+ fit.dx`, `+ fit.dy` |
| mascot left/top | `mp[0]-29`, `mp[1]-88` | `+ fit.dx`, `+ fit.dy` |
| wrapper dims | `CANVAS_W*SCALE`, `CANVAS_H*SCALE` | `fit.fitW*SCALE`, `fit.fitH*SCALE` |

## コードレビュー チェックリスト

### バウンディングボックスが全要素を含むか
- [x] 各 dept 建物 8 コーナー: `iso(px..px+120, py..py+120, 0..pz)` を走査
- [x] 各 dept デスクカード矩形: `iso(px+58,py+8,pz+50)` 中心、W=170, cardH=38+stages*27、上端 -10 で flag badge 分も含む
- [x] ゴール建物 8 コーナー: `iso(gx..gx+90, gy..gy+90, 0..gz)` を走査
- [x] ゴール旗: `iso(gx+45,gy+45,gz+22)` から上方 -20、右 +18
- [x] マスコット: `iso(base+46,base+50,base_z)` から上 -90、左右 30、下 +36
- [x] 影やグロー楕円はパディング(FIT_PAD=40)で吸収

### SVG translate と HTML オーバーレイの (dx,dy) 整合
- [x] SVG: `<g transform="translate(dx,dy)">` で全 SVG 要素を一括移動
- [x] deptCard (HTML): `left += fit.dx`, `top += fit.dy`
- [x] mascot (HTML): `left += fit.dx`, `top += fit.dy`
- [x] 全て同一の `fit.dx`, `fit.dy` を使用 → SVG と HTML が同期

### 部署数非依存（ハードコード本数なし）
- [x] ROWS_Y 固定配列を除去 → `rowY(row) = ROW_Y_START - row * ROW_GAP` で任意行数に対応
- [x] Z 算出: `Z_BASE + i * Z_STEP` で任意 i に対応
- [x] computeFit: depts 配列をイテレート → 配列長に依存しない
- [x] CANVAS_W/CANVAS_H 固定値を除去 → fitW/fitH で内容量に追従

### CANVAS_W/CANVAS_H 参照の完全除去
- [x] grep 確認: 0 件（全て fit.fitW/fitH に置換済み）

### スコープ遵守
- [x] 変更は `OfficeMapHome.tsx` のみ
- [x] ミッションデータ・部署構成に変更なし
- [x] glossary.ts 未変更
- [x] BrowserView / MissionBriefing / m1 / m5 の先の修正に回帰なし
- [x] コミット/プッシュ未実行

### 受け入れ条件
- [x] AC2: ハードコードした部署数なし（コードで確認済み）
- [ ] AC1: 12部署がフレーム内に収まる -- **藤田さんが npm run dev で目視確認**
- [ ] AC3: `npm run typecheck` exit 0 -- **参謀長がシェル実行**
- [ ] AC4: `npm test` 253 passed -- **参謀長がシェル実行**
