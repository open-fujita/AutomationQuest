// ============================================================
// IntroTab — 実機練習編 DS シェルの「紹介」タブ（レクチャー一覧）
//
// 実機練習編の入口ページ。目的:
//   「各アクションのマニュアル代わりに、WEB アプリで操作方法を習得できるもの」
//
// 表示内容:
//   - 実機練習編の説明（冒頭数行）
//   - DAS_STEP_CATALOG 準拠のカテゴリ見出しでアクションを列挙
//   - 7本のレクチャーがあるもの: 「▶ レクチャーを開始」ボタン
//   - 準備中のもの: 「準備中」バッジ（マニュアル目次として機能）
//
// props:
//   onStartLecture: レクチャー ID を渡してレクチャーを開始する
// ============================================================

import { LECTURES, LECTURES_COMING_SOON, isComingSoon } from '../../data/lectures'

interface IntroTabProps {
  onStartLecture: (lectureId: string) => void
}

// カテゴリ順序（DAS_STEP_CATALOG の順に準拠）
const CATEGORY_ORDER = [
  'アプリケーション',
  'マウスとキーボード',
  '抽出',
  'ループ',
  '条件と制御',
  '割り当てと変換',
  'その他',
]

const CATEGORY_ICONS: Record<string, string> = {
  'アプリケーション': '🖥',
  'マウスとキーボード': '🖱',
  '抽出': '🔎',
  'ループ': '↻',
  '条件と制御': '◇',
  '割り当てと変換': '=',
  'その他': '⋯',
}

export default function IntroTab({ onStartLecture }: IntroTabProps) {
  // カテゴリ別にアクション（レクチャー + 準備中）を集約
  const byCategory = new Map<string, {
    lectureId: string | null
    label: string
    comingSoon: boolean
    robotType: 'das' | 'ds'
    overview: string
  }[]>()

  // 実装済みレクチャーを追加
  for (const lec of LECTURES) {
    const arr = byCategory.get(lec.category) ?? []
    arr.push({
      lectureId: lec.id,
      label: lec.actionLabel,
      comingSoon: isComingSoon(lec),
      robotType: lec.robotType,
      overview: lec.overview,
    })
    byCategory.set(lec.category, arr)
  }

  // 準備中レクチャーを追加
  for (const cs of LECTURES_COMING_SOON) {
    const arr = byCategory.get(cs.category) ?? []
    arr.push({
      lectureId: null,
      label: cs.actionLabel,
      comingSoon: true,
      robotType: cs.robotType,
      overview: '',
    })
    byCategory.set(cs.category, arr)
  }

  // カテゴリを CATEGORY_ORDER でソート（未知カテゴリは末尾）
  const sortedCategories = [...byCategory.keys()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return (
    <div
      className="flex h-full flex-col overflow-auto bg-das-bg"
      role="main"
      aria-label="実機練習編 レクチャー一覧"
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-5">
        {/* 冒頭説明 */}
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[22px]" aria-hidden="true">🎓</span>
            <h1 className="text-[18px] font-bold text-das-text">実機練習編 — アクション別レクチャー</h1>
          </div>
          <p className="mb-2 text-[13px] leading-relaxed text-das-textDim">
            BizRobo! Design Studio の各アクションを、マニュアル代わりに操作しながら習得できます。
            レクチャーを開始すると、この DS シェル上でステップの追加・設定を実際に体験できます。
          </p>
          <div className="rounded border border-das-accent2/30 bg-das-accent2/5 px-3 py-2 text-[12px] text-das-accent2">
            💡 左パネルの「パレット」からステップを追加し、カードを展開して設定を行います。
            ガイドバーの指示に従って操作してみましょう。
          </div>
        </div>

        {/* カテゴリ別レクチャー一覧 */}
        <div className="space-y-5">
          {sortedCategories.map((category) => {
            const entries = byCategory.get(category) ?? []
            const icon = CATEGORY_ICONS[category] ?? '▸'
            return (
              <section key={category} aria-labelledby={`cat-${category}`}>
                {/* カテゴリ見出し */}
                <h2
                  id={`cat-${category}`}
                  className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-das-textDim"
                >
                  <span aria-hidden="true">{icon}</span>
                  {category}
                </h2>

                {/* アクション一覧 */}
                <div className="space-y-1.5">
                  {entries.map((entry) => (
                    <div
                      key={entry.label}
                      className={[
                        'flex items-center justify-between rounded border px-3 py-2',
                        entry.comingSoon
                          ? 'border-das-border/50 bg-das-panelAlt/40 opacity-60'
                          : 'border-das-border bg-das-panel hover:border-das-accent2/60 hover:bg-das-accent2/5',
                      ].join(' ')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {/* ロボット種別バッジ */}
                          <span
                            className={[
                              'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                              entry.robotType === 'das'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700',
                            ].join(' ')}
                            title={entry.robotType === 'das' ? '緑ロボット' : '青ロボット'}
                          >
                            {entry.robotType === 'das' ? '緑' : '青'}
                          </span>
                          <span className="text-[13px] font-semibold text-das-text">
                            {entry.label}
                          </span>
                          {entry.comingSoon && (
                            <span className="rounded-full bg-das-textDim/20 px-1.5 py-0.5 text-[10px] text-das-textDim">
                              準備中
                            </span>
                          )}
                        </div>
                        {/* 概要 1 行（非準備中のみ） */}
                        {!entry.comingSoon && entry.overview && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-das-textDim">
                            {entry.overview.split('\n')[0]}
                          </p>
                        )}
                      </div>

                      {/* アクションボタン */}
                      {!entry.comingSoon && entry.lectureId ? (
                        <button
                          type="button"
                          onClick={() => onStartLecture(entry.lectureId!)}
                          className={[
                            'ml-3 shrink-0 rounded px-3 py-1 text-[12px] font-semibold',
                            'bg-das-accent2 text-white hover:brightness-110 active:brightness-90',
                            'focus:outline-none focus:ring-2 focus:ring-das-accent2/50',
                          ].join(' ')}
                          aria-label={`${entry.label} のレクチャーを開始`}
                        >
                          ▶ レクチャーを開始
                        </button>
                      ) : (
                        <span className="ml-3 shrink-0 text-[11px] text-das-textDim/50">
                          準備中
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {/* フッタ */}
        <div className="mt-6 text-center text-[11px] text-das-textDim/60">
          レクチャーを終了するとこの一覧に戻ります。
        </div>
      </div>
    </div>
  )
}
