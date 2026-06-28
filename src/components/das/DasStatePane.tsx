// ============================================================
// DasStatePane — 右パネル: 変数一覧 + 実行ログ（状態パネル）
//
// 実機 DS の「状態」パネルに相当。
// 右パネルに:
//   - 変数一覧（robot.variables と実行時の data を統合表示）
//   - ガードチョイス結果サマリ
//   - 実行ログ
// アクセシビリティ: role="complementary"
// ============================================================

import { useDasRobotStore } from '../../store/dasRobotStore'
import type { DasSimLogEntry } from '../../engine/dasSimulator'
import PanelFrame from '../ds/PanelFrame'

// ---- ログエントリのスタイル定義 --------------------------------

const STATUS_STYLE: Record<DasSimLogEntry['status'], { mark: string; cls: string }> = {
  ok: { mark: '✓', cls: 'text-das-ok' },
  skip: { mark: '–', cls: 'text-das-textDim' },
  error: { mark: '✕', cls: 'text-das-err' },
  'guard-waiting': { mark: '⏳', cls: 'text-das-warn' },
  'guard-matched': { mark: '✓', cls: 'text-green-400' },
}

export default function DasStatePane() {
  const robot = useDasRobotStore((s) => s.robot)
  const sim = useDasRobotStore((s) => s.sim)

  return (
    <PanelFrame title="状態" hint="変数・実行ログ" className="!bg-das-panel [&>header]:!bg-das-panelAlt [&>header]:!border-das-border [&>header_h2]:!text-das-text [&>header_span]:!text-das-textDim">
      <div
        role="complementary"
        aria-label="状態パネル"
        className="flex flex-col gap-2 p-2 text-[11px] overflow-y-auto"
      >
        {/* ---- 変数一覧 ---- */}
        <div>
          <div className="text-[10px] font-semibold text-das-textDim mb-1 uppercase tracking-wide">変数</div>
          {robot.variables.length === 0 && !sim.ran && (
            <div className="text-[10px] text-das-textDim/60 italic">（変数なし）</div>
          )}
          {robot.variables.map((v) => {
            const records = sim.data[v.name]
            return (
              <div
                key={v.name}
                className="mb-1 rounded border border-das-border bg-das-bg px-2 py-1"
              >
                <div className="flex items-center gap-1">
                  <span className="font-mono text-das-accent">{v.name}</span>
                  <span className="text-[10px] text-das-textDim">: {String(v.typeName)}</span>
                  {records && records.length > 0 && (
                    <span className="ml-auto text-[10px] text-green-400">{records.length}件</span>
                  )}
                </div>
                {records && records.slice(0, 3).map((rec, i) => (
                  <div key={i} className="text-[10px] font-mono text-das-textDim truncate">
                    [{i}] {JSON.stringify(rec)}
                  </div>
                ))}
                {records && records.length > 3 && (
                  <div className="text-[10px] text-das-textDim">…他 {records.length - 3} 件</div>
                )}
              </div>
            )
          })}

          {/* 実行時に取得した変数（robot.variables に未定義のものも表示） */}
          {sim.ran && Object.entries(sim.data)
            .filter(([name]) => !robot.variables.find((v) => v.name === name))
            .map(([name, records]) => (
              <div
                key={name}
                className="mb-1 rounded border border-green-500/30 bg-green-400/5 px-2 py-1"
              >
                <div className="flex items-center gap-1">
                  <span className="font-mono text-das-accent">{name}</span>
                  <span className="ml-auto text-[10px] text-green-400">{records.length}件</span>
                </div>
                {records.slice(0, 3).map((rec, i) => (
                  <div key={i} className="text-[10px] font-mono text-das-textDim truncate">
                    [{i}] {JSON.stringify(rec)}
                  </div>
                ))}
                {records.length > 3 && (
                  <div className="text-[10px] text-das-textDim">…他 {records.length - 3} 件</div>
                )}
              </div>
            ))
          }
        </div>

        {/* ---- ガードチョイス結果 ---- */}
        {sim.ran && sim.guardResults.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-das-textDim mb-1 uppercase tracking-wide">ガード チョイス結果</div>
            {sim.guardResults.map((gr, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] rounded bg-green-400/5 px-2 py-0.5 mb-0.5">
                <span className="text-green-400">✓</span>
                <span className="font-mono text-green-300">{gr.winnerGuardType}</span>
                <span className="text-das-textDim">成立 (tick={gr.tick})</span>
              </div>
            ))}
          </div>
        )}

        {/* ---- 実行ログ ---- */}
        <div>
          <div className="text-[10px] font-semibold text-das-textDim mb-1 uppercase tracking-wide">実行ログ</div>
          <div
            role="log"
            aria-live="polite"
            aria-label="DAS 実行ログ"
            className="font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto"
          >
            {!sim.ran && (
              <div className="text-das-textDim/60">
                ［実行］を押すとログが表示されます
              </div>
            )}
            {sim.ran && sim.log.length === 0 && (
              <div className="text-das-textDim">実行されたステップがありません</div>
            )}
            {sim.log.map((entry, i) => {
              const st = STATUS_STYLE[entry.status]
              const isGuardEntry = entry.status === 'guard-waiting' || entry.status === 'guard-matched'
              return (
                <div
                  key={i}
                  className={[
                    'flex gap-1',
                    isGuardEntry ? 'rounded bg-das-panelAlt px-0.5' : '',
                    entry.status === 'guard-matched' ? 'bg-green-400/5' : '',
                  ].join(' ')}
                >
                  <span className={`shrink-0 ${st.cls}`}>{st.mark}</span>
                  <span className="flex-1 break-all text-das-textDim">{entry.stepName}</span>
                  {entry.tick !== undefined && (
                    <span className="shrink-0 text-[9px] text-das-textDim/50">t={entry.tick}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 実行結果サマリ */}
          {sim.ran && sim.errors.length > 0 && (
            <div className="mt-1 rounded border border-red-300 bg-red-50 p-1.5">
              <div className="font-semibold text-das-err text-[10px]">エラー {sim.errors.length} 件</div>
              {sim.errors.map((er, i) => (
                <div key={i} className="text-[10px] text-das-err">・{er}</div>
              ))}
            </div>
          )}
          {sim.ran && sim.errors.length === 0 && (
            <div className="mt-1 rounded border border-green-300 bg-green-50 p-1 text-[10px] text-das-ok">
              ✓ 正常終了（{sim.totalTick} tick）
            </div>
          )}
        </div>
      </div>
    </PanelFrame>
  )
}
