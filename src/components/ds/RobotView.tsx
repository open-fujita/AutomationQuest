import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import { useRobotStore } from '../../store/robotStore'
import StepNode, { type StepFlowNode } from './StepNode'
import PanelFrame from './PanelFrame'

const nodeTypes = { dsStep: StepNode }

export default function RobotView() {
  const robot = useRobotStore((s) => s.robot)
  const selectedStepId = useRobotStore((s) => s.selectedStepId)
  const selectStep = useRobotStore((s) => s.selectStep)

  const isGraph = !!robot.edges && robot.edges.length > 0

  const nodes = useMemo<StepFlowNode[]>(
    () =>
      robot.steps.map((step, i) => ({
        id: step.id,
        type: 'dsStep',
        // グラフモードはミッション提供の座標、線形モードは左→右に自動配置
        position: isGraph ? (step.pos ?? { x: i * 150, y: 0 }) : { x: i * 190, y: 0 },
        data: { step, isSelected: step.id === selectedStepId },
        draggable: false,
        connectable: false,
        selectable: true,
      })),
    [robot.steps, selectedStepId, isGraph],
  )

  const edges = useMemo<Edge[]>(() => {
    // ライトテーマ: 薄グレー地に見える中濃グレー
    const marker = { type: MarkerType.ArrowClosed, color: '#6b7280', width: 16, height: 16 }
    if (isGraph) {
      return (robot.edges ?? []).map((e, i) => ({
        id: `e-${e.from}-${e.to}-${i}`,
        source: e.from,
        target: e.to,
        label: e.label,
        type: 'smoothstep',
        animated: false,
        markerEnd: marker,
      }))
    }
    const es: Edge[] = []
    for (let i = 0; i < robot.steps.length - 1; i++) {
      es.push({
        id: `e-${robot.steps[i].id}-${robot.steps[i + 1].id}`,
        source: robot.steps[i].id,
        target: robot.steps[i + 1].id,
        type: 'smoothstep',
        animated: false,
        markerEnd: marker,
      })
    }
    return es
  }, [robot.steps, robot.edges, isGraph])

  const onNodeClick: NodeMouseHandler = (_, node) => selectStep(node.id)

  return (
    <PanelFrame title="ロボットビュー" hint="ステップを左→右に連結してフローを組む">
      <div className="h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => selectStep(null)}
          nodesDraggable={false}
          nodesConnectable={false}
          defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
          proOptions={{ hideAttribution: true }}
        >
          {/* ライトテーマ: 白いキャンバスに薄グレーのドット */}
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#d0d4dc" />
          <Controls showInteractive={false} className="!bg-das-panelAlt !border-das-border" />
        </ReactFlow>
      </div>
    </PanelFrame>
  )
}
