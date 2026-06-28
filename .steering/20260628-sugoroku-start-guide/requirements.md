---
index: "[[INDEX]]"
---

# requirements.md

> 親 INDEX: [[INDEX]]

## 概要
すごろくMAP の経路先頭に START マスを新設し、クリックで「クエストの進め方」ガイドモーダルを表示する。

## 受け入れ条件
- [ ] AC1: 経路先頭に START タイルが表示される
- [ ] AC2: START クリックでガイドモーダルが開く
- [ ] AC3: ガイドに4ステップ＋「STEP表示を見ながら」のコツが含まれる
- [ ] AC4: computeFit に START が含まれ見切れない
- [ ] AC5: `npm run typecheck` exit 0
- [ ] AC6: `npm test` 全 green

## スコープ
- 対象: `OfficeMapHome.tsx` のみ
