import type { Mission } from '../../model/mission'
import Modal from './Modal'
import ClientPortrait from './ClientPortrait'

interface Props {
  mission: Mission
  onAccept: () => void
}

export default function MissionBriefing({ mission, onAccept }: Props) {
  return (
    <Modal title={`相談票 #${mission.index} — ${mission.title}`}>
      <div className="flex gap-4">
        <ClientPortrait name={mission.client.name} dept={mission.client.dept} portrait={mission.client.portrait} size={72} />
        <div className="flex-1">
          <div className="text-[12px] text-ds-textDim">
            {mission.client.dept}・{mission.client.name}
          </div>
          <div className="mt-2 rounded-lg rounded-tl-none bg-ds-panelAlt p-3 text-[14px] leading-relaxed text-ds-text">
            「{mission.briefing}」
          </div>
          <div className="mt-3 flex items-center gap-2 text-[12px] text-ds-textDim">
            <span className="rounded bg-ds-err/20 px-2 py-0.5 text-ds-err">現状: 手作業 {mission.manualMinutes} 分/回</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={onAccept}
          className="rounded-lg bg-ds-accent px-5 py-2 text-[14px] font-bold text-ds-bg shadow hover:brightness-110"
        >
          相談を受ける →
        </button>
      </div>
    </Modal>
  )
}
