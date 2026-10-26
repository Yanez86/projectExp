import type { BiomeId } from "./biomes";
import { ETHNICITIES, type EthnicityId } from "./ethnicities";

/** Tempo di gioco per attraversare una pianura con Passo 5, senza affinità: 10 minuti. */
export const BASE_STEP_MS = 10 * 60 * 1000;

/** Fatica di ogni bioma in percentuale della pianura; l'acqua non si attraversa a piedi. */
export const TERRAIN_COST: Record<BiomeId, number | null> = {
  deep_water: null,
  shallow_water: null,
  plains: 100,
  desert: 130,
  forest: 150,
  tundra: 160,
  hills: 170,
  swamp: 200,
  mountains: 260,
};

/** Fatica presunta di una casella ancora sotto le nuvole: chi parte non sa cosa troverà. */
export const UNKNOWN_COST = 150;

/** Effetto dell'etnia sul terreno, in percentuale. */
export const COMFORTABLE_FACTOR = 75;
export const HARD_FACTOR = 140;

/** Raggio di vista: la sede, un personaggio, e il bonus delle alture. */
export const GUILD_VISION = 3;
export const CHARACTER_VISION = 2;
export const HIGH_GROUND: readonly BiomeId[] = ["hills", "mountains"];
/** Occhio da cui un personaggio vede una casella più lontano. */
export const KEEN_EYE = 7;

export function affinityFactor(ethnicity: EthnicityId, biome: BiomeId): number {
  const e = ETHNICITIES[ethnicity];
  if (e.comfortable.includes(biome)) return COMFORTABLE_FACTOR;
  if (e.hard.includes(biome)) return HARD_FACTOR;
  return 100;
}

/**
 * Tempo di gioco (ms interi) per entrare in una casella. `biome` undefined: casella ancora
 * sconosciuta. Restituisce null se la casella non si attraversa.
 */
export function stepDuration(ethnicity: EthnicityId, pace: number, biome: BiomeId | undefined): number | null {
  const cost = biome === undefined ? UNKNOWN_COST : TERRAIN_COST[biome];
  if (cost === null) return null;
  const affinity = biome === undefined ? 100 : affinityFactor(ethnicity, biome);
  return Math.round((BASE_STEP_MS * cost * affinity * 5) / (100 * 100 * Math.max(1, pace)));
}

/** Il passo più breve possibile per questo personaggio: serve a stimare le distanze. */
export function fastestStep(pace: number): number {
  const cheapest = Math.min(...Object.values(TERRAIN_COST).filter((c): c is number => c !== null));
  return Math.round((BASE_STEP_MS * cheapest * COMFORTABLE_FACTOR * 5) / (100 * 100 * Math.max(1, pace)));
}
