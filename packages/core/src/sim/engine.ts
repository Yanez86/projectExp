import {
  ETHNICITIES,
  ETHNICITY_IDS,
  STAT_IDS,
  STAT_MAX,
  STAT_MIN,
  type EthnicityId,
  type JobId,
  type Stats,
} from "../content/ethnicities";
import { visionRange } from "../content/vision";
import { hexEquals, type Hex } from "../hex";
import { FOG_UNEXPLORED, createFog, updateVisibility, type VisionSource } from "../map/fog";
import { generateMap } from "../map/generate";
import { biomeIdAt, inBounds, tileIndex } from "../map/world";
import { createRng, hashSeed, pick, randInt, type Rng } from "../rng";
import { findRoute, knownStepDuration, routeDuration } from "./route";
import { START_TIME, gameTimeAt, type Character, type GameEvent, type World } from "./state";

export interface NewWorldOptions {
  readonly seed: string;
  readonly width: number;
  readonly height: number;
  /** Velocità del mondo: quante volte il tempo di gioco scorre più veloce di quello reale. */
  readonly speed: number;
  /** L'istante reale (ms da epoch) in cui il mondo nasce. */
  readonly realNow: number;
}

/** Quello che è successo durante un avanzamento, per avvisare il giocatore e animare la mappa. */
export type Notice =
  | { readonly kind: "arrived"; readonly at: number; readonly characterId: number; readonly hex: Hex }
  | { readonly kind: "blocked"; readonly at: number; readonly characterId: number; readonly hex: Hex }
  | { readonly kind: "revealed"; readonly at: number; readonly origin: Hex; readonly count: number }
  | { readonly kind: "discovered"; readonly at: number; readonly placeId: number };

export type Command =
  | { readonly kind: "move"; readonly characterId: number; readonly target: Hex }
  | { readonly kind: "stop"; readonly characterId: number };

export type CommandResult = { readonly ok: true } | { readonly ok: false; readonly reason: "unknown-character" | "unreachable" };

/** Crea un mondo nuovo: la mappa, la sede della gilda e i primi due esploratori. */
export function createWorld(options: NewWorldOptions): World {
  const { seed, width, height, speed, realNow } = options;
  const map = generateMap({ seed, width, height });
  const rng = createRng(hashSeed(`${seed}/crew`));
  // Il primo esploratore è sempre un Cartiglio, che ha il talento; il secondo di un'altra etnia.
  const second = pick(rng, ETHNICITY_IDS.filter((id) => id !== "paperfolk"));
  const used = new Set<string>();
  const characters = [
    createCharacter(rng, 1, "paperfolk", "explorer", map.start, used),
    createCharacter(rng, 2, second, "explorer", map.start, used),
  ];
  const world: World = {
    map,
    state: {
      seed,
      width,
      height,
      clock: { realAt: realNow, gameAt: START_TIME, speed },
      time: START_TIME,
      fog: createFog(map),
      guild: { hex: map.start },
      characters,
      events: [],
      nextSeq: 0,
    },
  };
  refreshVisibility(world);
  return world;
}

function createCharacter(
  rng: Rng,
  id: number,
  ethnicity: EthnicityId,
  job: JobId,
  hex: Hex,
  usedNames: Set<string>,
): Character {
  const e = ETHNICITIES[ethnicity];
  const free = e.names.filter(([name]) => !usedNames.has(name));
  const [name, gender] = pick(rng, free.length > 0 ? free : e.names);
  usedNames.add(name);
  const stats = {} as Stats;
  for (const stat of STAT_IDS) {
    stats[stat] = Math.min(STAT_MAX, Math.max(STAT_MIN, e.stats[stat] + randInt(rng, -1, 1)));
  }
  return { id, name, gender, ethnicity, job, stats, hex, destination: null, route: [], step: null };
}

/** Fin dove vede un personaggio dove si trova: dipende dal terreno e dal suo Occhio. */
export function visionRadius(world: World, character: Character): number {
  return visionRange(biomeIdAt(world.map, character.hex), character.stats.eye);
}

/** Ricalcola cosa è in vista; restituisce quante caselle sono state scoperte ora. */
function refreshVisibility(world: World): number {
  const { state, map } = world;
  const before = countUnexplored(state.fog.state);
  // La sede vede come chi sta sulla sua casella.
  const sources: VisionSource[] = [{ hex: state.guild.hex, radius: visionRange(biomeIdAt(map, state.guild.hex)) }];
  for (const c of state.characters) sources.push({ hex: c.hex, radius: visionRadius(world, c) });
  updateVisibility(state.fog, map, sources);
  return before - countUnexplored(state.fog.state);
}

function countUnexplored(fog: Uint8Array): number {
  let n = 0;
  for (const v of fog) if (v === FOG_UNEXPLORED) n++;
  return n;
}

function findCharacter(world: World, id: number): Character | undefined {
  return world.state.characters.find((c) => c.id === id);
}

function schedule(world: World, event: Omit<GameEvent, "seq">): void {
  const { state } = world;
  const full: GameEvent = { ...event, seq: state.nextSeq++ };
  // Inserimento ordinato: la coda resta in ordine di orario e, a pari orario, di inserimento.
  let lo = 0;
  let hi = state.events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const e = state.events[mid]!;
    if (e.at < full.at || (e.at === full.at && e.seq < full.seq)) lo = mid + 1;
    else hi = mid;
  }
  state.events.splice(lo, 0, full);
}

/** Fa partire il prossimo passo del percorso, se c'è. */
function startStep(world: World, character: Character, at: number): void {
  const next = character.route[0];
  if (!next) return;
  const duration = knownStepDuration(world.map, world.state.fog, character, next);
  if (duration === null) return;
  character.route = character.route.slice(1);
  character.step = { from: character.hex, to: next, departAt: at, arriveAt: at + duration };
  schedule(world, { at: at + duration, kind: "arrive", characterId: character.id });
}

/** Esegue un comando del giocatore al tempo a cui è arrivata la simulazione. */
export function applyCommand(world: World, command: Command): CommandResult {
  const character = findCharacter(world, command.characterId);
  if (!character) return { ok: false, reason: "unknown-character" };
  if (command.kind === "stop") {
    // Un passo già iniziato si finisce: ci si ferma sulla casella successiva.
    character.destination = null;
    character.route = [];
    return { ok: true };
  }
  const { target } = command;
  if (!inBounds(world.map, target)) return { ok: false, reason: "unreachable" };
  const from = character.step ? character.step.to : character.hex;
  const route = findRoute(world.map, world.state.fog, character, from, target);
  if (route === null) return { ok: false, reason: "unreachable" };
  character.destination = hexEquals(from, target) && !character.step ? null : target;
  character.route = route;
  if (!character.step) startStep(world, character, world.state.time);
  return { ok: true };
}

/**
 * Porta la simulazione fino al tempo di gioco `until`, eseguendo in ordine gli eventi in
 * scadenza. Avanzare in un colpo solo o a piccoli passi dà lo stesso risultato.
 */
export function advance(world: World, until: number): Notice[] {
  const { state } = world;
  const notices: Notice[] = [];
  while (state.events.length > 0 && state.events[0]!.at <= until) {
    const event = state.events.shift()!;
    state.time = Math.max(state.time, event.at);
    if (event.kind === "arrive") arrive(world, event.characterId, event.at, notices);
  }
  state.time = Math.max(state.time, until);
  return notices;
}

function arrive(world: World, characterId: number, at: number, notices: Notice[]): void {
  const character = findCharacter(world, characterId);
  if (!character?.step) return;
  character.hex = character.step.to;
  character.step = null;
  const hidden = world.map.places.filter((p) => world.state.fog.state[tileIndex(world.map, p.hex)] === FOG_UNEXPLORED);
  const revealed = refreshVisibility(world);
  if (revealed > 0) notices.push({ kind: "revealed", at, origin: character.hex, count: revealed });
  for (const p of hidden) {
    if (world.state.fog.state[tileIndex(world.map, p.hex)] !== FOG_UNEXPLORED) {
      notices.push({ kind: "discovered", at, placeId: p.id });
    }
  }

  const destination = character.destination;
  if (!destination) return;
  if (hexEquals(character.hex, destination)) {
    character.destination = null;
    character.route = [];
    notices.push({ kind: "arrived", at, characterId, hex: character.hex });
    return;
  }
  // Ogni casella scoperta può cambiare la strada migliore: si ricalcola a ogni passo.
  const route = findRoute(world.map, world.state.fog, character, character.hex, destination);
  if (route === null || route.length === 0) {
    character.destination = null;
    character.route = [];
    notices.push({ kind: "blocked", at, characterId, hex: character.hex });
    return;
  }
  character.route = route;
  startStep(world, character, at);
}

/** Porta la simulazione all'istante reale `realNow`. */
export function syncTo(world: World, realNow: number): Notice[] {
  return advance(world, gameTimeAt(world.state.clock, realNow));
}

/** Cambia la velocità del mondo da questo istante in poi. */
export function setSpeed(world: World, speed: number, realNow: number): void {
  const { state } = world;
  state.clock = { realAt: realNow, gameAt: gameTimeAt(state.clock, realNow), speed };
}

/**
 * Strumento di prova: manda avanti il mondo di `ms` di tempo di gioco, eseguendo tutto quello che
 * succede nel frattempo, come se fosse passato davvero.
 */
export function skipAhead(world: World, ms: number, realNow: number): Notice[] {
  const { state } = world;
  state.clock = { realAt: realNow, gameAt: gameTimeAt(state.clock, realNow) + ms, speed: state.clock.speed };
  return syncTo(world, realNow);
}

/** Quando arriverà a destinazione (tempo di gioco), secondo quello che la gilda sa ora. */
export function estimateArrival(world: World, character: Character): number | null {
  if (!character.destination) return null;
  const start = character.step ? character.step.arriveAt : world.state.time;
  return start + routeDuration(world.map, world.state.fog, character, character.route);
}

/** Il percorso che il personaggio farebbe per arrivare in `target`, e quanto ci metterebbe. */
export function previewRoute(world: World, character: Character, target: Hex): { route: Hex[]; duration: number } | null {
  const from = character.step ? character.step.to : character.hex;
  const route = findRoute(world.map, world.state.fog, character, from, target);
  if (route === null) return null;
  const pending = character.step ? character.step.arriveAt - world.state.time : 0;
  return { route, duration: pending + routeDuration(world.map, world.state.fog, character, route) };
}
