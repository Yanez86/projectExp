import {
  ITEM_CHANCE,
  ITEM_CHANCE_PER_LEVEL,
  LEVEL_MS,
  LOOT_GOLD_MAX,
  LOOT_GOLD_MIN,
  LOOT_MATERIAL_MAX,
  LOSS_ARMOR,
  LOSS_CHANCE,
  RELIC_CHANCE,
  RELIC_CHANCE_PER_LEVEL,
  REPOPULATE_MS,
  SCAR_CHANCE,
  WEAPON_STRENGTH,
  WOUND_ARMOR,
  WOUND_CHANCE,
  WOUND_MS,
  dungeonDepth,
  levelDifficulty,
} from "../content/dungeons";
import { STAT_MAX } from "../content/ethnicities";
import { STORAGE_CAPACITY } from "../content/guild";
import { ITEMS, ITEM_KINDS, type Item, type ItemKind, type Rarity } from "../content/items";
import { DUNGEON_MATERIAL_IDS } from "../content/materials";
import { distance, hexEquals } from "../hex";
import type { Place } from "../map/places";
import { createRng, hashSeed, pick, randInt, type Rng } from "../rng";
import { effectiveStats, removeCharacter } from "./characters";
import { schedule } from "./events";
import type { Character, Expedition, Loot, Notice, World } from "./state";

/** Quanti livelli ha un dungeon: più è lontano dalla sede, più è profondo. */
export function dungeonLevels(world: World, place: Place): number {
  return dungeonDepth(distance(place.hex, world.state.guild.hex));
}

/** Se un livello è stato ripulito di recente, fino a quando resta vuoto. */
export function levelEmptyUntil(world: World, placeId: number, level: number, at = world.state.time): number | undefined {
  const c = world.state.cleared.find((x) => x.placeId === placeId && x.level === level);
  return c && at < c.clearedAt + REPOPULATE_MS ? c.clearedAt + REPOPULATE_MS : undefined;
}

/** La forza di una squadra: Vigore e Fegato di tutti, più le armi. */
export function squadStrength(members: readonly Character[]): number {
  return members.reduce((sum, c) => {
    const s = effectiveStats(c);
    return sum + s.vigor + s.guts + WEAPON_STRENGTH * (c.equipment.weapon?.rarity ?? 0);
  }, 0);
}

/** La probabilità (in percentuale) di ripulire un livello con questa forza. */
export function successChance(strength: number, level: number): number {
  const difficulty = levelDifficulty(level);
  return Math.round((100 * strength) / (strength + difficulty));
}

export function expeditionMembers(world: World, e: Expedition): Character[] {
  return e.members.map((id) => world.state.characters.find((c) => c.id === id)).filter((c): c is Character => c !== undefined);
}

/** La squadra è tutta all'ingresso? Allora entra, e il primo livello finisce tra `LEVEL_MS`. */
export function tryEnter(world: World, e: Expedition, entrance: Place, at: number, notices: Notice[]): void {
  if (e.level > 0) return;
  const members = expeditionMembers(world, e);
  if (members.length === 0 || members.some((c) => c.step || !hexEquals(c.hex, entrance.hex))) return;
  e.level = 1;
  schedule(world, at + LEVEL_MS, { kind: "delve", expeditionId: e.id });
  notices.push({ kind: "expedition_started", at, expeditionId: e.id, placeId: e.placeId });
}

/**
 * Un livello è finito. Se era ancora vuoto (ripulito da poco) la squadra passa oltre senza
 * trovare niente; altrimenti si tira la riuscita: se va bene, il bottino è della squadra e si
 * scende; se va male, si risale e ognuno rischia una ferita. Alla fine il bottino va alla gilda
 * e la squadra torna alla sede (`sendHome`).
 */
export function delve(world: World, expeditionId: number, at: number, notices: Notice[], sendHome: (c: Character) => void): void {
  const { state, map } = world;
  const e = state.expeditions.find((x) => x.id === expeditionId);
  if (!e) return;
  const place = map.places.find((p) => p.id === e.placeId);
  const members = expeditionMembers(world, e);
  if (!place || members.length === 0) {
    state.expeditions.splice(state.expeditions.indexOf(e), 1);
    return;
  }
  const rng = createRng(hashSeed(`${map.seed}/delve/${e.id}/${e.level}`));
  let ok = true;
  if (levelEmptyUntil(world, place.id, e.level, at) === undefined) {
    ok = rng() * 100 < successChance(squadStrength(members), e.level);
    if (ok) {
      addLoot(world, e.loot, e.level, members, rng);
      markCleared(world, place.id, e.level, at);
    } else {
      for (const c of members) risk(world, c, place, at, rng, notices);
    }
  }
  if (ok && e.level < e.depth) {
    e.level++;
    schedule(world, at + LEVEL_MS, { kind: "delve", expeditionId: e.id });
    return;
  }
  finish(world, e, place, ok ? e.level : e.level - 1, ok, at, notices, sendHome);
}

function markCleared(world: World, placeId: number, level: number, at: number): void {
  const c = world.state.cleared.find((x) => x.placeId === placeId && x.level === level);
  if (c) c.clearedAt = at;
  else world.state.cleared.push({ placeId, level, clearedAt: at });
}

/** Il bottino di un livello: monete, una materia rara e forse un oggetto o un reperto. */
function addLoot(world: World, loot: Loot, level: number, members: readonly Character[], rng: Rng): void {
  loot.gold += randInt(rng, LOOT_GOLD_MIN, LOOT_GOLD_MAX) * level;
  const material = pick(rng, DUNGEON_MATERIAL_IDS);
  const amount = randInt(rng, 1, LOOT_MATERIAL_MAX) * level;
  const found = loot.materials.find(([m]) => m === material);
  if (found) found[1] += amount;
  else loot.materials.push([material, amount]);
  // Chi ha l'occhio buono trova di più.
  const eye = members.reduce((sum, c) => sum + Math.max(0, effectiveStats(c).eye - 5), 0);
  if (rng() * 100 < ITEM_CHANCE + ITEM_CHANCE_PER_LEVEL * level + eye) loot.items.push(rollItem(world, level, rng));
  if (rng() * 100 < RELIC_CHANCE + RELIC_CHANCE_PER_LEVEL * level) loot.relics++;
}

/** Un oggetto: più si scende, più è raro. Armi e armature hanno la rarità del loro tipo. */
function rollItem(world: World, level: number, rng: Rng): Item {
  const roll = randInt(rng, 1, level);
  const rarity: Rarity = roll <= 2 ? 1 : roll === 3 ? 2 : 3;
  const r = rng();
  const slot = r < 0.5 ? "trinket" : r < 0.75 ? "weapon" : "armor";
  const kinds = ITEM_KINDS.filter((k) => ITEMS[k].slot === slot && (slot === "trinket" || ITEMS[k].rarity === rarity));
  const kind: ItemKind = pick(rng, kinds);
  return { id: world.state.nextItemId++, kind, rarity };
}

/** Un livello andato male: ferite, cicatrici d'oro per i Cocciai e, raramente, chi non torna. */
function risk(world: World, c: Character, place: Place, at: number, rng: Rng, notices: Notice[]): void {
  const armor = c.equipment.armor?.rarity ?? 0;
  if (rng() * 100 >= WOUND_CHANCE - WOUND_ARMOR * armor) return;
  if (rng() * 100 < LOSS_CHANCE - LOSS_ARMOR * armor) {
    removeCharacter(world, c.id, false);
    notices.push({ kind: "lost", at, name: c.name, gender: c.gender, placeId: place.id });
    return;
  }
  c.woundedUntil = at + WOUND_MS;
  schedule(world, c.woundedUntil, { kind: "healed", characterId: c.id });
  notices.push({ kind: "wounded", at, characterId: c.id });
  if (c.ethnicity === "sherdkin" && rng() * 100 < SCAR_CHANCE) {
    const stat = rng() < 0.5 ? "vigor" : "guts";
    c.stats[stat] = Math.min(STAT_MAX, c.stats[stat] + 1);
    c.story = { ...c.story, more: [...c.story.more, { kind: "scar", stat, placeId: place.id }] };
    notices.push({ kind: "scar", at, characterId: c.id, stat });
  }
}

/** La spedizione è finita: il bottino va alla gilda, la squadra torna a casa. */
function finish(
  world: World,
  e: Expedition,
  place: Place,
  cleared: number,
  complete: boolean,
  at: number,
  notices: Notice[],
  sendHome: (c: Character) => void,
): void {
  const { state } = world;
  const { guild } = state;
  const { loot } = e;
  guild.gold += loot.gold;
  for (const [m, n] of loot.materials) guild.stock[m] = Math.min(STORAGE_CAPACITY, guild.stock[m] + n);
  guild.items.push(...loot.items);
  guild.relics += loot.relics;
  notices.push({
    kind: "expedition_done",
    at,
    placeId: place.id,
    cleared,
    complete,
    gold: loot.gold,
    units: loot.materials.reduce((sum, [, n]) => sum + n, 0),
    items: loot.items.length,
    relics: loot.relics,
  });
  state.expeditions.splice(state.expeditions.indexOf(e), 1);
  for (const c of expeditionMembers(world, e)) {
    c.task = null;
    sendHome(c);
  }
}

/** Guarisce, se è il momento. */
export function heal(world: World, characterId: number, at: number, notices: Notice[]): void {
  const c = world.state.characters.find((x) => x.id === characterId);
  if (!c || c.woundedUntil === null || c.woundedUntil > at) return;
  c.woundedUntil = null;
  notices.push({ kind: "healed", at, characterId });
}
