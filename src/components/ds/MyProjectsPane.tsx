import { useRobotStore } from '../../store/robotStore'

export default function MyProjectsPane() {
  const robot = useRobotStore((s) => s.robot)

  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-das-border bg-das-panelAlt px-3 py-1.5 text-[12px] font-semibold text-das-text">
        マイプロジェクト
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 text-[12px]">
        <div className="text-das-text">📁 自動化推進室</div>
        <div className="ml-3 mt-0.5">
          <div className="flex items-center gap-1 rounded bg-das-accent2/15 px-1.5 py-0.5 text-das-text">
            🤖 {robot.name}.robot
          </div>
          <div className="ml-3 mt-1 text-das-textDim">
            <div className="mb-0.5">📂 タイプ</div>
            {robot.types.length === 0 && <div className="ml-3 text-[11px] text-das-textDim/70">（なし）</div>}
            {robot.types.map((t) => (
              <div key={t.name} className="ml-3 text-[11px]">
                📄 {t.name}.type
              </div>
            ))}
            <div className="mb-0.5 mt-1">📂 スニペット</div>
            <div className="ml-3 text-[11px] text-das-textDim/70">（M6 で登場）</div>
          </div>
        </div>
      </div>
    </div>
  )
}
