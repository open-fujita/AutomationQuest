import type { Mission } from '../../model/mission'
import { M1 } from './m1'
import { M2 } from './m2'
import { M3 } from './m3'
import { M4 } from './m4'
import { M5 } from './m5'

/** 登場順に並んだ全ミッション（M6〜 はここに追加するだけで増える） */
export const MISSIONS: Mission[] = [M1, M2, M3, M4, M5]

export function getMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}
