/**
 * Le regole dei dungeon e delle spedizioni. I numeri sono un punto di partenza da bilanciare.
 */

/** Quanti mercenari al massimo in una squadra. */
export const MAX_SQUAD = 3;

/** Quanto dura l'esplorazione di un livello, in tempo di gioco. */
export const LEVEL_MS = 2 * 3_600_000;

/** Dopo quanto un livello ripulito si ripopola. */
export const REPOPULATE_MS = 7 * 24 * 3_600_000;

/** Più lontano dalla sede, più profondo: 2 livelli vicino, 3 a media distanza, 4 lontano. */
export function dungeonDepth(distanceFromGuild: number): number {
  return distanceFromGuild < 10 ? 2 : distanceFromGuild < 16 ? 3 : 4;
}

/** La difficoltà di un livello (da 1), da confrontare con la forza della squadra. */
export function levelDifficulty(level: number): number {
  return 4 + 6 * level;
}

/** Ogni punto d'arma vale due punti di forza; ogni punto d'armatura toglie rischio. */
export const WEAPON_STRENGTH = 2;

/** Rischi, in percentuale, quando un livello va male. */
export const WOUND_CHANCE = 50;
export const WOUND_ARMOR = 10;
export const LOSS_CHANCE = 12;
export const LOSS_ARMOR = 3;
/** Per i Cocciai, la probabilità che una ferita diventi una cicatrice d'oro. */
export const SCAR_CHANCE = 50;
/** Quanto resta fermo un ferito. */
export const WOUND_MS = 24 * 3_600_000;

/** Il bottino di un livello: monete, materie rare, e con un po' di fortuna un oggetto o un reperto. */
export const LOOT_GOLD_MIN = 10;
export const LOOT_GOLD_MAX = 25;
export const LOOT_MATERIAL_MAX = 2;
export const ITEM_CHANCE = 25;
export const ITEM_CHANCE_PER_LEVEL = 10;
export const RELIC_CHANCE = 10;
export const RELIC_CHANCE_PER_LEVEL = 10;
