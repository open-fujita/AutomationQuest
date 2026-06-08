import type { Mission } from '../../model/mission'
import { useGameStore } from '../../store/gameStore'
import Modal from './Modal'

interface Props {
  mission: Mission
  onProceed: () => void
}

export default function DeductionPanel({ mission, onProceed }: Props) {
  const answers = useGameStore((s) => s.deductionAnswers)
  const answer = useGameStore((s) => s.answerDeduction)

  const allCorrect = mission.deductions.every((q) => answers[q.id] === q.correctIndex)

  return (
    <Modal title={`現場の観察 — 自動化のスジを読む（#${mission.index}）`}>
      <p className="mb-4 text-[13px] text-ds-textDim">
        いきなり作り始めない。まず手作業を観察し、「どこが繰り返しか」「何が変動するか」を<strong className="text-ds-text">見立て</strong>ます。これが自動化思考です。
      </p>

      <div className="space-y-4">
        {mission.deductions.map((q, qi) => {
          const chosen = answers[q.id]
          const correct = chosen === q.correctIndex
          return (
            <div key={q.id} className="rounded-lg border border-ds-border bg-ds-bg/40 p-3">
              <div className="mb-2 text-[13px] font-semibold text-ds-text">
                {qi + 1}. {q.question}
              </div>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi
                  const showState = isChosen
                  const stateCls = !showState
                    ? 'border-ds-border bg-ds-panel hover:border-ds-accent2'
                    : oi === q.correctIndex
                      ? 'border-ds-ok bg-ds-ok/15'
                      : 'border-ds-err bg-ds-err/15'
                  return (
                    <button
                      key={oi}
                      onClick={() => answer(q.id, oi)}
                      className={['flex w-full items-center gap-2 rounded border px-3 py-1.5 text-left text-[13px] text-ds-text', stateCls].join(' ')}
                    >
                      <span className="text-ds-textDim">{isChosen ? (oi === q.correctIndex ? '✓' : '✕') : '○'}</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {chosen !== undefined && (
                <div className={['mt-2 rounded p-2 text-[12px]', correct ? 'bg-ds-ok/10 text-ds-ok' : 'bg-ds-err/10 text-ds-err'].join(' ')}>
                  {correct ? `💡 ${q.insight}` : 'もう一度考えてみましょう。'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[12px] text-ds-textDim">{allCorrect ? '見立てが揃いました。現場へ向かいましょう。' : 'すべて正解すると次に進めます。'}</span>
        <button
          disabled={!allCorrect}
          onClick={onProceed}
          className={[
            'rounded-lg px-5 py-2 text-[14px] font-bold shadow',
            allCorrect ? 'bg-ds-accent text-ds-bg hover:brightness-110' : 'cursor-not-allowed bg-ds-border text-ds-textDim',
          ].join(' ')}
        >
          現場へ — ロボットを組む →
        </button>
      </div>
    </Modal>
  )
}
