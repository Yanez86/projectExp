import { describe, expect, it } from "vitest";
import { LEVEL_MS, REPOPULATE_MS, WOUND_MS } from "../src/content/dungeons";
import { START_GOLD } from "../src/content/guild";
import { DUNGEON_MATERIAL_IDS } from "../src/content/materials";
import { hexEquals, offsetToHex } from "../src/hex";
import type { Place } from "../src/map/places";
import { rollCharacter } from "../src/sim/characters";
import { dungeonLevels, levelEmptyUntil, squadStrength, successChance } from "../src/sim/dungeon";
import { advance, applyCommand, createWorld } from "../src/sim/engine";
import { deserializeWorld, serializeWorld } from "../src/sim/save";
import { DAY_MS, START_TIME, type Notice, type World } from "../src/sim/state";
import { createRng } from "../src/rng";
import { makeCharacter, worldFrom } from "./helpers";

const DUNGEON: Place = { id: 1, kind: "dungeon", hex: offsetToHex(6, 1), name: "Fossonero" };
const FAR = START_TIME + 3 * DAY_MS;

/** Una pianura con la sede a ovest e un dungeon a est; `stats` per i mercenari (Vigore e Fegato). */
function cave(squad: number, stat: number, ethnicity: "sherdkin" | "paperfolk" = "sherdkin", expeditionId = 1): World {
  const world = worldFrom(["........", "........", "........"], offsetToHex(0, 1), [DUNGEON]);
  world.state.fog.state.fill(1);
  for (let i = 0; i < squad; i++) {
    const c = makeCharacter(2 + i, world.map.start, "mercenary", ethnicity);
    c.stats = { ...c.stats, vigor: stat, guts: stat };
    world.state.characters.push(c);
  }
  world.state.nextCharacterId = 2 + squad;
  world.state.nextExpeditionId = expeditionId;
  return world;
}

const squadIds = (n: number) => Array.from({ length: n }, (_, i) => 2 + i);
const done = (notices: Notice[]) => notices.find((n) => n.kind === "expedition_done") as Extract<Notice, { kind: "expedition_done" }>;

describe("dungeon", () => {
  it("vicino alla sede ha due livelli", () => {
    expect(dungeonLevels(cave(1, 5), DUNGEON)).toBe(2);
  });

  it("riuscire è più facile in tanti e più difficile in fondo", () => {
    expect(successChance(40, 1)).toBeGreaterThan(successChance(20, 1));
    expect(successChance(40, 3)).toBeLessThan(successChance(40, 1));
  });

  it("la squadra va all'ingresso, entra, scende e torna con il bottino", () => {
    const world = cave(2, 8);
    expect(applyCommand(world, { kind: "expedition", placeId: DUNGEON.id, members: [2, 3], depth: 2 })).toEqual({ ok: true });
    const notices = advance(world, FAR);
    expect(notices.some((n) => n.kind === "expedition_started")).toBe(true);
    const result = done(notices);
    expect(result).toBeDefined();
    const { guild } = world.state;
    expect(guild.gold).toBe(START_GOLD + result.gold);
    expect(DUNGEON_MATERIAL_IDS.reduce((sum, m) => sum + guild.stock[m], 0)).toBe(result.units);
    expect(guild.items).toHaveLength(result.items);
    expect(guild.relics).toBe(result.relics);
    if (result.complete) expect(result.cleared).toBe(2);
    expect(world.state.expeditions).toHaveLength(0);
    for (const c of world.state.characters.filter((x) => x.job === "mercenary")) {
      expect(c.task).toBeNull();
      expect(hexEquals(c.hex, world.map.start)).toBe(true);
    }
  });

  it("un livello ripulito resta vuoto: si passa senza trovare niente, poi si ripopola", () => {
    const world = cave(1, 8);
    world.state.cleared.push({ placeId: DUNGEON.id, level: 1, clearedAt: START_TIME }, { placeId: DUNGEON.id, level: 2, clearedAt: START_TIME });
    applyCommand(world, { kind: "expedition", placeId: DUNGEON.id, members: [2], depth: 2 });
    const result = done(advance(world, FAR));
    expect(result).toMatchObject({ complete: true, cleared: 2, gold: 0, units: 0, items: 0, relics: 0 });
    expect(levelEmptyUntil(world, DUNGEON.id, 1)).toBe(START_TIME + REPOPULATE_MS);
    expect(levelEmptyUntil(world, DUNGEON.id, 1, START_TIME + REPOPULATE_MS)).toBeUndefined();
  });

  it("una squadra forte riesce più spesso di una debole", () => {
    const wins = (stat: number) => {
      let n = 0;
      for (let id = 1; id <= 30; id++) {
        const world = cave(3, stat, "paperfolk", id);
        applyCommand(world, { kind: "expedition", placeId: DUNGEON.id, members: squadIds(3), depth: 1 });
        if (done(advance(world, FAR))?.complete) n++;
      }
      return n;
    };
    expect(wins(10)).toBeGreaterThan(wins(1));
  });

  it("le cose vanno male: ferite, cicatrici d'oro per i Cocciai, e chi non torna", () => {
    let wounded = 0;
    let scars = 0;
    let lost = 0;
    for (let id = 1; id <= 40; id++) {
      const world = cave(3, 1, "sherdkin", id);
      applyCommand(world, { kind: "expedition", placeId: DUNGEON.id, members: squadIds(3), depth: 2 });
      const notices = advance(world, START_TIME + 6 * LEVEL_MS);
      for (const n of notices) {
        if (n.kind === "wounded") {
          wounded++;
          const c = world.state.characters.find((x) => x.id === n.characterId)!;
          expect(c.woundedUntil).toBe(n.at + WOUND_MS);
          expect(applyCommand(world, { kind: "move", characterId: c.id, target: offsetToHex(2, 2) })).toMatchObject({ ok: false });
        }
        if (n.kind === "scar") {
          scars++;
          const c = world.state.characters.find((x) => x.id === n.characterId)!;
          expect(c.stats[n.stat]).toBe(2);
          expect(c.story.more).toContainEqual({ kind: "scar", stat: n.stat, placeId: DUNGEON.id });
        }
        if (n.kind === "lost") lost++;
      }
      expect(world.state.characters.filter((c) => c.job === "mercenary")).toHaveLength(3 - notices.filter((n) => n.kind === "lost").length);
    }
    expect(wounded).toBeGreaterThan(0);
    expect(scars).toBeGreaterThan(0);
    expect(lost).toBeGreaterThan(0);
  });

  it("i feriti guariscono dopo un giorno", () => {
    for (let id = 1; id <= 40; id++) {
      const world = cave(3, 1, "paperfolk", id);
      applyCommand(world, { kind: "expedition", placeId: DUNGEON.id, members: squadIds(3), depth: 1 });
      const hurt = advance(world, START_TIME + 3 * LEVEL_MS).find((n) => n.kind === "wounded");
      if (!hurt || hurt.kind !== "wounded") continue;
      const healed = advance(world, hurt.at + WOUND_MS);
      expect(healed).toContainEqual(expect.objectContaining({ kind: "healed", characterId: hurt.characterId }));
      expect(world.state.characters.find((c) => c.id === hurt.characterId)!.woundedUntil).toBeNull();
      return;
    }
    throw new Error("nessun ferito in 40 spedizioni");
  });

  it("rifiuta le squadre impossibili", () => {
    const world = cave(3, 5);
    world.state.characters.push(makeCharacter(9, world.map.start, "explorer"));
    const go = (members: number[], depth = 1) => applyCommand(world, { kind: "expedition", placeId: DUNGEON.id, members, depth });
    expect(go([])).toEqual({ ok: false, reason: "squad" });
    expect(go([2, 2])).toEqual({ ok: false, reason: "squad" });
    expect(go([9])).toEqual({ ok: false, reason: "not-mercenary" });
    expect(go([2], 3)).toEqual({ ok: false, reason: "depth" });
    world.state.characters[1]!.woundedUntil = START_TIME + 1;
    expect(go([2])).toEqual({ ok: false, reason: "wounded" });
    expect(go([3])).toEqual({ ok: true });
    expect(go([3, 4])).toEqual({ ok: false, reason: "busy" });
    world.state.fog.state.fill(0);
    expect(go([4])).toEqual({ ok: false, reason: "unexplored" });
  });

  it("le armi rendono più forti", () => {
    const world = cave(1, 5);
    const c = world.state.characters[1]!;
    const bare = squadStrength([c]);
    c.equipment.weapon = { id: 1, kind: "moon_hammer", rarity: 3 };
    expect(squadStrength([c])).toBe(bare + 6);
  });
});

describe("spedizioni nel tempo", () => {
  function expedition(): World {
    const world = createWorld({ seed: "delve", width: 48, height: 36, speed: 60, realNow: 0 });
    world.state.fog.state.fill(1);
    const dungeon = world.map.places.find((p) => p.kind === "dungeon")!;
    const rng = createRng(3);
    for (let i = 0; i < 2; i++) {
      world.state.characters.push(rollCharacter(rng, world.state.nextCharacterId++, "sherdkin", "mercenary", world.map.start, new Set()));
    }
    const ids = world.state.characters.filter((c) => c.job === "mercenary").map((c) => c.id);
    expect(applyCommand(world, { kind: "expedition", placeId: dungeon.id, members: ids, depth: 1 })).toEqual({ ok: true });
    return world;
  }

  it("avanzare in un colpo o a piccoli passi dà lo stesso mondo", () => {
    const once = expedition();
    const steps = expedition();
    advance(once, FAR);
    for (let t = START_TIME; t <= FAR; t += 999_999) advance(steps, t);
    advance(steps, FAR);
    expect(serializeWorld(steps)).toBe(serializeWorld(once));
  });

  it("salva e ricarica a metà spedizione", () => {
    const world = expedition();
    advance(world, START_TIME + 3 * 3_600_000);
    const loaded = deserializeWorld(serializeWorld(world))!;
    expect(loaded.state.expeditions).toEqual(world.state.expeditions);
    advance(world, FAR);
    advance(loaded, FAR);
    expect(serializeWorld(loaded)).toBe(serializeWorld(world));
  });
});
