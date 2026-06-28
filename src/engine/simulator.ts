// ============================================================
// シミュレータ — ロボットを模擬サイトに対して「実行」し、
// 抽出データと実行ログを生成する。
//
// 教育上の核となる挙動:
//   ・要素の繰り返し（ForEach）の中で列を抽出 → 全行を取得
//   ・ループの外で列を抽出 → 先頭 1 件しか取れない
//   （= M2 で「ループが無いと 1 件しか取れない」を体験させる）
// ============================================================

import type { Robot, RobotStep } from '../model/robot'
import type { MockSite } from '../model/site'
import { parseColTarget } from '../model/site'
import type { SimResult, SimRecord, SimLogEntry } from '../model/sim'

/** 呼び出し元から渡される入力値（入力変数のシミュレーション） */
export type SimInputs = Record<string, Record<string, string>>

/**
 * ロボットを実行する。明示エッジ（分岐グラフ）があればグラフ実行、無ければ線形実行。
 */
export function runRobot(robot: Robot, site: MockSite, inputs?: SimInputs): SimResult {
  if (robot.edges && robot.edges.length > 0) return runGraph(robot, site, inputs)
  return runLinear(robot, site, inputs)
}

/** 入力値を data に初期セット（その変数が存在する場合のみ） */
function seedInputs(robot: Robot, data: Record<string, SimRecord[]>, inputs?: SimInputs) {
  if (!inputs) return
  for (const [name, rec] of Object.entries(inputs)) {
    if (robot.variables.some((v) => v.name === name)) data[name] = [{ ...rec }]
  }
}

/** 条件評価ユーティリティ（runLinear / runGraph 共用） */
function evalTest(cellValue: string, op: string, value: string): boolean {
  if (op === 'equals') return cellValue === value
  if (op === 'contains') return cellValue.includes(value)
  return cellValue.trim() !== '' // notEmpty
}

function runLinear(robot: Robot, site: MockSite, inputs?: SimInputs): SimResult {
  const log: SimLogEntry[] = []
  const errors: string[] = []
  const data: Record<string, SimRecord[]> = {}
  const returned: string[] = []
  seedInputs(robot, data, inputs)

  let loaded = false

  const ensureVar = (name: string): boolean => {
    if (!robot.variables.some((v) => v.name === name)) return false
    if (!data[name]) data[name] = []
    return true
  }

  const writeCell = (varName: string, idx: number, attr: string, value: string) => {
    if (!data[varName]) data[varName] = []
    if (!data[varName][idx]) data[varName][idx] = {}
    data[varName][idx][attr] = value
  }

  // ---- 1 ステップを実行（ループ外用） ----
  const execOutside = (step: RobotStep): void => {
    const action = step.action!
    switch (action.type) {
      case 'LoadPage': {
        if (action.url && action.url === site.url) {
          loaded = true
          log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `ページを読み込みました: ${site.url}` })
        } else if (!action.url) {
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: 'URL が未設定です' })
          errors.push('「ページを読み込む」の URL が未設定です')
        } else {
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: `ページを読み込めません: ${action.url}` })
          errors.push(`ページを読み込めません: ${action.url}`)
        }
        break
      }
      case 'ExtractText':
      case 'ExtractURL': {
        if (!loaded) {
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: '先にページを読み込んでください' })
          errors.push('抽出の前にページを読み込んでください')
          break
        }
        if (!ensureVar(action.toVariable)) {
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: `変数「${action.toVariable}」が見つかりません` })
          errors.push(`抽出先の変数「${action.toVariable}」が見つかりません`)
          break
        }
        const colKey = parseColTarget(action.targetId)
        if (colKey !== null) {
          if (!site.table) {
            log.push({ stepId: step.id, stepName: step.name, status: 'error', message: '一覧がありません' })
            errors.push('テーブルが無いため列を抽出できません')
            break
          }
          // ループ外: 先頭 1 件のみ
          const row = site.table.rows[0]
          if (row) writeCell(action.toVariable, 0, action.toAttribute, row.cells[colKey] ?? '')
          log.push({ stepId: step.id, stepName: step.name, status: 'ok',
            message: `抽出: ${action.toVariable}.${action.toAttribute} ← 1 件（ループ外のため先頭 1 件のみ）` })
        } else {
          const el = site.singles.find((s) => s.id === action.targetId)
          if (!el) {
            log.push({ stepId: step.id, stepName: step.name, status: 'error', message: '抽出対象の要素が見つかりません' })
            errors.push('抽出対象の要素が見つかりません')
            break
          }
          writeCell(action.toVariable, 0, action.toAttribute, el.text)
          log.push({ stepId: step.id, stepName: step.name, status: 'ok',
            message: `抽出: ${action.toVariable}.${action.toAttribute} ← "${el.text}"` })
        }
        break
      }
      case 'TestValue': {
        // ループ外: 従来のコレクション一括フィルタ（後方互換）
        const records = data[action.toVariable] ?? []
        const keep = records.filter((r) => evalTest(r[action.toAttribute] ?? '', action.op, action.value))
        data[action.toVariable] = keep
        log.push({ stepId: step.id, stepName: step.name, status: 'ok',
          message: `値判定: ${keep.length} 件が条件を満たしました` })
        break
      }
      case 'SaveFile': {
        log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `${action.fileName} に保存しました` })
        break
      }
      case 'ReturnValue': {
        if (!robot.variables.some((v) => v.name === action.variableName)) {
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: `返す変数「${action.variableName}」が見つかりません` })
          errors.push(`返す変数「${action.variableName}」が見つかりません`)
          break
        }
        returned.push(action.variableName)
        log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `出力変数「${action.variableName}」を呼び出し元へ返しました` })
        break
      }
      case 'EnterText': {
        if (!loaded) {
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: '先にページを読み込んでください' })
          errors.push('操作の前にページを読み込んでください')
          break
        }
        const text = action.fromVariable
          ? data[action.fromVariable]?.[0]?.[action.fromAttribute ?? ''] ?? ''
          : action.text
        const src = action.fromVariable ? `（入力変数 ${action.fromVariable}.${action.fromAttribute}）` : ''
        log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `「${text}」を入力${src}` })
        break
      }
      case 'Click': {
        if (!loaded) {
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: '先にページを読み込んでください' })
          errors.push('操作の前にページを読み込んでください')
          break
        }
        log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `${step.name} を実行` })
        break
      }
    }
  }

  // ---- メインループ: ForEach を per-row で実行 ----
  const allSteps = robot.steps
  let idx = 0
  while (idx < allSteps.length) {
    const step = allSteps[idx]
    if (step.kind === 'start' || step.kind === 'end') { idx++; continue }
    if (!step.enabled) {
      log.push({ stepId: step.id, stepName: step.name, status: 'skip', message: '無効化されたステップをスキップ' })
      idx++; continue
    }
    if (!step.action) {
      log.push({ stepId: step.id, stepName: step.name, status: 'error', message: 'アクションが設定されていません' })
      errors.push(`「${step.name}」にアクションが設定されていません`)
      idx++; continue
    }

    if (step.action.type === 'ForEach') {
      // ---- ForEach: per-row 実行 ----
      if (!loaded) {
        log.push({ stepId: step.id, stepName: step.name, status: 'error', message: '先にページを読み込んでください' })
        errors.push('「要素の繰り返し」の前にページを読み込んでください')
        idx++; continue
      }
      if (!site.table) {
        log.push({ stepId: step.id, stepName: step.name, status: 'error', message: '繰り返せる一覧がありません' })
        errors.push('このページに繰り返せる一覧（テーブル）がありません')
        idx++; continue
      }
      const rows = site.table.rows
      log.push({ stepId: step.id, stepName: step.name, status: 'ok',
        message: `要素の繰り返しを開始（${rows.length} 件の行を反復）` })

      // ループ本体を収集: ForEach 直後の連続する Extract/TestValue(+targetId) ステップ
      const bodySteps: RobotStep[] = []
      let scan = idx + 1
      while (scan < allSteps.length) {
        const s = allSteps[scan]
        if (s.kind === 'start' || s.kind === 'end' || !s.enabled || !s.action) { scan++; continue }
        const t = s.action.type
        if (t === 'ExtractText' || t === 'ExtractURL' || (t === 'TestValue' && s.action.targetId)) {
          bodySteps.push(s)
          scan++
        } else {
          break
        }
      }

      // 各行を実行
      let writeIdx = 0
      for (let ri = 0; ri < rows.length; ri++) {
        let skipRow = false
        for (const bs of bodySteps) {
          if (skipRow) break
          const ba = bs.action!
          if (ba.type === 'ExtractText' || ba.type === 'ExtractURL') {
            if (!ensureVar(ba.toVariable)) {
              log.push({ stepId: bs.id, stepName: bs.name, status: 'error', message: `変数「${ba.toVariable}」が見つかりません` })
              errors.push(`抽出先の変数「${ba.toVariable}」が見つかりません`)
              continue
            }
            const ck = parseColTarget(ba.targetId)
            if (ck !== null) {
              writeCell(ba.toVariable, writeIdx, ba.toAttribute, rows[ri].cells[ck] ?? '')
              log.push({ stepId: bs.id, stepName: bs.name, status: 'ok',
                message: `抽出: ${ba.toVariable}.${ba.toAttribute}（${ri + 1} 行目）` })
            } else {
              // 単一要素（ループ内でも 1 回だけ書く）
              const el = site.singles.find((s) => s.id === ba.targetId)
              if (el) writeCell(ba.toVariable, 0, ba.toAttribute, el.text)
              log.push({ stepId: bs.id, stepName: bs.name, status: 'ok',
                message: `抽出: ${ba.toVariable}.${ba.toAttribute}` })
            }
          } else if (ba.type === 'TestValue' && ba.targetId) {
            // DOM セルガード
            const ck = parseColTarget(ba.targetId)
            if (ck !== null) {
              const cellVal = rows[ri].cells[ck] ?? ''
              if (!evalTest(cellVal, ba.op, ba.value)) {
                skipRow = true
                log.push({ stepId: bs.id, stepName: bs.name, status: 'ok',
                  message: `値判定: 行 ${ri + 1} — 条件不一致、スキップ` })
              } else {
                log.push({ stepId: bs.id, stepName: bs.name, status: 'ok',
                  message: `値判定: 行 ${ri + 1} — 条件一致` })
              }
            }
          }
        }
        if (!skipRow) writeIdx++
      }

      idx = scan // ループ本体をスキップして post-loop へ
      continue
    }

    // ---- ループ外ステップ ----
    execOutside(step)
    idx++
  }

  return { ran: true, data, log, errors, returned }
}

/**
 * グラフ実行 — 実機 DS のフロー意味論を再現する。
 *   ・分岐点(branch)は出力エッジ（ブランチ）を上から順に実行
 *   ・End はロボット終了ではなく「呼び出し元（分岐点の次ブランチ / ループの次反復）」へ戻る
 *   ・ループ(loop)は本体ブランチを各行に対して反復実行（各反復で現在行を抽出）
 */
function runGraph(robot: Robot, site: MockSite, inputs?: SimInputs): SimResult {
  const log: SimLogEntry[] = []
  const errors: string[] = []
  const data: Record<string, SimRecord[]> = {}
  const returned: string[] = []
  seedInputs(robot, data, inputs)

  const nodeById = new Map<string, RobotStep>(robot.steps.map((s) => [s.id, s]))
  const outEdges = new Map<string, string[]>()
  for (const e of robot.edges ?? []) {
    const list = outEdges.get(e.from) ?? []
    list.push(e.to)
    outEdges.set(e.from, list)
  }

  const start = robot.steps.find((s) => s.kind === 'start')
  let loaded = false
  // ループ反復の現在行インデックス（入れ子対応のスタック。先頭が最内ループ）
  const rowStack: number[] = []

  const ensureVar = (name: string): boolean => {
    if (!robot.variables.some((v) => v.name === name)) return false
    if (!data[name]) data[name] = []
    return true
  }
  const writeCell = (v: string, idx: number, attr: string, value: string) => {
    if (!data[v]) data[v] = []
    if (!data[v][idx]) data[v][idx] = {}
    data[v][idx][attr] = value
  }

  // 1 ノードを実行（アクション系のみ。制御系は run() で処理）
  // 戻り値 false = ガード不一致で反復中断
  const exec = (step: RobotStep): boolean => {
    const a = step.action
    if (!a) return true
    const currentRow = rowStack.length > 0 ? rowStack[rowStack.length - 1] : null
    switch (a.type) {
      case 'LoadPage':
        if (a.url === site.url) {
          loaded = true
          log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `ページを読み込みました: ${site.url}` })
        } else {
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: 'ページを読み込めません' })
          errors.push('ページを読み込めません')
        }
        break
      case 'ExtractText':
      case 'ExtractURL': {
        if (!loaded) {
          errors.push('抽出の前にページを読み込んでください')
          break
        }
        if (!ensureVar(a.toVariable)) {
          errors.push(`抽出先の変数「${a.toVariable}」が見つかりません`)
          break
        }
        const colKey = parseColTarget(a.targetId)
        if (colKey !== null && site.table) {
          const idx = currentRow ?? 0
          const row = site.table.rows[idx]
          if (row) writeCell(a.toVariable, idx, a.toAttribute, row.cells[colKey] ?? '')
          log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `抽出: ${a.toVariable}.${a.toAttribute}（${currentRow !== null ? `${idx + 1} 行目` : 'ループ外: 先頭'}）` })
        } else {
          const el = site.singles.find((s) => s.id === a.targetId)
          if (el) writeCell(a.toVariable, 0, a.toAttribute, el.text)
          log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `抽出: ${a.toVariable}.${a.toAttribute}` })
        }
        break
      }
      case 'TestValue': {
        if (a.targetId && currentRow !== null) {
          // DOM セルガード（ループ内 + targetId あり）
          const ck = parseColTarget(a.targetId)
          if (ck !== null && site.table) {
            const cellVal = site.table.rows[currentRow]?.cells[ck] ?? ''
            if (!evalTest(cellVal, a.op, a.value)) {
              log.push({ stepId: step.id, stepName: step.name, status: 'ok',
                message: `値判定: 行 ${currentRow + 1} — 条件不一致、スキップ` })
              return false // ガード不一致 → 反復中断
            }
            log.push({ stepId: step.id, stepName: step.name, status: 'ok',
              message: `値判定: 行 ${currentRow + 1} — 条件一致` })
          }
        } else {
          // 従来のコレクション一括フィルタ（後方互換）
          const recs = data[a.toVariable] ?? []
          data[a.toVariable] = recs.filter((r) => evalTest(r[a.toAttribute] ?? '', a.op, a.value))
          log.push({ stepId: step.id, stepName: step.name, status: 'ok',
            message: `値判定: ${data[a.toVariable].length} 件が条件を満たしました` })
        }
        break
      }
      case 'SaveFile':
        log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `${a.fileName} に保存しました` })
        break
      case 'ReturnValue':
        if (!robot.variables.some((v) => v.name === a.variableName)) {
          errors.push(`返す変数「${a.variableName}」が見つかりません`)
          log.push({ stepId: step.id, stepName: step.name, status: 'error', message: `返す変数「${a.variableName}」が見つかりません` })
        } else {
          returned.push(a.variableName)
          log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `出力変数「${a.variableName}」を呼び出し元へ返しました` })
        }
        break
      case 'EnterText': {
        const text = a.fromVariable ? data[a.fromVariable]?.[0]?.[a.fromAttribute ?? ''] ?? '' : a.text
        const src = a.fromVariable ? `（入力変数 ${a.fromVariable}.${a.fromAttribute}）` : ''
        log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `「${text}」を入力${src}` })
        break
      }
      case 'Click':
        log.push({ stepId: step.id, stepName: step.name, status: 'ok', message: `${step.name} を実行` })
        break
    }
    return true
  }

  const next = (id: string): string | undefined => outEdges.get(id)?.[0]

  // 1 ブランチを End まで実行（再帰）。深さ上限で暴走防止。
  const run = (startId: string | undefined, depth: number): void => {
    let id = startId
    let guard = 0
    while (id && guard++ < 1000) {
      const node = nodeById.get(id)
      if (!node) return
      if (node.kind === 'end') return
      if (node.kind === 'branch') {
        if (depth > 50) return
        for (const to of outEdges.get(node.id) ?? []) run(to, depth + 1)
        return
      }
      if (node.kind === 'loop') {
        if (depth > 50) return
        const rows = site.table?.rows ?? []
        const body = outEdges.get(node.id)?.[0]
        if (!loaded) {
          errors.push('「要素の繰り返し」の前にページを読み込んでください')
          return
        }
        log.push({ stepId: node.id, stepName: node.name, status: 'ok', message: `要素の繰り返しを開始（${rows.length} 件）` })
        for (let i = 0; i < rows.length; i++) {
          rowStack.push(i)
          run(body, depth + 1)
          rowStack.pop()
        }
        return
      }
      // start / action / test
      if (node.kind !== 'start') {
        if (!exec(node)) return // ガード不一致 → この反復を中断
      }
      id = next(node.id)
    }
  }

  run(start?.id, 0)
  return { ran: true, data, log, errors, returned }
}
