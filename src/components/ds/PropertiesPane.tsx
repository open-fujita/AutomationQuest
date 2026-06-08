import { useState, type ReactNode } from 'react'
import { useRobotStore } from '../../store/robotStore'
import type { MockSite } from '../../model/site'
import { parseColTarget, ROW_TARGET } from '../../model/site'
import type { StepActionType } from '../../model/robot'
import { ACTION_LABELS } from '../../model/robot'
import { stepIssue } from '../../engine/stepStatus'
import PanelFrame from './PanelFrame'

// アクションの説明文（実機 DS のアクション説明に相当）
const ACTION_DESC: Record<StepActionType, string> = {
  LoadPage: 'このアクションは、指定した URL のページをブラウザ ウィンドウに読み込みます。',
  ExtractText: 'このアクションは、ファインダーで特定した要素のテキストを変数の属性に抽出します。',
  ExtractURL: 'このアクションは、リンク要素の URL を変数の属性に抽出します。',
  ForEach: 'このアクションは、ファインダーで特定したタグの集合を 1 つずつ繰り返します。',
  TestValue: 'このアクションは、変数の値が条件を満たすか判定し、満たさない行を除外します。',
  Click: 'このアクションは、ファインダーで特定した要素をクリックします。',
  EnterText: 'このアクションは、ファインダーで特定した入力欄にテキスト（固定値 or 入力変数の値）を入力します。',
  SaveFile: 'このアクションは、変数の内容をファイルに書き出します。',
  ReturnValue: 'このアクションは、出力変数を呼び出し元へ返します（ロボットの戻り値）。',
}

// ラベル左・入力右の行（実機 DS のプロパティ項目レイアウト）
function Row({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-right text-[11px] text-ds-textDim">
        {required && <span className="text-ds-err">*</span>}
        {label}:
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function resolveTargetLabel(site: MockSite, targetId: string): string {
  if (!targetId) return '未設定'
  if (targetId === ROW_TARGET) return '一覧の各行'
  const colKey = parseColTarget(targetId)
  if (colKey) return (site.table?.columns.find((c) => c.key === colKey)?.label ?? colKey) + ' 列'
  return site.singles.find((s) => s.id === targetId)?.label ?? targetId
}

// 実機 DS のファインダーは nodePath で対象を特定する。対象から擬似 nodePath を導出して表示。
function nodePathFor(site: MockSite, targetId: string): string {
  if (!targetId) return '（未設定）'
  if (targetId === ROW_TARGET) return '.*.table.tbody'
  const colKey = parseColTarget(targetId)
  if (colKey) {
    const idx = (site.table?.columns.findIndex((c) => c.key === colKey) ?? 0) + 1
    return `.*.tbody.tr.td[${idx}]`
  }
  const el = site.singles.find((s) => s.id === targetId)
  if (el?.role === 'heading') return '.*.h1'
  if (el?.role === 'link') return '.*.a'
  return '.*.' + (el?.role ?? 'div')
}

type PropTab = '基本' | 'ファインダー' | 'アクション' | 'エラー処理'
const TABS: PropTab[] = ['基本', 'ファインダー', 'アクション', 'エラー処理']

const fieldCls =
  'w-full rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-text outline-none focus:border-ds-accent2'
const labelCls = 'mb-1 block text-[11px] font-semibold text-ds-textDim'

// 「アクションを選択 ▼」に出すステップアクション一覧
const ACTION_CHOICES: StepActionType[] = ['LoadPage', 'ExtractText', 'ExtractURL', 'ForEach', 'TestValue', 'Click', 'EnterText', 'SaveFile', 'ReturnValue']

export default function PropertiesPane({ site }: { site: MockSite }) {
  const robot = useRobotStore((s) => s.robot)
  const selectedId = useRobotStore((s) => s.selectedStepId)
  const updateAction = useRobotStore((s) => s.updateAction)
  const updateStepName = useRobotStore((s) => s.updateStepName)
  const setActionType = useRobotStore((s) => s.setActionType)
  const toggleEnabled = useRobotStore((s) => s.toggleEnabled)
  const removeStep = useRobotStore((s) => s.removeStep)
  const moveStep = useRobotStore((s) => s.moveStep)

  const [tab, setTab] = useState<PropTab>('アクション')
  const [errorMode, setErrorMode] = useState('後続のステップをスキップ')
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  const step = robot.steps.find((s) => s.id === selectedId)

  if (!step) {
    return (
      <PanelFrame title="プロパティ" hint="選択中ステップの設定">
        <div className="p-4 text-[12px] text-ds-textDim">ステップまたは接続が選択されていません。</div>
      </PanelFrame>
    )
  }

  const a = step.action
  const editable = step.kind !== 'start' && step.kind !== 'end'
  const selectedVar = a && 'toVariable' in a ? robot.variables.find((v) => v.name === a.toVariable) : undefined
  const attrOptions = selectedVar ? robot.types.find((t) => t.name === selectedVar.typeName)?.attributes ?? [] : []
  const etVar = a?.type === 'EnterText' && a.fromVariable ? robot.variables.find((v) => v.name === a.fromVariable) : undefined
  const etAttrs = etVar ? robot.types.find((t) => t.name === etVar.typeName)?.attributes ?? [] : []
  const issue = stepIssue(step)
  const usesFinder =
    a?.type === 'ExtractText' || a?.type === 'ExtractURL' || a?.type === 'ForEach' || a?.type === 'Click' || a?.type === 'EnterText'

  return (
    <PanelFrame
      title="プロパティ"
      hint={step.stepClass}
      actions={
        editable && (
          <div className="flex items-center gap-1">
            <button onClick={() => moveStep(step.id, -1)} title="前へ" className="rounded bg-ds-panelAlt px-1.5 text-[12px] text-ds-textDim hover:text-ds-text">↑</button>
            <button onClick={() => moveStep(step.id, 1)} title="後へ" className="rounded bg-ds-panelAlt px-1.5 text-[12px] text-ds-textDim hover:text-ds-text">↓</button>
            <button onClick={() => removeStep(step.id)} title="削除" className="rounded bg-ds-err/20 px-1.5 text-[12px] text-ds-err hover:bg-ds-err/40">🗑</button>
          </div>
        )
      }
    >
      {/* タブ */}
      <div className="flex border-b border-ds-border bg-ds-panelAlt/60 text-[11px]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-3 py-1.5',
              tab === t ? 'border-b-2 border-ds-accent2 text-ds-text' : 'text-ds-textDim hover:text-ds-text',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {issue && (
        <div className="border-b border-ds-warn/30 bg-ds-warn/10 px-3 py-1.5 text-[11px] text-ds-warn">⚠ {issue}</div>
      )}

      <div className="space-y-3 p-3">
        {tab === '基本' && (
          <>
            <div>
              <label className={labelCls}>ステップ名</label>
              {editable ? (
                <input className={fieldCls} value={step.name} placeholder="(名前がありません)" onChange={(e) => updateStepName(step.id, e.target.value)} />
              ) : (
                <div className="text-[13px] text-ds-text">{step.name}</div>
              )}
            </div>
            <div>
              <label className={labelCls}>ステップクラス</label>
              <div className="rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-textDim">{step.stepClass}</div>
            </div>
            {editable && (
              <label className="flex items-center gap-2 pt-1 text-[12px] text-ds-textDim">
                <input type="checkbox" checked={step.enabled} onChange={() => toggleEnabled(step.id)} />
                このステップを有効にする
              </label>
            )}
          </>
        )}

        {tab === 'ファインダー' && (
          <>
            {!editable && <div className="text-[12px] text-ds-textDim">開始/終了ステップにファインダーはありません。</div>}
            {editable && !usesFinder && (
              <div className="text-[12px] text-ds-textDim">このアクションはファインダー（対象要素）を使いません。</div>
            )}
            {editable && usesFinder && a && 'targetId' in a && (
              <>
                <div>
                  <label className={labelCls}>{a.type === 'ForEach' ? '繰り返す対象' : '対象要素'}</label>
                  <div className="rounded border border-ds-border bg-ds-bg px-2 py-1 text-[12px] text-ds-text">
                    {resolveTargetLabel(site, a.targetId)}
                  </div>
                  {!a.targetId && (
                    <div className="mt-1 text-[10px] text-ds-warn">ブラウザビューで対象を右クリックして設定します</div>
                  )}
                </div>
                <div>
                  <label className={labelCls}>ノードパス（nodePath）</label>
                  <div className="rounded border border-ds-border bg-ds-bg px-2 py-1 font-mono text-[12px] text-ds-accent2">
                    {nodePathFor(site, a.targetId)}
                  </div>
                  <div className="mt-1 text-[10px] text-ds-textDim">
                    実機 DS のファインダーは、この nodePath（タグの道筋）と属性条件で対象を特定します。右クリックで自動設定されます。
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'アクション' && (
          <>
            {!editable && <div className="text-[12px] text-ds-textDim">{step.name} ステップ（アクション設定なし）。</div>}
            {editable && !a && step.kind === 'branch' && (
              <div className="text-[12px] text-ds-textDim">
                分岐点（○）です。ここから出る複数のブランチを<strong className="text-ds-text">上から順に</strong>実行します。各ブランチは終了（⊗）に達すると、この分岐点に戻って次のブランチへ進みます。
              </div>
            )}
            {editable && a && (
              <div className="space-y-3">
                {/* アクションカタログ（現在のアクション名を表示する全幅ボタン） */}
                <div className="relative">
                  <button
                    onClick={() => setActionMenuOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded border border-ds-border2 bg-ds-panelAlt px-3 py-1.5 text-[13px] font-semibold text-ds-text hover:border-ds-accent2"
                  >
                    <span>{ACTION_LABELS[a.type]}</span>
                    <span className="text-ds-textDim">▼</span>
                  </button>
                  {actionMenuOpen && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded border border-ds-border2 bg-ds-panel shadow-xl">
                      {ACTION_CHOICES.map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setActionType(step.id, t)
                            setActionMenuOpen(false)
                          }}
                          className={[
                            'block w-full px-3 py-1.5 text-left text-[12px] hover:bg-ds-accent2/30',
                            t === a.type ? 'text-ds-accent' : 'text-ds-text',
                          ].join(' ')}
                        >
                          {ACTION_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* アクションの説明 + ヘルプ */}
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[11px] leading-relaxed text-ds-textDim">{ACTION_DESC[a.type]}</p>
                  <span title="ヘルプ" className="cursor-help text-[13px] text-ds-accent2">?</span>
                </div>

                <div className="border-t border-ds-border" />

                {/* アクション別の項目（ラベル左・入力右） */}
                <div className="space-y-2">
                  {a.type === 'LoadPage' && (
                    <>
                      <Row label="URL" required>
                        <input className={fieldCls} value={a.url} placeholder="https://..." onChange={(e) => updateAction(step.id, { url: e.target.value })} />
                      </Row>
                      <div className="pl-[72px]">
                        <button onClick={() => updateAction(step.id, { url: site.url })} className="rounded bg-ds-panelAlt px-2 py-1 text-[11px] text-ds-accent2 hover:bg-ds-border2">
                          このページの URL を使う
                        </button>
                      </div>
                    </>
                  )}

                  {(a.type === 'ExtractText' || a.type === 'ExtractURL') && (
                    <>
                      <Row label="出力先" required>
                        <select className={fieldCls} value={a.toVariable} onChange={(e) => updateAction(step.id, { toVariable: e.target.value, toAttribute: '' })}>
                          <option value="">（変数を選択）</option>
                          {robot.variables.map((v) => (
                            <option key={v.name} value={v.name}>{v.name}（{v.typeName}）</option>
                          ))}
                        </select>
                      </Row>
                      <Row label="属性" required>
                        <select className={fieldCls} value={a.toAttribute} onChange={(e) => updateAction(step.id, { toAttribute: e.target.value })} disabled={!selectedVar}>
                          <option value="">（選択）</option>
                          {attrOptions.map((at) => (<option key={at.name} value={at.name}>{at.name}</option>))}
                        </select>
                      </Row>
                      <p className="pl-[72px] text-[10px] text-ds-textDim">抽出対象（ファインダー）は「ファインダー」タブで設定します。</p>
                    </>
                  )}

                  {a.type === 'ForEach' && (
                    <p className="text-[12px] text-ds-textDim">
                      繰り返す対象は「ファインダー」タブで設定します。この後ろのステップが各行に対して実行されます。
                    </p>
                  )}

                  {a.type === 'TestValue' && (
                    <>
                      <Row label="変数" required>
                        <select className={fieldCls} value={a.toVariable} onChange={(e) => updateAction(step.id, { toVariable: e.target.value, toAttribute: '' })}>
                          <option value="">（選択）</option>
                          {robot.variables.map((v) => (<option key={v.name} value={v.name}>{v.name}</option>))}
                        </select>
                      </Row>
                      <Row label="属性" required>
                        <select className={fieldCls} value={a.toAttribute} onChange={(e) => updateAction(step.id, { toAttribute: e.target.value })} disabled={!selectedVar}>
                          <option value="">（選択）</option>
                          {attrOptions.map((at) => (<option key={at.name} value={at.name}>{at.name}</option>))}
                        </select>
                      </Row>
                      <Row label="条件">
                        <div className="flex gap-1">
                          <select className={fieldCls} value={a.op} onChange={(e) => updateAction(step.id, { op: e.target.value as 'equals' | 'contains' | 'notEmpty' })}>
                            <option value="notEmpty">空でない</option>
                            <option value="equals">等しい</option>
                            <option value="contains">含む</option>
                          </select>
                          {a.op !== 'notEmpty' && (
                            <input className={fieldCls} value={a.value} placeholder="値" onChange={(e) => updateAction(step.id, { value: e.target.value })} />
                          )}
                        </div>
                      </Row>
                    </>
                  )}

                  {a.type === 'EnterText' && (
                    <>
                      <Row label="入力元">
                        <select
                          className={fieldCls}
                          value={a.fromVariable !== undefined ? 'var' : 'fixed'}
                          onChange={(e) =>
                            e.target.value === 'var'
                              ? updateAction(step.id, { fromVariable: robot.variables[0]?.name ?? '', fromAttribute: '' })
                              : updateAction(step.id, { fromVariable: undefined, fromAttribute: undefined })
                          }
                        >
                          <option value="fixed">固定テキスト</option>
                          <option value="var">入力変数から</option>
                        </select>
                      </Row>
                      {a.fromVariable === undefined ? (
                        <Row label="テキスト" required>
                          <input className={fieldCls} value={a.text} onChange={(e) => updateAction(step.id, { text: e.target.value })} />
                        </Row>
                      ) : (
                        <>
                          <Row label="変数" required>
                            <select className={fieldCls} value={a.fromVariable} onChange={(e) => updateAction(step.id, { fromVariable: e.target.value, fromAttribute: '' })}>
                              <option value="">（選択）</option>
                              {robot.variables.map((v) => (
                                <option key={v.name} value={v.name}>
                                  {v.name}
                                  {v.role === 'input' ? '（入力）' : ''}
                                </option>
                              ))}
                            </select>
                          </Row>
                          <Row label="属性" required>
                            <select className={fieldCls} value={a.fromAttribute ?? ''} onChange={(e) => updateAction(step.id, { fromAttribute: e.target.value })} disabled={!etVar}>
                              <option value="">（選択）</option>
                              {etAttrs.map((at) => (
                                <option key={at.name} value={at.name}>{at.name}</option>
                              ))}
                            </select>
                          </Row>
                        </>
                      )}
                    </>
                  )}

                  {a.type === 'Click' && (
                    <p className="text-[12px] text-ds-textDim">クリック対象は「ファインダー」タブで設定します。</p>
                  )}

                  {a.type === 'ReturnValue' && (
                    <Row label="返す変数" required>
                      <select className={fieldCls} value={a.variableName} onChange={(e) => updateAction(step.id, { variableName: e.target.value })}>
                        <option value="">（選択）</option>
                        {robot.variables.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name}
                            {v.role === 'output' ? '（出力）' : ''}
                          </option>
                        ))}
                      </select>
                    </Row>
                  )}

                  {a.type === 'SaveFile' && (
                    <Row label="ファイル名" required>
                      <input className={fieldCls} value={a.fileName} onChange={(e) => updateAction(step.id, { fileName: e.target.value })} />
                    </Row>
                  )}
                </div>

                {/* オプション（実機 DS のアクションタブ下部） */}
                <div className="border-t border-ds-border pt-2">
                  <div className="mb-1 text-[11px] font-semibold text-ds-textDim">オプション</div>
                  <Row label="次の時に続行">
                    <div className="h-14 rounded border border-ds-border bg-ds-bg" />
                    <div className="mt-1 flex gap-1 text-[11px] text-ds-textDim">
                      <span className="rounded bg-ds-panelAlt px-1.5">＋</span>
                      <span className="rounded bg-ds-panelAlt px-1.5">－</span>
                      <span className="rounded bg-ds-panelAlt px-1.5">▲</span>
                      <span className="rounded bg-ds-panelAlt px-1.5">▼</span>
                      <span className="rounded bg-ds-panelAlt px-1.5">🗑</span>
                    </div>
                  </Row>
                  <div className="mt-2">
                    <Row label="オプション">
                      <button className="rounded border border-ds-border bg-ds-bg px-2 py-1 text-[11px] text-ds-textDim hover:border-ds-accent2">設定...</button>
                    </Row>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'エラー処理' && (
          <div>
            <label className={labelCls}>エラー時の動作</label>
            <select className={fieldCls} value={errorMode} onChange={(e) => setErrorMode(e.target.value)} disabled={!editable}>
              <option>後続のステップをスキップ</option>
              <option>エラーを無視して続行</option>
              <option>次の行へ（NextIteration）</option>
              <option>ロボットを停止</option>
            </select>
            <div className="mt-2 text-[10px] text-ds-textDim">
              実機 DS では各ステップにエラー処理を設定でき、トライ-キャッチや「次の行へスキップ」で堅牢にします（M5 で本格的に学びます）。
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
