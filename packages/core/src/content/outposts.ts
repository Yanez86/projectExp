import type { BiomeId } from "./biomes";
import type { RawMaterialId } from "./materials";

/**
 * Gli avamposti: ognuno raccoglie la materia prima del bioma su cui sorge e la manda alla gilda.
 * Il nome visibile sta nei file di lingua, alla chiave `outpost.<id>`.
 */
export const OUTPOST_KINDS = ["farm", "lumber_camp", "clay_pit", "mine", "herb_hut", "sand_pit", "trapper_lodge"] as const;
export type OutpostKind = (typeof OUTPOST_KINDS)[number];

export const OUTPOSTS: Record<OutpostKind, { readonly biome: BiomeId; readonly material: RawMaterialId }> = {
  farm: { biome: "plains", material: "grain" },
  lumber_camp: { biome: "forest", material: "timber" },
  clay_pit: { biome: "hills", material: "clay" },
  mine: { biome: "mountains", material: "iron_ore" },
  herb_hut: { biome: "swamp", material: "herbs" },
  sand_pit: { biome: "desert", material: "sand" },
  trapper_lodge: { biome: "tundra", material: "hides" },
};

export function outpostKindFor(biome: BiomeId | undefined): OutpostKind | undefined {
  return OUTPOST_KINDS.find((kind) => OUTPOSTS[kind].biome === biome);
}

/** Quanto costa fondare un avamposto, in monete. */
export const OUTPOST_COST = 60;
/** Tempo di gioco per costruirlo; un costruttore con il talento ci mette i tre quarti. */
export const OUTPOST_BUILD_MS = 4 * 3_600_000;
export const TALENT_FACTOR = 75;
/** Ogni quanto un avamposto manda il raccolto alla gilda. */
export const HARVEST_MS = 3_600_000;
/** Raccolto di base, più uno ogni due caselle vicine dello stesso bioma. */
export const BASE_YIELD = 2;
/** Fin dove vede un avamposto. */
export const OUTPOST_VISION = 2;
