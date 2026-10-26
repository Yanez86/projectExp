import { MAX_SQUAD } from "../content/dungeons";
import { ETHNICITY_IDS, type EthnicityId, type JobId } from "../content/ethnicities";
import { START_GOLD } from "../content/guild";
import type { Slot } from "../content/items";
import { emptyStock } from "../content/materials";
import { OUTPOST_COST, OUTPOST_VISION } from "../content/outposts";
import type { RecipeId } from "../content/recipes";
import { visionRange } from "../content/vision";
import { hexEquals, type Hex } from "../hex";
import { FOG_UNEXPLORED, createFog, fogAt, updateVisibility, type VisionSource } from "../map/fog";
import { generateMap } from "../map/generate";
import { biomeIdAt, inBounds, tileIndex } from "../map/world";
import { createRng, hashSeed, pick } from "../rng";
import { effectiveStats, rollCharacter } from "./characters";
import { delve, dungeonLevels, heal, tryEnter } from "./dungeon";
import { equip, unequip, type EquipProblem } from "./equipment";
import { payday } from "./payroll";
import { hire, type HireProblem } from "./tavern";
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
import { buyGoods, cargoCapacity, cargoUnits, priceList, quotePurchase, sellCargo, unloadCargo } from "./trade";
import { findRoute, knownStepDuration, routeDuration } from "./route";
import { DAY_MS, START_TIME, gameTimeAt, type BuildProblem, type Character, type Notice, type Task, type World } from "./state";
import type { MaterialId } from "../content/materials";

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
  | { readonly kind: "toggle_workshop"; readonly workshopId: number }
  /**
   * Un carovaniere va a vendere `goods` a una cittadina (partendo dalla sede con il carico) o a
   * comprarle a un mercato; poi torna alla sede e scarica.
   */
  | {
      readonly kind: "trade";
      readonly characterId: number;
      readonly placeId: number;
      readonly mode: "sell" | "buy";
      readonly goods: readonly (readonly [MaterialId, number])[];
    }
  /** Ingaggia chi è nella locanda di una cittadina, al posto `slot`. */
  | { readonly kind: "hire"; readonly placeId: number; readonly slot: number }
  | { readonly kind: "equip"; readonly characterId: number; readonly itemId: number }
  | { readonly kind: "unequip"; readonly characterId: number; readonly slot: Slot }
  /** Una squadra di mercenari va in un dungeon e scende fino al livello `depth`. */
  | { readonly kind: "expedition"; readonly placeId: number; readonly members: readonly number[]; readonly depth: number };

export type CommandProblem =
  | "unknown-character"
  | "unknown-workshop"
  | "unreachable"
  | "busy"
  | "not-builder"
  | BuildProblem
  | WorkshopProblem
  | TradeProblem
  | HireProblem
  | EquipProblem
  | ExpeditionProblem
  | "wounded";

/** Perché una spedizione non può partire. */
export type ExpeditionProblem = "not-mercenary" | "squad" | "depth";

/** Perché un viaggio di commercio non può partire. */
export type TradeProblem =
  | "not-caravaneer"
  | "wrong-place"
  | "not-sold-here"
  | "empty"
  | "capacity"
  | "loaded"
  | "not-at-guild"
  | "stock";

export type CommandResult = { readonly ok: true } | { readonly ok: false; readonly reason: CommandProblem };

/**
 * Crea un mondo nuovo: la mappa, la sede della gilda, due esploratori, un costruttore e un
 * carovaniere. I mercenari si trovano nelle locande.
 */
export function createWorld(options: NewWorldOptions): World {
  const { seed, width, height, speed, realNow } = options;
  const map = generateMap({ seed, width, height });
  const rng = createRng(hashSeed(`${seed}/crew`));
  // Il primo esploratore è sempre un Cartiglio, che ha il talento; il secondo di un'altra etnia.
  const second = pick(rng, ETHNICITY_IDS.filter((id) => id !== "paperfolk"));
  const used = new Set<string>();
  const crew = (id: number, ethnicity: EthnicityId, job: JobId) => {
    const c = rollCharacter(rng, id, ethnicity, job, map.start, used);
    used.add(c.name);
    return c;
  };
  const characters = [
    crew(1, "paperfolk", "explorer"),
    crew(2, second, "explorer"),
    // Il costruttore è un Micelide e il carovaniere un Lumacaio: hanno il talento.
    crew(3, "mycelings", "builder"),
    crew(4, "shellfolk", "caravaneer"),
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
      guild: { hex: map.start, gold: START_GOLD, stock: emptyStock(), items: [], relics: 0 },
      characters,
      outposts: [],
      workshops: [],
      markets: [],
      expeditions: [],
      cleared: [],
      hires: [],
      nextCharacterId: characters.length + 1,
      nextItemId: 1,
      nextExpeditionId: 1,
      events: [],
      nextSeq: 0,
    },
  };
  // La prima paga è il secondo giorno, alla stessa ora in cui la gilda è nata.
  schedule(world, START_TIME + DAY_MS, { kind: "payday" });
  refreshVisibility(world);
  return world;
}

/** Fin dove vede un personaggio dove si trova: dipende dal terreno e dal suo Occhio. */
export function visionRadius(world: World, character: Character): number {
  return visionRange(biomeIdAt(world.map, character.hex), effectiveStats(character).eye);
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
  if (command.kind === "hire") return hire(world, command.placeId, command.slot, []);
  if (command.kind === "expedition") return startExpedition(world, command);
  const character = findCharacter(world, command.characterId);
  if (!character) return { ok: false, reason: "unknown-character" };
  if (command.kind === "equip") return equip(world, character, command.itemId);
  if (command.kind === "unequip") return unequip(world, character, command.slot);
  // Chi sta costruendo resta sul cantiere; chi commercia o è in spedizione finisce il suo viaggio.
  const task = character.task?.kind;
  if (task === "building" || task === "trade" || task === "expedition") return { ok: false, reason: "busy" };
  if (isWounded(world, character)) return { ok: false, reason: "wounded" };
  if (command.kind === "trade") return startTrade(world, character, command);
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

export function isWounded(world: World, c: Character): boolean {
  return c.woundedUntil !== null && c.woundedUntil > world.state.time;
}

/** Prepara una spedizione: ogni mercenario va all'ingresso; quando ci sono tutti, la squadra entra. */
function startExpedition(world: World, command: Extract<Command, { kind: "expedition" }>): CommandResult {
  const { map, state } = world;
  const place = map.places.find((p) => p.id === command.placeId);
  if (!place || place.kind !== "dungeon") return { ok: false, reason: "wrong-place" };
  if (fogAt(state.fog, map, place.hex) === FOG_UNEXPLORED) return { ok: false, reason: "unexplored" };
  const ids = [...new Set(command.members)];
  if (ids.length === 0 || ids.length > MAX_SQUAD || ids.length !== command.members.length) return { ok: false, reason: "squad" };
  const members = ids.map((id) => findCharacter(world, id));
  if (members.some((c) => !c)) return { ok: false, reason: "unknown-character" };
  const squad = members as Character[];
  if (squad.some((c) => c.job !== "mercenary")) return { ok: false, reason: "not-mercenary" };
  if (squad.some((c) => c.task)) return { ok: false, reason: "busy" };
  if (squad.some((c) => isWounded(world, c))) return { ok: false, reason: "wounded" };
  if (!Number.isInteger(command.depth) || command.depth < 1 || command.depth > dungeonLevels(world, place)) {
    return { ok: false, reason: "depth" };
  }
  const routes = squad.map((c) => findRoute(map, state.fog, c, c.step ? c.step.to : c.hex, place.hex));
  if (routes.some((r) => r === null)) return { ok: false, reason: "unreachable" };

  const expedition = {
    id: state.nextExpeditionId++,
    placeId: place.id,
    members: ids,
    depth: command.depth,
    level: 0,
    loot: { gold: 0, materials: [], items: [], relics: 0 },
  };
  state.expeditions.push(expedition);
  squad.forEach((c, i) => {
    const route = routes[i]!;
    const here = route.length === 0 && !c.step;
    c.task = { kind: "expedition", expeditionId: expedition.id };
    c.destination = here ? null : place.hex;
    c.route = route;
    if (!here && !c.step) startStep(world, c, state.time);
  });
  tryEnter(world, expedition, place, state.time, []);
  return { ok: true };
}

/** Un mercenario esce da una spedizione prima di entrare (non trova la strada): gli altri non lo aspettano più. */
function leaveExpedition(world: World, c: Character, at: number, notices: Notice[]): void {
  const task = c.task;
  if (task?.kind !== "expedition") return;
  c.task = null;
  const { state, map } = world;
  const e = state.expeditions.find((x) => x.id === task.expeditionId);
  if (!e) return;
  e.members = e.members.filter((id) => id !== c.id);
  if (e.members.length === 0) {
    state.expeditions.splice(state.expeditions.indexOf(e), 1);
    return;
  }
  const place = map.places.find((p) => p.id === e.placeId);
  if (place) tryEnter(world, e, place, at, notices);
}

/** Rimanda un personaggio alla sede, se c'è una strada. */
function sendHome(world: World, c: Character, at: number): void {
  const { state, map } = world;
  const route = findRoute(map, state.fog, c, c.step ? c.step.to : c.hex, state.guild.hex);
  if (route === null || (route.length === 0 && !c.step)) return;
  c.destination = state.guild.hex;
  c.route = route;
  if (!c.step) startStep(world, c, at);
}

/** Prepara e fa partire un viaggio di commercio, se si può. */
function startTrade(world: World, character: Character, command: Extract<Command, { kind: "trade" }>): CommandResult {
  const { map, state } = world;
  if (character.job !== "caravaneer") return { ok: false, reason: "not-caravaneer" };
  const place = map.places.find((p) => p.id === command.placeId);
  if (!place || place.kind !== (command.mode === "sell" ? "town" : "market")) return { ok: false, reason: "wrong-place" };
  if (fogAt(state.fog, map, place.hex) === FOG_UNEXPLORED) return { ok: false, reason: "unexplored" };
  const goods = command.goods.filter(([, n]) => n > 0).map(([m, n]): [MaterialId, number] => [m, n]);
  if (goods.length === 0 || goods.some(([, n]) => !Number.isInteger(n))) return { ok: false, reason: "empty" };
  if (cargoUnits(goods) > cargoCapacity(character)) return { ok: false, reason: "capacity" };
  if (character.cargo.length > 0) return { ok: false, reason: "loaded" };
  if (command.mode === "sell") {
    if (character.step || !hexEquals(character.hex, state.guild.hex)) return { ok: false, reason: "not-at-guild" };
    if (goods.some(([m, n]) => state.guild.stock[m] < n)) return { ok: false, reason: "stock" };
  } else {
    const { featured } = priceList(map, place);
    if (goods.some(([m]) => !featured.includes(m))) return { ok: false, reason: "not-sold-here" };
    if (quotePurchase(world, place, goods) > state.guild.gold) return { ok: false, reason: "gold" };
  }
  const from = character.step ? character.step.to : character.hex;
  const route = findRoute(map, state.fog, character, from, place.hex);
  if (route === null) return { ok: false, reason: "unreachable" };

  if (command.mode === "sell") {
    for (const [m, n] of goods) state.guild.stock[m] -= n;
    character.cargo = goods;
  }
  character.task = { kind: "trade", placeId: place.id, mode: command.mode, order: goods, returning: false };
  if (route.length === 0 && !character.step) {
    // È già sul posto: commercia subito.
    tradeArrival(world, character, character.task, state.time, []);
    return { ok: true };
  }
  character.destination = place.hex;
  character.route = route;
  if (!character.step) startStep(world, character, state.time);
  return { ok: true };
}

/** Un carovaniere arriva al luogo del commercio (e riparte per la sede) o alla sede (e scarica). */
function tradeArrival(world: World, character: Character, task: Extract<Task, { kind: "trade" }>, at: number, notices: Notice[]): void {
  const { map, state } = world;
  if (task.returning) {
    character.task = null;
    unloadCargo(world, character, at, notices);
    return;
  }
  const place = map.places.find((p) => p.id === task.placeId);
  if (place && hexEquals(place.hex, character.hex)) {
    if (task.mode === "sell") sellCargo(world, character, place, at, notices);
    else buyGoods(world, character, place, task.order, at, notices);
  }
  const route = findRoute(map, state.fog, character, character.hex, state.guild.hex);
  if (route === null || route.length === 0) {
    character.task = null;
    if (route === null) notices.push({ kind: "blocked", at, characterId: character.id, hex: character.hex });
    else unloadCargo(world, character, at, notices);
    return;
  }
  character.task = { ...task, returning: true };
  character.destination = state.guild.hex;
  character.route = route;
  startStep(world, character, at);
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
      case "payday":
        payday(world, event.at, notices);
        break;
      case "delve":
        delve(world, event.expeditionId, event.at, notices, (c) => sendHome(world, c, event.at));
        break;
      case "healed":
        heal(world, event.characterId, event.at, notices);
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
    const task = character.task;
    if (task?.kind === "build" && hexEquals(task.hex, character.hex)) {
      startConstruction(world, character, at, notices);
    } else if (task?.kind === "trade") {
      tradeArrival(world, character, task, at, notices);
    } else if (task?.kind === "expedition") {
      const e = world.state.expeditions.find((x) => x.id === task.expeditionId);
      const place = e && world.map.places.find((p) => p.id === e.placeId);
      if (e && place) tryEnter(world, e, place, at, notices);
    } else if (character.cargo.length > 0 && hexEquals(character.hex, world.state.guild.hex)) {
      // Un carico rimasto da un viaggio interrotto: arrivato alla sede, va in magazzino.
      unloadCargo(world, character, at, notices);
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
    if (character.task?.kind === "expedition") leaveExpedition(world, character, at, notices);
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
