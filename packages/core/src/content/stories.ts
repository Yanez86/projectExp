import type { BiomeId } from "./biomes";
import type { EthnicityId, StatId } from "./ethnicities";

/**
 * La storia di un personaggio, il suo "DNA": quattro capitoli estratti da tabelle, ognuno con un
 * effetto. I testi stanno nei file di lingua (`story.<capitolo>.<id>`, accordati al genere).
 */
export type StatEffects = Partial<Record<StatId, number>>;

/** Origine: dove è nato. Dà un bioma congeniale in più. */
export const ORIGIN_BIOMES = ["plains", "forest", "hills", "mountains", "swamp", "desert", "tundra"] as const satisfies readonly BiomeId[];
export type OriginId = (typeof ORIGIN_BIOMES)[number];

/** Mestiere precedente: cosa faceva prima. Un punto in più a una statistica. */
export const PAST_JOBS: Record<string, StatEffects> = {
  bouncer: { vigor: 1 },
  lumberjack: { vigor: 1 },
  bookmark: { eye: 1 },
  cartographer: { eye: 1 },
  courier: { pace: 1 },
  lamplighter: { pace: 1 },
  peddler: { gab: 1 },
  auctioneer: { gab: 1 },
  beekeeper: { guts: 1 },
  goatherd: { guts: 1 },
};
export type PastJobId = keyof typeof PAST_JOBS;
export const PAST_JOB_IDS = Object.keys(PAST_JOBS) as PastJobId[];

/** Evento segnante: cosa gli è successo. Gli lascia un tratto (`story.trait.<id>`). */
export const EVENTS: Record<string, StatEffects> = {
  well: { guts: 1 },
  fire: { guts: -1, eye: 1 },
  shipwreck: { vigor: 1 },
  lost: { eye: 1 },
  duel: { gab: 1 },
  race: { pace: 1 },
  curse: { pace: 1, vigor: -1 },
  treasure: {},
};
export type EventId = keyof typeof EVENTS;
export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** Mania: un vizio o una fissazione. Un piccolo difetto, o solo una stranezza. */
export const MANIAS: Record<string, StatEffects> = {
  counts_coins: { gab: -1 },
  fixes_maps: {},
  collects_stones: { pace: -1 },
  sings: {},
  naps: { eye: -1 },
  afraid_dark: { guts: -1 },
  tuesdays: {},
  talks_to_hat: {},
};
export type ManiaId = keyof typeof MANIAS;
export const MANIA_IDS = Object.keys(MANIAS) as ManiaId[];

/** Un capitolo aggiunto dopo: per ora le cicatrici d'oro dei Cocciai, prese in un dungeon. */
export interface ScarChapter {
  readonly kind: "scar";
  readonly stat: StatId;
  readonly placeId: number;
}

export interface Story {
  readonly origin: OriginId;
  readonly pastJob: PastJobId;
  readonly event: EventId;
  readonly mania: ManiaId;
  readonly more: readonly ScarChapter[];
}

/** Gli effetti di tutta la storia sulle statistiche. */
export function storyEffects(story: Story): StatEffects {
  const total: StatEffects = {};
  const add = (effects: StatEffects) => {
    for (const [stat, n] of Object.entries(effects) as [StatId, number][]) total[stat] = (total[stat] ?? 0) + n;
  };
  add(PAST_JOBS[story.pastJob] ?? {});
  add(EVENTS[story.event] ?? {});
  add(MANIAS[story.mania] ?? {});
  for (const chapter of story.more) add({ [chapter.stat]: 1 });
  return total;
}

/** Quanti soprannomi ha ogni etnia (`epithet.<etnia>.<n>`, accordati al genere). */
export const EPITHETS: Record<EthnicityId, number> = { paperfolk: 6, shellfolk: 6, sherdkin: 6, mycelings: 6 };
