import type { Mission } from '../../model/mission'
import { M1 } from './m1'
import { M2 } from './m2'
import { M3 } from './m3'
import { M4 } from './m4'
import { M5 } from './m5'
import { S1 } from './s1'
import { D1 } from './d1'
import { D2 } from './d2'
import { D3 } from './d3'
import { D4 } from './d4'
import { D5 } from './d5'

/** 登場順に並んだ全ミッション（M6〜 はここに追加するだけで増える） */
export const MISSIONS: Mission[] = [M1, M2, M3, M4, M5, S1, D1, D2, D3, D4, D5]

export function getMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}
