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
import { START_GOLD } from "../content/guild";
import { emptyStock } from "../content/materials";
import { OUTPOST_COST, OUTPOST_VISION } from "../content/outposts";
import type { RecipeId } from "../content/recipes";
import { visionRange } from "../content/vision";
import { hexEquals, type Hex } from "../hex";
import { FOG_UNEXPLORED, createFog, updateVisibility, type VisionSource } from "../map/fog";
import { generateMap } from "../map/generate";
import { biomeIdAt, inBounds, tileIndex } from "../map/world";
import { createRng, hashSeed, pick, randInt, type Rng } from "../rng";
import {
  buildWorkshop,
  checkOutpostSite,
  completeCycle,
  finishOutpost,
  finishWorkshop,
  harvest,
  startConstruction,
  toggleWorkshop,
  type WorkshopProblem,
} from "./economy";
import { schedule } from "./events";
import { findRoute, knownStepDuration, routeDuration } from "./route";
import { START_TIME, gameTimeAt, type BuildProblem, type Character, type Notice, type World } from "./state";

export interface NewWorldOptions {
  readonly seed: string;
  readonly width: number;
  readonly height: number;
  /** Velocità del mondo: quante volte il tempo di gioco scorre più veloce di quello reale. */
  readonly speed: number;
  /** L'istante reale (ms da epoch) in cui il mondo nasce. */
  readonly realNow: number;
}

export type Command =
  | { readonly kind: "move"; readonly characterId: number; readonly target: Hex }
  | { readonly kind: "stop"; readonly characterId: number }
  /** Un costruttore va in `target` e ci fonda un avamposto. */
  | { readonly kind: "build_outpost"; readonly characterId: number; readonly target: Hex }
  | { readonly kind: "build_workshop"; readonly recipe: RecipeId }
  /** Mette in pausa un laboratorio, o lo fa ripartire. */
  | { readonly kind: "toggle_workshop"; readonly workshopId: number };

export type CommandProblem =
  | "unknown-character"
  | "unknown-workshop"
  | "unreachable"
  | "busy"
  | "not-builder"
  | BuildProblem
  | WorkshopProblem;

export type CommandResult = { readonly ok: true } | { readonly ok: false; readonly reason: CommandProblem };

/** Crea un mondo nuovo: la mappa, la sede della gilda, due esploratori e un costruttore. */
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
    // Il costruttore è un Micelide, che ha il talento.
    createCharacter(rng, 3, "mycelings", "builder", map.start, used),
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
      guild: { hex: map.start, gold: START_GOLD, stock: emptyStock() },
      characters,
      outposts: [],
      workshops: [],
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
  return { id, name, gender, ethnicity, job, stats, hex, destination: null, route: [], step: null, task: null };
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
  for (const o of state.outposts) if (o.readyAt === null) sources.push({ hex: o.hex, radius: OUTPOST_VISION });
  updateVisibility(state.fog, map, sources);
  return before - countUnexplored(state.fog.state);
}

/** Ricalcola la vista dopo un cambiamento in `origin`, avvisando di ciò che si è scoperto. */
function look(world: World, origin: Hex, at: number, notices: Notice[]): void {
  const { map, state } = world;
  const hidden = map.places.filter((p) => state.fog.state[tileIndex(map, p.hex)] === FOG_UNEXPLORED);
  const revealed = refreshVisibility(world);
  if (revealed > 0) notices.push({ kind: "revealed", at, origin, count: revealed });
  for (const p of hidden) {
    if (state.fog.state[tileIndex(map, p.hex)] !== FOG_UNEXPLORED) notices.push({ kind: "discovered", at, placeId: p.id });
  }
}

function countUnexplored(fog: Uint8Array): number {
  let n = 0;
  for (const v of fog) if (v === FOG_UNEXPLORED) n++;
  return n;
}

function findCharacter(world: World, id: number): Character | undefined {
  return world.state.characters.find((c) => c.id === id);
}

/** Fa partire il prossimo passo del percorso, se c'è. */
function startStep(world: World, character: Character, at: number): void {
  const next = character.route[0];
  if (!next) return;
  const duration = knownStepDuration(world.map, world.state.fog, character, next);
  if (duration === null) return;
  character.route = character.route.slice(1);
  character.step = { from: character.hex, to: next, departAt: at, arriveAt: at + duration };
  schedule(world, at + duration, { kind: "arrive", characterId: character.id });
}

/** Esegue un comando del giocatore al tempo a cui è arrivata la simulazione. */
export function applyCommand(world: World, command: Command): CommandResult {
  if (command.kind === "build_workshop") return buildWorkshop(world, command.recipe);
  if (command.kind === "toggle_workshop") {
    return toggleWorkshop(world, command.workshopId) ? { ok: true } : { ok: false, reason: "unknown-workshop" };
  }
  const character = findCharacter(world, command.characterId);
  if (!character) return { ok: false, reason: "unknown-character" };
  // Chi sta costruendo resta sul cantiere.
  if (character.task?.kind === "building") return { ok: false, reason: "busy" };
  if (command.kind === "stop") {
    // Un passo già iniziato si finisce: ci si ferma sulla casella successiva.
    character.destination = null;
    character.route = [];
    character.task = null;
    return { ok: true };
  }
  const { target } = command;
  if (command.kind === "build_outpost") {
    if (character.job !== "builder") return { ok: false, reason: "not-builder" };
    const site = checkOutpostSite(world, target);
    if (!site.ok) return { ok: false, reason: site.reason };
    if (world.state.guild.gold < OUTPOST_COST) return { ok: false, reason: "gold" };
  }
  if (!inBounds(world.map, target)) return { ok: false, reason: "unreachable" };
  const from = character.step ? character.step.to : character.hex;
  const route = findRoute(world.map, world.state.fog, character, from, target);
  if (route === null) return { ok: false, reason: "unreachable" };
  const here = hexEquals(from, target) && !character.step;
  character.destination = here ? null : target;
  character.route = route;
  character.task = command.kind === "build_outpost" ? { kind: "build", hex: target } : null;
  if (here && character.task) startConstruction(world, character, world.state.time, []);
  else if (!character.step) startStep(world, character, world.state.time);
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
    switch (event.kind) {
      case "arrive":
        arrive(world, event.characterId, event.at, notices);
        break;
      case "outpost_ready": {
        const outpost = finishOutpost(world, event.outpostId, event.at, notices);
        if (outpost) look(world, outpost.hex, event.at, notices);
        break;
      }
      case "harvest":
        harvest(world, event.outpostId, event.at);
        break;
      case "workshop_ready":
        finishWorkshop(world, event.workshopId, event.at, notices);
        break;
      case "workshop_done":
        completeCycle(world, event.workshopId, event.at);
        break;
    }
  }
  state.time = Math.max(state.time, until);
  return notices;
}

function arrive(world: World, characterId: number, at: number, notices: Notice[]): void {
  const character = findCharacter(world, characterId);
  if (!character?.step) return;
  character.hex = character.step.to;
  character.step = null;
  look(world, character.hex, at, notices);

  const destination = character.destination;
  if (!destination) return;
  if (hexEquals(character.hex, destination)) {
    character.destination = null;
    character.route = [];
    if (character.task?.kind === "build" && hexEquals(character.task.hex, character.hex)) {
      startConstruction(world, character, at, notices);
    } else {
      notices.push({ kind: "arrived", at, characterId, hex: character.hex });
    }
    return;
  }
  // Ogni casella scoperta può cambiare la strada migliore: si ricalcola a ogni passo.
  const route = findRoute(world.map, world.state.fog, character, character.hex, destination);
  if (route === null || route.length === 0) {
    character.destination = null;
    character.route = [];
    character.task = null;
    notices.push({ kind: "blocked", at, characterId, hex: character.hex });
    return;
  }
  character.route = route;
  startStep(world, character, at);
}

/** Quando succede la prossima cosa in coda (tempo di gioco), se c'è. */
export function nextEventAt(world: World): number | undefined {
  return world.state.events[0]?.at;
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

/** Strumento di prova: monete in regalo alla gilda. */
export function grantGold(world: World, amount: number): void {
  world.state.guild.gold += amount;
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
