/** I biomi della mappa. Il nome visibile sta nei file di lingua, alla chiave `biome.<id>`. */
export const BIOME_IDS = [
  "deep_water",
  "shallow_water",
  "plains",
  "forest",
  "hills",
  "mountains",
  "swamp",
  "desert",
  "tundra",
] as const;

export type BiomeId = (typeof BIOME_IDS)[number];

export interface Biome {
  readonly id: BiomeId;
  readonly water: boolean;
}

export const BIOMES: readonly Biome[] = BIOME_IDS.map((id) => ({
  id,
  water: id === "deep_water" || id === "shallow_water",
}));

export function biomeIndex(id: BiomeId): number {
  return BIOME_IDS.indexOf(id);
}
