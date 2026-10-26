import { describe, expect, it } from "vitest";
import { ETHNICITIES, STAT_IDS, STAT_MAX, STAT_MIN } from "../src/content/ethnicities";
import { HIRE_MAX, HIRE_MIN, START_GOLD, WAGE_DIVISOR } from "../src/content/guild";
import { COMFORTABLE_FACTOR, affinityFactor } from "../src/content/movement";
import { storyEffects } from "../src/content/stories";
import { hexEquals, offsetToHex } from "../src/hex";
import type { Place } from "../src/map/places";
import { effectiveStats, hireCost, rollCharacter, wage } from "../src/sim/characters";
import { advance, applyCommand, createWorld } from "../src/sim/engine";
import { dailyWages } from "../src/sim/payroll";
import { serializeWorld } from "../src/sim/save";
import { DAY_MS, START_TIME, type World } from "../src/sim/state";
import { tavernCandidates, tavernPeriod } from "../src/sim/tavern";
import { createRng } from "../src/rng";
import { makeCharacter, worldFrom } from "./helpers";

const TOWN: Place = { id: 1, kind: "town", hex: offsetToHex(5, 1), name: "Valemir" };

function village(): World {
  const world = worldFrom(["........", "........", "........"], offsetToHex(0, 1), [TOWN]);
  world.state.fog.state.fill(1);
  return world;
}

describe("storie dei personaggi", () => {
  it("statistiche = base dell'etnia + storia, sempre nei limiti", () => {
    const rng = createRng(42);
    for (let i = 0; i < 50; i++) {
      const c = rollCharacter(rng, i, "sherdkin", "mercenary", offsetToHex(0, 0), new Set());
      const effects = storyEffects(c.story);
      for (const stat of STAT_IDS) {
        const expected = Math.min(STAT_MAX, Math.max(STAT_MIN, ETHNICITIES.sherdkin.stats[stat] + (effects[stat] ?? 0)));
        expect(c.stats[stat]).toBe(expected);
      }
    }
  });

  it("si muove bene nel bioma dove è nato", () => {
    expect(affinityFactor("paperfolk", "forest")).toBe(100);
    expect(affinityFactor("paperfolk", "forest", "forest")).toBe(COMFORTABLE_FACTOR);
  });

  it("costa secondo le statistiche, e la paga è un ventesimo", () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const c = rollCharacter(rng, i, "paperfolk", "explorer", offsetToHex(0, 0), new Set());
      const cost = hireCost(c);
      expect(cost).toBeGreaterThanOrEqual(HIRE_MIN);
      expect(cost).toBeLessThanOrEqual(HIRE_MAX);
      expect(wage(c)).toBe(Math.ceil(cost / WAGE_DIVISOR));
    }
  });

  it("la squadra iniziale ha storie diverse e nessun mercenario", () => {
    const world = createWorld({ seed: "crew", width: 40, height: 30, speed: 60, realNow: 0 });
    expect(world.state.characters.some((c) => c.job === "mercenary")).toBe(false);
    const names = world.state.characters.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("paga", () => {
  it("ogni giorno la gilda paga tutti", () => {
    const world = createWorld({ seed: "wages", width: 40, height: 30, speed: 60, realNow: 0 });
    const due = dailyWages(world);
    const notices = advance(world, START_TIME + DAY_MS);
    expect(notices).toContainEqual(expect.objectContaining({ kind: "paid", gold: due, count: 4 }));
    expect(world.state.guild.gold).toBe(START_GOLD - due);
    advance(world, START_TIME + 2 * DAY_MS);
    expect(world.state.guild.gold).toBe(START_GOLD - 2 * due);
  });

  it("chi non viene pagato per due giorni se ne va, e lascia l'equipaggiamento nel forziere", () => {
    const world = createWorld({ seed: "wages", width: 40, height: 30, speed: 60, realNow: 0 });
    world.state.characters[0]!.equipment.trinket = { id: 99, kind: "snail_bell", rarity: 1 };
    world.state.guild.gold = 0;
    const first = advance(world, START_TIME + DAY_MS);
    expect(first.filter((n) => n.kind === "unpaid")).toHaveLength(4);
    expect(world.state.characters).toHaveLength(4);
    const second = advance(world, START_TIME + 2 * DAY_MS);
    expect(second.filter((n) => n.kind === "left")).toHaveLength(4);
    expect(world.state.characters).toHaveLength(0);
    expect(world.state.guild.items).toEqual([{ id: 99, kind: "snail_bell", rarity: 1 }]);
  });

  it("una paga arrivata in tempo azzera il conto", () => {
    const world = createWorld({ seed: "wages", width: 40, height: 30, speed: 60, realNow: 0 });
    world.state.guild.gold = 0;
    advance(world, START_TIME + DAY_MS);
    world.state.guild.gold = 10_000;
    advance(world, START_TIME + 2 * DAY_MS);
    expect(world.state.characters.every((c) => c.unpaid === 0)).toBe(true);
    expect(world.state.characters).toHaveLength(4);
  });
});

describe("locanda", () => {
  it("ogni cittadina ha 2 o 3 personaggi, che cambiano ogni due giorni", () => {
    const world = village();
    const now = tavernCandidates(world, TOWN);
    expect(now.length).toBeGreaterThanOrEqual(2);
    expect(now.length).toBeLessThanOrEqual(3);
    expect(tavernCandidates(world, TOWN)).toEqual(now);
    const later = tavernCandidates(world, TOWN, START_TIME + 2 * DAY_MS);
    expect(tavernPeriod(START_TIME + 2 * DAY_MS)).toBe(1);
    expect(later.map((c) => c.character.name)).not.toEqual(now.map((c) => c.character.name));
  });

  it("si ingaggia pagando; il nuovo arrivato parte dalla cittadina", () => {
    const world = village();
    const [candidate] = tavernCandidates(world, TOWN);
    world.state.guild.gold = 1_000;
    expect(applyCommand(world, { kind: "hire", placeId: TOWN.id, slot: candidate!.slot })).toEqual({ ok: true });
    expect(world.state.guild.gold).toBe(1_000 - candidate!.cost);
    const hired = world.state.characters.at(-1)!;
    expect(hired.id).toBe(2);
    expect(hired.name).toBe(candidate!.character.name);
    expect(hexEquals(hired.hex, TOWN.hex)).toBe(true);
    expect(tavernCandidates(world, TOWN).some((c) => c.slot === candidate!.slot)).toBe(false);
    expect(applyCommand(world, { kind: "hire", placeId: TOWN.id, slot: candidate!.slot })).toEqual({ ok: false, reason: "gone" });
  });

  it("non propone omonimi di chi è già nella gilda", () => {
    for (let seed = 0; seed < 20; seed++) {
      const base = village();
      const world: World = { state: base.state, map: { ...base.map, seed: `omonimi-${seed}` } };
      // Metà dei nomi di ogni etnia sono già presi.
      let id = 2;
      for (const e of Object.values(ETHNICITIES)) {
        for (const [name] of e.names.slice(0, 4)) world.state.characters.push({ ...makeCharacter(id++, world.map.start), name });
      }
      const taken = world.state.characters.map((c) => c.name);
      for (const cand of tavernCandidates(world, TOWN)) expect(taken).not.toContain(cand.character.name);
    }
  });

  it("rifiuta se le monete non bastano o la cittadina non è ancora scoperta", () => {
    const world = village();
    const [candidate] = tavernCandidates(world, TOWN);
    world.state.guild.gold = candidate!.cost - 1;
    expect(applyCommand(world, { kind: "hire", placeId: TOWN.id, slot: candidate!.slot })).toEqual({ ok: false, reason: "gold" });
    world.state.fog.state.fill(0);
    expect(applyCommand(world, { kind: "hire", placeId: TOWN.id, slot: candidate!.slot })).toEqual({ ok: false, reason: "unexplored" });
  });
});

describe("equipaggiamento", () => {
  function armed(): World {
    const world = village();
    world.state.characters.push(makeCharacter(2, world.map.start, "mercenary", "sherdkin"));
    world.state.guild.items.push(
      { id: 1, kind: "crooked_compass", rarity: 2 },
      { id: 2, kind: "cleaver", rarity: 1 },
      { id: 3, kind: "snail_bell", rarity: 1 },
    );
    return world;
  }

  it("il ninnolo alza la sua statistica", () => {
    const world = armed();
    expect(applyCommand(world, { kind: "equip", characterId: 1, itemId: 1 })).toEqual({ ok: true });
    const c = world.state.characters[0]!;
    expect(effectiveStats(c).eye).toBe(c.stats.eye + 2);
    expect(world.state.guild.items.map((i) => i.id)).toEqual([2, 3]);
  });

  it("solo i mercenari portano armi e armature", () => {
    const world = armed();
    expect(applyCommand(world, { kind: "equip", characterId: 1, itemId: 2 })).toEqual({ ok: false, reason: "wrong-slot" });
    expect(applyCommand(world, { kind: "equip", characterId: 2, itemId: 2 })).toEqual({ ok: true });
    expect(world.state.characters[1]!.equipment.weapon?.kind).toBe("cleaver");
  });

  it("cambiare ninnolo rimette il vecchio nel forziere; togliere lo rimette pure", () => {
    const world = armed();
    applyCommand(world, { kind: "equip", characterId: 1, itemId: 1 });
    applyCommand(world, { kind: "equip", characterId: 1, itemId: 3 });
    expect(world.state.characters[0]!.equipment.trinket?.id).toBe(3);
    expect(world.state.guild.items.map((i) => i.id).sort()).toEqual([1, 2]);
    expect(applyCommand(world, { kind: "unequip", characterId: 1, slot: "trinket" })).toEqual({ ok: true });
    expect(world.state.guild.items).toHaveLength(3);
  });

  it("si cambia solo alla sede", () => {
    const world = armed();
    applyCommand(world, { kind: "move", characterId: 1, target: offsetToHex(3, 1) });
    advance(world, START_TIME + DAY_MS);
    expect(applyCommand(world, { kind: "equip", characterId: 1, itemId: 1 })).toEqual({ ok: false, reason: "not-at-guild" });
  });

  it("il Passo del ninnolo accorcia i viaggi", () => {
    const slow = armed();
    const fast = armed();
    applyCommand(fast, { kind: "equip", characterId: 1, itemId: 3 });
    for (const w of [slow, fast]) applyCommand(w, { kind: "move", characterId: 1, target: offsetToHex(7, 1) });
    expect(fast.state.characters[0]!.step!.arriveAt).toBeLessThan(slow.state.characters[0]!.step!.arriveAt);
  });
});

describe("salvataggi della squadra", () => {
  it("storie, paga e locanda passano dal salvataggio", () => {
    const world = createWorld({ seed: "crew-save", width: 40, height: 30, speed: 60, realNow: 0 });
    advance(world, START_TIME + DAY_MS + 1);
    const json = serializeWorld(world);
    expect(json).toContain("\"story\"");
    expect(json).toContain("\"unpaid\"");
  });
});
