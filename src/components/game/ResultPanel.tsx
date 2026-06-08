import type { Mission } from '../../model/mission'
import type { SimResult } from '../../model/sim'
import { GLOSSARY } from '../../data/glossary'
import Modal from './Modal'

interface Props {
  mission: Mission
  sim: SimResult
  hasNext: boolean
  onNext: () => void
}

const WORKDAYS_PER_YEAR = 240

export default function ResultPanel({ mission, sim, hasNext, onNext }: Props) {
  const annualHours = Math.round((mission.manualMinutes * WORKDAYS_PER_YEAR) / 60)
  const reveal = mission.reveal(sim)

  return (
    <Modal title={`解決！ 相談 #${mission.index}「${mission.title}」`} maxWidth="max-w-xl">
      <div className="text-center">
        <div className="text-[40px]">🛠️🎉</div>
        <div className="mt-1 text-[15px] font-bold text-ds-accent">ロボット完成・実行成功</div>
      </div>

      {/* 効果測定 */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-ds-err/15 p-3">
          <div className="text-[11px] text-ds-textDim">手作業</div>
          <div className="text-[20px] font-bold text-ds-err">{mission.manualMinutes}分</div>
        </div>
        <div className="flex items-center justify-center text-[20px] text-ds-textDim">→</div>
        <div className="rounded-lg bg-ds-ok/15 p-3">
          <div className="text-[11px] text-ds-textDim">ロボット</div>
          <div className="text-[20px] font-bold text-ds-ok">{mission.robotSeconds}秒</div>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-ds-panelAlt p-2 text-center text-[13px] text-ds-text">
        年間 約 <span className="text-[16px] font-bold text-ds-accent">{annualHours}</span> 時間の削減（概算・毎営業日換算）
      </div>

      {/* 気づき・成果 */}
      <div className="mt-4 rounded-lg border border-ds-accent/40 bg-ds-accent/5 p-3 text-[13px] leading-relaxed text-ds-text">
        {reveal.split('\n\n').map((para, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {para}
          </p>
        ))}
      </div>

      {/* 解禁された用語 */}
      <div className="mt-4">
        <div className="mb-1 text-[12px] font-semibold text-ds-textDim">この相談で身についた用語</div>
        <div className="flex flex-wrap gap-1.5">
          {mission.glossary.map((k) => (
            <span key={k} className="rounded-full bg-ds-panelAlt px-2.5 py-0.5 text-[11px] text-ds-text" title={GLOSSARY[k]?.desc}>
              {GLOSSARY[k]?.term ?? k}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        {hasNext ? (
          <button onClick={onNext} className="rounded-lg bg-ds-accent px-5 py-2 text-[14px] font-bold text-ds-bg hover:brightness-110">
            次の相談へ →
          </button>
        ) : (
          <div className="text-center text-[13px] text-ds-textDim">
            ここまでが現在の縦切り（M1・M2）です。続きの相談（M3〜M7）は順次追加されます。
          </div>
        )}
      </div>
    </Modal>
  )
}
