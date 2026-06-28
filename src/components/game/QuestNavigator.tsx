// ============================================================
// QuestNavigator — build フェーズ中に「今やること」を常時ナビゲートするバー。
//
// 表示仕様:
//   - 未達成の条件のうち最初の 1 つを「STEP n/N: <label>」で大きく表示
//   - STEP 1 のみ先頭に「まずは…」を付加（最初の一歩演出）
//   - その failHint を 1 行で添える
//   - 達成済み件数のプログレス表示（n-1/N ✓）
//   - すべての構造チェックが済んで残りが実行時チェックのみの場合は
//     「▶ 実行して確認しましょう」を強調表示
//   - 折りたたみ可能（▾/▸）。folded でも「STEP n/N」のミニ表示を維持
// ============================================================

import { useState } from 'react'
import type { CheckOutcome } from '../../engine/validator'

interface Props {
  /** validateMission / validateDasMission の outcomes をそのまま渡す */
  outcomes: CheckOutcome[]
}

/** hint が「実行」に関するチェックかどうかを判定（▶ 表示切り替え用） */
function isRunCheck(hint: string): boolean {
  return hint.startsWith('▶') || /実行/.test(hint)
}

export default function QuestNavigator({ outcomes }: Props) {
  const [folded, setFolded] = useState(false)

  const total = outcomes.length
  const passedCount = outcomes.filter((o) => o.pass).length
  const failedOutcomes = outcomes.filter((o) => !o.pass)

  // すべてクリア済み（結果フェーズへ遷移直前）は非表示でよい
  if (total === 0 || failedOutcomes.length === 0) return null

  const current = failedOutcomes[0]
  const currentIndex = outcomes.findIndex((o) => o.id === current.id) // 0-based 全体インデックス
  const stepNumber = currentIndex + 1 // 1-based 表示用

  // 残りが実行時チェックのみかどうかを判定
  const onlyRunChecksLeft = failedOutcomes.every((o) => isRunCheck(o.hint))

  // STEP 1 だけ「まずは…」接頭辞
  const labelPrefix = stepNumber === 1 ? 'まずは…　' : ''

  return (
    <div
      className="shrink-0 border-b border-das-border bg-das-bg/80"
      role="region"
      aria-label="今やること ナビゲータ"
    >
      <div className="flex items-center gap-2 px-3 py-1">
        {/* 折りたたみボタン */}
        <button
          onClick={() => setFolded((v) => !v)}
          className="shrink-0 rounded px-1 text-[11px] text-das-textDim hover:text-das-text"
          aria-label={folded ? 'ナビゲータを展開' : 'ナビゲータを折りたたむ'}
          aria-expanded={!folded}
        >
          {folded ? '▸' : '▾'}
        </button>

        {/* STEP バッジ */}
        <span className="shrink-0 rounded bg-das-accent2/20 px-1.5 py-0.5 text-[11px] font-bold text-das-accent2">
          STEP {stepNumber}/{total}
        </span>

        {/* folded 時: ミニ表示のみ */}
        {folded ? (
          <span className="truncate text-[12px] text-das-textDim">
            {labelPrefix}{current.label}
          </span>
        ) : (
          <>
            {/* 展開時: メインラベル */}
            <span className="truncate text-[13px] font-semibold text-das-text">
              {labelPrefix}{current.label}
            </span>

            {/* 達成プログレス */}
            {passedCount > 0 && (
              <span className="ml-auto shrink-0 text-[11px] text-das-ok">
                {passedCount}/{total} ✓
              </span>
            )}
          </>
        )}
      </div>

      {/* 展開時: ヒント行 */}
      {!folded && (
        <div className="px-3 pb-1.5">
          {onlyRunChecksLeft ? (
            /* 実行時チェックのみ残っている場合は実行促進メッセージを強調表示 */
            <p className="text-[12px] font-semibold text-das-accent2">
              ▶ 実行して確認しましょう
            </p>
          ) : (
            <p className="text-[12px] text-das-warn">
              {/* 実行チェックが混在する場合でも hint をそのまま表示 */}
              💡 {current.hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
