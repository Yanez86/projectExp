import type { EthnicityId, JobId, Stats } from "../content/ethnicities";
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
}

/** Un evento in coda, eseguito quando il tempo di gioco arriva a `at`. */
export interface GameEvent {
  readonly at: number;
  /** A parità di orario, l'ordine di inserimento: rende l'esecuzione deterministica. */
  readonly seq: number;
  readonly kind: "arrive";
  readonly characterId: number;
}

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
  readonly guild: { readonly hex: Hex };
  readonly characters: Character[];
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
