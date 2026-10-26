import type { MaterialId } from "./materials";

/**
 * Le ricette dei laboratori della gilda: a ogni ciclo consumano le materie in ingresso e, alla
 * fine, mettono in magazzino quelle in uscita. Il nome visibile del laboratorio sta nei file di
 * lingua, alla chiave `workshop.<id>`.
 */
export const RECIPE_IDS = [
  "mill",
  "bakery",
  "sawmill",
  "charcoal_kiln",
  "brickworks",
  "smelter",
  "forge",
  "glassworks",
  "tannery",
  "herbalist",
] as const;
export type RecipeId = (typeof RECIPE_IDS)[number];

export type Amounts = readonly (readonly [MaterialId, number])[];

export interface Recipe {
  readonly inputs: Amounts;
  readonly outputs: Amounts;
  /** Durata di un ciclo, in tempo di gioco. */
  readonly duration: number;
}

const HOUR = 3_600_000;

export const RECIPES: Record<RecipeId, Recipe> = {
  mill: { inputs: [["grain", 2]], outputs: [["flour", 1]], duration: HOUR },
  bakery: { inputs: [["flour", 2], ["timber", 1]], outputs: [["bread", 3]], duration: 2 * HOUR },
  sawmill: { inputs: [["timber", 2]], outputs: [["planks", 1]], duration: HOUR },
  charcoal_kiln: { inputs: [["timber", 3]], outputs: [["charcoal", 2]], duration: 2 * HOUR },
  brickworks: { inputs: [["clay", 2], ["charcoal", 1]], outputs: [["bricks", 2]], duration: 2 * HOUR },
  smelter: { inputs: [["iron_ore", 2], ["charcoal", 1]], outputs: [["iron", 1]], duration: 2 * HOUR },
  forge: { inputs: [["iron", 1], ["planks", 1]], outputs: [["tools", 1]], duration: 2 * HOUR },
  glassworks: { inputs: [["sand", 2], ["charcoal", 1]], outputs: [["glass", 1]], duration: 2 * HOUR },
  tannery: { inputs: [["hides", 2], ["herbs", 1]], outputs: [["leather", 2]], duration: 2 * HOUR },
  herbalist: { inputs: [["herbs", 3]], outputs: [["salve", 1]], duration: 2 * HOUR },
};
