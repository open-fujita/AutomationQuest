// ============================================================
// MockApp — 模擬デスクトップアプリ（DAS 緑ロボット用）
//
// tick 駆動の決定的シミュレーションで使う疑似 Windows アプリ状態。
// シード乱数（LCG）で決定的なタイムラインを生成し、テスト容易性を確保する。
// applyTimeline / findWidget はすべて純粋関数（副作用なし）。
// ============================================================

// ---- ウィジェット要素ツリー -----------------------------------

export type WidgetType =
  | 'window'
  | 'button'
  | 'label'
  | 'textfield'
  | 'listitem'
  | 'table'
  | 'tablerow'
  | 'tablecell'
  | 'checkbox'
  | 'notification'  // 通知ウィンドウ（D3 用）

export interface AppWidget {
  id: string
  type: WidgetType
  /** CSS 風セレクタで参照される属性（name / class / title / x / y 等） */
  attrs: Record<string, string>
  /** 表示テキスト */
  text?: string
  children: AppWidget[]
  /** 可視かどうか（ガードの「見つかる/見つからない」判定に使う） */
  visible: boolean
  /** クリック可能か（D2: ボタン有効化遅延で enabled: false → true に変化） */
  enabled?: boolean
}

// ---- tick タイムライン ----------------------------------------

/**
 * 特定 tick に発生するアプリ状態変化イベント。
 * シード乱数で決定的なタイムラインを生成する。
 */
export type AppEvent =
  | { tick: number; type: 'enableWidget'; widgetId: string }
  | { tick: number; type: 'showWidget'; widgetId: string }
  | { tick: number; type: 'hideWidget'; widgetId: string }
  | { tick: number; type: 'addListItem'; parentId: string; widget: AppWidget }
  | { tick: number; type: 'shuffleColumns'; tableId: string; order: string[] }

// ---- MockApp --------------------------------------------------

export interface MockApp {
  id: string
  /** 疑似 Windows アプリのタイトルバー文字列 */
  windowTitle: string
  /** 最初のウィジェットツリー（tick=0 の初期状態） */
  widgets: AppWidget[]
  /** tick ごとのイベント列（tick 昇順） */
  timeline: AppEvent[]
}

// ---- シード乱数（LCG: 線形合同法）----------------------------

export interface SeededRng {
  next(): number        // 0.0〜1.0 の float
  nextInt(max: number): number  // 0〜max-1 の整数
}

/**
 * LCG シード乱数生成器（Math.random を一切使わない）。
 * パラメータは Numerical Recipes の推奨値（m=2^32, a=1664525, c=1013904223）。
 */
export function createSeededRng(seed: number): SeededRng {
  // LCG: X(n+1) = (a * X(n) + c) mod m
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32
  let state = (seed >>> 0)  // 32bit 符号なし整数に正規化

  return {
    next(): number {
      state = ((a * state + c) >>> 0) % m
      return state / m
    },
    nextInt(max: number): number {
      return Math.floor(this.next() * max)
    },
  }
}

// ---- ウィジェットの深いコピー（純粋関数のために必要）----------

function cloneWidget(w: AppWidget): AppWidget {
  return {
    ...w,
    attrs: { ...w.attrs },
    children: w.children.map(cloneWidget),
  }
}

function cloneWidgets(widgets: AppWidget[]): AppWidget[] {
  return widgets.map(cloneWidget)
}

// ---- ウィジェットの検索・更新ヘルパー（immutable スタイル）----

function updateWidgetInTree(
  widgets: AppWidget[],
  id: string,
  updater: (w: AppWidget) => AppWidget,
): AppWidget[] {
  return widgets.map((w) => {
    if (w.id === id) return updater(w)
    const newChildren = updateWidgetInTree(w.children, id, updater)
    if (newChildren === w.children) return w
    return { ...w, children: newChildren }
  })
}

function appendChildById(
  widgets: AppWidget[],
  parentId: string,
  child: AppWidget,
): AppWidget[] {
  return widgets.map((w) => {
    if (w.id === parentId) {
      return { ...w, children: [...w.children, cloneWidget(child)] }
    }
    const newChildren = appendChildById(w.children, parentId, child)
    if (newChildren === w.children) return w
    return { ...w, children: newChildren }
  })
}

// ---- applyTimeline --------------------------------------------

/**
 * MockApp のウィジェット状態を指定 tick に進めて返す（純粋関数）。
 * タイムラインのイベントを tick ≤ currentTick の範囲で順に適用する。
 * 元の MockApp は変更しない。
 */
export function applyTimeline(app: MockApp, currentTick: number): AppWidget[] {
  // tick=0 の初期状態をディープコピーして開始
  let widgets = cloneWidgets(app.widgets)

  // tick 昇順で適用
  const events = [...app.timeline].sort((a, b) => a.tick - b.tick)

  for (const event of events) {
    if (event.tick > currentTick) break

    switch (event.type) {
      case 'enableWidget':
        widgets = updateWidgetInTree(widgets, event.widgetId, (w) => ({ ...w, enabled: true }))
        break

      case 'showWidget':
        widgets = updateWidgetInTree(widgets, event.widgetId, (w) => ({ ...w, visible: true }))
        break

      case 'hideWidget':
        widgets = updateWidgetInTree(widgets, event.widgetId, (w) => ({ ...w, visible: false }))
        break

      case 'addListItem':
        widgets = appendChildById(widgets, event.parentId, event.widget)
        break

      case 'shuffleColumns': {
        // tableId を持つ table ウィジェット内の tablecell の order 属性を更新する
        // order は列ヘッダー名の配列。各 tablerow の tablecell を order に従い並べ替える
        widgets = updateWidgetInTree(widgets, event.tableId, (table) => {
          const newChildren = table.children.map((row) => {
            if (row.type !== 'tablerow') return row
            // 列を order 指定順に並べ替え
            const reordered: AppWidget[] = []
            for (const colName of event.order) {
              const cell = row.children.find(
                (c) => c.type === 'tablecell' && (c.attrs['col'] === colName || c.attrs['name'] === colName),
              )
              if (cell) reordered.push(cloneWidget(cell))
            }
            // order にない列は末尾に追加
            for (const cell of row.children) {
              if (
                cell.type === 'tablecell' &&
                !event.order.includes(cell.attrs['col'] ?? cell.attrs['name'] ?? '')
              ) {
                reordered.push(cloneWidget(cell))
              }
            }
            return { ...row, children: reordered }
          })
          return { ...table, children: newChildren }
        })
        break
      }
    }
  }

  return widgets
}

// ---- findWidgetPath -------------------------------------------

/**
 * ウィジェットツリー内で指定 id のウィジェットへの祖先パスを返す（純粋関数）。
 * ルートから対象ウィジェット自身まで含む配列。
 * 見つからなかった場合は null を返す。
 *
 * 例: [window, list, listitem[2], label]
 */
export function findWidgetPath(
  widgets: AppWidget[],
  targetId: string,
  ancestors: AppWidget[] = [],
): AppWidget[] | null {
  for (const w of widgets) {
    const path = [...ancestors, w]
    if (w.id === targetId) return path
    const found = findWidgetPath(w.children, targetId, path)
    if (found) return found
  }
  return null
}

// ---- findWidget -----------------------------------------------

/**
 * CSS 風セレクタで AppWidget を検索する（純粋関数）。
 *
 * サポートするセレクタ形式:
 *   - 'button'                     タグ名（type）
 *   - 'button[name="OK"]'          属性完全一致
 *   - 'button[name^="Save"]'       属性前方一致
 *   - 'button[name$="Form"]'       属性後方一致
 *   - 'button[name*="sub"]'        属性部分一致
 *   - 'button[visible="true"][name^="Save"]'  複数属性 AND
 *   - '> button'                   直接の子（scope が必要）
 *   - ':nth-child(2)'              位置（1-based）
 *   - '[x="120"][y="48"]'          座標固定（D5 失敗体験用）
 *
 * @param widgets   検索対象のウィジェットツリー（applyTimeline の結果）
 * @param selector  CSS 風セレクタ文字列
 * @param scope     相対セレクタ（'> ...'）の場合の起点ウィジェット
 * @returns 最初に一致した AppWidget | undefined
 */
export function findWidget(
  widgets: AppWidget[],
  selector: string,
  scope?: AppWidget,
): AppWidget | undefined {
  const trimmed = selector.trim()

  // 相対セレクタ（'> tagName ...'）: scope の直接の子から検索
  if (trimmed.startsWith('>')) {
    const rest = trimmed.slice(1).trim()
    const children = scope ? scope.children : widgets
    return matchFirst(children, rest, false)
  }

  // 通常セレクタ: 全ツリーを再帰検索
  return matchFirst(widgets, trimmed, true)
}

/** セレクタにマッチする最初のウィジェットを返す（再帰）。deepSearch=true で子孫まで検索 */
function matchFirst(
  widgets: AppWidget[],
  selector: string,
  deepSearch: boolean,
): AppWidget | undefined {
  const parsed = parseSelector(selector)
  if (!parsed) return undefined

  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i]
    if (matchesParsed(w, parsed, i + 1)) return w
    if (deepSearch) {
      const found = matchFirst(w.children, selector, true)
      if (found) return found
    }
  }
  return undefined
}

// ---- セレクタパーサー -----------------------------------------

interface ParsedSelector {
  tagName?: string      // タグ名（AppWidget.type）
  attrs: AttrMatcher[]
  nthChild?: number
}

interface AttrMatcher {
  name: string
  op: '=' | '^=' | '$=' | '*='
  value: string
}

/** 'button[name="OK"][visible="true"]' を解析する */
function parseSelector(selector: string): ParsedSelector | null {
  const s = selector.trim()
  if (!s) return null

  // ':nth-child(n)'
  const nthMatch = s.match(/^:nth-child\((\d+)\)$/)
  if (nthMatch) {
    return { attrs: [], nthChild: parseInt(nthMatch[1], 10) }
  }

  const attrs: AttrMatcher[] = []
  let rest = s

  // 先頭のタグ名（英数字 + 記号なし）を取り出す
  const tagMatch = rest.match(/^([a-zA-Z_][\w-]*)/)
  let tagName: string | undefined
  if (tagMatch) {
    tagName = tagMatch[1]
    rest = rest.slice(tagName.length)
  }

  // '[name="value"]' パターンを繰り返し取り出す
  const attrRe = /\[(\w+)(\^=|\$=|\*=|=)"([^"]*)"\]/g
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(rest)) !== null) {
    attrs.push({ name: m[1], op: m[2] as AttrMatcher['op'], value: m[3] })
  }

  return { tagName, attrs }
}

/** ウィジェットがパース済みセレクタにマッチするか判定する */
function matchesParsed(w: AppWidget, parsed: ParsedSelector, indexOneBased: number): boolean {
  // visible でないウィジェットは検索対象外
  if (!w.visible) return false

  // nth-child チェック
  if (parsed.nthChild !== undefined && indexOneBased !== parsed.nthChild) return false

  // タグ名チェック（AppWidget.type に対応）
  if (parsed.tagName && w.type !== parsed.tagName) return false

  // 属性チェック
  for (const am of parsed.attrs) {
    // attrs と type 両方を検索対象にする
    const actual = w.attrs[am.name] ?? (am.name === 'type' ? w.type : undefined)
    if (actual === undefined) return false
    switch (am.op) {
      case '=':  if (actual !== am.value) return false; break
      case '^=': if (!actual.startsWith(am.value)) return false; break
      case '$=': if (!actual.endsWith(am.value)) return false; break
      case '*=': if (!actual.includes(am.value)) return false; break
    }
  }

  return true
}
