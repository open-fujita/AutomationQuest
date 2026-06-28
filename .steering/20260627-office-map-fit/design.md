---
index: "[[INDEX]]"
---

# design.md

> 親 INDEX: [[INDEX]]

## 3段階修正アプローチ

### (A) 傾き緩和 -- 階段の段差を浅くして全体をコンパクトに

| 定数 | Before | After | 効果 |
|---|---|---|---|
| Z_STEP（高さ増分/部署） | 22 | 14 | 建物の高さ差が36%縮小 |
| ROW_GAP（行間隔） | 210 | 160 | 行間が24%縮小 |
| ROWS_Y | [560,350,140,-70] 固定配列 | `ROW_Y_START - row * ROW_GAP` 関数 | 任意行数に対応 |

冒頭に定数としてまとめ調整しやすくする: `Z_BASE=16`, `Z_STEP=14`, `ROW_Y_START=560`, `ROW_GAP=160`。

### (B) バウンディングボックスフィット -- クリップ解消の本体

`computeFit()` 関数を新設。depts/goal 確定後、全描画要素の最小/最大 X,Y を算出:

- 各 dept 建物の 8 コーナー: `iso(px..px+120, py..py+120, 0..pz)`
- 各 dept のデスクカード矩形: `iso(px+58,py+8,pz+50)` を中心に W=170, cardH=38+stages*27
- ゴール建物 8 コーナー + 旗
- マスコット矩形（上88/幅29/下ラベル36）

結果から:
- `dx = PAD - minX`, `dy = PAD - minY` （平行移動量）
- `fitW = (maxX-minX) + 2*PAD`, `fitH = (maxY-minY) + 2*PAD` （フィットサイズ）

適用:
- SVG: children を `<g transform="translate(dx,dy)">` でラップ、viewBox/width/height を fitW x fitH に
- HTML オーバーレイ（deptCard / マスコット）: left/top に dx, dy を加算
- キャンバス wrapper: fitW x fitH に

iso() の OX/OY は据え置き（translate で吸収）。

### (C) SCALE 調整

SCALE を 0.88 → 0.82 に縮小。バウンディングボックスフィットと合わせて全体がフレーム内に収まる。

### 概算値（12部署時）

- fitW: 約 720px, fitH: 約 650px
- 表示サイズ（SCALE=0.82）: 約 590 x 533px
- フレーム内側幅（maxWidth 1280 - padding - card padding）: 約 1188px → 十分に収まる

## 変更箇所

| 箇所 | 行番号 | 変更内容 |
|---|---|---|
| 定数 | 33-38 | CANVAS_W/H 除去、Z_BASE/Z_STEP/ROW_Y_START/ROW_GAP/FIT_PAD/SCALE 追加 |
| ROWS_Y + buildDepts | 87-123 | ROWS_Y 配列 → rowY() 関数、z/y 算出に新定数使用 |
| 新規 computeFit | 123 直後 | バウンディングボックス算出関数 |
| コンポーネント内 | 486 直後 | fit 値の算出 |
| scene() SVG | 350-354 | viewBox/dimensions を fitW/fitH、children を g translate でラップ |
| deptCard() | 386-388 | left/top に dx/dy 加算 |
| マスコット | 631 | left/top に dx/dy 加算 |
| キャンバス wrapper | 626-627 | CANVAS_W/H → fitW/fitH |
