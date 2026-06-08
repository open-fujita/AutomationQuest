import { useState, type MouseEvent } from 'react'
import type { MockSite, SiteElement } from '../../model/site'
import { colTarget, ROW_TARGET } from '../../model/site'
import { useRobotStore } from '../../store/robotStore'
import type { StepActionType } from '../../model/robot'
import PanelFrame from './PanelFrame'

interface MenuState {
  x: number
  y: number
  label: string
  options: { label: string; action: StepActionType; targetId: string }[]
}

export default function BrowserView({ site, readOnly = false }: { site: MockSite; readOnly?: boolean }) {
  const addAction = useRobotStore((s) => s.addAction)
  const [menu, setMenu] = useState<MenuState | null>(null)

  const openMenu = (e: MouseEvent, m: Omit<MenuState, 'x' | 'y'>) => {
    if (readOnly) return // グラフ（分岐）ミッションでは構成固定
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, ...m })
  }

  const choose = (action: StepActionType, targetId: string) => {
    addAction(action, { targetId })
    setMenu(null)
  }

  const singleOptions = (el: SiteElement) => {
    if (el.role === 'input') {
      return [{ label: 'テキストを入力', action: 'EnterText' as const, targetId: el.id }]
    }
    const opts: MenuState['options'] = [{ label: '抽出（テキスト）', action: 'ExtractText', targetId: el.id }]
    if (el.role === 'link') {
      opts.push({ label: 'URL を抽出', action: 'ExtractURL', targetId: el.id })
    }
    if (el.role === 'link' || el.role === 'button') {
      opts.push({ label: 'クリック', action: 'Click', targetId: el.id })
    }
    return opts
  }

  return (
    <PanelFrame title="アプリケーション（ブラウザビュー）" hint="要素を右クリック →「抽出」などを割り当て" scroll>
      <div className="flex h-full flex-col" onClick={() => setMenu(null)}>
        {/* 疑似ブラウザのアドレスバー */}
        <div className="flex shrink-0 items-center gap-2 border-b border-ds-border bg-ds-bg/60 px-3 py-1.5">
          <span className="text-ds-textDim">🔒</span>
          <span className="truncate rounded bg-ds-panelAlt px-2 py-0.5 text-[12px] text-ds-textDim">{site.url}</span>
        </div>

        {/* ページ本文 */}
        <div className="min-h-0 flex-1 overflow-auto bg-[#f4f6fb] px-5 py-4 text-slate-800">
          <div className="mb-3 border-b border-slate-300 pb-2">
            <div className="text-[15px] font-bold text-slate-900">{site.title}</div>
            {site.intro && <div className="mt-1 text-[12px] text-slate-500">{site.intro}</div>}
          </div>

          {site.singles.map((el) => (
            <div
              key={el.id}
              onContextMenu={(e) => openMenu(e, { label: el.label, options: singleOptions(el) })}
              className="group mb-2 cursor-context-menu rounded px-2 py-1 hover:bg-sky-100"
              title="右クリックで操作を割り当て"
            >
              <span className="mr-2 text-[10px] uppercase tracking-wide text-slate-400">{el.label}</span>
              {el.role === 'heading' ? (
                <span className="text-[15px] font-bold text-slate-900">{el.text}</span>
              ) : el.role === 'link' ? (
                <span className="text-[14px] text-sky-700 underline">{el.text}</span>
              ) : el.role === 'input' ? (
                <span className="inline-block min-w-[160px] rounded border border-slate-400 bg-white px-2 py-0.5 text-[13px] text-slate-400">
                  {el.text || '（入力欄）'}
                </span>
              ) : el.role === 'button' ? (
                <span className="inline-block rounded bg-slate-700 px-3 py-0.5 text-[13px] font-semibold text-white">{el.text}</span>
              ) : (
                <span className="text-[14px]">{el.text}</span>
              )}
            </div>
          ))}

          {site.table && (
            <div className="mt-3">
              <div className="mb-1 text-[12px] font-semibold text-slate-600">{site.table.caption}</div>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {site.table.columns.map((c) => (
                      <th
                        key={c.key}
                        onContextMenu={(e) =>
                          openMenu(e, {
                            label: `${c.label} 列`,
                            options: [
                              { label: `テキストを抽出（${c.label}）`, action: 'ExtractText', targetId: colTarget(c.key) },
                              { label: `URL を抽出（${c.label}）`, action: 'ExtractURL', targetId: colTarget(c.key) },
                            ],
                          })
                        }
                        className="cursor-context-menu border border-slate-300 bg-slate-200 px-2 py-1 text-left font-semibold hover:bg-sky-200"
                        title="列を右クリックで「抽出」"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {site.table.rows.map((row, i) => (
                    <tr
                      key={row.id}
                      onContextMenu={(e) =>
                        openMenu(e, {
                          label: '一覧の行',
                          options: [
                            { label: '要素の繰り返し（各行をループ）', action: 'ForEach', targetId: ROW_TARGET },
                          ],
                        })
                      }
                      className="cursor-context-menu hover:bg-amber-100"
                      title="行を右クリックで「要素の繰り返し」"
                    >
                      {site.table!.columns.map((c) => (
                        <td key={c.key} className={['border border-slate-300 px-2 py-1', i === 0 ? '' : ''].join(' ')}>
                          {row.cells[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1 text-[11px] text-slate-400">行を右クリック →「要素の繰り返し」、列見出しを右クリック →「抽出」</div>
            </div>
          )}
        </div>
      </div>

      {/* 右クリックメニュー */}
      {menu && (
        <div
          className="fixed z-50 min-w-[180px] overflow-hidden rounded-md border border-ds-border2 bg-ds-panel shadow-xl"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-ds-border px-3 py-1.5 text-[11px] text-ds-textDim">{menu.label}</div>
          {menu.options.map((o) => (
            <button
              key={o.label}
              onClick={() => choose(o.action, o.targetId)}
              className="block w-full px-3 py-2 text-left text-[13px] text-ds-text hover:bg-ds-accent2/30"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </PanelFrame>
  )
}
