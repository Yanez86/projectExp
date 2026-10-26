/**
 * Esagoni in coordinate assiali (q, r), punta in alto.
 * Algoritmi da https://www.redblobgames.com/grids/hexagons/
 */
export interface Hex {
  readonly q: number;
  readonly r: number;
}

export function hex(q: number, r: number): Hex {
  return { q, r };
}

/** Le sei direzioni, in senso antiorario partendo da est. */
export const DIRECTIONS: readonly Hex[] = [
  hex(1, 0),
  hex(1, -1),
  hex(0, -1),
  hex(-1, 0),
  hex(-1, 1),
  hex(0, 1),
];

export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`;
}

export function hexEquals(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexAdd(a: Hex, b: Hex): Hex {
  return hex(a.q + b.q, a.r + b.r);
}

export function neighbors(h: Hex): Hex[] {
  return DIRECTIONS.map((d) => hexAdd(h, d));
}

export function distance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Tutti gli esagoni entro `radius` passi da `center`, centro compreso. */
export function hexesInRange(center: Hex, radius: number): Hex[] {
  const out: Hex[] = [];
  for (let dq = -radius; dq <= radius; dq++) {
    const lo = Math.max(-radius, -dq - radius);
    const hi = Math.min(radius, -dq + radius);
    for (let dr = lo; dr <= hi; dr++) out.push(hex(center.q + dq, center.r + dr));
  }
  return out;
}

/**
 * Gli esagoni attraversati dalla retta da `a` a `b`, estremi compresi. `nudge` sposta di poco la
 * retta: quando passa esattamente su un lato, decide da che parte cadere (+1 o -1).
 */
export function hexLine(a: Hex, b: Hex, nudge: 1 | -1 = 1): Hex[] {
  const n = distance(a, b);
  if (n === 0) return [a];
  const e = 1e-6 * nudge;
  const aq = a.q + e;
  const ar = a.r + 2 * e;
  const bq = b.q + e;
  const br = b.r + 2 * e;
  const out: Hex[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(hexRound(aq + (bq - aq) * t, ar + (br - ar) * t));
  }
  return out;
}

/** Arrotonda coordinate assiali frazionarie all'esagono più vicino. */
export function hexRound(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  // Evita -0, che renderebbe diverse due chiavi uguali.
  return hex(rq + 0, rr + 0);
}

/**
 * La mappa è un rettangolo di righe sfalsate: le righe dispari sono spostate di mezzo
 * esagono a destra ("odd-r"). Queste due funzioni passano da (colonna, riga) ad assiali.
 */
export function offsetToHex(col: number, row: number): Hex {
  return hex(col - (row - (row & 1)) / 2, row);
}

export function hexToOffset(h: Hex): { col: number; row: number } {
  return { col: h.q + (h.r - (h.r & 1)) / 2, row: h.r };
}
