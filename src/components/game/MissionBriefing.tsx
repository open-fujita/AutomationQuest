import type { Mission } from '../../model/mission'
import Modal from './Modal'
import ClientPortrait from './ClientPortrait'

interface Props {
  mission: Mission
  onAccept: () => void
  onRest: () => void
}

export default function MissionBriefing({ mission, onAccept, onRest }: Props) {
  return (
    <Modal title={`相談票 #${mission.index} — ${mission.title}`}>
      <div className="flex gap-4">
        <ClientPortrait name={mission.client.name} dept={mission.client.dept} portrait={mission.client.portrait} size={72} />
        <div className="flex-1">
          <div className="text-[12px]" style={{ color: '#9A9A9A' }}>
            {mission.client.dept}・{mission.client.name}
          </div>
          <div
            className="mt-2 rounded-lg rounded-tl-none p-3 text-[14px] leading-relaxed"
            style={{ background: '#FBF1E6', border: '1px solid #F0C79A', color: '#5b4b2a' }}
          >
            「{mission.briefing}」
          </div>
          <div className="mt-3 flex items-center gap-2 text-[12px]">
            <span className="rounded px-2 py-0.5" style={{ background: '#FCE9EC', color: '#ED6A82', fontWeight: 700 }}>
              現状: 手作業 {mission.manualMinutes} 分/回
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-between">
        <button
          onClick={onRest}
          className="rounded-lg px-5 py-2.5 text-[14px] font-bold"
          style={{ background: '#fff', border: '1px solid #E5D9C8', color: '#8a7a5a' }}
        >
          ← 休憩する
        </button>
        <button
          onClick={onAccept}
          className="rounded-lg px-5 py-2.5 text-[14px] font-bold text-white"
          style={{ background: 'linear-gradient(100deg,#F6A35A,#ED6A82)', boxShadow: '0 8px 20px rgba(237,106,130,.24)' }}
        >
          相談を受ける →
        </button>
      </div>
    </Modal>
  )
}
