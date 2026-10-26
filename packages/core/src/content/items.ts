import type { StatId } from "./ethnicities";

/**
 * Gli oggetti da equipaggiare. Ogni personaggio ha uno slot per un ninnolo; i mercenari anche
 * arma e armatura. Il nome visibile sta nei file di lingua, alla chiave `item.<id>`.
 */
export const SLOTS = ["trinket", "weapon", "armor"] as const;
export type Slot = (typeof SLOTS)[number];

/** Comune, raro, leggendario: è anche il bonus dell'oggetto. */
export type Rarity = 1 | 2 | 3;

export const ITEM_KINDS = [
  "crooked_compass",
  "snail_bell",
  "holed_coin",
  "troll_tooth",
  "iron_thimble",
  "cleaver",
  "ash_spear",
  "moon_hammer",
  "padded_jacket",
  "sherd_armor",
  "reinforced_shell",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export interface ItemKindInfo {
  readonly slot: Slot;
  /** La statistica che un ninnolo alza. */
  readonly stat?: StatId;
  /** Armi e armature hanno una rarità fissa; i ninnoli la prendono da dove si trovano. */
  readonly rarity?: Rarity;
}

export const ITEMS: Record<ItemKind, ItemKindInfo> = {
  crooked_compass: { slot: "trinket", stat: "eye" },
  snail_bell: { slot: "trinket", stat: "pace" },
  holed_coin: { slot: "trinket", stat: "gab" },
  troll_tooth: { slot: "trinket", stat: "guts" },
  iron_thimble: { slot: "trinket", stat: "vigor" },
  cleaver: { slot: "weapon", rarity: 1 },
  ash_spear: { slot: "weapon", rarity: 2 },
  moon_hammer: { slot: "weapon", rarity: 3 },
  padded_jacket: { slot: "armor", rarity: 1 },
  sherd_armor: { slot: "armor", rarity: 2 },
  reinforced_shell: { slot: "armor", rarity: 3 },
};

/** Un oggetto vero, trovato in un dungeon. */
export interface Item {
  readonly id: number;
  readonly kind: ItemKind;
  readonly rarity: Rarity;
}

/** Gli slot di un mestiere: tutti il ninnolo, i mercenari anche arma e armatura. */
export function slotsFor(job: string): readonly Slot[] {
  return job === "mercenary" ? SLOTS : ["trinket"];
}
