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
      <p className="mb-4 text-[13px]" style={{ color: '#6B6B6B' }}>
        いきなり作り始めない。まず手作業を観察し、「どこが繰り返しか」「何が変動するか」を<strong style={{ color: '#1A1A1A' }}>見立て</strong>ます。これが自動化思考です。
      </p>

      <div className="space-y-4">
        {mission.deductions.map((q, qi) => {
          const chosen = answers[q.id]
          const correct = chosen === q.correctIndex
          return (
            <div key={q.id} className="rounded-xl p-3" style={{ background: '#FAFAF8', border: '1px solid #ECEBE7' }}>
              <div className="mb-2 text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>
                {qi + 1}. {q.question}
              </div>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi
                  const stateStyle = !isChosen
                    ? { background: '#fff', border: '1px solid #E6E5E1' }
                    : oi === q.correctIndex
                      ? { background: '#E9F6EF', border: '1px solid #2E9E6B' }
                      : { background: '#FCE9EC', border: '1px solid #ED6A82' }
                  return (
                    <button
                      key={oi}
                      onClick={() => answer(q.id, oi)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px]"
                      style={{ color: '#3D3D3D', ...stateStyle }}
                    >
                      <span style={{ color: isChosen ? (oi === q.correctIndex ? '#2E9E6B' : '#ED6A82') : '#B7B6B1', fontWeight: 700 }}>
                        {isChosen ? (oi === q.correctIndex ? '✓' : '✕') : '○'}
                      </span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {chosen !== undefined && (
                <div
                  className="mt-2 rounded-lg p-2 text-[12px]"
                  style={correct ? { background: '#E9F6EF', color: '#2E9E6B' } : { background: '#FCE9EC', color: '#ED6A82' }}
                >
                  {correct ? `💡 ${q.insight}` : 'もう一度考えてみましょう。'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[12px]" style={{ color: '#9A9A9A' }}>{allCorrect ? '見立てが揃いました。現場へ向かいましょう。' : 'すべて正解すると次に進めます。'}</span>
        <button
          disabled={!allCorrect}
          onClick={onProceed}
          className="rounded-lg px-5 py-2.5 text-[14px] font-bold text-white"
          style={
            allCorrect
              ? { background: 'linear-gradient(100deg,#F6A35A,#ED6A82)', boxShadow: '0 8px 20px rgba(237,106,130,.24)', cursor: 'pointer' }
              : { background: '#D9D6D0', cursor: 'not-allowed' }
          }
        >
          現場へ — ロボットを組む →
        </button>
      </div>
    </Modal>
  )
}
