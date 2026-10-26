import type { BiomeId } from "./biomes";

/**
 * Fin dove si vede, secondo il terreno su cui si sta: in pianura e sui terreni aperti 4 caselle,
 * dalle alture di più. La vista poi si ferma contro gli ostacoli (vedi sotto).
 */
export const VISION_RANGE: Record<BiomeId, number> = {
  deep_water: 4,
  shallow_water: 4,
  plains: 4,
  desert: 4,
  tundra: 4,
  swamp: 4,
  forest: 4,
  hills: 5,
  mountains: 6,
};

/** Chi ha almeno questo Occhio vede una casella più lontano. */
export const KEEN_EYE = 7;

/** Le montagne nascondono tutto ciò che sta dietro (la montagna stessa si vede). */
export const BLOCKS_SIGHT: readonly BiomeId[] = ["mountains"];

/** Attraverso una foresta si vede la foresta e solo `SCREEN_DEPTH` caselle dietro. */
export const SCREENS_SIGHT: readonly BiomeId[] = ["forest"];
export const SCREEN_DEPTH = 1;

/** Dalle alture si vede sopra le foreste. */
export const HIGH_GROUND: readonly BiomeId[] = ["hills", "mountains"];

export function visionRange(biome: BiomeId | undefined, eye = 0): number {
  return (biome ? VISION_RANGE[biome] : 4) + (eye >= KEEN_EYE ? 1 : 0);
}
