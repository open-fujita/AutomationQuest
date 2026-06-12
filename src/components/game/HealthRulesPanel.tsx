// ============================================================
// HealthRulesPanel — 「健康なロボットのための10か条」常設リファレンスモーダル
//
// 10 条すべてのタイトル＋短い解説を一覧表示。
// クリア済みミッションでフォーカスした条には「体験済み」バッジを表示。
// 末尾に出典（RPA Technologies の PDF）へのリンクを表示。
// ============================================================

import { useGameStore } from '../../store/gameStore'
import {
  HEALTH_RULES,
  HEALTH_RULES_SOURCE_URL,
  HEALTH_RULES_SOURCE_LABEL,
  MISSION_HEALTH_FOCUS,
} from '../../data/healthRules'
import Modal from './Modal'

interface Props {
  onClose: () => void
}

export default function HealthRulesPanel({ onClose }: Props) {
  const completedMissions = useGameStore((s) => s.completedMissions)

  // クリア済みミッションで体験済みの条番号セットを導出
  const experiencedNumbers = new Set<number>(
    completedMissions.flatMap((id) => MISSION_HEALTH_FOCUS[id] ?? []),
  )

  return (
    <Modal
      title="健康なロボットのための10か条"
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <p className="mb-4 text-[12px] text-ds-textDim">
        保守しやすく、壊れにくいロボットを設計するための原則です。ミッションをクリアするたびに「体験済み」になります。
      </p>

      <ol className="space-y-2.5">
        {HEALTH_RULES.map((rule) => {
          const experienced = experiencedNumbers.has(rule.number)
          return (
            <li
              key={rule.id}
              className={[
                'rounded-lg border p-3',
                experienced
                  ? 'border-ds-ok/40 bg-ds-ok/5'
                  : 'border-ds-border bg-ds-bg/40',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {/* 条番号バッジ */}
                  <span
                    className={[
                      'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold',
                      experienced
                        ? 'bg-ds-ok/20 text-ds-ok'
                        : 'bg-ds-panelAlt text-ds-textDim',
                    ].join(' ')}
                    aria-label={`第 ${rule.number} 条`}
                  >
                    第{rule.number}条
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-ds-text">
                      {rule.title}
                    </div>
                    <div className="mt-0.5 text-[12px] leading-relaxed text-ds-textDim">
                      {rule.description}
                    </div>
                  </div>
                </div>

                {/* 体験済みバッジ */}
                {experienced && (
                  <span
                    className="shrink-0 rounded-full bg-ds-ok/20 px-2 py-0.5 text-[10px] font-semibold text-ds-ok"
                    aria-label="体験済み"
                  >
                    体験済み ✓
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* 出典 */}
      <div className="mt-5 border-t border-ds-border pt-3 text-[11px] text-ds-textDim">
        出典:{' '}
        <a
          href={HEALTH_RULES_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ds-accent2 underline hover:brightness-125"
        >
          {HEALTH_RULES_SOURCE_LABEL}
        </a>
      </div>
    </Modal>
  )
}
