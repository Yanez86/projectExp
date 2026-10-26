import type { EthnicityId, JobId, Stats } from "../content/ethnicities";
import type { MaterialId, Stock } from "../content/materials";
import type { OutpostKind } from "../content/outposts";
import type { RecipeId } from "../content/recipes";
import type { Hex } from "../hex";
import type { Fog } from "../map/fog";
import type { WorldMap } from "../map/world";

/** Un passo da una casella alla vicina, con orari di partenza e arrivo in tempo di gioco. */
export interface Step {
  readonly from: Hex;
  readonly to: Hex;
  readonly departAt: number;
  readonly arriveAt: number;
}

/** Un lavoro affidato a un personaggio, oltre al viaggio. */
export type Task =
  /** In viaggio per fondare un avamposto in `hex`. */
  | { readonly kind: "build"; readonly hex: Hex }
  /** Fermo sul cantiere finché l'avamposto non è pronto. */
  | { readonly kind: "building"; readonly outpostId: number }
  /**
   * Un viaggio di commercio: va al luogo, vende il carico (a una cittadina) o compra `order` (a
   * un mercato), poi torna alla sede e scarica. `returning` dice in quale metà del viaggio è.
   */
  | {
      readonly kind: "trade";
      readonly placeId: number;
      readonly mode: "sell" | "buy";
      readonly order: readonly (readonly [MaterialId, number])[];
      readonly returning: boolean;
    };

export interface Character {
  readonly id: number;
  readonly name: string;
  readonly gender: "f" | "m";
  readonly ethnicity: EthnicityId;
  readonly job: JobId;
  readonly stats: Stats;
  /** Dove si trova; durante un passo, la casella da cui è partito. */
  hex: Hex;
  /** Dove sta andando, se sta andando da qualche parte. */
  destination: Hex | null;
  /** Il percorso previsto da `hex` (esclusa) a `destination` (inclusa). */
  route: Hex[];
  step: Step | null;
  task: Task | null;
  /** Le merci che porta con sé. */
  cargo: [MaterialId, number][];
}

/** Un avamposto: raccoglie la materia prima della sua casella e la manda alla gilda. */
export interface Outpost {
  readonly id: number;
  readonly kind: OutpostKind;
  readonly hex: Hex;
  /** Quante unità manda a ogni raccolto. */
  readonly yield: number;
  /** Quando finiscono i lavori; null se è pronto. */
  readyAt: number | null;
}

/** Un laboratorio della sede: trasforma le materie con la sua ricetta, un ciclo dopo l'altro. */
export interface Workshop {
  readonly id: number;
  readonly recipe: RecipeId;
  /** Quando finiscono i lavori; null se è pronto. */
  readyAt: number | null;
  /** Quando finisce il ciclo in corso; null se è fermo. */
  busyUntil: number | null;
  /** In pausa non comincia cicli nuovi. */
  paused: boolean;
}

/** Quante unità di una materia un luogo ha scambiato da poco (abbassa o alza i prezzi). */
export interface Saturation {
  readonly placeId: number;
  readonly material: MaterialId;
  amount: number;
  /** Da quando conta il recupero. */
  at: number;
}

export interface Guild {
  readonly hex: Hex;
  gold: number;
  /** Il magazzino della sede. */
  readonly stock: Stock;
}

/** Cosa fa un evento quando arriva il suo momento. */
export type EventBody =
  | { readonly kind: "arrive"; readonly characterId: number }
  | { readonly kind: "outpost_ready" | "harvest"; readonly outpostId: number }
  | { readonly kind: "workshop_ready" | "workshop_done"; readonly workshopId: number };

/** Un evento in coda, eseguito quando il tempo di gioco arriva a `at`. */
export type GameEvent = {
  readonly at: number;
  /** A parità di orario, l'ordine di inserimento: rende l'esecuzione deterministica. */
  readonly seq: number;
} & EventBody;

/** Quello che è successo durante un avanzamento, per avvisare il giocatore e animare la mappa. */
export type Notice =
  | { readonly kind: "arrived"; readonly at: number; readonly characterId: number; readonly hex: Hex }
  | { readonly kind: "blocked"; readonly at: number; readonly characterId: number; readonly hex: Hex }
  | { readonly kind: "revealed"; readonly at: number; readonly origin: Hex; readonly count: number }
  | { readonly kind: "discovered"; readonly at: number; readonly placeId: number }
  | { readonly kind: "build_started"; readonly at: number; readonly characterId: number; readonly outpostId: number }
  | { readonly kind: "build_failed"; readonly at: number; readonly characterId: number; readonly reason: BuildProblem }
  | { readonly kind: "outpost_ready"; readonly at: number; readonly outpostId: number }
  | { readonly kind: "workshop_ready"; readonly at: number; readonly workshopId: number }
  | { readonly kind: "sold" | "bought"; readonly at: number; readonly characterId: number; readonly placeId: number; readonly units: number; readonly gold: number }
  | { readonly kind: "unloaded"; readonly at: number; readonly characterId: number; readonly units: number };

/** Perché un avamposto non si può fondare in una casella. */
export type SiteProblem = "unexplored" | "water" | "guild" | "place" | "outpost" | "near-outpost";
export type BuildProblem = SiteProblem | "gold";

/**
 * L'orologio del mondo: il tempo di gioco scorre come quello reale moltiplicato per la velocità.
 * `realAt` e `gameAt` sono un istante in cui i due tempi sono stati allineati.
 */
export interface Clock {
  readonly realAt: number;
  readonly gameAt: number;
  readonly speed: number;
}

export interface GameState {
  readonly seed: string;
  readonly width: number;
  readonly height: number;
  clock: Clock;
  /** Fin dove è arrivata la simulazione, in tempo di gioco (ms). */
  time: number;
  readonly fog: Fog;
  readonly guild: Guild;
  readonly characters: Character[];
  readonly outposts: Outpost[];
  readonly workshops: Workshop[];
  /** Il ricordo degli scambi recenti in cittadine e mercati. */
  readonly markets: Saturation[];
  /** Eventi in attesa, in ordine di orario e di inserimento. */
  events: GameEvent[];
  nextSeq: number;
}

/** Lo stato e la mappa, che si rigenera dal seed e quindi non si salva. */
export interface World {
  readonly state: GameState;
  readonly map: WorldMap;
}

/** Il primo giorno comincia alle 8 del mattino. */
export const START_TIME = 8 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Il tempo di gioco in un istante reale (ms da epoch, come Date.now()). */
export function gameTimeAt(clock: Clock, realNow: number): number {
  return clock.gameAt + Math.max(0, realNow - clock.realAt) * clock.speed;
}

/** Il tempo reale (ms) che manca perché il tempo di gioco arrivi a `gameTime`. */
export function realDelay(clock: Clock, gameTime: number, realNow: number): number {
  return Math.max(0, (gameTime - gameTimeAt(clock, realNow)) / clock.speed);
}

/** Giorno (da 1) e ora del giorno di un tempo di gioco. */
export function calendar(gameTime: number): { day: number; hours: number; minutes: number } {
  const day = Math.floor(gameTime / DAY_MS) + 1;
  const ms = gameTime % DAY_MS;
  return { day, hours: Math.floor(ms / 3_600_000), minutes: Math.floor((ms % 3_600_000) / 60_000) };
}
