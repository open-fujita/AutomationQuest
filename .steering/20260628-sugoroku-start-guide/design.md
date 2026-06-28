---
index: "[[INDEX]]"
---

# design.md

> 親 INDEX: [[INDEX]]

## 実装アプローチ

### START 座標
depts[0]（serpentine 先頭）の手前（row=0 の1つ前）に配置。depts[0] は row=0, col=0 (x=40)。START は col=-1 相当: x=40-250=-210, y=rowY(0)=560, z=0（低い台座）。サイズは GOAL と同じ 90x90。

### scene() に START タイル追加
GOAL タイル描画 (line 353-369) のパターンを鏡写し。色は入口らしい緑系。「START」テキストは SVG text 要素で上面に配置。

### 点線ルート延長
route の dPath (line 374-381) を START 中心から開始するよう変更。`M` の始点を START の中心 iso 座標に。

### HTML オーバーレイ「スタート」ラベル
absolute 配置。onClick で showGuide state を true に。fit.dx/dy で補正。

### ガイドモーダル
10か条モーダル（line 745-）のパターン踏襲。4ステップ＋STEPバーのビジュアル＋コツ。

### computeFit に START 追加
START タイル (90x90, z=0) の 8 コーナー + ラベル矩形を ext() に追加。
