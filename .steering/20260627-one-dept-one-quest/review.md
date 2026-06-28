---
index: "[[INDEX]]"
---

# review.md

> 親 INDEX: [[INDEX]]

## 判定: APPROVE（条件付き）

コードレビュー + dept 一意性検証 全項目 PASS。typecheck / test の実行は参謀長に委ねる。

## 変更サマリ（Before / After）

| # | ファイル | 行番号 | Before | After | 検証 |
|---|---|---|---|---|---|
| 1 | `m1.ts` | 35 | `{ name: '神崎 経理部主任', dept: '経理部', portrait: '/img/portrait-keiri.png' }` | `{ name: '及川 広報部', dept: '広報部' }` | 実読確認 OK |
| 2 | `m5.ts` | 44 | `{ name: '橘 情報システム部', dept: '情報システム部' }` | `{ name: '岡田 業務システム課', dept: '業務システム課' }` | 実読確認 OK |

## コードレビュー チェックリスト

### dept 一意性検証（grep 突合）
- [x] 全 12 ミッションの `client.dept` を grep で一覧取得
- [x] 12 部署が全て一意（重複なし）:
  広報部 / 総務部 / カスタマーサポート部 / 受注課 / 業務システム課 / 経理部 / 情報システム部 / 倉庫管理部 / 総務部受付係 / 購買部 / 購買管理課 / 営業企画部
- [x] 新部署名「広報部」「業務システム課」が既存部署と重複しない

### クライアント名の整合性
- [x] m1「及川 広報部」: m6 の「神崎」と別姓。部署名と矛盾なし
- [x] m5「岡田 業務システム課」: s1 の「橘」と別姓。部署名と矛盾なし

### portrait の整合性
- [x] m1: `portrait` キーを削除。`ClientPortrait` コンポーネントは portrait 未指定時にイニシャル表示（m4/m5 と同様の fallback）
- [x] m5: 元から portrait なし。変更なし

### briefing / reveal の本文
- [x] m1 briefing:「お知らせ見出しを手でコピーして全社メールに貼っている」→ 広報部の業務として自然
- [x] m1 reveal:「経理メール」の言及 → 広報が他部署通知を拾って配る文脈で成立
- [x] m5 briefing:「呼び出して使い回す部品にしたい」→ 業務システム課のシステム連携で自然
- [x] m5 reveal: 部署固有の言及なし → 問題なし

### スコープ遵守
- [x] 変更ファイルは `m1.ts` / `m5.ts` の 2 ファイルのみ
- [x] OfficeMapHome.tsx 変更なし（動的グルーピングで自動対応）
- [x] missionMapMeta.ts 変更なし
- [x] glossary.ts 未変更
- [x] BrowserView.tsx / MissionBriefing.tsx の先の修正に回帰なし
- [x] コミット/プッシュ未実行

### 受け入れ条件
- [x] AC1: 全 12 部署が一意（grep で突合確認済み）
- [x] AC2: 新部署名が他と重複しない（上記一覧で確認済み）
- [ ] AC3: `npm run typecheck` exit 0 -- **参謀長がシェル実行**
- [ ] AC4: `npm test` 253 passed -- **参謀長がシェル実行**
