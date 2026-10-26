import { ETHNICITIES, STAT_IDS, STAT_MAX, STAT_MIN, type EthnicityId, type JobId, type Stats } from "../content/ethnicities";
import { HIRE_FREE_POINTS, HIRE_MAX, HIRE_MIN, HIRE_PER_POINT, HIRE_TALENT, WAGE_DIVISOR } from "../content/guild";
import { ITEMS } from "../content/items";
import { EPITHETS, EVENT_IDS, MANIA_IDS, ORIGIN_BIOMES, PAST_JOB_IDS, storyEffects, type Story } from "../content/stories";
import type { Hex } from "../hex";
import { pick, randInt, type Rng } from "../rng";
import type { Character, World } from "./state";

/**
 * Un personaggio nuovo, già fatto: nome e soprannome, una storia in quattro capitoli estratti
 * a caso, e le statistiche che ne vengono (base dell'etnia più gli effetti della storia).
 */
export function rollCharacter(
  rng: Rng,
  id: number,
  ethnicity: EthnicityId,
  job: JobId,
  hex: Hex,
  usedNames: ReadonlySet<string>,
): Character {
  const e = ETHNICITIES[ethnicity];
  const free = e.names.filter(([name]) => !usedNames.has(name));
  const [name, gender] = pick(rng, free.length > 0 ? free : e.names);
  const epithet = randInt(rng, 0, EPITHETS[ethnicity] - 1);
  const story: Story = {
    origin: pick(rng, ORIGIN_BIOMES),
    pastJob: pick(rng, PAST_JOB_IDS),
    event: pick(rng, EVENT_IDS),
    mania: pick(rng, MANIA_IDS),
    more: [],
  };
  return {
    id,
    name,
    epithet,
    gender,
    ethnicity,
    job,
    stats: storyStats(ethnicity, story),
    story,
    hex,
    destination: null,
    route: [],
    step: null,
    task: null,
    cargo: [],
    equipment: { trinket: null, weapon: null, armor: null },
    woundedUntil: null,
    unpaid: 0,
  };
}

const clampStat = (n: number) => Math.min(STAT_MAX, Math.max(STAT_MIN, n));

/** Le statistiche di base: quelle dell'etnia più gli effetti della storia. */
export function storyStats(ethnicity: EthnicityId, story: Story): Stats {
  const effects = storyEffects(story);
  const stats = {} as Stats;
  for (const stat of STAT_IDS) stats[stat] = clampStat(ETHNICITIES[ethnicity].stats[stat] + (effects[stat] ?? 0));
  return stats;
}

/** Le statistiche con il ninnolo addosso: sono quelle che contano sulla mappa. */
export function effectiveStats(character: Character): Stats {
  const stats = { ...character.stats };
  const trinket = character.equipment.trinket;
  const stat = trinket && ITEMS[trinket.kind].stat;
  if (trinket && stat) stats[stat] = clampStat(stats[stat] + trinket.rarity);
  return stats;
}

/** Ha il talento del suo mestiere (l'etnia giusta per quel lavoro)? */
export function hasTalent(character: Pick<Character, "ethnicity" | "job">): boolean {
  return ETHNICITIES[character.ethnicity].talent === character.job;
}

/** Quanto costa ingaggiarlo: più è dotato, più costa. */
export function hireCost(character: Character): number {
  const points = STAT_IDS.reduce((sum, stat) => sum + character.stats[stat], 0);
  const cost = HIRE_PER_POINT * (points - HIRE_FREE_POINTS) + (hasTalent(character) ? HIRE_TALENT : 0);
  return Math.min(HIRE_MAX, Math.max(HIRE_MIN, cost));
}

/** La paga di ogni giorno. */
export function wage(character: Character): number {
  return Math.ceil(hireCost(character) / WAGE_DIVISOR);
}

/**
 * Toglie un personaggio dalla gilda (se ne va, o non torna da un dungeon). Con `keepItems` il suo
 * equipaggiamento torna nel forziere; altrimenti è perso con lui.
 */
export function removeCharacter(world: World, id: number, keepItems: boolean): Character | undefined {
  const { state } = world;
  const index = state.characters.findIndex((c) => c.id === id);
  if (index < 0) return undefined;
  const [character] = state.characters.splice(index, 1);
  if (keepItems) {
    for (const item of Object.values(character!.equipment)) if (item) state.guild.items.push(item);
  }
  for (const e of state.expeditions) e.members = e.members.filter((m) => m !== id);
  return character;
}
