// ============================================================
// GuideBar — レクチャーエンジンのガイドバー
//
// レクチャー進行中にシェル上部に表示されるガイドバー。
// 表示内容:
//   - 現在手順の指示文
//   - 完了チェックマーク（done 述語の評価結果）
//   - 「次へ」ボタン（done=true または done=null のとき有効）
//   - 「レクチャー終了」ボタン
//
// done 述語の評価は外部（PracticeStudio）が行い、props として渡す。
// GuideBar はシンプルな表示コンポーネント。
//
// props:
//   lectureTitle: レクチャーのアクション名（例:「ブラウザ」）
//   stepIndex: 現在のステップインデックス（0-based）
//   totalSteps: 総ステップ数
//   instruction: 現在ステップの指示文
//   isDone: 現在ステップの完了判定結果（done述語の評価結果）
//   hint: ヒント文字列（省略可）
//   onNext: 次のステップへ（完了後にコール）
//   onFinish: レクチャー終了
// ============================================================

interface GuideBarProps {
  lectureTitle: string
  stepIndex: number
  totalSteps: number
  instruction: string
  isDone: boolean
  hint?: string
  onNext: () => void
  onFinish: () => void
}

export default function GuideBar({
  lectureTitle,
  stepIndex,
  totalSteps,
  instruction,
  isDone,
  hint,
  onNext,
  onFinish,
}: GuideBarProps) {
  const isLastStep = stepIndex >= totalSteps - 1

  return (
    <div
      role="region"
      aria-label="レクチャーガイドバー"
      aria-live="polite"
      className="flex shrink-0 flex-col border-b-2 border-das-accent2 bg-das-accent2/10 px-3 py-2"
    >
      {/* 上段: タイトル + ステップ進捗 */}
      <div className="mb-1.5 flex items-center gap-2">
        <span className="shrink-0 rounded bg-das-accent2 px-2 py-0.5 text-[11px] font-bold text-white">
          レクチャー
        </span>
        <span className="text-[13px] font-semibold text-das-text">{lectureTitle}</span>
        <span className="text-[11px] text-das-textDim">
          ステップ {stepIndex + 1} / {totalSteps}
        </span>

        {/* 完了チェックマーク */}
        <span
          className={[
            'ml-1 rounded-full px-1.5 py-0.5 text-[12px] font-bold transition-colors',
            isDone
              ? 'bg-das-ok/20 text-das-ok'
              : 'bg-das-border/30 text-das-textDim',
          ].join(' ')}
          aria-live="assertive"
          aria-label={isDone ? 'このステップは完了しました' : '未完了'}
          title={isDone ? '完了' : '未完了'}
        >
          {isDone ? '✓ 完了' : '⬜ 未完了'}
        </span>

        {/* 右端: 終了ボタン */}
        <button
          type="button"
          onClick={onFinish}
          className="ml-auto shrink-0 rounded border border-das-border px-2 py-0.5 text-[11px] text-das-textDim hover:border-das-err/60 hover:text-das-err focus:outline-none"
          aria-label="レクチャーを終了して一覧に戻る"
        >
          レクチャー終了
        </button>
      </div>

      {/* 下段: 指示文 + ヒント + 次へボタン */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {/* 指示文 */}
          <p className="text-[13px] text-das-text">{instruction}</p>

          {/* ヒント（isDone=false のとき表示） */}
          {hint && !isDone && (
            <p className="mt-0.5 text-[11px] text-das-textDim">
              <span className="mr-0.5 text-das-warn" aria-hidden="true">💡</span>
              {hint}
            </p>
          )}
        </div>

        {/* 「次へ」ボタン（isDone=true のとき有効） */}
        <button
          type="button"
          onClick={onNext}
          disabled={!isDone}
          className={[
            'shrink-0 rounded px-4 py-1.5 text-[13px] font-semibold transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-das-accent2/50',
            isDone
              ? 'bg-das-accent2 text-white hover:brightness-110 active:brightness-90'
              : 'cursor-not-allowed bg-das-border/30 text-das-textDim',
          ].join(' ')}
          aria-label={
            isDone
              ? isLastStep
                ? 'レクチャーを完了する'
                : '次のステップへ進む'
              : '操作を完了してから次へ進めます'
          }
        >
          {isLastStep && isDone ? '完了 🎉' : '次へ →'}
        </button>
      </div>

      {/* ステッププログレスバー */}
      <div className="mt-2 flex gap-1" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`進捗 ${stepIndex + 1} / ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={[
              'h-1 flex-1 rounded-full transition-colors',
              i < stepIndex ? 'bg-das-ok' : i === stepIndex ? (isDone ? 'bg-das-ok' : 'bg-das-accent2') : 'bg-das-border',
            ].join(' ')}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}
