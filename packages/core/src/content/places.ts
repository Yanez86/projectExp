import type { BiomeId } from "./biomes";

/** I luoghi di interesse. Nome e descrizione visibili: chiavi `place.<id>` e `place.<id>.about`. */
export const PLACE_KINDS = ["town", "castle", "market", "wizard_tower", "dungeon"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export interface PlaceRule {
  readonly kind: PlaceKind;
  /** Quanti ogni tante caselle di terra raggiungibile, e almeno quanti. */
  readonly landPerPlace: number;
  readonly min: number;
  /** Biomi in cui può sorgere. */
  readonly biomes: readonly BiomeId[];
  /** Distanza minima da un altro luogo dello stesso tipo. */
  readonly spacing: number;
}

/** In ordine di piazzamento: prima le cittadine, poi chi si orienta rispetto a loro. */
export const PLACE_RULES: readonly PlaceRule[] = [
  { kind: "town", landPerPlace: 240, min: 3, biomes: ["plains", "hills", "forest", "desert", "tundra"], spacing: 6 },
  { kind: "castle", landPerPlace: 700, min: 1, biomes: ["hills", "plains"], spacing: 10 },
  { kind: "market", landPerPlace: 500, min: 2, biomes: ["plains", "desert", "hills"], spacing: 6 },
  { kind: "wizard_tower", landPerPlace: 700, min: 1, biomes: ["hills", "mountains", "forest", "swamp", "tundra"], spacing: 10 },
  { kind: "dungeon", landPerPlace: 300, min: 2, biomes: ["hills", "mountains", "forest", "swamp", "desert"], spacing: 5 },
];

/** Distanza minima tra due luoghi qualsiasi, e dalla sede della gilda. */
export const PLACE_GAP = 3;
export const PLACE_GUILD_GAP = 4;
