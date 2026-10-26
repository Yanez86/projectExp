import { describe, expect, it } from "vitest";
import { STORAGE_CAPACITY, START_GOLD, WORKSHOP_BUILD_MS, WORKSHOP_COST, WORKSHOP_SLOTS } from "../src/content/guild";
import { HARVEST_MS, OUTPOST_BUILD_MS, OUTPOST_COST, TALENT_FACTOR } from "../src/content/outposts";
import { distance, hexEquals, hexesInRange, offsetToHex } from "../src/hex";
import { FOG_VISIBLE, fogAt } from "../src/map/fog";
import type { Place } from "../src/map/places";
import { checkOutpostSite, outpostYield, workshopStatus } from "../src/sim/economy";
import { advance, applyCommand, createWorld, nextEventAt } from "../src/sim/engine";
import { deserializeWorld, serializeWorld } from "../src/sim/save";
import { START_TIME, type World } from "../src/sim/state";
import { makeCharacter, worldFrom } from "./helpers";

const HOUR = 3_600_000;

/** Una pianura con un bosco a est e un lago a sud; la sede a ovest, con un costruttore micelide. */
function valley(places: Place[] = []): World {
  const world = worldFrom(
    [
      "....ffff",
      "....ffff",
      "....ffff",
      "..~~....",
    ],
    offsetToHex(0, 1),
    places,
  );
  world.state.characters.push(makeCharacter(2, world.map.start, "builder", "mycelings"));
  world.state.fog.state.fill(1);
  return world;
}

/** Porta avanti il mondo e restituisce tutti gli avvisi. */
const run = (world: World, until: number) => advance(world, until);

describe("dove si fonda un avamposto", () => {
  it("non sotto le nuvole, non sull'acqua, non sulla sede, sui luoghi o accanto a un altro avamposto", () => {
    const world = valley([{ id: 1, kind: "town", hex: offsetToHex(2, 0), name: "Valemir" }]);
    expect(checkOutpostSite(world, offsetToHex(2, 3))).toEqual({ ok: false, reason: "water" });
    expect(checkOutpostSite(world, world.map.start)).toEqual({ ok: false, reason: "guild" });
    expect(checkOutpostSite(world, offsetToHex(2, 0))).toEqual({ ok: false, reason: "place" });
    expect(checkOutpostSite(world, offsetToHex(5, 1))).toEqual({ ok: true, kind: "lumber_camp", yield: 5 });
    expect(checkOutpostSite(world, offsetToHex(1, 2))).toMatchObject({ ok: true, kind: "farm" });

    world.state.outposts.push({ id: 1, kind: "lumber_camp", hex: offsetToHex(5, 1), yield: 5, readyAt: null });
    expect(checkOutpostSite(world, offsetToHex(5, 1))).toEqual({ ok: false, reason: "outpost" });
    expect(checkOutpostSite(world, offsetToHex(6, 1))).toEqual({ ok: false, reason: "near-outpost" });
    expect(checkOutpostSite(world, offsetToHex(7, 1))).toMatchObject({ ok: true });

    world.state.fog.state.fill(0);
    expect(checkOutpostSite(world, offsetToHex(7, 1))).toEqual({ ok: false, reason: "unexplored" });
  });

  it("rende di più in mezzo al suo bioma", () => {
    const world = valley();
    // Al margine del bosco: tre vicine di bosco su sei.
    expect(outpostYield(world, offsetToHex(4, 0))).toBe(2 + 1);
    // Dentro il bosco: sei su sei.
    expect(outpostYield(world, offsetToHex(5, 1))).toBe(2 + 3);
  });
});

describe("avamposti", () => {
  it("il costruttore va sul posto, paga, costruisce e poi il raccolto arriva ogni ora", () => {
    const world = valley();
    const target = offsetToHex(5, 1);
    expect(applyCommand(world, { kind: "build_outpost", characterId: 2, target })).toEqual({ ok: true });
    expect(world.state.guild.gold).toBe(START_GOLD);

    const started = run(world, START_TIME + 24 * HOUR).find((n) => n.kind === "build_started");
    expect(started).toBeDefined();
    const builder = world.state.characters[1]!;
    expect(hexEquals(builder.hex, target)).toBe(true);
    expect(world.state.guild.gold).toBe(START_GOLD - OUTPOST_COST);
    const outpost = world.state.outposts[0]!;
    // Il Micelide ha il talento del costruttore: ci mette i tre quarti.
    const ready = started!.at + (OUTPOST_BUILD_MS * TALENT_FACTOR) / 100;
    expect(outpost.readyAt === null || outpost.readyAt === ready).toBe(true);
    expect(outpost).toMatchObject({ kind: "lumber_camp", yield: 5 });
  });

  it("produce legname e resta sveglio: un'ora dopo l'altra, fino a riempire il magazzino", () => {
    const world = valley();
    applyCommand(world, { kind: "build_outpost", characterId: 2, target: offsetToHex(5, 1) });
    const notices = run(world, START_TIME + 2 * HOUR);
    const started = notices.find((n) => n.kind === "build_started")!;
    const ready = started.at + (OUTPOST_BUILD_MS * TALENT_FACTOR) / 100;

    expect(applyCommand(world, { kind: "move", characterId: 2, target: world.map.start })).toEqual({ ok: false, reason: "busy" });
    const done = run(world, ready);
    expect(done.some((n) => n.kind === "outpost_ready")).toBe(true);
    expect(world.state.characters[1]!.task).toBeNull();

    run(world, ready + 3 * HARVEST_MS);
    expect(world.state.guild.stock.timber).toBe(3 * 5);
    run(world, ready + 1000 * HARVEST_MS);
    expect(world.state.guild.stock.timber).toBe(STORAGE_CAPACITY);
  });

  it("vede attorno a sé anche quando il costruttore se ne va", () => {
    const world = valley();
    const target = offsetToHex(5, 1);
    applyCommand(world, { kind: "build_outpost", characterId: 2, target });
    run(world, START_TIME + 12 * HOUR);
    world.state.fog.state.fill(1);
    applyCommand(world, { kind: "move", characterId: 2, target: world.map.start });
    applyCommand(world, { kind: "move", characterId: 1, target: offsetToHex(1, 3) });
    run(world, START_TIME + 48 * HOUR);
    expect(fogAt(world.state.fog, world.map, offsetToHex(6, 2))).toBe(FOG_VISIBLE);
  });

  it("rifiuta chi non è costruttore, i posti sbagliati e le casse vuote", () => {
    const world = valley();
    expect(applyCommand(world, { kind: "build_outpost", characterId: 1, target: offsetToHex(5, 1) })).toEqual({
      ok: false,
      reason: "not-builder",
    });
    expect(applyCommand(world, { kind: "build_outpost", characterId: 2, target: offsetToHex(2, 3) })).toEqual({
      ok: false,
      reason: "water",
    });
    world.state.guild.gold = OUTPOST_COST - 1;
    expect(applyCommand(world, { kind: "build_outpost", characterId: 2, target: offsetToHex(5, 1) })).toEqual({
      ok: false,
      reason: "gold",
    });
  });

  it("se all'arrivo le monete non bastano più, non costruisce e avvisa", () => {
    const world = valley();
    applyCommand(world, { kind: "build_outpost", characterId: 2, target: offsetToHex(5, 1) });
    world.state.guild.gold = 0;
    const notices = run(world, START_TIME + 24 * HOUR);
    expect(notices).toContainEqual(expect.objectContaining({ kind: "build_failed", characterId: 2, reason: "gold" }));
    expect(world.state.outposts).toHaveLength(0);
    expect(world.state.characters[1]!.task).toBeNull();
  });

  it("un altro ordine annulla la costruzione prima dell'arrivo", () => {
    const world = valley();
    applyCommand(world, { kind: "build_outpost", characterId: 2, target: offsetToHex(5, 1) });
    applyCommand(world, { kind: "stop", characterId: 2 });
    run(world, START_TIME + 24 * HOUR);
    expect(world.state.outposts).toHaveLength(0);
    expect(world.state.guild.gold).toBe(START_GOLD);
  });
});

describe("laboratori", () => {
  it("si costruiscono nella sede, poi trasformano le materie un ciclo dopo l'altro", () => {
    const world = valley();
    world.state.guild.stock.timber = 5;
    expect(applyCommand(world, { kind: "build_workshop", recipe: "sawmill" })).toEqual({ ok: true });
    expect(world.state.guild.gold).toBe(START_GOLD - WORKSHOP_COST);
    const workshop = world.state.workshops[0]!;
    expect(workshopStatus(world, workshop)).toEqual({ kind: "building", until: START_TIME + WORKSHOP_BUILD_MS });

    const ready = START_TIME + WORKSHOP_BUILD_MS;
    expect(run(world, ready).some((n) => n.kind === "workshop_ready")).toBe(true);
    // Due cicli da un'ora: 2 legname → 1 asse ciascuno; poi il legname non basta più.
    expect(workshopStatus(world, workshop)).toEqual({ kind: "working", until: ready + HOUR });
    run(world, ready + 10 * HOUR);
    expect(world.state.guild.stock.planks).toBe(2);
    expect(world.state.guild.stock.timber).toBe(1);
    expect(workshopStatus(world, workshop)).toEqual({ kind: "missing", materials: ["timber"] });
  });

  it("ripartono quando arriva la materia che mancava, e la catena gira da sola", () => {
    const world = valley();
    world.state.guild.gold = 10_000;
    applyCommand(world, { kind: "build_outpost", characterId: 2, target: offsetToHex(5, 1) });
    applyCommand(world, { kind: "build_workshop", recipe: "sawmill" });
    applyCommand(world, { kind: "build_workshop", recipe: "charcoal_kiln" });
    run(world, START_TIME + 48 * HOUR);
    const { stock } = world.state.guild;
    expect(stock.planks).toBeGreaterThan(10);
    expect(stock.charcoal).toBeGreaterThan(10);
  });

  it("annunciano quando succede la prossima cosa, anche se non porta avvisi", () => {
    const world = valley();
    world.state.guild.stock.timber = 4;
    applyCommand(world, { kind: "build_workshop", recipe: "sawmill" });
    const ready = START_TIME + WORKSHOP_BUILD_MS;
    expect(nextEventAt(world)).toBe(ready);
    expect(run(world, ready + HOUR - 1)).toHaveLength(1);
    // Il ciclo finisce senza avvisi, ma qualcosa è successo e il prossimo è già in coda.
    expect(nextEventAt(world)).toBe(ready + HOUR);
    expect(run(world, ready + HOUR)).toEqual([]);
    expect(world.state.guild.stock.planks).toBe(1);
    expect(nextEventAt(world)).toBe(ready + 2 * HOUR);
  });

  it("in pausa non cominciano cicli nuovi", () => {
    const world = valley();
    world.state.guild.stock.timber = 50;
    applyCommand(world, { kind: "build_workshop", recipe: "sawmill" });
    expect(applyCommand(world, { kind: "toggle_workshop", workshopId: 1 })).toEqual({ ok: true });
    run(world, START_TIME + 10 * HOUR);
    expect(world.state.guild.stock.planks).toBe(0);
    expect(workshopStatus(world, world.state.workshops[0]!)).toEqual({ kind: "paused" });
    applyCommand(world, { kind: "toggle_workshop", workshopId: 1 });
    run(world, START_TIME + 13 * HOUR);
    expect(world.state.guild.stock.planks).toBe(3);
  });

  it("si fermano se il prodotto non ci sta più in magazzino", () => {
    const world = valley();
    world.state.guild.stock.timber = 50;
    world.state.guild.stock.planks = STORAGE_CAPACITY;
    applyCommand(world, { kind: "build_workshop", recipe: "sawmill" });
    run(world, START_TIME + 10 * HOUR);
    expect(world.state.guild.stock.timber).toBe(50);
    expect(workshopStatus(world, world.state.workshops[0]!)).toEqual({ kind: "full", materials: ["planks"] });
  });

  it("hanno un numero di posti e un prezzo", () => {
    const world = valley();
    world.state.guild.gold = WORKSHOP_COST * 10;
    for (let i = 0; i < WORKSHOP_SLOTS; i++) applyCommand(world, { kind: "build_workshop", recipe: "mill" });
    expect(applyCommand(world, { kind: "build_workshop", recipe: "mill" })).toEqual({ ok: false, reason: "slots" });
    const poor = valley();
    poor.state.guild.gold = WORKSHOP_COST - 1;
    expect(applyCommand(poor, { kind: "build_workshop", recipe: "mill" })).toEqual({ ok: false, reason: "gold" });
    expect(applyCommand(poor, { kind: "toggle_workshop", workshopId: 9 })).toEqual({ ok: false, reason: "unknown-workshop" });
  });
});

describe("economia nel tempo", () => {
  /** Un mondo generato con un avamposto ordinato vicino alla sede e due laboratori. */
  function busyWorld(): World {
    const world = createWorld({ seed: "economy", width: 48, height: 36, speed: 60, realNow: 0 });
    const builder = world.state.characters.find((c) => c.job === "builder")!;
    const site = hexesInRange(world.map.start, 3)
      .filter((h) => distance(h, world.map.start) >= 2)
      .find((h) => checkOutpostSite(world, h).ok)!;
    expect(site).toBeDefined();
    expect(applyCommand(world, { kind: "build_outpost", characterId: builder.id, target: site })).toEqual({ ok: true });
    applyCommand(world, { kind: "build_workshop", recipe: "sawmill" });
    applyCommand(world, { kind: "build_workshop", recipe: "mill" });
    return world;
  }

  it("avanzare in un colpo o a piccoli passi dà la stessa economia", () => {
    const once = busyWorld();
    const steps = busyWorld();
    const end = START_TIME + 72 * HOUR;
    advance(once, end);
    for (let t = START_TIME; t <= end; t += 1_234_567) advance(steps, t);
    advance(steps, end);
    expect(serializeWorld(steps)).toBe(serializeWorld(once));
    expect(once.state.outposts[0]!.readyAt).toBeNull();
  });

  it("salva e ricarica avamposti, laboratori e magazzino", () => {
    const world = busyWorld();
    advance(world, START_TIME + 20 * HOUR);
    const loaded = deserializeWorld(serializeWorld(world))!;
    expect(loaded.state.outposts).toEqual(world.state.outposts);
    expect(loaded.state.workshops).toEqual(world.state.workshops);
    advance(world, START_TIME + 60 * HOUR);
    advance(loaded, START_TIME + 60 * HOUR);
    expect(serializeWorld(loaded)).toBe(serializeWorld(world));
  });
});
