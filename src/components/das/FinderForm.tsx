// ============================================================
// FinderForm — 2026.1 準拠コンポーネントファインダーフォーム
//
// 公式 UI 画像（GuardedChoiceLocation.png）の項目をそのまま再現:
//   エイリアス / ベース ファインダー / デバイス / アプリケーション / コンポーネント / □テキスト一致 (Regex)
//
// シミュレータは引き続き selector のみを実際の検索に使用する。
// 他のフィールドは実機の見た目に寄せるための UI 表示用。
// アクセシビリティ: label 関連付け、全フィールドに aria-label
// ============================================================

import React from 'react'
import type { DasFinder } from '../../model/dasRobot'

// ベース ファインダーの選択肢
const BASE_FINDER_OPTIONS = [
  { value: '', label: '(なし)' },
  { value: 'デバイスを再利用', label: 'デバイスを再利用' },
  { value: '前のファインダーを参照', label: '前のファインダーを参照' },
]

// デバイスの選択肢（ゲーム内は local 固定）
const DEVICE_OPTIONS = [
  { value: 'local', label: 'local' },
]

interface FinderFormProps {
  finder: DasFinder
  onChange: (finder: DasFinder) => void
  /** ヘッダの折りたたみボタンを表示するか（ガードレーン内では展開固定） */
  showHeader?: boolean
  headerLabel?: string
  idPrefix: string
}

export const FinderForm = React.memo(function FinderForm({
  finder,
  onChange,
  showHeader = false,
  headerLabel = 'コンポーネント',
  idPrefix,
}: FinderFormProps) {
  const inputCls =
    'w-full rounded border border-ds-border bg-ds-bg px-1.5 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none'
  const labelCls = 'block text-[10px] text-ds-textDim mb-0.5'

  return (
    <div className="rounded border border-ds-border/60 bg-ds-panelAlt p-2 text-[11px]">
      {showHeader && (
        <div className="flex items-center justify-between mb-1.5 text-[11px] font-medium text-ds-text">
          <span>{headerLabel}</span>
          <button
            type="button"
            className="text-[10px] text-ds-textDim hover:text-ds-text"
            aria-label={`${headerLabel}の設定を折りたたむ`}
          >
            ^
          </button>
          <button
            type="button"
            className="ml-1 text-[10px] text-ds-textDim hover:text-ds-text"
            aria-label="ヘルプ"
          >
            ?
          </button>
        </div>
      )}

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
          className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
          aria-label="ベース ファインダー"
        >
          {BASE_FINDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* デバイス */}
      <div className="mb-1.5">
        <label htmlFor={`${idPrefix}-device`} className={labelCls}>
          デバイス
        </label>
        <select
          id={`${idPrefix}-device`}
          value={finder.device ?? 'local'}
          onChange={(e) => onChange({ ...finder, device: e.target.value })}
          className="w-full rounded border border-ds-border bg-ds-panelAlt px-1.5 py-0.5 text-[11px] text-ds-text focus:border-ds-accent2 focus:outline-none"
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

      {/* コンポーネント（セレクタ）*/}
      <div className="mb-1.5">
        <label htmlFor={`${idPrefix}-selector`} className={labelCls}>
          コンポーネント
        </label>
        <input
          id={`${idPrefix}-selector`}
          type="text"
          value={finder.selector}
          onChange={(e) => onChange({ ...finder, selector: e.target.value })}
          className={`${inputCls} font-mono text-ds-accent2`}
          placeholder="button[name=&quot;OK&quot;]"
          spellCheck={false}
          aria-label="コンポーネント セレクタ"
        />
      </div>

      {/* テキスト一致 (Regex) */}
      <div className="flex items-center gap-1.5">
        <input
          id={`${idPrefix}-textmatch`}
          type="checkbox"
          checked={finder.textMatch ?? false}
          onChange={(e) => onChange({ ...finder, textMatch: e.target.checked })}
          className="accent-ds-accent2"
          aria-label="テキスト一致 (Regex) を使用する"
        />
        <label htmlFor={`${idPrefix}-textmatch`} className="text-[10px] text-ds-textDim cursor-pointer">
          テキスト一致 (Regex)
        </label>
        {finder.textMatch && (
          <input
            type="text"
            value={finder.textMatchRegex ?? ''}
            onChange={(e) => onChange({ ...finder, textMatchRegex: e.target.value })}
            className="flex-1 rounded border border-ds-border bg-ds-bg px-1 py-0.5 font-mono text-[10px] text-ds-accent2 focus:border-ds-accent2 focus:outline-none"
            placeholder="正規表現"
            aria-label="テキスト一致の正規表現"
          />
        )}
      </div>
    </div>
  )
})

export default FinderForm
