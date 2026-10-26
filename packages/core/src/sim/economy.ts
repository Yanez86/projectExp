import { BIOMES, BIOME_IDS } from "../content/biomes";
import { STORAGE_CAPACITY, WORKSHOP_BUILD_MS, WORKSHOP_COST, WORKSHOP_SLOTS } from "../content/guild";
import type { MaterialId } from "../content/materials";
import {
  BASE_YIELD,
  HARVEST_MS,
  OUTPOSTS,
  OUTPOST_BUILD_MS,
  OUTPOST_COST,
  TALENT_FACTOR,
  outpostKindFor,
  type OutpostKind,
} from "../content/outposts";
import { RECIPES, RECIPE_IDS, type RecipeId } from "../content/recipes";
import { distance, hexEquals, neighbors, type Hex } from "../hex";
import { FOG_UNEXPLORED, fogAt } from "../map/fog";
import { biomeIdAt, inBounds, placeAt } from "../map/world";
import { hasTalent } from "./characters";
import { schedule } from "./events";
import type { Character, GameState, Notice, Outpost, SiteProblem, Workshop, World } from "./state";

export type SiteCheck =
  | { readonly ok: true; readonly kind: OutpostKind; readonly yield: number }
  | { readonly ok: false; readonly reason: SiteProblem };

export function outpostAt(state: GameState, h: Hex): Outpost | undefined {
  return state.outposts.find((o) => hexEquals(o.hex, h));
}

/** Il raccolto di un avamposto in `h`: di base, più uno ogni due vicine dello stesso bioma. */
export function outpostYield(world: World, h: Hex): number {
  const biome = biomeIdAt(world.map, h);
  const same = neighbors(h).filter((n) => inBounds(world.map, n) && biomeIdAt(world.map, n) === biome).length;
  return BASE_YIELD + Math.floor(same / 2);
}

/** Se in `h` si può fondare un avamposto, e quale; altrimenti perché no. */
export function checkOutpostSite(world: World, h: Hex): SiteCheck {
  const { map, state } = world;
  if (!inBounds(map, h) || fogAt(state.fog, map, h) === FOG_UNEXPLORED) return { ok: false, reason: "unexplored" };
  const biome = biomeIdAt(map, h)!;
  const kind = outpostKindFor(biome);
  if (!kind || BIOMES[BIOME_IDS.indexOf(biome)]!.water) return { ok: false, reason: "water" };
  if (hexEquals(h, state.guild.hex)) return { ok: false, reason: "guild" };
  if (placeAt(map, h)) return { ok: false, reason: "place" };
  if (outpostAt(state, h)) return { ok: false, reason: "outpost" };
  if (state.outposts.some((o) => distance(o.hex, h) <= 1)) return { ok: false, reason: "near-outpost" };
  return { ok: true, kind, yield: outpostYield(world, h) };
}

/** Quanto ci mette questo personaggio a costruire un avamposto. */
export function buildDuration(character: Character): number {
  return (OUTPOST_BUILD_MS * (hasTalent(character) ? TALENT_FACTOR : 100)) / 100;
}

/** Il costruttore è arrivato sul posto: paga e apre il cantiere, se si può ancora. */
export function startConstruction(world: World, character: Character, at: number, notices: Notice[]): void {
  const { state } = world;
  character.task = null;
  const site = checkOutpostSite(world, character.hex);
  if (!site.ok || state.guild.gold < OUTPOST_COST) {
    notices.push({ kind: "build_failed", at, characterId: character.id, reason: site.ok ? "gold" : site.reason });
    return;
  }
  state.guild.gold -= OUTPOST_COST;
  const outpost: Outpost = {
    id: state.outposts.length + 1,
    kind: site.kind,
    hex: character.hex,
    yield: site.yield,
    readyAt: at + buildDuration(character),
  };
  state.outposts.push(outpost);
  character.task = { kind: "building", outpostId: outpost.id };
  schedule(world, outpost.readyAt!, { kind: "outpost_ready", outpostId: outpost.id });
  notices.push({ kind: "build_started", at, characterId: character.id, outpostId: outpost.id });
}

/** Il cantiere è finito: il costruttore torna libero e il primo raccolto arriva tra un'ora. */
export function finishOutpost(world: World, outpostId: number, at: number, notices: Notice[]): Outpost | undefined {
  const outpost = world.state.outposts.find((o) => o.id === outpostId);
  if (!outpost || outpost.readyAt === null) return undefined;
  outpost.readyAt = null;
  for (const c of world.state.characters) {
    if (c.task?.kind === "building" && c.task.outpostId === outpostId) c.task = null;
  }
  schedule(world, at + HARVEST_MS, { kind: "harvest", outpostId });
  notices.push({ kind: "outpost_ready", at, outpostId });
  return outpost;
}

/** Un raccolto arriva in magazzino (quello che non ci sta va perso); i laboratori ripartono. */
export function harvest(world: World, outpostId: number, at: number): void {
  const outpost = world.state.outposts.find((o) => o.id === outpostId);
  if (!outpost) return;
  store(world, OUTPOSTS[outpost.kind].material, outpost.yield);
  schedule(world, at + HARVEST_MS, { kind: "harvest", outpostId });
  runWorkshops(world, at);
}

function store(world: World, material: MaterialId, amount: number): void {
  const { stock } = world.state.guild;
  stock[material] = Math.min(STORAGE_CAPACITY, stock[material] + amount);
}

export type WorkshopProblem = "slots" | "gold" | "unknown-recipe";

/** Fa costruire un laboratorio nella sede, se c'è posto e bastano le monete. */
export function buildWorkshop(world: World, recipe: RecipeId): { ok: true } | { ok: false; reason: WorkshopProblem } {
  const { state } = world;
  if (!RECIPE_IDS.includes(recipe)) return { ok: false, reason: "unknown-recipe" };
  if (state.workshops.length >= WORKSHOP_SLOTS) return { ok: false, reason: "slots" };
  if (state.guild.gold < WORKSHOP_COST) return { ok: false, reason: "gold" };
  state.guild.gold -= WORKSHOP_COST;
  const workshop: Workshop = {
    id: state.workshops.length + 1,
    recipe,
    readyAt: state.time + WORKSHOP_BUILD_MS,
    busyUntil: null,
    paused: false,
  };
  state.workshops.push(workshop);
  schedule(world, workshop.readyAt!, { kind: "workshop_ready", workshopId: workshop.id });
  return { ok: true };
}

export function finishWorkshop(world: World, workshopId: number, at: number, notices: Notice[]): void {
  const workshop = world.state.workshops.find((w) => w.id === workshopId);
  if (!workshop || workshop.readyAt === null) return;
  workshop.readyAt = null;
  notices.push({ kind: "workshop_ready", at, workshopId });
  runWorkshops(world, at);
}

/** Un ciclo è finito: i prodotti vanno in magazzino e i laboratori ripartono. */
export function completeCycle(world: World, workshopId: number, at: number): void {
  const workshop = world.state.workshops.find((w) => w.id === workshopId);
  if (!workshop || workshop.busyUntil === null) return;
  workshop.busyUntil = null;
  for (const [material, amount] of RECIPES[workshop.recipe].outputs) store(world, material, amount);
  runWorkshops(world, at);
}

export function toggleWorkshop(world: World, workshopId: number): boolean {
  const workshop = world.state.workshops.find((w) => w.id === workshopId);
  if (!workshop) return false;
  workshop.paused = !workshop.paused;
  runWorkshops(world, world.state.time);
  return true;
}

/** Cosa manca a un laboratorio fermo per cominciare un ciclo. */
function blockers(world: World, workshop: Workshop): WorkshopStatus | undefined {
  const { stock } = world.state.guild;
  const recipe = RECIPES[workshop.recipe];
  const missing = recipe.inputs.filter(([m, n]) => stock[m] < n).map(([m]) => m);
  if (missing.length > 0) return { kind: "missing", materials: missing };
  const full = recipe.outputs.filter(([m, n]) => stock[m] + n > STORAGE_CAPACITY).map(([m]) => m);
  if (full.length > 0) return { kind: "full", materials: full };
  return undefined;
}

/**
 * Fa cominciare un ciclo a ogni laboratorio fermo che ha quello che gli serve, in ordine. Si
 * ripete finché qualcosa parte, perché chi consuma può fare spazio a chi produce.
 */
function runWorkshops(world: World, at: number): void {
  const { stock } = world.state.guild;
  let started = true;
  while (started) {
    started = false;
    for (const workshop of world.state.workshops) {
      if (workshop.readyAt !== null || workshop.busyUntil !== null || workshop.paused) continue;
      if (blockers(world, workshop)) continue;
      const recipe = RECIPES[workshop.recipe];
      for (const [material, amount] of recipe.inputs) stock[material] -= amount;
      workshop.busyUntil = at + recipe.duration;
      schedule(world, workshop.busyUntil, { kind: "workshop_done", workshopId: workshop.id });
      started = true;
    }
  }
}

export type WorkshopStatus =
  | { readonly kind: "building"; readonly until: number }
  | { readonly kind: "working"; readonly until: number }
  | { readonly kind: "paused" }
  | { readonly kind: "missing"; readonly materials: readonly MaterialId[] }
  | { readonly kind: "full"; readonly materials: readonly MaterialId[] };

/** Cosa sta facendo un laboratorio, per mostrarlo al giocatore. */
export function workshopStatus(world: World, workshop: Workshop): WorkshopStatus {
  if (workshop.readyAt !== null) return { kind: "building", until: workshop.readyAt };
  if (workshop.busyUntil !== null) return { kind: "working", until: workshop.busyUntil };
  if (workshop.paused) return { kind: "paused" };
  return blockers(world, workshop) ?? { kind: "working", until: world.state.time };
}

/** Il prossimo raccolto di un avamposto (tempo di gioco), se è pronto. */
export function nextHarvest(world: World, outpost: Outpost): number | undefined {
  return world.state.events.find((e) => e.kind === "harvest" && e.outpostId === outpost.id)?.at;
}
