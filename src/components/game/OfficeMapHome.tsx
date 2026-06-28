// ============================================================
// OfficeMapHome.tsx — すごろくMAP（アイソメトリック・オフィスフロア）ホーム
//
// 原典: Claude Design `自動化すごろくMAP.dc.html`（アイソメ SVG + 部署デスク）。
// それを React+TSX に移植し、実データ（MISSIONS / gameStore / missionMapMeta /
// HEALTH_RULES）で駆動する。配色・余白・アニメは原典に準拠（inline style）。
//
// - 部署は client.dept でグルーピングし、昇順の階段状アイソメ座標を手続き生成。
// - クエスト「ロボットで解決する」→ startMission(id)（実プレイへ）。
// - XP/レベル/スタンプは completedMissions × missionMapMeta.xp から派生。
// ============================================================

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import { MISSIONS } from '../../data/missions'
import { getMapMeta, XP_PER_LEVEL } from '../../data/missionMapMeta'
import { HEALTH_RULES } from '../../data/healthRules'
import { MASCOT, LOGO } from './mascot'

// ---- palette（原典 C） ----
const C = {
  o: '#E0A767',
  od: '#CC8C4B',
  os: '#F0C79A',
  ow: '#FBF1E6',
  smile: 'linear-gradient(100deg,#F6A35A,#ED6A82)',
  fg1: '#1A1A1A',
  fg3: '#6B6B6B',
  fg4: '#9A9A9A',
  su: '#2E9E6B',
  blue: '#3A7BD6',
}
const OX = 600
const OY = 235
/** フロア全体の表示縮尺（上限。実際はコンテナ幅に追従して縮小） */
const MAX_SCALE = 1.0
const FALLBACK_AVAIL_W = 1080
// ---- フロア配置定数（傾きと間隔を制御） ----
const Z_BASE = 16
const Z_STEP = 14
const ROW_Y_START = 560
const ROW_GAP = 160
const FIT_PAD = 16

type Pt = [number, number]

interface Stage {
  id: string
  no: string
  title: string
  dept: string
  ch: 'blue' | 'green'
  setup: boolean
  who: string
  manual: number | null
  xp: number
  skill: string
  blurb: string
}

interface Dept {
  key: string
  dept: string
  ch: 'blue' | 'green'
  stageIds: string[]
  pos: [number, number, number] // x, y, heightZ
}

// ---- STAGES ← MISSIONS + missionMapMeta ----
function buildStages(): Stage[] {
  return MISSIONS.map((m) => {
    const meta = getMapMeta(m.id)
    const setup = m.missionKind === 'setup'
    const ch: 'blue' | 'green' = m.robotType === 'das' || setup ? 'green' : 'blue'
    return {
      id: m.id,
      no: setup ? 'SETUP' : `#${m.index}`,
      title: setup ? m.title.replace(/^セットアップ[:：]\s*/, '') : m.title,
      dept: m.client.dept,
      ch,
      setup,
      who: m.client.name,
      manual: setup ? null : m.manualMinutes,
      xp: meta.xp,
      skill: meta.skill,
      blurb: meta.mapBlurb,
    }
  })
}

// ---- DEPTS ← client.dept でグルーピング + 階段状アイソメ座標を手続き生成 ----
const COLS_X = [40, 290, 540]
function rowY(row: number): number {
  return ROW_Y_START - row * ROW_GAP
}
function buildDepts(stages: Stage[]): { depts: Dept[]; goal: [number, number, number]; start: [number, number, number] } {
  // 部署ごとに最小 index 順で並べる（カリキュラム順）
  const order: string[] = []
  const map = new Map<string, Stage[]>()
  for (const s of stages) {
    if (!map.has(s.dept)) {
      map.set(s.dept, [])
      order.push(s.dept)
    }
    map.get(s.dept)!.push(s)
  }
  const depts: Dept[] = order.map((dept, i) => {
    const list = map.get(dept)!
    const row = Math.floor(i / 3)
    const col = i % 3
    const x = row % 2 === 0 ? COLS_X[col]! : COLS_X[2 - col]!
    const y = rowY(row)
    const z = Z_BASE + i * Z_STEP
    return {
      key: 'd' + i,
      dept,
      ch: list[0]!.ch,
      stageIds: list.map((s) => s.id),
      pos: [x, y, z],
    }
  })
  // ゴール: 右上奥（対角線の終点）。高さは部署数に連動。
  const n = order.length
  const goal: [number, number, number] = [220, -210, Z_BASE + n * Z_STEP]
  // スタート: 左下前景（対角線の始点）
  const start: [number, number, number] = [20, 690, 0]
  return { depts, goal, start }
}

// ---- 描画バウンディングボックス → 平行移動＋フィットサイズ算出 ----
function computeFit(
  depts: Dept[],
  goal: [number, number, number],
  startPos: [number, number, number],
  mascotBase: [number, number, number],
): { dx: number; dy: number; fitW: number; fitH: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  function ext(x: number, y: number) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  // 部署建物 8 コーナー + デスクカード矩形
  for (const d of depts) {
    const [px, py, pz] = d.pos
    for (const cx of [px, px + 120]) for (const cy of [py, py + 120]) for (const cz of [0, pz]) {
      const p = iso(cx, cy, cz); ext(p[0], p[1])
    }
    const np = iso(px + 58, py + 8, pz + 50)
    const cardH = 38 + d.stageIds.length * 27
    ext(np[0] - 85, np[1] - cardH - 10)
    ext(np[0] + 85, np[1])
  }
  // ゴール建物 (90x90)
  const [gx, gy, gz] = goal
  for (const cx of [gx, gx + 90]) for (const cy of [gy, gy + 90]) for (const cz of [0, gz]) {
    const p = iso(cx, cy, cz); ext(p[0], p[1])
  }
  const tp = iso(gx + 45, gy + 45, gz + 22)
  ext(tp[0] - 2, tp[1] - 20); ext(tp[0] + 18, tp[1])
  // スタートタイル (90x90, z=0)
  const [sx, sy] = startPos
  for (const cx of [sx, sx + 90]) for (const cy of [sy, sy + 90]) {
    const p = iso(cx, cy, 0); ext(p[0], p[1])
  }
  // スタートラベル矩形
  const slp = iso(sx + 45, sy + 45, 10)
  ext(slp[0] - 50, slp[1] - 40); ext(slp[0] + 50, slp[1] + 10)
  // マスコット
  const mpt = iso(mascotBase[0] + 46, mascotBase[1] + 50, mascotBase[2])
  ext(mpt[0] - 30, mpt[1] - 90); ext(mpt[0] + 30, mpt[1] + 36)
  // フィット
  const dx = FIT_PAD - minX
  const dy = FIT_PAD - minY
  return {
    dx, dy,
    fitW: Math.ceil(maxX - minX + 2 * FIT_PAD),
    fitH: Math.ceil(maxY - minY + 2 * FIT_PAD),
  }
}

// ---- 色ユーティリティ（原典） ----
function hx(h: string): [number, number, number] {
  const s = h.replace('#', '')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
function mix(a: string, b: string, p: number): string {
  const A = hx(a)
  const B = hx(b)
  return (
    'rgb(' +
    Math.round(A[0] + (B[0] - A[0]) * p) +
    ',' +
    Math.round(A[1] + (B[1] - A[1]) * p) +
    ',' +
    Math.round(A[2] + (B[2] - A[2]) * p) +
    ')'
  )
}
const lighten = (c: string, p: number) => mix(c, '#ffffff', p)
const shade = (c: string, p: number) => mix(c, '#000000', p)

// ---- アイソメ幾何（原典） ----
function iso(x: number, y: number, z?: number): Pt {
  return [OX + (x - y) * 0.866, OY + (x + y) * 0.5 - (z || 0)]
}
function pstr(pts: Pt[]): string {
  return pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
}
function poly(pts: Pt[], fill: string, key: string, extra?: Record<string, unknown>): React.ReactElement {
  const o: Record<string, unknown> = { key, points: pstr(pts), fill }
  if (extra) Object.assign(o, extra)
  return React.createElement('polygon', o)
}
function box(
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
  base: string,
  kp: string,
): React.ReactElement[] {
  const I = (a: number, b: number, c: number) => iso(a, b, c)
  const top = [I(x, y, z + dz), I(x + dx, y, z + dz), I(x + dx, y + dy, z + dz), I(x, y + dy, z + dz)]
  const right = [I(x + dx, y, z), I(x + dx, y + dy, z), I(x + dx, y + dy, z + dz), I(x + dx, y, z + dz)]
  const left = [I(x, y + dy, z), I(x + dx, y + dy, z), I(x + dx, y + dy, z + dz), I(x, y + dy, z + dz)]
  return [
    poly(left, shade(base, 0.12), kp + 'l'),
    poly(right, shade(base, 0.22), kp + 'r'),
    poly(top, lighten(base, 0.1), kp + 't'),
  ]
}

// ============================================================
// コンポーネント
// ============================================================
export default function OfficeMapHome() {
  const profile = useGameStore((s) => s.profile)
  const completed = useGameStore((s) => s.completedMissions)
  const startMission = useGameStore((s) => s.startMission)
  const goPractice = useGameStore((s) => s.goPractice)
  const logoutProfile = useGameStore((s) => s.logoutProfile)
  const startFromBeginning = useGameStore((s) => s.startFromBeginning)

  const [selId, setSelId] = useState<string | null>(null)
  const [show10, setShow10] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // ---- adaptive scale: コンテナ幅に追従して SCALE を動的算出 ----
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [availW, setAvailW] = useState(FALLBACK_AVAIL_W)
  const measureWidth = useCallback(() => {
    if (mapContainerRef.current) setAvailW(mapContainerRef.current.clientWidth)
  }, [])
  useEffect(() => {
    measureWidth()
    if (typeof ResizeObserver === 'undefined') return // jsdom 等 SSR ガード
    const ro = new ResizeObserver(measureWidth)
    if (mapContainerRef.current) ro.observe(mapContainerRef.current)
    return () => ro.disconnect()
  }, [measureWidth])

  const stages = useMemo(() => buildStages(), [])
  const { depts, goal, start } = useMemo(() => buildDepts(stages), [stages])
  const completedSet = useMemo(() => new Set(completed), [completed])

  const stageById = (id: string) => stages.find((s) => s.id === id)
  const isCleared = (id: string) => completedSet.has(id)
  // シリーズ（blue/green）内直列解放: 先頭 or 同シリーズ前ミッション完了で解放
  const isUnlocked = (s: Stage): boolean => {
    if (s.setup) return true
    const series = stages.filter((x) => x.ch === s.ch)
    const idx = series.indexOf(s)
    return idx <= 0 || isCleared(series[idx - 1]!.id)
  }
  const recommended = (): Stage | null => {
    for (const s of stages) if (isUnlocked(s) && !isCleared(s.id)) return s
    return null
  }
  const totalXp = stages.reduce((acc, s) => acc + (isCleared(s.id) ? s.xp : 0), 0)
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1
  const inLevel = totalXp % XP_PER_LEVEL
  const levelPct = Math.round((inLevel / XP_PER_LEVEL) * 100)
  const name = profile ?? 'プレイヤー'
  const rec = recommended()

  const deptOfStage = (id: string) => depts.find((d) => d.stageIds.includes(id))
  const posOf = (id: string): [number, number, number] => deptOfStage(id)?.pos ?? [205, 560, 0]

  // ---- desk（deptStation 原典移植） ----
  function deptStation(d: Dept): { depth: number; el: React.ReactElement[] } {
    const p = d.pos
    const wx = p[0]
    const wy = p[1]
    const Z = p[2]
    const k = d.key + '_'
    const dStages = d.stageIds.map((id) => stageById(id)!).filter(Boolean)
    const allCleared = dStages.every((s) => isCleared(s.id))
    const hasRec = !!rec && d.stageIds.includes(rec.id)
    const locked = dStages.every((s) => !isUnlocked(s) && !isCleared(s.id))
    const wallC = locked ? '#D6D2E0' : d.ch === 'green' ? '#CFE3D8' : '#D3DCEE'
    const desk = locked ? '#E7E4EF' : '#F4F2F9'
    const inner: React.ReactElement[] = []
    // L 字パーティション
    inner.push(...box(wx + 12, wy + 12, Z, 66, 6, 40, wallC, k + 'wb'))
    inner.push(...box(wx + 12, wy + 12, Z, 6, 58, 40, wallC, k + 'wl'))
    // （各デスクの着席ロボットは表示しない方針）
    // 天板＋前面パネル
    inner.push(...box(wx + 20, wy + 30, Z + 26, 54, 34, 5, desk, k + 'd'))
    inner.push(...box(wx + 20, wy + 60, Z + 18, 54, 4, 12, shade(desk, 0.07), k + 'mp'))
    // モニタ（最大2）
    dStages.slice(0, 2).forEach((_s, i) => {
      const mx = 24 + i * 22
      inner.push(...box(wx + mx, wy + 32, Z + 38, 4, 14, 13, '#2f2f3a', k + 'mon' + i))
      inner.push(...box(wx + mx - 0.6, wy + 32.6, Z + 38.5, 0.8, 13, 12, '#86B0E0', k + 'scr' + i))
    })
    // 椅子
    inner.push(...box(wx + 38, wy + 62, Z + 18, 18, 5, 22, '#5a6473', k + 'ch'))
    // クリア旗
    if (allCleared) {
      inner.push(...box(wx + 66, wy + 14, Z + 30, 2.5, 2.5, 20, '#CC8C4B', k + 'fp'))
      const fp = iso(wx + 67, wy + 15, Z + 58)
      inner.push(
        React.createElement('polygon', {
          key: k + 'fl',
          points: pstr([fp, [fp[0] + 15, fp[1] + 3.5], [fp[0], fp[1] + 9]]),
          fill: '#ED6A82',
        }),
      )
    }
    const grp = React.createElement('g', { key: k + 'g', opacity: locked ? 0.5 : 1 }, inner)
    const out: React.ReactElement[] = []
    if (hasRec) {
      const c = iso(wx + 46, wy + 40, Z)
      out.push(
        React.createElement(
          'g',
          { key: k + 'ring', style: { animation: 'qGlow 1.8s ease-in-out infinite' } },
          React.createElement('ellipse', {
            cx: c[0],
            cy: c[1],
            rx: 54,
            ry: 27,
            fill: 'none',
            stroke: '#E0A767',
            strokeWidth: 3,
            strokeDasharray: '5 5',
          }),
        ),
      )
    }
    out.push(grp)
    return { depth: wx + wy, el: out }
  }

  // ---- scene（scenePrims 原典移植） ----
  function scene(): React.ReactElement {
    const prims: { depth: number; el: React.ReactElement[] }[] = []
    // 部署タイル（柱＋影）
    depts.forEach((d) => {
      const p = d.pos
      const base = d.ch === 'green' ? '#E3EBE8' : '#E6E3EF'
      const c = iso(p[0] + 60, p[1] + 128, 0)
      const sh = React.createElement('ellipse', {
        key: 'sh' + d.key,
        cx: c[0],
        cy: c[1] + 4,
        rx: 76,
        ry: 30,
        fill: 'rgba(90,78,120,.15)',
        style: { filter: 'blur(10px)' },
      })
      prims.push({ depth: p[0] + p[1] - 2, el: [sh, ...box(p[0], p[1], 0, 120, 120, p[2], base, 'tile' + d.key)] })
    })
    // ゴール柱
    const G = goal
    const gk = 'goal_'
    const gel: React.ReactElement[] = []
    gel.push(...box(G[0], G[1], 0, 90, 90, G[2], '#EFE8F2', gk))
    gel.push(...box(G[0] + 28, G[1] + 28, G[2], 34, 34, 6, '#F3D9B4', gk + 'b'))
    gel.push(...box(G[0] + 38, G[1] + 38, G[2] + 6, 14, 14, 16, '#E0A767', gk + 'p'))
    const tp = iso(G[0] + 45, G[1] + 45, G[2] + 22)
    gel.push(
      React.createElement('polygon', {
        key: gk + 'fl',
        points: pstr([[tp[0], tp[1] - 18], [tp[0] + 16, tp[1] - 14], [tp[0], tp[1] - 9]]),
        fill: '#ED6A82',
      }),
    )
    gel.push(React.createElement('rect', { key: gk + 'po', x: tp[0] - 1, y: tp[1] - 18, width: 2, height: 18, fill: '#8a8a93' }))
    prims.push({ depth: G[0] + G[1], el: gel })
    // スタートタイル
    const S = start
    const sk = 'start_'
    const sel2: React.ReactElement[] = []
    sel2.push(...box(S[0], S[1], 0, 90, 90, 8, '#D9EFE2', sk))
    sel2.push(...box(S[0] + 25, S[1] + 25, 8, 40, 40, 4, '#A8D5BA', sk + 'b'))
    const stp = iso(S[0] + 45, S[1] + 45, 14)
    sel2.push(React.createElement('text', {
      key: sk + 'txt', x: stp[0], y: stp[1], textAnchor: 'middle', fill: '#2E9E6B',
      style: { fontSize: 11, fontWeight: 800, fontFamily: 'Montserrat,sans-serif', letterSpacing: '.08em' },
    }, 'START'))
    prims.push({ depth: S[0] + S[1], el: sel2 })
    prims.sort((a, b) => a.depth - b.depth)
    const children: React.ReactElement[] = []
    prims.forEach((pr) => pr.el.forEach((e) => children.push(e)))
    // 登攀ルート（破線・スタート→部署→部署→ゴール）
    const sc = iso(S[0] + 45, S[1] + 45, 5)
    let dPath = 'M' + sc[0].toFixed(1) + ' ' + sc[1].toFixed(1) + ' '
    depts.forEach((dep) => {
      const p = dep.pos
      const c = iso(p[0] + 60, p[1] + 60, p[2] + 1)
      dPath += 'L' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ' '
    })
    const gc = iso(G[0] + 45, G[1] + 45, G[2] + 1)
    dPath += 'L' + gc[0].toFixed(1) + ' ' + gc[1].toFixed(1)
    children.push(
      React.createElement('path', {
        key: 'route',
        d: dPath,
        fill: 'none',
        stroke: 'rgba(219,146,68,.5)',
        strokeWidth: 4,
        strokeLinecap: 'round',
        strokeDasharray: '2 11',
      }),
    )
    // デスク（奥→手前）
    depts
      .map((dep) => deptStation(dep))
      .sort((a, b) => a.depth - b.depth)
      .forEach((w) => w.el.forEach((e) => children.push(e)))
    return React.createElement(
      'svg',
      { width: fit.fitW, height: fit.fitH, viewBox: `0 0 ${fit.fitW} ${fit.fitH}`, style: { position: 'absolute', inset: 0, overflow: 'visible' } },
      React.createElement('g', { transform: `translate(${fit.dx},${fit.dy})` }, children),
    )
  }

  // ---- 部署カード（HTML オーバーレイ） ----
  function deptCard(d: Dept) {
    const p = d.pos
    const W = 170
    const dStages = d.stageIds.map((id) => stageById(id)!).filter(Boolean)
    const hasRec = !!rec && d.stageIds.includes(rec.id)
    const allCleared = dStages.every((s) => isCleared(s.id))
    const cardH = 38 + dStages.length * 27
    const np = iso(p[0] + 58, p[1] + 8, p[2] + 50)
    let border = '#E6E3DE'
    let sh = '0 6px 16px rgba(26,26,26,.14)'
    let flagShow = false
    let flagText = ''
    let flagBg = C.o
    if (hasRec) {
      border = C.o
      sh = '0 0 0 2.5px rgba(219,146,68,.5), 0 10px 22px rgba(219,146,68,.25)'
      flagShow = true
      flagText = 'いまここ'
    } else if (allCleared) {
      border = '#CFE7DA'
      flagShow = true
      flagText = 'クリア'
      flagBg = C.su
    }
    return (
      <div
        key={d.key}
        style={{
          position: 'absolute',
          left: np[0] - W / 2 + fit.dx,
          top: np[1] - cardH + fit.dy,
          width: W,
          zIndex: Math.round(p[0] + p[1]) + 20,
          animation: hasRec ? 'qBob 4.5s ease-in-out infinite' : undefined,
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1.5px solid ' + border,
            borderRadius: 12,
            boxShadow: sh,
            padding: '7px 9px 8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 3px 5px',
              borderBottom: '1px solid #F1F0EC',
              marginBottom: 3,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.ch === 'green' ? C.su : C.blue, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>{d.dept}</span>
            <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#B7B6B1' }}>{dStages.length}件</span>
          </div>
          {dStages.map((s) => {
            const cleared = isCleared(s.id)
            const unlocked = isUnlocked(s)
            const isRec = !!rec && rec.id === s.id
            const locked = !unlocked && !cleared
            let stColor = C.blue
            let stText = '挑戦'
            let rowBg = 'transparent'
            if (cleared) {
              stColor = C.su
              stText = '済'
            } else if (isRec) {
              stColor = C.od
              stText = '受付中'
              rowBg = C.ow
            } else if (locked) {
              stColor = C.fg4
              stText = '準備中'
            }
            return (
              <div
                key={s.id}
                onClick={() => setSelId(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 6px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: rowBg,
                }}
              >
                <span style={{ font: '800 8.5px/1 Montserrat,sans-serif', color: s.ch === 'green' ? C.su : C.blue, flexShrink: 0, width: 26 }}>
                  {s.no}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 600, color: locked ? C.fg4 : C.fg1, lineHeight: 1.2 }}>
                  {s.title}
                </span>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: stColor, flexShrink: 0 }}>{stText}</span>
              </div>
            )
          })}
        </div>
        {flagShow && (
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: -7,
              background: flagBg,
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 999,
              boxShadow: '0 3px 9px rgba(26,26,26,.2)',
              animation: 'qBob 2.4s ease-in-out infinite',
            }}
          >
            {flagText}
          </div>
        )}
      </div>
    )
  }

  // ---- マスコット位置 ----
  const ma = rec ? posOf(rec.id) : goal
  const mp = iso(ma[0] + 46, ma[1] + 50, ma[2])
  const fit = computeFit(depts, goal, start, ma)
  const scale = Math.min(MAX_SCALE, availW / fit.fitW)

  // ---- 詳細モーダル用データ ----
  const sel = selId ? stageById(selId) : null
  const selCleared = sel ? isCleared(sel.id) : false
  const selUnlocked = sel ? isUnlocked(sel) : false

  const stamps = stages.filter((s) => isCleared(s.id))

  return (
    <div style={{ height: '100vh', paddingBottom: 60, background: '#F1EADD', color: '#1A1A1A', fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", overflowY: 'auto' }}>
      {/* ===== ヘッダ ===== */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,.86)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E6E5E1' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '13px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={LOGO} alt="OPEN" style={{ height: 28, width: 'auto' }} />
            <div style={{ height: 24, width: 1, background: '#E0DED9' }} />
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.02em' }}>自動化推進室クエスト</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={goPractice}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1.5px solid #CFE0F5', color: '#3A7BD6', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 999, cursor: 'pointer' }}
            >
              🖥 実機練習
            </div>
            <div
              onClick={() => setShow10(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #F0C79A', color: '#CC8C4B', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 999, cursor: 'pointer' }}
            >
              🩺 健康なロボットのための10か条
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px 0' }}>
        {/* ===== マスコット吹き出し + プレイヤーカード ===== */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', display: 'flex', alignItems: 'flex-end', gap: 13, background: '#fff', border: '1px solid #ECEBE7', borderRadius: 16, padding: '16px 18px' }}>
            <img src={MASCOT} alt="" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, animation: 'qBob 4s ease-in-out infinite' }} />
            <div style={{ background: '#FBF1E6', border: '1px solid #F0C79A', borderRadius: 15, padding: '11px 15px', fontSize: 13.5, lineHeight: 1.7, color: '#5b4b2a' }}>
              {rec
                ? `${rec.dept}のデスクへ向かおう。${rec.who.split(' ')[0]}さんが相談「${rec.title}」で困っているみたい。ロボットで解決だ！`
                : 'フロアのぜんぶの部署をめぐって相談を解決！キミはもう自動化マスターだね。'}
            </div>
          </div>
          <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 12, background: '#fff', border: '1px solid #ECEBE7', borderRadius: 16, padding: '16px 18px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#F6A35A,#ED6A82)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                {name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#9A9A9A' }}>ようこそ</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {name} <span style={{ fontSize: 11.5, color: '#9A9A9A', fontWeight: 500 }}>さん</span>
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: '#1A1A1A', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>
                <span style={{ font: '800 8px/1 Montserrat,sans-serif', letterSpacing: '.08em', color: '#E0A767' }}>LV</span>
                <span style={{ fontSize: 17, fontWeight: 800 }}>{level}</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#6B6B6B', marginBottom: 4 }}>
                <span>XP {inLevel} / {XP_PER_LEVEL}</span>
                <span>次のレベルまで {XP_PER_LEVEL - inLevel}</span>
              </div>
              <div style={{ height: 10, background: '#EDECE8', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: levelPct + '%', background: 'linear-gradient(100deg,#F6A35A,#ED6A82)', borderRadius: 999, transition: 'width .6s cubic-bezier(.22,.61,.36,1)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>
                解決 <b style={{ color: '#1A1A1A', fontSize: 14 }}>{stamps.length}</b> / {stages.length}
              </div>
              <div onClick={logoutProfile} style={{ marginLeft: 'auto', fontSize: 11.5, color: '#CC8C4B', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                プレイヤーを変更
              </div>
            </div>
          </div>
        </div>

        {/* ===== アクション行 ===== */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <div
            onClick={() => {
              if (rec) startMission(rec.id)
            }}
            style={{ background: 'linear-gradient(100deg,#F6A35A,#ED6A82)', color: '#fff', fontSize: 14, fontWeight: 700, padding: '13px 24px', borderRadius: 999, cursor: 'pointer', boxShadow: '0 8px 22px rgba(237,106,130,.26)', display: 'flex', alignItems: 'center', gap: 9, opacity: rec ? 1 : 0.55 }}
          >
            ▶ {rec ? '続きから挑戦' : 'コンプリート！'}
          </div>
          <div
            onClick={() => {
              if (completed.length === 0 || confirm('最初からやり直しますか？（このプレイヤーの進捗はリセットされます）')) startFromBeginning()
            }}
            style={{ background: '#fff', border: '1.5px solid #E6E5E1', color: '#3D3D3D', fontSize: 13.5, fontWeight: 700, padding: '13px 22px', borderRadius: 999, cursor: 'pointer' }}
          >
            最初から
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A', letterSpacing: '.06em' }}>スタンプ</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {stamps.length === 0 ? (
                <span style={{ fontSize: 12, color: '#B7B6B1' }}>まだありません</span>
              ) : (
                stamps.map((s) => (
                  <div
                    key={s.id}
                    title={s.title}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(100deg,#F6A35A,#ED6A82)', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(237,106,130,.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat,sans-serif' }}>
                      {s.no === 'SETUP' ? 'S' : s.no.replace('#', '')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ===== アイソメ・オフィス ===== */}
        <div style={{ background: '#fff', border: '1px solid #ECEBE7', borderRadius: 22, boxShadow: '0 16px 40px rgba(26,26,26,.08)', padding: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 14px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.02em' }}>
              🏢 自動化推進室フロア <span style={{ fontSize: 12, color: '#9A9A9A', fontWeight: 500 }}>— 各部署のデスクをめぐって相談を解決しよう</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3A7BD6', fontWeight: 700 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A7BD6' }} />青ロボット編
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2E9E6B', fontWeight: 700 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2E9E6B' }} />緑ロボット編
              </span>
            </div>
          </div>

          <div ref={mapContainerRef}>
            <div style={{ width: fit.fitW * scale, height: fit.fitH * scale, margin: '0 auto' }}>
              <div style={{ position: 'relative', width: fit.fitW, height: fit.fitH, transform: `scale(${scale})`, transformOrigin: 'top left', background: 'radial-gradient(120% 90% at 50% 30%, #FBF7F0 0%, #F3EEF7 70%, #ECE6F2 100%)', borderRadius: 18 }}>
              {scene()}
              {depts.map((d) => deptCard(d))}
              {/* スタートラベル */}
              {(() => {
                const sp = iso(start[0] + 45, start[1] + 45, 10)
                return (
                  <div
                    onClick={() => setShowGuide(true)}
                    style={{ position: 'absolute', left: sp[0] - 48 + fit.dx, top: sp[1] - 18 + fit.dy, width: 96, textAlign: 'center', cursor: 'pointer', zIndex: 20 }}
                  >
                    <div style={{ display: 'inline-block', background: '#fff', border: '1.5px solid #A8D5BA', borderRadius: 10, padding: '6px 14px', boxShadow: '0 4px 12px rgba(46,158,107,.18)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#2E9E6B', fontFamily: 'Montserrat,sans-serif', letterSpacing: '.08em' }}>START</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#6B6B6B', marginTop: 2 }}>進め方ガイド</div>
                    </div>
                  </div>
                )
              })()}
              {/* マスコット */}
              <div style={{ position: 'absolute', left: mp[0] - 29 + fit.dx, top: mp[1] - 88 + fit.dy, width: 58, textAlign: 'center', zIndex: 50, transition: 'left .7s cubic-bezier(.22,.61,.36,1), top .7s cubic-bezier(.22,.61,.36,1)' }}>
                <img src={MASCOT} alt="" style={{ width: 58, height: 58, borderRadius: '50%', boxShadow: '0 12px 22px rgba(26,26,26,.22)', animation: 'qFloat 2.6s ease-in-out infinite' }} />
                <div style={{ marginTop: 3, display: 'inline-block', background: '#1A1A1A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                  {rec ? 'いまここ' : 'GOAL！'}
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 詳細モーダル ===== */}
      {sel && (
        <div onClick={() => setSelId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 2000, animation: 'qFade .15s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px rgba(26,26,26,.32)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: selCleared ? C.smile : sel.ch === 'green' ? 'linear-gradient(100deg,#2E9E6B,#1f7d52)' : 'linear-gradient(100deg,#3A7BD6,#2f63ad)', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, opacity: 0.92 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                {sel.ch === 'green' ? '緑ロボット編' : '青ロボット編'} ・ {sel.no} ・ {sel.dept}
              </div>
              <div style={{ marginTop: 9, fontSize: 21, fontWeight: 700, letterSpacing: '.02em' }}>{sel.title}</div>
            </div>
            <div style={{ padding: '22px 24px' }}>
              <div style={{ fontSize: 13, color: '#3D3D3D', lineHeight: 1.85 }}>{sel.blurb}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <div style={{ flex: 1, background: '#FAFAF8', border: '1px solid #ECEBE7', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10.5, color: '#9A9A9A' }}>相談者</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{sel.who}</div>
                </div>
                <div style={{ flex: 1, background: '#FAFAF8', border: '1px solid #ECEBE7', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10.5, color: '#9A9A9A' }}>いまの手作業</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{sel.manual == null ? '初期設定' : '手作業 ' + sel.manual + ' 分'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, background: '#FBF1E6', border: '1px solid #F0C79A', borderRadius: 12, padding: '12px 15px' }}>
                <span style={{ fontSize: 11, color: '#CC8C4B', fontWeight: 700 }}>習得スキル</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{sel.skill}</span>
                <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: '#2E9E6B' }}>+{sel.xp} XP</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {selUnlocked && !selCleared && (
                  <div onClick={() => startMission(sel.id)} style={{ flex: 1, textAlign: 'center', background: 'linear-gradient(100deg,#F6A35A,#ED6A82)', color: '#fff', fontSize: 14, fontWeight: 700, padding: 14, borderRadius: 13, cursor: 'pointer', boxShadow: '0 8px 22px rgba(237,106,130,.26)' }}>
                    ロボットで解決する
                  </div>
                )}
                {selCleared && (
                  <div onClick={() => startMission(sel.id)} style={{ flex: 1, textAlign: 'center', background: '#E9F6EF', color: '#2E9E6B', fontSize: 14, fontWeight: 700, padding: 14, borderRadius: 13, cursor: 'pointer' }}>
                    解決済み（もう一度挑戦）
                  </div>
                )}
                {!selUnlocked && !selCleared && (
                  <div style={{ flex: 1, textAlign: 'center', background: '#F2F1EE', color: '#9A9A9A', fontSize: 13, fontWeight: 700, padding: 14, borderRadius: 13 }}>
                    前の相談をクリアで解放
                  </div>
                )}
                <div onClick={() => setSelId(null)} style={{ background: '#fff', border: '1.5px solid #E6E5E1', color: '#3D3D3D', fontSize: 13.5, fontWeight: 700, padding: '14px 20px', borderRadius: 13, cursor: 'pointer' }}>
                  閉じる
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 10か条モーダル ===== */}
      {show10 && (
        <div onClick={() => setShow10(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 2000, animation: 'qFade .15s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '100%', maxHeight: '86vh', overflowY: 'auto', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px rgba(26,26,26,.32)' }}>
            <div style={{ padding: '22px 26px 18px', display: 'flex', alignItems: 'center', gap: 13, borderBottom: '1px solid #F1F0EC', position: 'sticky', top: 0, background: '#fff' }}>
              <img src={MASCOT} alt="" style={{ width: 46, height: 46, borderRadius: '50%' }} />
              <div>
                <div style={{ font: '800 10px/1 Montserrat,sans-serif', letterSpacing: '.14em', color: '#CC8C4B' }}>ROBOT WELLNESS</div>
                <div style={{ marginTop: 5, fontSize: 18, fontWeight: 700 }}>健康なロボットのための10か条</div>
              </div>
              <div onClick={() => setShow10(false)} style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%', background: '#F2F1EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B6B6B' }}>
                ✕
              </div>
            </div>
            <div style={{ padding: '18px 26px 26px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HEALTH_RULES.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FAFAF8', border: '1px solid #ECEBE7', borderRadius: 12, padding: '11px 15px' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#F6A35A,#ED6A82)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 13px/1 Montserrat,sans-serif', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13.5, color: '#3D3D3D', lineHeight: 1.6 }}>{r.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== 進め方ガイドモーダル ===== */}
      {showGuide && (
        <div onClick={() => setShowGuide(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 2000, animation: 'qFade .15s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: '100%', maxHeight: '86vh', overflowY: 'auto', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px rgba(26,26,26,.32)' }}>
            <div style={{ padding: '22px 26px 18px', display: 'flex', alignItems: 'center', gap: 13, borderBottom: '1px solid #F1F0EC', position: 'sticky', top: 0, background: '#fff' }}>
              <img src={MASCOT} alt="" style={{ width: 46, height: 46, borderRadius: '50%' }} />
              <div>
                <div style={{ font: '800 10px/1 Montserrat,sans-serif', letterSpacing: '.14em', color: '#2E9E6B' }}>HOW TO PLAY</div>
                <div style={{ marginTop: 5, fontSize: 18, fontWeight: 700 }}>クエストの進め方</div>
              </div>
              <div onClick={() => setShowGuide(false)} style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%', background: '#F2F1EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B6B6B' }}>
                ✕
              </div>
            </div>
            <div style={{ padding: '18px 26px 26px' }}>
              <div style={{ fontSize: 13.5, color: '#3D3D3D', lineHeight: 1.8, marginBottom: 18 }}>
                すごろくの各デスクは 1 つの相談（クエスト）です。スタートから順にデスクをめぐり、すべての相談を解決して GOAL を目指しましょう。
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {[
                  { no: 1, label: '相談を受ける', desc: '相談票で困りごとを把握し、どう解決するか見立てクイズに挑戦' },
                  { no: 2, label: '見立てる', desc: 'クイズでどう自動化するか考える。正解すると次へ進める' },
                  { no: 3, label: '組み立てる', desc: 'ロボットを実際に作る。STEP 表示に従って操作しよう' },
                  { no: 4, label: '実行して確認', desc: '実行ボタンを押して結果を確かめたらクリア！' },
                ].map((s) => (
                  <div key={s.no} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FAFAF8', border: '1px solid #ECEBE7', borderRadius: 12, padding: '11px 15px' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#2E9E6B,#1f7d52)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 13px/1 Montserrat,sans-serif', flexShrink: 0 }}>
                      {s.no}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{s.label}</div>
                      <div style={{ fontSize: 11.5, color: '#6B6B6B', marginTop: 2, lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#FBF1E6', border: '1px solid #F0C79A', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#CC8C4B', marginBottom: 8 }}>最重要のコツ</div>
                <div style={{ fontSize: 13, color: '#5b4b2a', lineHeight: 1.8 }}>
                  画面上部の <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #E6E5E1', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    <span style={{ color: '#2E9E6B' }}>STEP 1/3</span> <span style={{ color: '#9A9A9A' }}>...</span> <span style={{ color: '#B7B6B1' }}>2/3</span>
                  </span> 表示を見ながら進めましょう。今やるべきことが 1 つずつ示され、その通り操作すれば迷いません。1 ステップ終えるごとにチェックが付きます。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
