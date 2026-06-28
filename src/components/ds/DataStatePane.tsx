import { useState } from 'react'
import { useRobotStore } from '../../store/robotStore'
import PanelFrame from './PanelFrame'

function AddTypeForm({ onDone, defaultName }: { onDone: () => void; defaultName?: string }) {
  const addType = useRobotStore((s) => s.addType)
  const [name, setName] = useState(defaultName ?? '')
  return (
    <div className="mt-1 flex items-center gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="タイプ名（例: 取引先）"
        className="w-full rounded border border-das-border bg-das-bg px-1.5 py-1 text-[12px] text-das-text outline-none focus:border-das-accent2"
      />
      <button
        onClick={() => {
          if (name.trim()) addType({ name: name.trim(), kind: 'complex', attributes: [] })
          onDone()
        }}
        className="shrink-0 rounded bg-das-accent2 px-2 py-1 text-[11px] font-semibold text-white"
      >
        作成
      </button>
    </div>
  )
}

function AddAttrForm({ typeName, onDone }: { typeName: string; onDone: () => void }) {
  const addAttribute = useRobotStore((s) => s.addAttribute)
  const [name, setName] = useState('')
  return (
    <div className="mt-1 flex items-center gap-1 pl-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="属性名（例: 会社名）"
        className="w-full rounded border border-das-border bg-das-bg px-1.5 py-0.5 text-[11px] text-das-text outline-none focus:border-das-accent2"
      />
      <button
        onClick={() => {
          if (name.trim()) addAttribute(typeName, { name: name.trim() })
          onDone()
        }}
        className="shrink-0 rounded bg-das-border2 px-2 py-0.5 text-[11px] text-das-text"
      >
        ＋
      </button>
    </div>
  )
}

function AddVarForm({ onDone, defaultName }: { onDone: () => void; defaultName?: string }) {
  const types = useRobotStore((s) => s.robot.types)
  const addVariable = useRobotStore((s) => s.addVariable)
  const [name, setName] = useState(defaultName ?? '')
  const [typeName, setTypeName] = useState(defaultName && types.some((t) => t.name === defaultName) ? defaultName : types[0]?.name ?? '')
  const [role, setRole] = useState<'local' | 'input' | 'output'>('local')
  return (
    <div className="mt-1 space-y-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="変数名（例: 取引先）"
        className="w-full rounded border border-das-border bg-das-bg px-1.5 py-1 text-[12px] text-das-text outline-none focus:border-das-accent2"
      />
      <div className="flex items-center gap-1">
        <select
          value={typeName}
          onChange={(e) => setTypeName(e.target.value)}
          className="w-full rounded border border-das-border bg-das-bg px-1.5 py-1 text-[12px] text-das-text outline-none"
        >
          {types.length === 0 && <option value="">（先にタイプを作成）</option>}
          {types.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'local' | 'input' | 'output')}
          title="変数の役割"
          className="shrink-0 rounded border border-das-border bg-das-bg px-1 py-1 text-[11px] text-das-text outline-none"
        >
          <option value="local">一時</option>
          <option value="input">入力</option>
          <option value="output">出力</option>
        </select>
        <button
          onClick={() => {
            if (name.trim() && typeName)
              addVariable({ name: name.trim(), typeName, role: role === 'local' ? undefined : role })
            onDone()
          }}
          className="shrink-0 rounded bg-das-accent2 px-2 py-1 text-[11px] font-semibold text-white"
        >
          作成
        </button>
      </div>
    </div>
  )
}

interface SuggestedSpec {
  typeName: string
  attributes: string[]
  variableName: string
  variableRole?: 'input' | 'output'
}

export default function DataStatePane({ suggested, inputs }: { suggested?: SuggestedSpec; inputs?: Record<string, Record<string, string>> }) {
  const robot = useRobotStore((s) => s.robot)
  const sim = useRobotStore((s) => s.sim)
  const addType = useRobotStore((s) => s.addType)
  const addAttribute = useRobotStore((s) => s.addAttribute)
  const addVariable = useRobotStore((s) => s.addVariable)
  const removeAttribute = useRobotStore((s) => s.removeAttribute)
  const removeType = useRobotStore((s) => s.removeType)
  const removeVariable = useRobotStore((s) => s.removeVariable)
  const [adding, setAdding] = useState<null | { kind: 'type' } | { kind: 'attr'; type: string } | { kind: 'var' }>(null)

  const suggestedCreated =
    !!suggested &&
    robot.types.some((t) => t.name === suggested.typeName) &&
    robot.variables.some((v) => v.name === suggested.variableName)

  const createSuggested = () => {
    if (!suggested) return
    addType({ name: suggested.typeName, kind: 'complex', attributes: [] })
    suggested.attributes.forEach((a) => addAttribute(suggested.typeName, { name: a }))
    addVariable({ name: suggested.variableName, typeName: suggested.typeName, role: suggested.variableRole })
  }

  return (
    <PanelFrame title="データの状態" hint="変数・タイプ・抽出結果">
      <div className="space-y-3 p-2.5 text-[12px]">
        {/* 推奨構成の案内（初心者ガイド） */}
        {suggested && (
          <div className="rounded-lg border border-das-accent/40 bg-das-accent/5 p-2">
            <div className="mb-1 text-[11px] font-semibold text-das-accent">このミッションの推奨構成</div>
            <div className="text-[11px] text-das-text">
              タイプ「<strong>{suggested.typeName}</strong>」（{suggested.attributes.join(' / ')}）＋ 変数「
              <strong>{suggested.variableName}</strong>」
            </div>
            <button
              onClick={createSuggested}
              disabled={suggestedCreated}
              className={[
                'mt-1.5 rounded px-2 py-1 text-[11px] font-semibold',
                suggestedCreated ? 'cursor-default bg-das-panelAlt text-das-textDim' : 'bg-das-accent text-white hover:brightness-110',
              ].join(' ')}
            >
              {suggestedCreated ? '✓ 推奨構成を作成済み' : '推奨構成をまとめて作成'}
            </button>
            <div className="mt-1 text-[10px] text-das-textDim">名前は自由に変えても OK（合否は構造で判定）。迷ったら上のボタンで作成。</div>
          </div>
        )}

        {/* タイプと変数の関係（常時表示の解説） */}
        <div className="rounded-lg border border-das-border bg-das-bg p-2 text-[11px] leading-relaxed text-das-textDim">
          <div>
            <span className="font-semibold text-das-accent2">タイプ</span>＝データの設計図（どんな項目を持つか）。
            <span className="font-semibold text-das-accent2">変数</span>＝その設計図で作った実際の入れ物（データが入る）。
          </div>
          <div className="mt-1">
            例: タイプ「取引先」が <span className="text-das-text">会社名 / 担当者 / 電話</span> を定義 → 変数「取引先」に各社が 1 行ずつ入る（
            <span className="font-mono text-das-text">取引先.会社名</span> で参照）。
          </div>
        </div>

        {/* タイプ */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-das-textDim">タイプ</span>
            <button
              onClick={() => setAdding({ kind: 'type' })}
              className="rounded bg-das-panelAlt px-1.5 py-0.5 text-[11px] text-das-text hover:bg-das-border2"
            >
              ＋ タイプを追加
            </button>
          </div>
          {adding?.kind === 'type' && <AddTypeForm onDone={() => setAdding(null)} defaultName={suggested?.typeName} />}
          {robot.types.length === 0 && adding?.kind !== 'type' && (
            <div className="text-[11px] text-das-textDim">（まだありません）</div>
          )}
          {robot.types.map((t) => (
            <div key={t.name} className="mb-1 rounded border border-das-border bg-das-bg px-2 py-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-das-text">
                  {t.name} <span className="text-[10px] text-das-textDim">({t.kind === 'complex' ? '複合型' : '簡易型'})</span>
                </span>
                <span className="flex items-center gap-2">
                  <button
                    onClick={() => setAdding({ kind: 'attr', type: t.name })}
                    className="text-[11px] text-das-accent2 hover:underline"
                  >
                    ＋ 属性
                  </button>
                  <button
                    onClick={() => removeType(t.name)}
                    title="このタイプを削除（使用中の変数も削除）"
                    className="text-[11px] text-das-err hover:text-red-600"
                  >
                    🗑
                  </button>
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {t.attributes.map((a) => (
                  <span key={a.name} className="inline-flex items-center gap-1 rounded bg-das-panelAlt px-1.5 py-0.5 text-[10px] text-das-textDim">
                    {a.name}
                    <button onClick={() => removeAttribute(t.name, a.name)} title="属性を削除" className="text-das-textDim hover:text-das-err">
                      ×
                    </button>
                  </span>
                ))}
                {t.attributes.length === 0 && <span className="text-[10px] text-das-textDim/70">（属性なし）</span>}
              </div>
              {adding?.kind === 'attr' && adding.type === t.name && (
                <AddAttrForm typeName={t.name} onDone={() => setAdding(null)} />
              )}
            </div>
          ))}
        </div>

        {/* 変数 */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-das-textDim">変数</span>
            <button
              onClick={() => setAdding({ kind: 'var' })}
              className="rounded bg-das-panelAlt px-1.5 py-0.5 text-[11px] text-das-text hover:bg-das-border2"
            >
              ＋ 変数を追加
            </button>
          </div>
          {adding?.kind === 'var' && <AddVarForm onDone={() => setAdding(null)} defaultName={suggested?.variableName} />}
          {robot.variables.length === 0 && adding?.kind !== 'var' && (
            <div className="text-[11px] text-das-textDim">（まだありません）</div>
          )}
          {robot.variables.map((v) => (
            <div key={v.name} className="group mb-0.5 flex items-center gap-2 rounded px-2 py-0.5 hover:bg-das-panelAlt">
              <span className="text-das-accent">◆</span>
              <span className="text-das-text">{v.name}</span>
              <span className="text-[10px] text-das-textDim">: {v.typeName}</span>
              {v.role === 'input' && <span className="rounded bg-das-accent2/20 px-1 text-[9px] text-das-accent2">入力</span>}
              {v.role === 'output' && <span className="rounded bg-das-ok/20 px-1 text-[9px] text-das-ok">出力</span>}
              <button
                onClick={() => removeVariable(v.name)}
                title="変数を削除"
                className="ml-auto text-[11px] text-das-textDim opacity-0 hover:text-das-err group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* 呼び出し元から受け取った入力値 */}
        {inputs && Object.keys(inputs).length > 0 && (
          <div className="rounded-lg border border-das-accent2/40 bg-das-accent2/5 p-2">
            <div className="mb-1 text-[11px] font-semibold text-das-accent2">入力値（呼び出し元から受け取り）</div>
            {Object.entries(inputs).map(([varName, rec]) => (
              <div key={varName} className="text-[11px] text-das-text">
                {varName}: {Object.entries(rec).map(([k, val]) => `${k}=${val}`).join(' / ')}
              </div>
            ))}
            <div className="mt-1 text-[10px] text-das-textDim">入力変数にこの値が入った状態でロボットが呼ばれます（ID等を直書きしない）。</div>
          </div>
        )}

        {/* 実行結果 */}
        {sim.ran && (
          <div>
            <div className="mb-1 font-semibold text-das-textDim">抽出結果</div>
            {Object.keys(sim.data).length === 0 && <div className="text-[11px] text-das-textDim">（データなし）</div>}
            {Object.entries(sim.data).map(([varName, records]) => {
              const attrs = records.length > 0 ? Object.keys(records[0]) : []
              const typeName = robot.variables.find((v) => v.name === varName)?.typeName
              return (
                <div key={varName} className="mb-2">
                  <div className="mb-0.5 text-[11px] text-das-text">
                    変数 {varName}
                    {typeName && <span className="text-das-textDim">（タイプ: {typeName}）</span>}{' '}
                    <span className="text-das-accent">{records.length} 件</span>
                  </div>
                  {attrs.length > 0 && (
                    <div className="mb-0.5 text-[10px] text-das-textDim">列＝タイプの属性／行＝抽出した値</div>
                  )}
                  {attrs.length > 0 && (
                    <div className="overflow-auto rounded border border-das-border">
                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr>
                            {attrs.map((a) => (
                              <th key={a} className="border-b border-das-border bg-das-panelAlt px-1.5 py-0.5 text-left text-das-textDim">
                                {a}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {records.slice(0, 12).map((r, i) => (
                            <tr key={i}>
                              {attrs.map((a) => (
                                <td key={a} className="border-b border-das-border/50 px-1.5 py-0.5 text-das-text">
                                  {r[a]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
