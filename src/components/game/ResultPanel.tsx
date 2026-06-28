import { useState } from 'react'
import type { Mission } from '../../model/mission'
import type { SimResult } from '../../model/sim'
import type { HealthFinding } from '../../model/health'
import { GLOSSARY } from '../../data/glossary'
import Modal from './Modal'

interface Props {
  mission: Mission
  sim: SimResult
  hasNext: boolean
  onNext: () => void
  /** 診断エンジンの結果（フォーカス条優先ソート済み）。省略時は診断セクションを非表示 */
  healthFindings?: HealthFinding[]
}

const WORKDAYS_PER_YEAR = 240

// ---- 健康診断サブコンポーネント --------------------------------

interface HealthDiagnosisProps {
  findings: HealthFinding[]
  focusNumbers: number[]
}

function HealthDiagnosis({ findings, focusNumbers }: HealthDiagnosisProps) {
  const [open, setOpen] = useState(true)
  const focusSet = new Set(focusNumbers)
  const allGood = findings.every((f) => f.status === 'good')

  return (
    <div className="mt-4 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #ECEBE7' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        aria-expanded={open}
        aria-controls="health-diagnosis-body"
      >
        <span className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>
          🩺 ロボット健康診断
        </span>
        <span className="text-[11px]" style={{ color: '#9A9A9A' }} aria-hidden>
          {open ? '▲ 閉じる' : '▼ 開く'}
        </span>
      </button>

      {open && (
        <div id="health-diagnosis-body" className="px-3 pb-3">
          {allGood && (
            <div className="mb-2 rounded-lg px-3 py-2 text-[12px] font-semibold" style={{ background: '#E9F6EF', color: '#2E9E6B' }}>
              健康なロボットです！すべてのチェック項目をクリアしました。
            </div>
          )}

          {findings.filter((f) => focusSet.has(f.ruleNumber)).length > 0 && (
            <div className="mb-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#CC8C4B' }}>
                今回のポイント
              </div>
              <div className="space-y-1.5">
                {findings
                  .filter((f) => focusSet.has(f.ruleNumber))
                  .map((f) => (
                    <FindingRow key={f.ruleId} finding={f} isFocus />
                  ))}
              </div>
            </div>
          )}

          {findings.filter((f) => !focusSet.has(f.ruleNumber)).length > 0 && (
            <div>
              {findings.filter((f) => focusSet.has(f.ruleNumber)).length > 0 && (
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#9A9A9A' }}>
                  その他のチェック
                </div>
              )}
              <div className="space-y-1.5">
                {findings
                  .filter((f) => !focusSet.has(f.ruleNumber))
                  .map((f) => (
                    <FindingRow key={f.ruleId} finding={f} isFocus={false} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 1 件の診断結果行 */
function FindingRow({ finding, isFocus }: { finding: HealthFinding; isFocus: boolean }) {
  const isGood = finding.status === 'good'
  const style = isFocus
    ? isGood
      ? { background: '#E9F6EF', border: '1px solid rgba(46,158,107,.35)' }
      : { background: '#FBF1E6', border: '1px solid #F0C79A' }
    : { background: '#F4F2F0' }
  return (
    <div className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-[12px]" style={style}>
      <span className="mt-0.5 shrink-0 text-[13px]" style={{ color: isGood ? '#2E9E6B' : '#E0A767' }} aria-label={isGood ? '良い' : '改善余地あり'}>
        {isGood ? '○' : '△'}
      </span>
      <div className="min-w-0 flex-1">
        <span className="font-semibold" style={{ color: '#6B6B6B' }}>第{finding.ruleNumber}条</span>
        <span className="ml-1" style={{ color: '#1A1A1A' }}>{finding.message}</span>
      </div>
    </div>
  )
}

// ---- メインコンポーネント --------------------------------------

export default function ResultPanel({ mission, sim, hasNext, onNext, healthFindings }: Props) {
  const annualHours = Math.round((mission.manualMinutes * WORKDAYS_PER_YEAR) / 60)
  const reveal = mission.reveal(sim)

  return (
    <Modal title={`解決！ 相談 #${mission.index}「${mission.title}」`} maxWidth="max-w-xl">
      <div className="text-center">
        <div className="text-[40px]">🛠️🎉</div>
        <div className="mt-1 text-[15px] font-bold" style={{ color: '#2E9E6B' }}>ロボット完成・実行成功</div>
      </div>

      {/* 効果測定 */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg p-3" style={{ background: '#FCE9EC' }}>
          <div className="text-[11px]" style={{ color: '#9A9A9A' }}>手作業</div>
          <div className="text-[20px] font-bold" style={{ color: '#ED6A82' }}>{mission.manualMinutes}分</div>
        </div>
        <div className="flex items-center justify-center text-[20px]" style={{ color: '#9A9A9A' }}>→</div>
        <div className="rounded-lg p-3" style={{ background: '#E9F6EF' }}>
          <div className="text-[11px]" style={{ color: '#9A9A9A' }}>ロボット</div>
          <div className="text-[20px] font-bold" style={{ color: '#2E9E6B' }}>{mission.robotSeconds}秒</div>
        </div>
      </div>
      <div className="mt-2 rounded-lg p-2 text-center text-[13px]" style={{ background: '#FAFAF8', color: '#3D3D3D' }}>
        年間 約 <span className="text-[16px] font-bold" style={{ color: '#CC8C4B' }}>{annualHours}</span> 時間の削減（概算・毎営業日換算）
      </div>

      {/* 気づき・成果 */}
      <div className="mt-4 rounded-lg p-3 text-[13px] leading-relaxed" style={{ background: '#FBF1E6', border: '1px solid #F0C79A', color: '#5b4b2a' }}>
        {reveal.split('\n\n').map((para, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {para}
          </p>
        ))}
      </div>

      {/* 健康診断 */}
      {healthFindings && healthFindings.length > 0 && (
        <HealthDiagnosis findings={healthFindings} focusNumbers={mission.healthFocus ?? []} />
      )}

      {/* 解禁された用語 */}
      <div className="mt-4">
        <div className="mb-1 text-[12px] font-semibold" style={{ color: '#9A9A9A' }}>この相談で身についた用語</div>
        <div className="flex flex-wrap gap-1.5">
          {mission.glossary.map((k) => (
            <span key={k} className="rounded-full px-2.5 py-0.5 text-[11px]" style={{ background: '#FAFAF8', border: '1px solid #ECEBE7', color: '#3D3D3D' }} title={GLOSSARY[k]?.desc}>
              {GLOSSARY[k]?.term ?? k}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        {hasNext ? (
          <button
            onClick={onNext}
            className="rounded-lg px-5 py-2.5 text-[14px] font-bold text-white"
            style={{ background: 'linear-gradient(100deg,#F6A35A,#ED6A82)', boxShadow: '0 8px 20px rgba(237,106,130,.24)' }}
          >
            次の相談へ →
          </button>
        ) : (
          <div className="text-center text-[13px]" style={{ color: '#9A9A9A' }}>
            ここまでが現在の縦切りです。続きの相談は順次追加されます。
          </div>
        )}
      </div>
    </Modal>
  )
}
