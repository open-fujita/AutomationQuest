---
index: "[[INDEX]]"
---

# design.md

> 親 INDEX: [[INDEX]]

## 実装アプローチ

### 変更箇所

#### 1. MissionBriefing.tsx -- コンポーネント修正

**Props 拡張**: `onRest: () => void` を必須プロップとして追加。

```typescript
// Before
interface Props {
  mission: Mission
  onAccept: () => void
}

// After
interface Props {
  mission: Mission
  onAccept: () => void
  onRest: () => void
}
```

**フッターレイアウト変更**: `justify-end` → `justify-between` に変更し、左に「休憩する」、右に「相談を受ける →」を配置。

```tsx
// Before
<div className="mt-5 flex justify-end">
  <button onClick={onAccept} ...>相談を受ける →</button>
</div>

// After
<div className="mt-5 flex justify-between">
  <button onClick={onRest} ...>← 休憩する</button>
  <button onClick={onAccept} ...>相談を受ける →</button>
</div>
```

**「休憩する」ボタンのスタイル**: 副次的ボタン（ゴースト/アウトライン系）。明テーマの配色に合わせ、白背景・薄い枠線・落ち着いた文字色。左向き矢印「←」を付与し「戻る」意図を視覚的に強調。

```tsx
<button
  onClick={onRest}
  className="rounded-lg px-5 py-2.5 text-[14px] font-bold"
  style={{ background: '#fff', border: '1px solid #E5D9C8', color: '#8a7a5a' }}
>
  ← 休憩する
</button>
```

#### 2. 呼び出し元 3 箇所 -- `onRest={goHome}` 追加

| ファイル | 行 | 変更 |
|---|---|---|
| `App.tsx` | 197 | `<MissionBriefing ... onRest={goHome} />` |
| `DasWorkspaceLayout.tsx` | 222 | `<MissionBriefing ... onRest={goHome} />` |
| `SetupWorkspace.tsx` | 1119 | `<MissionBriefing ... onRest={goHome} />` |

3 箇所全てで `goHome = useGameStore((s) => s.goHome)` が既に取得済み（実読で確認済み）。新規 import 不要。

### 設計判断

#### `onRest` を必須 vs optional

**必須を採用**。理由: `onRest` を optional (`onRest?: () => void`) にすると、呼び出し元で `onRest` を渡し忘れても型エラーにならず、ボタンが表示されないサイレント不具合になる。必須にすることで 3 箇所全ての配線を型チェックで強制できる。

#### ボタン文言: 「休憩する」vs「← 休憩する」

**「← 休憩する」を採用**。理由: 右側の「相談を受ける →」と対称的なナビゲーション表現になり、「戻る」意図が視覚的に明確。

## 影響範囲分析

### 直接影響

- `MissionBriefing.tsx`: Props 拡張 + フッターレイアウト変更
- `App.tsx`, `DasWorkspaceLayout.tsx`, `SetupWorkspace.tsx`: `onRest` プロップ追加

### 影響なし

- `BrowserView.tsx`（先のサブメニュー修正）
- `Modal.tsx`（MissionBriefing の親コンポーネント、Props 変更なし）
- `goHome` の実装（既存をそのまま使用）
- `glossary.ts`（未コミット WIP）
