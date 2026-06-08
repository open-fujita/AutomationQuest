import { create } from 'zustand'

/** ミッション内のフェーズ */
export type GamePhase = 'briefing' | 'deduction' | 'build' | 'result'

/** アプリ画面 */
export type Screen = 'home' | 'play'

// ---- プレイヤー別ローカル保存（複数人が非同期で利用できる） -------------
const PROFILES_KEY = 'ds-master-profiles'
const LAST_KEY = 'ds-master-last-profile'
const progKey = (name: string) => `ds-master-progress::${name}`

interface Progress {
  currentMissionId: string
  completedMissions: string[]
  unlockedTerms: string[]
  deductionAnswers: Record<string, number>
}

const DEFAULT_PROGRESS: Progress = {
  currentMissionId: 'm1',
  completedMissions: [],
  unlockedTerms: [],
  deductionAnswers: {},
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function loadProfiles(): string[] {
  return safeParse<string[]>(localStorage.getItem(PROFILES_KEY), [])
}
function saveProfiles(list: string[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list))
}
function loadProgress(name: string): Progress {
  return safeParse<Progress>(localStorage.getItem(progKey(name)), { ...DEFAULT_PROGRESS })
}
function saveProgress(name: string, p: Progress) {
  localStorage.setItem(progKey(name), JSON.stringify(p))
}

interface GameState extends Progress {
  screen: Screen
  profile: string | null
  profiles: string[]
  phase: GamePhase

  // プロフィール
  loginProfile: (name: string) => void
  logoutProfile: () => void
  deleteProfile: (name: string) => void

  // 画面遷移
  goHome: () => void
  continueGame: () => void
  startFromBeginning: () => void
  startMission: (id: string) => void

  // ミッション内
  setMission: (id: string) => void
  setPhase: (phase: GamePhase) => void
  answerDeduction: (questionId: string, index: number) => void
  unlockTerms: (keys: string[]) => void
  completeMission: (id: string) => void
}

export const useGameStore = create<GameState>()((set, get) => {
  // 現在プロフィールの進捗を localStorage に書き戻す
  const persist = () => {
    const s = get()
    if (!s.profile) return
    saveProgress(s.profile, {
      currentMissionId: s.currentMissionId,
      completedMissions: s.completedMissions,
      unlockedTerms: s.unlockedTerms,
      deductionAnswers: s.deductionAnswers,
    })
  }

  return {
    ...DEFAULT_PROGRESS,
    screen: 'home',
    profile: null,
    profiles: loadProfiles(),
    phase: 'briefing',

    loginProfile: (rawName) => {
      const name = rawName.trim()
      if (!name) return
      const profiles = loadProfiles()
      if (!profiles.includes(name)) {
        profiles.push(name)
        saveProfiles(profiles)
      }
      localStorage.setItem(LAST_KEY, name)
      const p = loadProgress(name)
      set({ profile: name, profiles, screen: 'home', phase: 'briefing', ...p })
    },

    logoutProfile: () => set({ profile: null, screen: 'home' }),

    deleteProfile: (name) => {
      const profiles = loadProfiles().filter((n) => n !== name)
      saveProfiles(profiles)
      localStorage.removeItem(progKey(name))
      set((s) => ({ profiles, profile: s.profile === name ? null : s.profile }))
    },

    goHome: () => set({ screen: 'home' }),

    continueGame: () => set({ screen: 'play', phase: 'briefing' }),

    startFromBeginning: () => {
      set({ ...DEFAULT_PROGRESS, screen: 'play', phase: 'briefing' })
      persist()
    },

    startMission: (id) => {
      set({ currentMissionId: id, screen: 'play', phase: 'briefing' })
      persist()
    },

    setMission: (id) => {
      set({ currentMissionId: id, phase: 'briefing' })
      persist()
    },
    setPhase: (phase) => set({ phase }),
    answerDeduction: (questionId, index) => {
      set((s) => ({ deductionAnswers: { ...s.deductionAnswers, [questionId]: index } }))
      persist()
    },
    unlockTerms: (keys) => {
      set((s) => ({ unlockedTerms: [...new Set([...s.unlockedTerms, ...keys])] }))
      persist()
    },
    completeMission: (id) => {
      set((s) => ({ completedMissions: [...new Set([...s.completedMissions, id])] }))
      persist()
    },
  }
})
