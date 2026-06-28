// ============================================================
// FinderForm — 2026.1 準拠コンポーネントファインダーフォーム
//
// 実機 UI スクリーンショット（DS_3_guardedchoice_real.png）準拠:
//   「コンポーネント ^ ?」ヘッダ / エイリアス / ベース ファインダー /
//   デバイス / アプリケーション / コンポーネント /
//   □内部コンポーネント / □テキスト一致 (Regex)
//
// ベース ファインダー:
//   「デバイスを再利用」→ デバイス/アプリケーション/コンポーネントを表示（通常モード）
//   「コンポーネント...」→ デバイス/アプリケーション欄を隠し、「(直前の)」ドロップダウンを表示
//
// フォーカス/選択中: 緑の枠線（ガードレーン内での実機表示に準拠）
// コンポーネント(セレクタ)が空のとき: 赤枠 + ❗アイコン
// アクセシビリティ: label 関連付け、全フィールドに aria-label
// ============================================================

import React, { useState } from 'react'
import type { DasFinder } from '../../model/dasRobot'

// ベース ファインダーの選択肢（実機 UI 準拠）
const BASE_FINDER_OPTIONS = [
  { value: '', label: '(なし)' },
  { value: 'device-reuse', label: 'デバイスを再利用' },
  { value: 'component-prev', label: 'コンポーネント...' },
]

// デバイスの選択肢（ゲーム内は local 固定）
const DEVICE_OPTIONS = [
  { value: 'local', label: 'local' },
]

interface FinderFormProps {
  finder: DasFinder
  onChange: (finder: DasFinder) => void
  /**
   * ヘッダ（「コンポーネント ^ ?」行）を表示するか。
   * デフォルト true（実機準拠: ガードレーン内でも表示）
   */
  showHeader?: boolean
  headerLabel?: string
  idPrefix: string
  /** コンポーネントが未設定（セレクタ空）のときに外から ❗ を表示させる場合に使用 */
  showError?: boolean
}

export const FinderForm = React.memo(function FinderForm({
  finder,
  onChange,
  showHeader = true,
  headerLabel = 'コンポーネント',
  idPrefix,
  showError,
}: FinderFormProps) {
  // ヘッダの折りたたみ状態（展開固定のユースケースが多いのでデフォルト展開）
  const [collapsed, setCollapsed] = useState(false)

  // ライトテーマ: 白地・薄グレー枠・濃グレーラベル（コントラスト比確保）
  const inputCls =
    'w-full rounded border border-das-border bg-white px-1.5 py-0.5 text-[11px] text-das-text focus:border-green-600 focus:outline-none'
  const labelCls = 'block text-[10px] text-das-textDim mb-0.5 font-medium'

  // コンポーネント(セレクタ)が空のときエラー表示
  const selectorEmpty = !finder.selector || finder.selector.trim() === ''
  const showSelectorError = showError !== undefined ? showError : selectorEmpty

  // ベース ファインダーが「コンポーネント...」モードか
  const isComponentPrevMode = finder.baseFinder === 'component-prev'

  return (
    <div
      className={[
        'rounded border bg-white p-2 text-[11px]',
        // フォーカス中 / アクティブ: 緑枠（実機準拠）
        'border-das-border focus-within:border-green-600',
      ].join(' ')}
    >
      {/* ヘッダ: 「コンポーネント ^ ?」 */}
      {showHeader && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className="flex-1 text-[11px] font-medium text-das-text">{headerLabel}</span>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="text-[10px] text-das-textDim hover:text-das-text px-0.5"
            aria-label={collapsed ? `${headerLabel}の設定を展開` : `${headerLabel}の設定を折りたたむ`}
          >
            ^
          </button>
          <button
            type="button"
            className="text-[10px] text-das-textDim hover:text-das-text px-0.5"
            aria-label="ヘルプ"
          >
            ?
          </button>
        </div>
      )}

      {/* 折りたたみ時はボディを非表示 */}
      {!collapsed && (
        <>
          {/* エイリアス */}
          <div className="mb-1.5">
            <label htmlFor={`${idPrefix}-alias`} className={labelCls}>
              エイリアス
            </label>
            <input
              id={`${idPrefix}-alias`}
              type="text"
              value={finder.alias ?? ''}
              onChange={(e) => onChange({ ...finder, alias: e.target.value })}
              className={inputCls}
              placeholder=""
              aria-label="エイリアス"
            />
          </div>

          {/* ベース ファインダー */}
          <div className="mb-1.5">
            <label htmlFor={`${idPrefix}-base`} className={labelCls}>
              ベース ファインダー
            </label>
            <select
              id={`${idPrefix}-base`}
              value={finder.baseFinder ?? ''}
              onChange={(e) => onChange({ ...finder, baseFinder: e.target.value })}
              className="w-full rounded border border-das-border bg-white px-1.5 py-0.5 text-[11px] text-das-text focus:border-green-600 focus:outline-none"
              aria-label="ベース ファインダー"
            >
              {BASE_FINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 「コンポーネント...」モード以外: デバイス / アプリケーション を表示 */}
          {!isComponentPrevMode && (
            <>
              {/* デバイス */}
              <div className="mb-1.5">
                <label htmlFor={`${idPrefix}-device`} className={labelCls}>
                  デバイス
                </label>
                <select
                  id={`${idPrefix}-device`}
                  value={finder.device ?? 'local'}
                  onChange={(e) => onChange({ ...finder, device: e.target.value })}
                  className="w-full rounded border border-das-border bg-white px-1.5 py-0.5 text-[11px] text-das-text focus:border-green-600 focus:outline-none"
                  aria-label="デバイス"
                >
                  {DEVICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* アプリケーション */}
              <div className="mb-1.5">
                <label htmlFor={`${idPrefix}-app`} className={labelCls}>
                  アプリケーション
                </label>
                <input
                  id={`${idPrefix}-app`}
                  type="text"
                  value={finder.application ?? ''}
                  onChange={(e) => onChange({ ...finder, application: e.target.value })}
                  className={inputCls}
                  placeholder="cef"
                  aria-label="アプリケーション"
                />
              </div>
            </>
          )}

          {/* 「コンポーネント...」モード: (直前の) ドロップダウンを表示 */}
          {isComponentPrevMode && (
            <div className="mb-1.5">
              <label htmlFor={`${idPrefix}-prev-component`} className={labelCls}>
                コンポーネント
              </label>
              <div className="flex items-center gap-1">
                <select
                  id={`${idPrefix}-prev-component`}
                  value={finder.aliasName ?? ''}
                  onChange={(e) => onChange({ ...finder, aliasName: e.target.value, reuse: 'prev' })}
                  className={[
                    'flex-1 rounded border px-1.5 py-0.5 text-[11px] focus:outline-none bg-white',
                    showSelectorError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-das-border focus:border-green-600',
                  ].join(' ')}
                  aria-label="コンポーネント（直前の）"
                >
                  <option value="">(直前の)</option>
                </select>
                {showSelectorError && (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                    aria-label="コンポーネントが未設定です"
                    title="コンポーネントが未設定です"
                  >
                    ❗
                  </span>
                )}
              </div>
            </div>
          )}

          {/* コンポーネント（セレクタ）: 通常モードのみ表示 */}
          {!isComponentPrevMode && (
            <div className="mb-1.5">
              <label htmlFor={`${idPrefix}-selector`} className={labelCls}>
                コンポーネント
              </label>
              <div className="flex items-center gap-1">
                <input
                  id={`${idPrefix}-selector`}
                  type="text"
                  value={finder.selector}
                  onChange={(e) => onChange({ ...finder, selector: e.target.value })}
                  className={[
                    'flex-1 rounded border px-1.5 py-0.5 text-[11px] font-mono focus:outline-none bg-white text-das-accent2',
                    showSelectorError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-das-border focus:border-green-600',
                  ].join(' ')}
                  placeholder='button[name="OK"]'
                  spellCheck={false}
                  aria-label="コンポーネント セレクタ"
                  aria-invalid={showSelectorError}
                />
                {showSelectorError && (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                    aria-label="コンポーネントが未設定です"
                    title="コンポーネントが未設定です"
                  >
                    ❗
                  </span>
                )}
              </div>
            </div>
          )}

          {/* □内部コンポーネント（実機 UI 2026.1 準拠: □テキスト一致の上） */}
          <div className="flex items-center gap-1.5 mb-1">
            <input
              id={`${idPrefix}-innercomponent`}
              type="checkbox"
              checked={finder.innerComponent ?? false}
              onChange={(e) => onChange({ ...finder, innerComponent: e.target.checked })}
              className="accent-das-accent2"
              aria-label="内部コンポーネントを対象にする"
            />
            <label htmlFor={`${idPrefix}-innercomponent`} className="text-[10px] text-das-textDim cursor-pointer">
              内部コンポーネント
            </label>
          </div>

          {/* □テキスト一致 (Regex) */}
          <div className="flex items-center gap-1.5">
            <input
              id={`${idPrefix}-textmatch`}
              type="checkbox"
              checked={finder.textMatch ?? false}
              onChange={(e) => onChange({ ...finder, textMatch: e.target.checked })}
              className="accent-das-accent2"
              aria-label="テキスト一致 (Regex) を使用する"
            />
            <label htmlFor={`${idPrefix}-textmatch`} className="text-[10px] text-das-textDim cursor-pointer">
              テキスト一致 (Regex)
            </label>
            {finder.textMatch && (
              <input
                type="text"
                value={finder.textMatchRegex ?? ''}
                onChange={(e) => onChange({ ...finder, textMatchRegex: e.target.value })}
                className="flex-1 rounded border border-das-border bg-white px-1 py-0.5 font-mono text-[10px] text-das-accent2 focus:border-green-600 focus:outline-none"
                placeholder="正規表現"
                aria-label="テキスト一致の正規表現"
              />
            )}
          </div>
        </>
      )}
    </div>
  )
})

export default FinderForm
