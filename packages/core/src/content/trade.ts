import type { MaterialId } from "./materials";

/**
 * Il valore di base di ogni materia, in monete: cresce lungo le catene di produzione, così
 * trasformare conviene più che vendere le materie prime.
 */
export const MATERIAL_VALUE: Record<MaterialId, number> = {
  grain: 2,
  timber: 2,
  clay: 2,
  iron_ore: 3,
  herbs: 3,
  sand: 1,
  hides: 3,
  moon_iron: 14,
  echo_crystal: 18,
  glowmoss: 12,
  shadow_silk: 20,
  flour: 5,
  bread: 6,
  planks: 5,
  charcoal: 3,
  bricks: 4,
  iron: 12,
  tools: 26,
  glass: 8,
  leather: 7,
  salve: 13,
  moon_steel: 30,
  music_box: 45,
  everlamp: 40,
  shadow_cloak: 55,
};

/** Quanto porta un carovaniere: una base più due unità per punto di Vigore; con il talento, la metà in più. */
export const CARGO_BASE = 10;
export const CARGO_PER_VIGOR = 2;
export const CARGO_TALENT = 150;

/**
 * Ogni unità venduta in una cittadina abbassa il prezzo delle successive (e ogni unità comprata
 * a un mercato alza quello delle successive) di questa percentuale; il mercato dimentica
 * un'unità ogni `RECOVERY_MS` di tempo di gioco.
 */
export const SATURATION_STEP = 4;
export const RECOVERY_MS = 20 * 60_000;

/** Le merci che ogni cittadina cerca, e le materie prime che ogni mercato vende. */
export const WANTED_PER_TOWN = 2;
export const OFFERS_PER_MARKET = 3;
