import { BIOMES, BIOME_IDS, type Biome, type BiomeId } from "../content/biomes";
import { hexEquals, hexToOffset, offsetToHex, type Hex } from "../hex";
import type { Place } from "./places";

/** La mappa di un round: un rettangolo di esagoni a righe sfalsate (vedi `offsetToHex`). */
export interface WorldMap {
  readonly seed: string;
  readonly width: number;
  readonly height: number;
  /** Indice in `BIOME_IDS` per ogni casella, riga per riga. */
  readonly biomes: Uint8Array;
  /** Variante grafica di ogni casella (0–255): la grafica sceglie tra le varianti che ha. */
  readonly variants: Uint8Array;
  /** Dove parte la gilda del giocatore. */
  readonly start: Hex;
  /** I luoghi di interesse: cittadine, mercati, torri, dungeon, castelli. */
  readonly places: readonly Place[];
}

export function placeAt(map: WorldMap, h: Hex): Place | undefined {
  return map.places.find((p) => hexEquals(p.hex, h));
}

export function inBounds(map: WorldMap, h: Hex): boolean {
  const { col, row } = hexToOffset(h);
  return col >= 0 && row >= 0 && col < map.width && row < map.height;
}

/** Indice della casella nell'array della mappa, o -1 se fuori mappa. */
export function tileIndex(map: WorldMap, h: Hex): number {
  const { col, row } = hexToOffset(h);
  if (col < 0 || row < 0 || col >= map.width || row >= map.height) return -1;
  return row * map.width + col;
}

export function hexAt(map: WorldMap, index: number): Hex {
  return offsetToHex(index % map.width, Math.floor(index / map.width));
}

export function biomeIdAt(map: WorldMap, h: Hex): BiomeId | undefined {
  const i = tileIndex(map, h);
  return i < 0 ? undefined : BIOME_IDS[map.biomes[i] as number];
}

export function biomeAt(map: WorldMap, h: Hex): Biome | undefined {
  const i = tileIndex(map, h);
  return i < 0 ? undefined : BIOMES[map.biomes[i] as number];
}
