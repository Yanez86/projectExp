import type { BiomeId } from "./biomes";

/** I mestieri dei personaggi. Il nome visibile sta nei file di lingua, alla chiave `job.<id>`. */
export const JOB_IDS = ["explorer", "builder", "caravaneer", "mercenary"] as const;
export type JobId = (typeof JOB_IDS)[number];

/** Le statistiche: Vigore, Passo, Occhio, Parlantina, Fegato (chiavi `stat.<id>`). */
export const STAT_IDS = ["vigor", "pace", "eye", "gab", "guts"] as const;
export type StatId = (typeof STAT_IDS)[number];
export type Stats = Record<StatId, number>;

export const STAT_MIN = 1;
export const STAT_MAX = 10;

export const ETHNICITY_IDS = ["paperfolk", "shellfolk", "sherdkin", "mycelings"] as const;
export type EthnicityId = (typeof ETHNICITY_IDS)[number];

export interface Ethnicity {
  readonly id: EthnicityId;
  /** Il mestiere in cui l'etnia ha talento. */
  readonly talent: JobId;
  /** Biomi in cui si muove ed esplora meglio. */
  readonly comfortable: readonly BiomeId[];
  /** Biomi in cui fatica. */
  readonly hard: readonly BiomeId[];
  /** Statistiche di partenza; ogni personaggio ci aggiunge la sua storia. */
  readonly stats: Stats;
  /** Nomi propri, con il genere per accordare i testi in italiano. */
  readonly names: readonly (readonly [string, "f" | "m"])[];
}

export const ETHNICITIES: Record<EthnicityId, Ethnicity> = {
  paperfolk: {
    id: "paperfolk",
    talent: "explorer",
    comfortable: ["plains", "desert"],
    hard: ["swamp"],
    stats: { vigor: 3, pace: 7, eye: 7, gab: 5, guts: 4 },
    names: [
      ["Folio", "m"], ["Glossa", "f"], ["Margine", "m"], ["Postilla", "f"],
      ["Rotolo", "m"], ["Velina", "f"], ["Codice", "m"], ["Piega", "f"],
    ],
  },
  shellfolk: {
    id: "shellfolk",
    talent: "caravaneer",
    comfortable: ["forest", "swamp"],
    hard: ["desert"],
    stats: { vigor: 5, pace: 3, eye: 5, gab: 7, guts: 5 },
    names: [
      ["Spirella", "f"], ["Lumo", "m"], ["Mucilla", "f"], ["Elico", "m"],
      ["Chiocciola", "f"], ["Tardo", "m"], ["Perla", "f"], ["Guscione", "m"],
    ],
  },
  sherdkin: {
    id: "sherdkin",
    talent: "mercenary",
    comfortable: ["hills", "mountains"],
    hard: ["tundra"],
    stats: { vigor: 7, pace: 4, eye: 4, gab: 4, guts: 7 },
    names: [
      ["Brunilde", "f"], ["Orcio", "m"], ["Anfora", "f"], ["Coccio", "m"],
      ["Brocca", "f"], ["Mattone", "m"], ["Smalta", "f"], ["Fornace", "m"],
    ],
  },
  mycelings: {
    id: "mycelings",
    talent: "builder",
    comfortable: ["forest"],
    hard: ["desert", "tundra"],
    stats: { vigor: 5, pace: 5, eye: 6, gab: 4, guts: 5 },
    names: [
      ["Ifa", "f"], ["Porcino", "m"], ["Lamella", "f"], ["Muffo", "m"],
      ["Spora", "f"], ["Gambo", "m"], ["Volva", "f"], ["Cappello", "m"],
    ],
  },
};
