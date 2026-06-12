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

  // すべて good なら全員合格
  const allGood = findings.every((f) => f.status === 'good')

  return (
    <div className="mt-4 rounded-lg border border-ds-border2 bg-ds-bg/60">
      {/* ヘッダー（折りたたみトグル） */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-ds-panelAlt/60"
        aria-expanded={open}
        aria-controls="health-diagnosis-body"
      >
        <span className="text-[13px] font-semibold text-ds-text">
          🩺 ロボット健康診断
        </span>
        <span className="text-[11px] text-ds-textDim" aria-hidden>
          {open ? '▲ 閉じる' : '▼ 開く'}
        </span>
      </button>

      {open && (
        <div id="health-diagnosis-body" className="px-3 pb-3">
          {/* 全員合格の場合 */}
          {allGood && (
            <div className="mb-2 rounded-lg bg-ds-ok/10 px-3 py-2 text-[12px] font-semibold text-ds-ok">
              健康なロボットです！すべてのチェック項目をクリアしました。
            </div>
          )}

          {/* フォーカス条（上部・強調） */}
          {findings.filter((f) => focusSet.has(f.ruleNumber)).length > 0 && (
            <div className="mb-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ds-accent">
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

          {/* 非フォーカス条（下部） */}
          {findings.filter((f) => !focusSet.has(f.ruleNumber)).length > 0 && (
            <div>
              {findings.filter((f) => focusSet.has(f.ruleNumber)).length > 0 && (
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ds-textDim">
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
  return (
    <div
      className={[
        'flex items-start gap-2 rounded-lg px-2.5 py-2 text-[12px]',
        isFocus
          ? isGood
            ? 'border border-ds-ok/40 bg-ds-ok/8'
            : 'border border-amber-400/40 bg-amber-500/8'
          : 'bg-ds-panelAlt/60',
      ].join(' ')}
    >
      {/* ステータスアイコン */}
      <span
        className={[
          'mt-0.5 shrink-0 text-[13px]',
          isGood ? 'text-ds-ok' : 'text-amber-400',
        ].join(' ')}
        aria-label={isGood ? '良い' : '改善余地あり'}
      >
        {isGood ? '○' : '△'}
      </span>
      {/* 内容 */}
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-ds-textDim">
          第{finding.ruleNumber}条
        </span>
        <span className="ml-1 text-ds-text">{finding.message}</span>
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

      {/* 健康診断 */}
      {healthFindings && healthFindings.length > 0 && (
        <HealthDiagnosis
          findings={healthFindings}
          focusNumbers={mission.healthFocus ?? []}
        />
      )}

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
