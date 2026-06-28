---
index: "[[INDEX]]"
---

# requirements.md

> 親 INDEX: [[INDEX]]

## 概要

OfficeMapHome（すごろくMAP）のクエストを「1部署1クエスト」にする。2クエストある部署の片方を新部署へ移す。

## 現状の重複

| 部署 | ミッション | 対応 |
|---|---|---|
| 経理部 | m1（神崎・お知らせ見出し全社展開）+ m6（神崎・経費精算の二段絞り込み） | m6 を残し、m1 を「広報部」へ |
| 情報システム部 | m5（橘・ロボット部品化/入出力変数）+ s1（橘蓮・DASセットアップ） | s1 を残し、m5 を「業務システム課」へ |

## 要件

- m1 の `client.dept` を「広報部」に変更。`client.name` を「及川 広報部」に変更。`portrait` を削除（fallback イニシャル表示）
- m5 の `client.dept` を「業務システム課」に変更。`client.name` を「岡田 業務システム課」に変更
- briefing / reveal の本文は変更しない（内容は新部署でも自然に成立する）
- OfficeMapHome.tsx は変更不要（`buildDepts` が `client.dept` で動的グルーピングするため自動対応）

## 受け入れ条件

- [ ] AC1: 全 12 ミッションの `client.dept` が一意（重複なし）
- [ ] AC2: 新部署名「広報部」「業務システム課」が他ミッションと重複しない
- [ ] AC3: `npm run typecheck` exit 0
- [ ] AC4: `npm test` 253 passed 維持

## スコープ

- 対象: `m1.ts`, `m5.ts` の `client` オブジェクトのみ
- 対象外: 他ミッション、OfficeMapHome.tsx、missionMapMeta.ts、glossary.ts

## 制約

- コミット/プッシュは藤田さん指示待ち
