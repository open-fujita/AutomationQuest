// ============================================================
// DasStatusView — DAS 実行ログ表示（ガード待機ビジュアル付き）
//
// ガードチョイスの guard-waiting / guard-matched エントリを
// 視覚的に区別して表示する（⏳ → ✓ の遷移演出）。
// 既存 StatusView コンポーネントのデザインパターンを踏襲。
// アクセシビリティ: role="log" + aria-live="polite"
// ============================================================

import { useDasRobotStore } from '../../store/dasRobotStore'
import type { DasSimLogEntry } from '../../engine/dasSimulator'
import PanelFrame from '../ds/PanelFrame'

// ---- ログエントリのスタイル定義 ------------------------------

const STATUS_STYLE: Record<DasSimLogEntry['status'], { mark: string; cls: string }> = {
  ok: { mark: '✓', cls: 'text-ds-ok' },
  skip: { mark: '–', cls: 'text-ds-textDim' },
  error: { mark: '✕', cls: 'text-ds-err' },
  'guard-waiting': { mark: '⏳', cls: 'text-ds-warn' },
  'guard-matched': { mark: '✓', cls: 'text-green-400' },
}

// ---- DasStatusView 本体 --------------------------------------

export default function DasStatusView() {
  const sim = useDasRobotStore((s) => s.sim)

  return (
    <PanelFrame title="ステータスビュー" hint="DAS 実行ログ（ガード待機・成立の可視化）">
      <div
        role="log"
        aria-live="polite"
        aria-label="実行ログ"
        className="p-2 font-mono text-[11px] leading-relaxed"
      >
        {!sim.ran && (
          <div className="text-ds-textDim">
            ［実行］を押すと、ここに DAS 実行ログが表示されます。
          </div>
        )}
        {sim.ran && sim.log.length === 0 && (
          <div className="text-ds-textDim">実行されたステップがありません。</div>
        )}

        {sim.log.map((entry, i) => {
          const st = STATUS_STYLE[entry.status]
          const isGuardEntry = entry.status === 'guard-waiting' || entry.status === 'guard-matched'

          return (
            <div
              key={i}
              className={[
                'flex gap-2',
                isGuardEntry ? 'rounded bg-ds-panelAlt/50 px-1' : '',
                entry.status === 'guard-matched' ? 'bg-green-400/5' : '',
              ].join(' ')}
            >
              <span className={`shrink-0 ${st.cls}`}>{st.mark}</span>
              <span className="shrink-0 text-ds-textDim">[{entry.stepName}]</span>
              <span
                className={[
                  'flex-1 break-all',
                  entry.status === 'error' ? 'text-ds-err' :
                  entry.status === 'guard-matched' ? 'text-green-300' :
                  entry.status === 'guard-waiting' ? 'text-ds-warn' :
                  'text-ds-text',
                ].join(' ')}
              >
                {entry.message}
              </span>
              {entry.tick !== undefined && (
                <span className="shrink-0 text-[10px] text-ds-textDim/60">
                  t={entry.tick}
                </span>
              )}
            </div>
          )
        })}

        {/* エラーサマリ */}
        {sim.ran && sim.errors.length > 0 && (
          <div className="mt-2 rounded border border-ds-err/40 bg-ds-err/10 p-2">
            <div className="mb-1 font-semibold text-ds-err">エラー {sim.errors.length} 件</div>
            {sim.errors.map((er, i) => (
              <div key={i} className="text-ds-err">
                ・{er}
              </div>
            ))}
          </div>
        )}

        {/* 実行サマリ */}
        {sim.ran && sim.errors.length === 0 && (
          <div className="mt-2 rounded border border-ds-ok/40 bg-ds-ok/10 p-2 text-[11px] text-ds-ok">
            ✓ 正常終了（{sim.totalTick} tick 消費）
          </div>
        )}

        {/* ガードチョイス結果サマリ */}
        {sim.ran && sim.guardResults.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[10px] text-ds-textDim">ガードチョイス結果:</div>
            {sim.guardResults.map((gr, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="text-green-400">✓</span>
                <span className="text-green-300">{gr.winnerGuardType}</span>
                <span className="text-ds-textDim">成立 (tick={gr.tick})</span>
              </div>
            ))}
          </div>
        )}

        {/* 抽出データサマリ */}
        {sim.ran && Object.keys(sim.data).length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] text-ds-textDim">抽出データ:</div>
            {Object.entries(sim.data).map(([varName, records]) => (
              <div key={varName} className="mt-1 rounded border border-ds-border/40 bg-ds-bg/50 px-2 py-1">
                <div className="text-[10px] font-semibold text-ds-accent">{varName} ({records.length}件)</div>
                {records.slice(0, 5).map((rec, i) => (
                  <div key={i} className="text-[10px] text-ds-textDim">
                    [{i}] {JSON.stringify(rec)}
                  </div>
                ))}
                {records.length > 5 && (
                  <div className="text-[10px] text-ds-textDim">…他 {records.length - 5} 件</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
