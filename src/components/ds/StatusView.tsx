import { useRobotStore } from '../../store/robotStore'
import PanelFrame from './PanelFrame'

const STATUS_STYLE = {
  ok: { mark: '✓', cls: 'text-ds-ok' },
  skip: { mark: '–', cls: 'text-ds-textDim' },
  error: { mark: '✕', cls: 'text-ds-err' },
} as const

export default function StatusView() {
  const sim = useRobotStore((s) => s.sim)

  return (
    <PanelFrame title="ステータスビュー / エラービュー" hint="実行ログ・エラー">
      <div className="p-2 font-mono text-[11px] leading-relaxed">
        {!sim.ran && <div className="text-ds-textDim">［実行］を押すと、ここに実行ログが表示されます。</div>}
        {sim.ran && sim.log.length === 0 && <div className="text-ds-textDim">実行されたステップがありません。</div>}
        {sim.log.map((e, i) => {
          const st = STATUS_STYLE[e.status]
          return (
            <div key={i} className="flex gap-2">
              <span className={st.cls}>{st.mark}</span>
              <span className="text-ds-textDim">[{e.stepName}]</span>
              <span className={e.status === 'error' ? 'text-ds-err' : 'text-ds-text'}>{e.message}</span>
            </div>
          )
        })}
        {sim.errors.length > 0 && (
          <div className="mt-2 rounded border border-ds-err/40 bg-ds-err/10 p-2">
            <div className="mb-1 font-semibold text-ds-err">エラー {sim.errors.length} 件</div>
            {sim.errors.map((er, i) => (
              <div key={i} className="text-ds-err">
                ・{er}
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
