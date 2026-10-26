import { DAY_MS } from "@exp/core";

/** Colori del cielo lungo la giornata (moltiplicano i colori della mappa). */
const NIGHT = 0x5c68a8;
const DAWN = 0xf2c0a8;
const DAY = 0xffffff;
const DUSK = 0xe8a8b0;

/** [ora, colore]: tra due chiavi il colore sfuma. */
const KEYS: readonly (readonly [number, number])[] = [
  [0, NIGHT],
  [5, NIGHT],
  [6.5, DAWN],
  [8, DAY],
  [17.5, DAY],
  [19, DUSK],
  [20.5, NIGHT],
  [24, NIGHT],
];

function mix(a: number, b: number, t: number): number {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    out |= Math.round(ca + (cb - ca) * t) << shift;
  }
  return out;
}

export interface Daylight {
  /** Il colore che moltiplica la mappa. */
  readonly tint: number;
  /** Quanto sono accese le luci (0 di giorno, 1 di notte). */
  readonly glow: number;
  readonly night: boolean;
}

/** La luce del mondo a un'ora di gioco. */
export function daylight(gameTime: number): Daylight {
  const hour = ((gameTime % DAY_MS) + DAY_MS) % DAY_MS / 3_600_000;
  let tint = NIGHT;
  for (let i = 1; i < KEYS.length; i++) {
    const [h0, c0] = KEYS[i - 1]!;
    const [h1, c1] = KEYS[i]!;
    if (hour <= h1) {
      tint = mix(c0, c1, (hour - h0) / (h1 - h0));
      break;
    }
  }
  // Le luci si accendono al tramonto e si spengono all'alba.
  const glow = hour >= 20.5 || hour < 5 ? 1 : hour >= 19 ? (hour - 19) / 1.5 : hour < 6.5 ? 1 - (hour - 5) / 1.5 : 0;
  return { tint, glow, night: hour >= 19.5 || hour < 6 };
}
