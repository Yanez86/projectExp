import { hexRound, type Hex } from "@exp/core";

/**
 * Misure dei tile in pixel dell'arte (vedi art/tiles.px.js): esagoni con la punta in alto,
 * 32 px di larghezza, 32 di altezza, sopra 16 px di spazio per il rilievo.
 */
export const TILE_W = 32;
export const TILE_H = 48;
export const HEX_TOP = 16;
export const COL_STEP = 32;
export const ROW_STEP = 24;

/** Angolo in alto a sinistra del tile di un esagono, in pixel del mondo. */
export function tileOrigin(h: Hex): { x: number; y: number } {
  return { x: COL_STEP * (h.q + h.r / 2), y: ROW_STEP * h.r };
}

/** Centro dell'esagono in pixel del mondo. */
export function hexCenter(h: Hex): { x: number; y: number } {
  const o = tileOrigin(h);
  return { x: o.x + TILE_W / 2, y: o.y + HEX_TOP + 16 };
}

/** L'esagono sotto un punto del mondo. */
export function hexAtPoint(x: number, y: number): Hex {
  const r = (y - HEX_TOP - 16) / ROW_STEP;
  const q = (x - TILE_W / 2) / COL_STEP - r / 2;
  return hexRound(q, r);
}
