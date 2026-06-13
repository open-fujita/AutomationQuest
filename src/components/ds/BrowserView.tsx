import { useState, type MouseEvent } from 'react'
import type { MockSite, SiteElement } from '../../model/site'
import { colTarget, ROW_TARGET } from '../../model/site'
import { useRobotStore } from '../../store/robotStore'
import PanelFrame from './PanelFrame'

// ============================================================
// 選択中要素のパス情報
// ============================================================
type SelectedPath =
  | { kind: 'none' }
  | { kind: 'single'; elementId: string; segments: PathSegment[] }
  | { kind: 'tableCell'; rowIndex: number; colKey: string; segments: PathSegment[] }
  | { kind: 'tableRow'; rowIndex: number; segments: PathSegment[] }
  | { kind: 'table'; segments: PathSegment[] }
  | { kind: 'thead'; colKey: string; segments: PathSegment[] }

interface PathSegment {
  label: string
  pathKind: SelectedPath['kind']
  /** テーブルセルへ戻るときに必要な追加情報 */
  rowIndex?: number
  colKey?: string
  /** 単一要素へ戻るときの要素 ID */
  elementId?: string
}

// ============================================================
// 階層メニュー型定義
// ============================================================
type MenuItem =
  | { kind: 'action'; label: string; action: () => void; disabled?: boolean }
  | { kind: 'submenu'; label: string; children: MenuItem[] }
  | { kind: 'separator' }

interface MenuState {
  x: number
  y: number
  label: string
  items: MenuItem[]
}

// ============================================================
// 新しいコンプレックス タイプ ダイアログ状態
// ============================================================
interface ComplexTypeDialogState {
  targetId: string
  typeName: string
  attributes: string[]   // カンマ区切りで入力させる（UI上は1フィールド）
  variableName: string
}

// ============================================================
// タグパスを生成するユーティリティ
// ============================================================
function buildSinglePath(el: SiteElement): PathSegment[] {
  const tag =
    el.role === 'heading' ? 'h2'
    : el.role === 'link' ? 'a'
    : el.role === 'input' ? 'input'
    : el.role === 'button' ? 'button'
    : 'p'
  return [
    { label: 'html', pathKind: 'none' },
    { label: 'body', pathKind: 'none' },
    { label: tag, pathKind: 'single', elementId: el.id },
  ]
}

function buildTablePath(): PathSegment[] {
  return [
    { label: 'html', pathKind: 'none' },
    { label: 'body', pathKind: 'none' },
    { label: 'table', pathKind: 'table' },
  ]
}

function buildRowPath(rowIndex: number): PathSegment[] {
  return [
    { label: 'html', pathKind: 'none' },
    { label: 'body', pathKind: 'none' },
    { label: 'table', pathKind: 'table' },
    { label: 'tbody', pathKind: 'none' },
    { label: `tr[${rowIndex}]`, pathKind: 'tableRow', rowIndex },
  ]
}

function buildCellPath(rowIndex: number, colIndex: number, colKey: string): PathSegment[] {
  return [
    { label: 'html', pathKind: 'none' },
    { label: 'body', pathKind: 'none' },
    { label: 'table', pathKind: 'table' },
    { label: 'tbody', pathKind: 'none' },
    { label: `tr[${rowIndex}]`, pathKind: 'tableRow', rowIndex },
    { label: `td[${colIndex}]`, pathKind: 'tableCell', rowIndex, colKey },
  ]
}

function buildTheadPath(colIndex: number, colKey: string): PathSegment[] {
  return [
    { label: 'html', pathKind: 'none' },
    { label: 'body', pathKind: 'none' },
    { label: 'table', pathKind: 'table' },
    { label: 'thead', pathKind: 'none' },
    { label: `th[${colIndex}]`, pathKind: 'thead', colKey },
  ]
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function BrowserView({ site, readOnly = false }: { site: MockSite; readOnly?: boolean }) {
  const addAction = useRobotStore((s) => s.addAction)
  const addType = useRobotStore((s) => s.addType)
  const addAttribute = useRobotStore((s) => s.addAttribute)
  const addVariable = useRobotStore((s) => s.addVariable)
  const robot = useRobotStore((s) => s.robot)

  // ForEach ステップが存在するか（青枠スコープ表示用）
  const hasForEach = robot.steps.some((s) => s.enabled && s.action?.type === 'ForEach')
  const tableRowCount = site.table?.rows.length ?? 0

  // 選択中要素（緑枠）
  const [selected, setSelected] = useState<SelectedPath>({ kind: 'none' })

  // 右クリックメニュー
  const [menu, setMenu] = useState<MenuState | null>(null)

  // コンプレックス タイプ作成ダイアログ
  const [complexDialog, setComplexDialog] = useState<ComplexTypeDialogState | null>(null)

  // メニュー外クリックでメニューを閉じる
  const closeMenu = () => setMenu(null)

  // ============================================================
  // ストアへの操作ヘルパー
  // ============================================================
  const doForEach = () => {
    addAction('ForEach', { targetId: ROW_TARGET })
    setMenu(null)
  }

  const doExtractText = (targetId: string, toVariable?: string, toAttribute?: string) => {
    const id = addAction('ExtractText', { targetId })
    // 既存属性への抽出の場合は変数・属性も設定
    if (toVariable && toAttribute) {
      // addActionはIDを返すので、updateActionでパッチ（ここでは直接store側で対応）
      // 簡略化のため addAction 後に patch を別途送る
      const { updateAction } = useRobotStore.getState()
      updateAction(id, { toVariable, toAttribute })
    }
    setMenu(null)
  }

  // コンプレックス タイプ作成（ダイアログ確定後）
  const createComplexType = (state: ComplexTypeDialogState) => {
    const attrs = state.attributes.filter((a) => a.trim() !== '')
    if (!state.typeName.trim() || attrs.length === 0 || !state.variableName.trim()) return

    // タイプを追加（既存なら addType の中で重複チェック）
    addType({ name: state.typeName, kind: 'complex', attributes: [] })
    for (const attr of attrs) {
      addAttribute(state.typeName, { name: attr })
    }
    // 変数を追加
    addVariable({ name: state.variableName, typeName: state.typeName })
    // 抽出ステップを追加（最初の属性への抽出として）
    if (attrs.length > 0) {
      const id = addAction('ExtractText', { targetId: state.targetId })
      const { updateAction } = useRobotStore.getState()
      updateAction(id, { toVariable: state.variableName, toAttribute: attrs[0] })
    }
    setComplexDialog(null)
    setMenu(null)
  }

  // ============================================================
  // 選択可能な既存タイプ属性リスト
  // ============================================================
  const existingComplexAttrs: { typeName: string; attrName: string; varName: string }[] = []
  for (const t of robot.types) {
    if (t.kind !== 'complex') continue
    const vars = robot.variables.filter((v) => v.typeName === t.name)
    for (const attr of t.attributes) {
      for (const v of vars) {
        existingComplexAttrs.push({ typeName: t.name, attrName: attr.name, varName: v.name })
      }
    }
  }

  // ============================================================
  // 抽出サブメニュー（テキスト）の子アイテム生成
  // ============================================================
  const extractTextChildren = (targetId: string): MenuItem[] => {
    const children: MenuItem[] = []

    if (existingComplexAttrs.length > 0) {
      for (const { attrName, varName } of existingComplexAttrs) {
        children.push({
          kind: 'action',
          label: `${varName}.${attrName}`,
          action: () => doExtractText(targetId, varName, attrName),
        })
      }
    } else {
      children.push({
        kind: 'action',
        label: '（必要なタイプの属性がありません）',
        action: () => {},
        disabled: true,
      })
    }

    children.push({ kind: 'separator' })
    children.push({
      kind: 'action',
      label: '新しいシンプル タイプの変数…',
      action: () => {
        // シンプルタイプ変数作成（タイプ名のみ入力）→ ここでは簡易ダイアログ省略、従来挙動で直接追加
        const typeName = `SimpleType_${Date.now()}`
        addType({ name: typeName, kind: 'simple', attributes: [] })
        addVariable({ name: typeName, typeName })
        doExtractText(targetId, typeName, '')
        setMenu(null)
      },
    })
    children.push({
      kind: 'action',
      label: '新しいコンプレックス タイプの変数…',
      action: () => {
        // M2 の suggested はロボットモデルに含まれないため、サイト情報からプリフィルする
        const preAttrs = site.table?.columns.map((c) => c.label) ?? []
        const defaultName = site.table ? site.title.replace(/[　 —-].*/u, '').slice(0, 8) : 'データ'
        setComplexDialog({
          targetId,
          typeName: defaultName,
          attributes: preAttrs,
          variableName: defaultName,
        })
        setMenu(null)
      },
    })
    return children
  }

  // ============================================================
  // テーブル全体選択時のループメニュー子アイテム
  // ============================================================
  const loopMenuForTable = (): MenuItem[] => [
    {
      kind: 'action',
      label: 'タグ繰り返し',
      action: () => {
        addAction('ForEach', { targetId: ROW_TARGET })
        setMenu(null)
      },
    },
    {
      kind: 'submenu',
      label: 'テーブル行繰り返し',
      children: [
        {
          kind: 'action',
          label: '最初の行を含める',
          action: () => {
            addAction('ForEach', { targetId: ROW_TARGET })
            setMenu(null)
          },
        },
        {
          kind: 'action',
          label: '最初の行を除外',
          action: doForEach,
        },
      ],
    },
    {
      kind: 'action',
      label: 'テーブル列繰り返し',
      action: () => {},
      disabled: true,
    },
  ]

  // ============================================================
  // 右クリックメニューを開く
  // ============================================================
  const openMenu = (e: MouseEvent, label: string, items: MenuItem[]) => {
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, label, items })
  }

  // ============================================================
  // 選択要素のクリック処理
  // ============================================================
  const selectElement = (e: MouseEvent, next: SelectedPath) => {
    e.stopPropagation()
    setSelected(next)
  }

  // パスバー セグメントクリック → 選択を上位へ
  const handleSegmentClick = (seg: PathSegment) => {
    if (seg.pathKind === 'none') return
    if (seg.pathKind === 'table') {
      setSelected({ kind: 'table', segments: buildTablePath() })
    } else if (seg.pathKind === 'tableRow' && seg.rowIndex !== undefined) {
      setSelected({ kind: 'tableRow', rowIndex: seg.rowIndex, segments: buildRowPath(seg.rowIndex) })
    } else if (seg.pathKind === 'tableCell' && seg.rowIndex !== undefined && seg.colKey) {
      const colIdx = site.table?.columns.findIndex((c) => c.key === seg.colKey) ?? 0
      setSelected({ kind: 'tableCell', rowIndex: seg.rowIndex, colKey: seg.colKey, segments: buildCellPath(seg.rowIndex, colIdx, seg.colKey) })
    } else if (seg.pathKind === 'thead' && seg.colKey) {
      const colIdx = site.table?.columns.findIndex((c) => c.key === seg.colKey) ?? 0
      setSelected({ kind: 'thead', colKey: seg.colKey, segments: buildTheadPath(colIdx, seg.colKey) })
    } else if (seg.pathKind === 'single' && seg.elementId) {
      const el = site.singles.find((s) => s.id === seg.elementId)
      if (el) setSelected({ kind: 'single', elementId: seg.elementId, segments: buildSinglePath(el) })
    }
  }

  // ============================================================
  // テーブル右クリックメニュー生成（選択状態に応じて）
  // ============================================================
  const buildTableCellMenu = (_rowIndex: number, _colKey: string, targetId: string): MenuItem[] => [
    {
      kind: 'submenu',
      label: '抽出',
      children: [
        {
          kind: 'submenu',
          label: 'テキスト',
          children: extractTextChildren(targetId),
        },
        { kind: 'action', label: '構造化テキスト', action: () => {}, disabled: true },
        { kind: 'action', label: 'HTML', action: () => {}, disabled: true },
        { kind: 'separator' },
        { kind: 'action', label: '数値', action: () => {}, disabled: true },
        { kind: 'action', label: '日付', action: () => {}, disabled: true },
        { kind: 'action', label: '属性', action: () => {}, disabled: true },
        { kind: 'action', label: 'URL', action: () => {}, disabled: true },
        { kind: 'action', label: 'ターゲット', action: () => {}, disabled: true },
      ],
    },
    { kind: 'action', label: 'テスト', action: () => {}, disabled: true },
    {
      kind: 'submenu',
      label: 'ループ',
      children: [
        {
          kind: 'action',
          label: 'タグ繰り返し',
          action: () => {
            addAction('ForEach', { targetId: ROW_TARGET })
            setMenu(null)
          },
        },
        {
          kind: 'submenu',
          label: 'テーブル行繰り返し',
          children: [
            { kind: 'action', label: '最初の行を含める', action: () => { addAction('ForEach', { targetId: ROW_TARGET }); setMenu(null) } },
            { kind: 'action', label: '最初の行を除外', action: doForEach },
          ],
        },
        { kind: 'action', label: 'テーブル列繰り返し', action: () => {}, disabled: true },
      ],
    },
    { kind: 'action', label: '修正', action: () => {}, disabled: true },
    { kind: 'action', label: 'その他', action: () => {}, disabled: true },
  ]

  const buildTableMenu = (): MenuItem[] => [
    { kind: 'action', label: 'キープレス', action: () => {}, disabled: true },
    { kind: 'action', label: '指定タグまでスクロール', action: () => {}, disabled: true },
    { kind: 'separator' },
    {
      kind: 'submenu',
      label: '抽出',
      children: [
        { kind: 'submenu', label: 'テキスト', children: extractTextChildren(ROW_TARGET) },
      ],
    },
    { kind: 'action', label: 'テスト', action: () => {}, disabled: true },
    {
      kind: 'submenu',
      label: 'ループ',
      children: loopMenuForTable(),
    },
    { kind: 'action', label: '修正', action: () => {}, disabled: true },
    { kind: 'action', label: 'その他', action: () => {}, disabled: true },
  ]

  const buildRowMenu = (_rowIndex: number): MenuItem[] => [
    {
      kind: 'submenu',
      label: '抽出',
      children: [
        { kind: 'submenu', label: 'テキスト', children: extractTextChildren(ROW_TARGET) },
      ],
    },
    {
      kind: 'submenu',
      label: 'ループ',
      children: [
        {
          kind: 'action',
          label: 'タグ繰り返し',
          action: () => { addAction('ForEach', { targetId: ROW_TARGET }); setMenu(null) },
        },
        {
          kind: 'submenu',
          label: 'テーブル行繰り返し',
          children: [
            { kind: 'action', label: '最初の行を含める', action: () => { addAction('ForEach', { targetId: ROW_TARGET }); setMenu(null) } },
            { kind: 'action', label: '最初の行を除外', action: doForEach },
          ],
        },
        { kind: 'action', label: 'テーブル列繰り返し', action: () => {}, disabled: true },
      ],
    },
    { kind: 'action', label: '修正', action: () => {}, disabled: true },
    { kind: 'action', label: 'その他', action: () => {}, disabled: true },
  ]

  const buildSingleMenu = (el: SiteElement): MenuItem[] => {
    const items: MenuItem[] = []
    if (el.role === 'input') {
      items.push({ kind: 'action', label: 'テキストを入力', action: () => { addAction('EnterText', { targetId: el.id }); setMenu(null) } })
    } else {
      items.push({
        kind: 'submenu',
        label: '抽出',
        children: [
          { kind: 'submenu', label: 'テキスト', children: extractTextChildren(el.id) },
        ],
      })
      if (el.role === 'link') {
        items.push({ kind: 'action', label: 'URL を抽出', action: () => { addAction('ExtractURL', { targetId: el.id }); setMenu(null) } })
      }
      if (el.role === 'link' || el.role === 'button') {
        items.push({ kind: 'action', label: 'クリック', action: () => { addAction('Click', { targetId: el.id }); setMenu(null) } })
      }
    }
    return items
  }

  // ============================================================
  // 選択状態に応じたボーダースタイル
  // ============================================================
  const isTableSelected = selected.kind === 'table'
  const isRowSelected = (rowIndex: number) =>
    selected.kind === 'tableRow' && selected.rowIndex === rowIndex
  const isCellSelected = (rowIndex: number, colKey: string) =>
    selected.kind === 'tableCell' && selected.rowIndex === rowIndex && selected.colKey === colKey
  const isTheadSelected = (colKey: string) =>
    selected.kind === 'thead' && selected.colKey === colKey

  // 青枠（ForEach スコープ）= 最初のデータ行（rowIndex=0）
  const isScopeRow = (rowIndex: number) => hasForEach && rowIndex === 0

  // ============================================================
  // パスバーに表示するセグメント
  // ============================================================
  const pathSegments: PathSegment[] =
    selected.kind === 'none'
      ? []
      : (selected as { segments: PathSegment[] }).segments ?? []

  // ============================================================
  // 階層メニューレンダラー
  // ============================================================
  const MenuItemRenderer = ({ item, depth = 0 }: { item: MenuItem; depth?: number }) => {
    const [subOpen, setSubOpen] = useState(false)

    if (item.kind === 'separator') {
      return <div className="my-0.5 border-t border-das-border" />
    }

    if (item.kind === 'action') {
      return (
        <button
          onClick={item.disabled ? undefined : item.action}
          disabled={item.disabled}
          className={[
            'block w-full px-3 py-1.5 text-left text-[12px]',
            item.disabled
              ? 'cursor-default text-das-textDim'
              : 'text-das-text hover:bg-das-accent2/30 cursor-pointer',
          ].join(' ')}
        >
          {item.label}
        </button>
      )
    }

    // submenu
    return (
      <div
        className="relative"
        onMouseEnter={() => setSubOpen(true)}
        onMouseLeave={() => setSubOpen(false)}
      >
        <div className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-[12px] text-das-text hover:bg-das-accent2/30">
          <span>{item.label}</span>
          <span className="ml-4 text-[10px] text-das-textDim">▶</span>
        </div>
        {subOpen && (
          <div
            className={[
              'absolute top-0 z-[60] min-w-[200px] overflow-hidden rounded-md border border-das-border2 bg-das-panel shadow-xl',
              depth % 2 === 0 ? 'left-full' : 'right-full',
            ].join(' ')}
            style={{ marginTop: -1 }}
          >
            {item.children.map((child, i) => (
              <MenuItemRenderer key={i} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <PanelFrame title="アプリケーション（ブラウザビュー）" hint="要素をクリックして選択（緑枠）→ タグパスバーで階層を選択 → 右クリックで操作" scroll>
      <div className="flex h-full flex-col" onClick={closeMenu}>
        {/* 疑似ブラウザのアドレスバー */}
        <div className="flex shrink-0 items-center gap-2 border-b border-das-border bg-das-bg/60 px-3 py-1.5">
          <span className="text-das-textDim">🔒</span>
          <span className="truncate rounded bg-das-panelAlt px-2 py-0.5 text-[12px] text-das-textDim">{site.url}</span>
        </div>

        {/* ページ本文 */}
        <div className="min-h-0 flex-1 overflow-auto bg-[#f4f6fb] px-5 py-4 text-slate-800">
          <div className="mb-3 border-b border-slate-300 pb-2">
            <div className="text-[15px] font-bold text-slate-900">{site.title}</div>
            {site.intro && <div className="mt-1 text-[12px] text-slate-500">{site.intro}</div>}
          </div>

          {/* 単一要素 */}
          {site.singles.map((el) => (
            <div
              key={el.id}
              onClick={(e) => selectElement(e, { kind: 'single', elementId: el.id, segments: buildSinglePath(el) })}
              onContextMenu={(e) => {
                selectElement(e, { kind: 'single', elementId: el.id, segments: buildSinglePath(el) })
                openMenu(e, el.label, buildSingleMenu(el))
              }}
              className={[
                'group mb-2 cursor-pointer rounded px-2 py-1',
                selected.kind === 'single' && (selected as { elementId: string }).elementId === el.id
                  ? 'outline outline-2 outline-green-500'
                  : 'hover:bg-sky-100',
              ].join(' ')}
              title="クリックで選択、右クリックで操作を割り当て"
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

          {/* テーブル */}
          {site.table && (
            <div className="mt-3">
              <div className="mb-1 text-[12px] font-semibold text-slate-600">{site.table.caption}</div>
              <table
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected({ kind: 'table', segments: buildTablePath() })
                }}
                onContextMenu={(e) => {
                  // テーブル全体（セル・行以外）の右クリックはテーブル全体メニュー
                  e.stopPropagation()
                  setSelected({ kind: 'table', segments: buildTablePath() })
                  openMenu(e, 'table', buildTableMenu())
                }}
                className={[
                  'w-full cursor-pointer border-collapse text-[13px]',
                  isTableSelected ? 'outline outline-2 outline-green-500' : '',
                ].join(' ')}
              >
                <thead>
                  <tr>
                    {site.table.columns.map((c, colIdx) => (
                      <th
                        key={c.key}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected({ kind: 'thead', colKey: c.key, segments: buildTheadPath(colIdx, c.key) })
                        }}
                        onContextMenu={(e) => {
                          e.stopPropagation()
                          setSelected({ kind: 'thead', colKey: c.key, segments: buildTheadPath(colIdx, c.key) })
                          openMenu(e, `${c.label} 列`, [
                            {
                              kind: 'submenu',
                              label: '抽出',
                              children: [
                                { kind: 'submenu', label: 'テキスト', children: extractTextChildren(colTarget(c.key)) },
                              ],
                            },
                            { kind: 'action', label: 'URL を抽出（列）', action: () => { addAction('ExtractURL', { targetId: colTarget(c.key) }); setMenu(null) } },
                          ])
                        }}
                        className={[
                          'cursor-pointer border border-slate-300 bg-slate-200 px-2 py-1 text-left font-semibold',
                          isTheadSelected(c.key) ? 'outline outline-2 outline-green-500' : 'hover:bg-sky-200',
                        ].join(' ')}
                        title="クリックで選択 / 右クリックで「抽出」"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {site.table.rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected({ kind: 'tableRow', rowIndex, segments: buildRowPath(rowIndex) })
                      }}
                      onContextMenu={(e) => {
                        e.stopPropagation()
                        setSelected({ kind: 'tableRow', rowIndex, segments: buildRowPath(rowIndex) })
                        openMenu(e, `行 ${rowIndex + 1}`, buildRowMenu(rowIndex))
                      }}
                      className={[
                        'cursor-pointer',
                        isScopeRow(rowIndex)
                          ? 'outline outline-2 outline-blue-500'
                          : isRowSelected(rowIndex)
                          ? 'outline outline-2 outline-green-500'
                          : 'hover:bg-amber-50',
                      ].join(' ')}
                      title={isScopeRow(rowIndex) ? '現在反復行（名前付きタグ）— 青枠はスコープを表します' : 'クリックで選択 / 右クリックで操作'}
                    >
                      {site.table!.columns.map((c, colIdx) => (
                        <td
                          key={c.key}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected({ kind: 'tableCell', rowIndex, colKey: c.key, segments: buildCellPath(rowIndex, colIdx, c.key) })
                          }}
                          onContextMenu={(e) => {
                            e.stopPropagation()
                            setSelected({ kind: 'tableCell', rowIndex, colKey: c.key, segments: buildCellPath(rowIndex, colIdx, c.key) })
                            openMenu(e, `${c.label}（行 ${rowIndex + 1}）`, buildTableCellMenu(rowIndex, c.key, colTarget(c.key)))
                          }}
                          className={[
                            'border border-slate-300 px-2 py-1',
                            isCellSelected(rowIndex, c.key) ? 'bg-green-100 outline outline-2 outline-green-500' : 'hover:bg-sky-50',
                          ].join(' ')}
                          title="クリックで選択 / 右クリックで「抽出」"
                        >
                          {row.cells[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ForEach スコープインジケーター */}
              {hasForEach && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-blue-600">
                  <span className="inline-block h-2 w-2 rounded-sm border border-blue-500 bg-blue-50" />
                  <span>現在反復行（1 / {tableRowCount}）— 青枠内のセルを右クリック → 抽出</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* タグパスバー */}
        <div className="flex shrink-0 items-center gap-0 border-t border-das-border bg-das-panelAlt px-2 py-1 text-[11px] text-das-textDim">
          {pathSegments.length === 0 ? (
            <span className="text-das-textDim opacity-60">要素をクリックするとタグパスが表示されます</span>
          ) : (
            pathSegments.map((seg, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <span className="mx-0.5 text-das-textDim opacity-50">.</span>}
                <button
                  onClick={() => handleSegmentClick(seg)}
                  className={[
                    'rounded px-1 py-0.5',
                    seg.pathKind !== 'none'
                      ? 'cursor-pointer text-sky-700 hover:bg-sky-100 hover:underline'
                      : 'cursor-default text-das-textDim',
                  ].join(' ')}
                  title={seg.pathKind !== 'none' ? `${seg.label} を選択` : seg.label}
                >
                  {seg.label}
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 右クリック階層メニュー */}
      {menu && (
        <div
          className="fixed z-50 min-w-[200px] overflow-visible rounded-md border border-das-border2 bg-das-panel shadow-xl"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-das-border px-3 py-1.5 text-[11px] text-das-textDim">{menu.label}</div>
          {menu.items.map((item, i) => (
            <MenuItemRenderer key={i} item={item} />
          ))}
        </div>
      )}

      {/* コンプレックス タイプ 作成ダイアログ */}
      {complexDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          onClick={() => setComplexDialog(null)}
        >
          <div
            className="w-[360px] rounded-lg border border-das-border2 bg-das-panel p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-[14px] font-semibold text-das-text">新しいコンプレックス タイプの変数</div>

            <label className="mb-3 block">
              <span className="mb-1 block text-[12px] text-das-textDim">タイプ名</span>
              <input
                type="text"
                value={complexDialog.typeName}
                onChange={(e) => setComplexDialog({ ...complexDialog, typeName: e.target.value })}
                className="w-full rounded border border-das-border bg-das-bg px-2 py-1.5 text-[13px] text-das-text focus:outline-none focus:ring-1 focus:ring-das-accent"
                placeholder="例: 取引先"
                autoFocus
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block text-[12px] text-das-textDim">属性名（カンマ区切り）</span>
              <input
                type="text"
                value={complexDialog.attributes.join(', ')}
                onChange={(e) =>
                  setComplexDialog({
                    ...complexDialog,
                    attributes: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
                className="w-full rounded border border-das-border bg-das-bg px-2 py-1.5 text-[13px] text-das-text focus:outline-none focus:ring-1 focus:ring-das-accent"
                placeholder="例: 会社名, 担当者, 電話"
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-1 block text-[12px] text-das-textDim">変数名</span>
              <input
                type="text"
                value={complexDialog.variableName}
                onChange={(e) => setComplexDialog({ ...complexDialog, variableName: e.target.value })}
                className="w-full rounded border border-das-border bg-das-bg px-2 py-1.5 text-[13px] text-das-text focus:outline-none focus:ring-1 focus:ring-das-accent"
                placeholder="例: 取引先"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setComplexDialog(null)}
                className="rounded border border-das-border px-4 py-1.5 text-[12px] text-das-textDim hover:bg-das-panelAlt"
              >
                キャンセル
              </button>
              <button
                onClick={() => createComplexType(complexDialog)}
                className="rounded bg-das-accent px-4 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
              >
                作成して抽出
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelFrame>
  )
}
