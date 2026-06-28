// ============================================================
// setupChecks.ts ユニットテスト
//
// テスト対象:
//   1. 各チェック: 初期状態（false）→ 操作後（true）の境界
//   2. connect(): トークン一致で成功 / 各失敗ケース
//   3. validateSetupMission(): 全通過 / 未達
//   4. MISSIONS の並び順: S1 が緑編先頭、D1 は S1 の次
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  checkDasHostName,
  checkSingleUserEnabled,
  checkDasToken,
  checkSavedAndRestarted,
  checkDeviceMappingCreated,
  checkConnected,
  buildSetupChecks,
  connect,
  validateSetupMission,
} from './setupChecks'
import type { SetupMissionCheckCtx } from './setupChecks'
import { INITIAL_SETUP_STATE } from '../model/setup'
import type { SetupState } from '../model/setup'
import { MISSIONS } from '../data/missions/index'

// ---- テスト用ステート生成ヘルパー --------------------------------

function makeCtx(overrides: Partial<SetupState> = {}): SetupMissionCheckCtx {
  return {
    state: {
      ...INITIAL_SETUP_STATE,
      dasDialog: { ...INITIAL_SETUP_STATE.dasDialog, ...overrides.dasDialog },
      mapping: { ...INITIAL_SETUP_STATE.mapping, ...overrides.mapping },
      connectionResult: overrides.connectionResult ?? null,
    },
  }
}

/** 全操作完了状態（トークン一致）を作るヘルパー */
function makeCompletedCtx(token = 'DA01'): SetupMissionCheckCtx {
  return makeCtx({
    dasDialog: {
      hostName: 'MY-PC',
      singleUserEnabled: true,
      token,
      savedAndRestarted: true,
    },
    mapping: {
      name: 'MyDevice',
      host: 'MY-PC',
      commandPort: 49998,
      token,
    },
    connectionResult: { ok: true, reason: null },
  })
}

// ============================================================
// 1. checkDasHostName
// ============================================================

describe('checkDasHostName', () => {
  const check = checkDasHostName()

  it('初期状態（hostName 空）は false', () => {
    expect(check.test(makeCtx())).toBe(false)
  })

  it('hostName を入力すると true', () => {
    expect(check.test(makeCtx({ dasDialog: { hostName: 'MY-PC', singleUserEnabled: false, token: '', savedAndRestarted: false } }))).toBe(true)
  })

  it('半角スペースのみは false（trim チェック）', () => {
    expect(check.test(makeCtx({ dasDialog: { hostName: '   ', singleUserEnabled: false, token: '', savedAndRestarted: false } }))).toBe(false)
  })
})

// ============================================================
// 2. checkSingleUserEnabled
// ============================================================

describe('checkSingleUserEnabled', () => {
  const check = checkSingleUserEnabled()

  it('初期状態（false）は false', () => {
    expect(check.test(makeCtx())).toBe(false)
  })

  it('singleUserEnabled=true にすると true', () => {
    expect(check.test(makeCtx({ dasDialog: { hostName: '', singleUserEnabled: true, token: '', savedAndRestarted: false } }))).toBe(true)
  })
})

// ============================================================
// 3. checkDasToken
// ============================================================

describe('checkDasToken', () => {
  const check = checkDasToken()

  it('初期状態（token 空）は false', () => {
    expect(check.test(makeCtx())).toBe(false)
  })

  it('token を入力すると true', () => {
    expect(check.test(makeCtx({ dasDialog: { hostName: '', singleUserEnabled: false, token: 'DA01', savedAndRestarted: false } }))).toBe(true)
  })

  it('空白のみは false', () => {
    expect(check.test(makeCtx({ dasDialog: { hostName: '', singleUserEnabled: false, token: '  ', savedAndRestarted: false } }))).toBe(false)
  })
})

// ============================================================
// 4. checkSavedAndRestarted
// ============================================================

describe('checkSavedAndRestarted', () => {
  const check = checkSavedAndRestarted()

  it('初期状態（false）は false', () => {
    expect(check.test(makeCtx())).toBe(false)
  })

  it('savedAndRestarted=true にすると true', () => {
    expect(check.test(makeCtx({ dasDialog: { hostName: '', singleUserEnabled: false, token: '', savedAndRestarted: true } }))).toBe(true)
  })
})

// ============================================================
// 5. checkDeviceMappingCreated
// ============================================================

describe('checkDeviceMappingCreated', () => {
  const check = checkDeviceMappingCreated()

  it('初期状態（全空）は false', () => {
    expect(check.test(makeCtx())).toBe(false)
  })

  it('name だけ入力しても false', () => {
    expect(check.test(makeCtx({ mapping: { name: 'Dev', host: '', commandPort: 0, token: '' } }))).toBe(false)
  })

  it('name/host/port/token すべて入力すると true', () => {
    expect(check.test(makeCtx({ mapping: { name: 'Dev', host: 'MY-PC', commandPort: 49998, token: 'DA01' } }))).toBe(true)
  })

  it('commandPort=0 は false（未入力扱い）', () => {
    expect(check.test(makeCtx({ mapping: { name: 'Dev', host: 'MY-PC', commandPort: 0, token: 'DA01' } }))).toBe(false)
  })

  it('token が空白のみは false', () => {
    expect(check.test(makeCtx({ mapping: { name: 'Dev', host: 'MY-PC', commandPort: 49998, token: '   ' } }))).toBe(false)
  })
})

// ============================================================
// 6. checkConnected
// ============================================================

describe('checkConnected', () => {
  const check = checkConnected()

  it('初期状態（connectionResult=null）は false', () => {
    expect(check.test(makeCtx())).toBe(false)
  })

  it('connectionResult.ok=false は false', () => {
    expect(check.test(makeCtx({ connectionResult: { ok: false, reason: 'token_mismatch' } }))).toBe(false)
  })

  it('connectionResult.ok=true は true', () => {
    expect(check.test(makeCtx({ connectionResult: { ok: true, reason: null } }))).toBe(true)
  })
})

// ============================================================
// 7. connect() — トークン一致・失敗理由テスト
// ============================================================

describe('connect()', () => {
  it('全条件を満たすと ok=true になる', () => {
    const state: SetupState = {
      ...INITIAL_SETUP_STATE,
      dasDialog: {
        hostName: 'MY-PC',
        singleUserEnabled: true,
        token: 'DA01',
        savedAndRestarted: true,
      },
      mapping: {
        name: 'Dev',
        host: 'MY-PC',
        commandPort: 49998,
        token: 'DA01',
      },
      connectionResult: null,
    }
    const result = connect(state)
    expect(result.ok).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('トークン不一致は token_mismatch', () => {
    const state: SetupState = {
      ...INITIAL_SETUP_STATE,
      dasDialog: {
        hostName: 'MY-PC',
        singleUserEnabled: true,
        token: 'DA01',
        savedAndRestarted: true,
      },
      mapping: {
        name: 'Dev',
        host: 'MY-PC',
        commandPort: 49998,
        token: 'WRONG',
      },
      connectionResult: null,
    }
    const result = connect(state)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('token_mismatch')
  })

  it('ホスト名が空は host_empty', () => {
    const state: SetupState = {
      ...INITIAL_SETUP_STATE,
      dasDialog: {
        hostName: '',
        singleUserEnabled: true,
        token: 'DA01',
        savedAndRestarted: true,
      },
      mapping: {
        name: 'Dev',
        host: '',
        commandPort: 49998,
        token: 'DA01',
      },
      connectionResult: null,
    }
    const result = connect(state)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('host_empty')
  })

  it('保存して再起動未実行は not_saved', () => {
    const state: SetupState = {
      ...INITIAL_SETUP_STATE,
      dasDialog: {
        hostName: 'MY-PC',
        singleUserEnabled: true,
        token: 'DA01',
        savedAndRestarted: false,
      },
      mapping: {
        name: 'Dev',
        host: 'MY-PC',
        commandPort: 49998,
        token: 'DA01',
      },
      connectionResult: null,
    }
    const result = connect(state)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not_saved')
  })

  it('シングルユーザー未有効は single_user_disabled', () => {
    const state: SetupState = {
      ...INITIAL_SETUP_STATE,
      dasDialog: {
        hostName: 'MY-PC',
        singleUserEnabled: false,
        token: 'DA01',
        savedAndRestarted: true,
      },
      mapping: {
        name: 'Dev',
        host: 'MY-PC',
        commandPort: 49998,
        token: 'DA01',
      },
      connectionResult: null,
    }
    const result = connect(state)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('single_user_disabled')
  })

  it('DS 側トークンが空は token_mismatch', () => {
    const state: SetupState = {
      ...INITIAL_SETUP_STATE,
      dasDialog: {
        hostName: 'MY-PC',
        singleUserEnabled: true,
        token: 'DA01',
        savedAndRestarted: true,
      },
      mapping: {
        name: 'Dev',
        host: 'MY-PC',
        commandPort: 49998,
        token: '',
      },
      connectionResult: null,
    }
    const result = connect(state)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('token_mismatch')
  })
})

// ============================================================
// 8. validateSetupMission()
// ============================================================

describe('validateSetupMission()', () => {
  it('全チェックが通ると pass=true', () => {
    const checks = buildSetupChecks()
    const ctx = makeCompletedCtx()
    const result = validateSetupMission(ctx, checks)
    expect(result.pass).toBe(true)
    expect(result.firstHint).toBeNull()
  })

  it('初期状態では pass=false で firstHint が返る', () => {
    const checks = buildSetupChecks()
    const ctx = makeCtx()
    const result = validateSetupMission(ctx, checks)
    expect(result.pass).toBe(false)
    expect(result.firstHint).not.toBeNull()
  })

  it('outcomes の件数はチェック数と一致する', () => {
    const checks = buildSetupChecks()
    const ctx = makeCompletedCtx()
    const result = validateSetupMission(ctx, checks)
    expect(result.outcomes).toHaveLength(checks.length)
  })

  it('接続成功だけ未達のとき firstHint が接続に関する内容', () => {
    // checkConnected だけ false の状態
    const checks = buildSetupChecks()
    const ctx = makeCtx({
      dasDialog: {
        hostName: 'MY-PC',
        singleUserEnabled: true,
        token: 'DA01',
        savedAndRestarted: true,
      },
      mapping: {
        name: 'Dev',
        host: 'MY-PC',
        commandPort: 49998,
        token: 'DA01',
      },
      connectionResult: null,  // 未試行
    })
    const result = validateSetupMission(ctx, checks)
    expect(result.pass).toBe(false)
    // 接続チェック（最後）のヒントが含まれるはず
    expect(result.firstHint).toMatch(/接続|トークン/)
  })
})

// ============================================================
// 9. MISSIONS の並び順テスト
// ============================================================

describe('MISSIONS の並び順', () => {
  it('S1 が緑ロボット編（robotType="das" または missionKind="setup"）の先頭にある', () => {
    const s1Idx = MISSIONS.findIndex((m) => m.id === 's1')
    expect(s1Idx).toBeGreaterThanOrEqual(0)

    // S1 より後ろにある最初の das ミッションが D1 であること
    const d1Idx = MISSIONS.findIndex((m) => m.id === 'd1')
    expect(d1Idx).toBeGreaterThan(s1Idx)
  })

  it('D1 は S1 の直後にある', () => {
    const s1Idx = MISSIONS.findIndex((m) => m.id === 's1')
    const d1Idx = MISSIONS.findIndex((m) => m.id === 'd1')
    expect(d1Idx).toBe(s1Idx + 1)
  })

  it('S1 より前に D1〜D5 のどれも来ない', () => {
    const s1Idx = MISSIONS.findIndex((m) => m.id === 's1')
    for (const id of ['d1', 'd2', 'd3', 'd4', 'd5']) {
      const idx = MISSIONS.findIndex((m) => m.id === id)
      expect(idx).toBeGreaterThan(s1Idx)
    }
  })

  it('S1 は missionKind="setup" である', () => {
    const s1 = MISSIONS.find((m) => m.id === 's1')
    expect(s1?.missionKind).toBe('setup')
  })

  it('既存ミッション（M1〜M5, D1〜D5）の missionKind は undefined（従来動作維持）', () => {
    const existing = ['m1', 'm2', 'm3', 'm4', 'm5', 'd1', 'd2', 'd3', 'd4', 'd5']
    for (const id of existing) {
      const m = MISSIONS.find((m) => m.id === id)
      expect(m?.missionKind).toBeUndefined()
    }
  })
})
