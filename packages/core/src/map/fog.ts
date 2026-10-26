import { hexesInRange, type Hex } from "../hex";
import { tileIndex, type WorldMap } from "./world";

/** Stato della nebbia di ogni casella. */
export const FOG_UNEXPLORED = 0;
export const FOG_EXPLORED = 1;
export const FOG_VISIBLE = 2;

export type FogLevel = typeof FOG_UNEXPLORED | typeof FOG_EXPLORED | typeof FOG_VISIBLE;

export interface Fog {
  readonly state: Uint8Array;
}

export interface VisionSource {
  readonly hex: Hex;
  readonly radius: number;
}

export function createFog(map: WorldMap): Fog {
  return { state: new Uint8Array(map.width * map.height) };
}

export function fogAt(fog: Fog, map: WorldMap, h: Hex): FogLevel {
  const i = tileIndex(map, h);
  return i < 0 ? FOG_UNEXPLORED : (fog.state[i] as FogLevel);
}

/**
 * Ricalcola cosa è in vista: ciò che era in vista e non lo è più resta esplorato,
 * ciò che è vicino a una fonte di visione diventa in vista (e quindi esplorato per sempre).
 */
export function updateVisibility(fog: Fog, map: WorldMap, sources: readonly VisionSource[]): void {
  const { state } = fog;
  for (let i = 0; i < state.length; i++) {
    if (state[i] === FOG_VISIBLE) state[i] = FOG_EXPLORED;
  }
  for (const source of sources) {
    for (const h of hexesInRange(source.hex, source.radius)) {
      const i = tileIndex(map, h);
      if (i >= 0) state[i] = FOG_VISIBLE;
    }
  }
}
