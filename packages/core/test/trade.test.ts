import { describe, expect, it } from "vitest";
import { STORAGE_CAPACITY, START_GOLD } from "../src/content/guild";
import { PRODUCT_IDS, RAW_MATERIAL_IDS, type MaterialId } from "../src/content/materials";
import { RECOVERY_MS } from "../src/content/trade";
import { hexEquals, offsetToHex } from "../src/hex";
import type { Place } from "../src/map/places";
import { advance, applyCommand, createWorld } from "../src/sim/engine";
import { deserializeWorld, serializeWorld } from "../src/sim/save";
import { START_TIME, type World } from "../src/sim/state";
import { cargoCapacity, priceList, quotePurchase, quoteSale, unitQuote } from "../src/sim/trade";
import { makeCharacter, worldFrom } from "./helpers";

const HOUR = 3_600_000;
const FAR = START_TIME + 48 * HOUR;
const TOWN: Place = { id: 1, kind: "town", hex: offsetToHex(5, 1), name: "Valemir" };
const MARKET: Place = { id: 2, kind: "market", hex: offsetToHex(7, 2), name: "Garmont" };

/** Una pianura con la sede a ovest, una cittadina e un mercato; un esploratore e un carovaniere lumacaio. */
function plain(): World {
  const world = worldFrom(["........", "........", "........"], offsetToHex(0, 1), [TOWN, MARKET]);
  world.state.characters.push(makeCharacter(2, world.map.start, "caravaneer", "shellfolk"));
  world.state.fog.state.fill(1);
  return world;
}

const caravaneer = (world: World) => world.state.characters[1]!;

describe("prezzi", () => {
  it("ogni luogo ha i suoi, dal seme della mappa", () => {
    const world = plain();
    const town = priceList(world.map, TOWN);
    expect(priceList(world.map, TOWN)).toEqual(town);
    expect(town.featured).toHaveLength(2);
    for (const m of town.featured) {
      expect(PRODUCT_IDS).toContain(m);
      expect(town.factors[m]).toBeGreaterThanOrEqual(150);
    }
    const market = priceList(world.map, MARKET);
    expect(market.featured).toHaveLength(3);
    for (const m of market.featured) expect(RAW_MATERIAL_IDS).toContain(m);
  });

  it("scendono a ogni unità venduta e risalgono con il tempo", () => {
    const world = plain();
    const first = unitQuote(world, TOWN, "tools");
    expect(quoteSale(world, TOWN, [["tools", 20]])).toBeLessThan(20 * first);
    world.state.guild.stock.tools = 20;
    applyCommand(world, { kind: "trade", characterId: 2, placeId: TOWN.id, mode: "sell", goods: [["tools", 20]] });
    const sold = advance(world, FAR).find((n) => n.kind === "sold")!;
    expect(unitQuote(world, TOWN, "tools", sold.at)).toBeLessThan(first);
    expect(unitQuote(world, TOWN, "tools", sold.at + 20 * RECOVERY_MS)).toBe(first);
  });
});

describe("carovane", () => {
  it("vendono il carico in una cittadina, incassano e tornano alla sede", () => {
    const world = plain();
    world.state.guild.stock.tools = 8;
    const expected = quoteSale(world, TOWN, [["tools", 5]]);
    expect(applyCommand(world, { kind: "trade", characterId: 2, placeId: TOWN.id, mode: "sell", goods: [["tools", 5]] })).toEqual({ ok: true });
    expect(world.state.guild.stock.tools).toBe(3);
    expect(caravaneer(world).cargo).toEqual([["tools", 5]]);

    const notices = advance(world, FAR);
    expect(notices).toContainEqual(expect.objectContaining({ kind: "sold", characterId: 2, placeId: TOWN.id, units: 5, gold: expected }));
    expect(world.state.guild.gold).toBe(START_GOLD + expected);
    const c = caravaneer(world);
    expect(hexEquals(c.hex, world.map.start)).toBe(true);
    expect(c.task).toBeNull();
    expect(c.cargo).toEqual([]);
  });

  it("comprano a un mercato e scaricano in magazzino", () => {
    const world = plain();
    const m = priceList(world.map, MARKET).featured[0]!;
    const cost = quotePurchase(world, MARKET, [[m, 10]]);
    expect(applyCommand(world, { kind: "trade", characterId: 2, placeId: MARKET.id, mode: "buy", goods: [[m, 10]] })).toEqual({ ok: true });
    expect(world.state.guild.gold).toBe(START_GOLD);

    const notices = advance(world, FAR);
    expect(notices).toContainEqual(expect.objectContaining({ kind: "bought", units: 10, gold: cost }));
    expect(notices).toContainEqual(expect.objectContaining({ kind: "unloaded", characterId: 2, units: 10 }));
    expect(world.state.guild.gold).toBe(START_GOLD - cost);
    expect(world.state.guild.stock[m]).toBe(10);
  });

  it("al mercato comprano solo finché bastano le monete", () => {
    const world = plain();
    const m = priceList(world.map, MARKET).featured[0]!;
    const one = unitQuote(world, MARKET, m);
    applyCommand(world, { kind: "trade", characterId: 2, placeId: MARKET.id, mode: "buy", goods: [[m, 10]] });
    world.state.guild.gold = one * 3;
    advance(world, FAR);
    expect(world.state.guild.stock[m]).toBe(3);
    expect(world.state.guild.gold).toBe(0);
  });

  it("durante il viaggio non prendono altri ordini", () => {
    const world = plain();
    world.state.guild.stock.bread = 5;
    applyCommand(world, { kind: "trade", characterId: 2, placeId: TOWN.id, mode: "sell", goods: [["bread", 5]] });
    expect(applyCommand(world, { kind: "move", characterId: 2, target: offsetToHex(2, 2) })).toEqual({ ok: false, reason: "busy" });
  });

  it("rifiutano gli ordini impossibili", () => {
    const world = plain();
    const sell = (goods: [MaterialId, number][], placeId = TOWN.id, characterId = 2) =>
      applyCommand(world, { kind: "trade", characterId, placeId, mode: "sell", goods });
    world.state.guild.stock.tools = 100;
    expect(sell([["tools", 1]], TOWN.id, 1)).toEqual({ ok: false, reason: "not-caravaneer" });
    expect(sell([["tools", 1]], MARKET.id)).toEqual({ ok: false, reason: "wrong-place" });
    expect(sell([])).toEqual({ ok: false, reason: "empty" });
    expect(sell([["tools", cargoCapacity(caravaneer(world)) + 1]])).toEqual({ ok: false, reason: "capacity" });
    expect(sell([["bread", 1]])).toEqual({ ok: false, reason: "stock" });
    const raw = RAW_MATERIAL_IDS.find((m) => !priceList(world.map, MARKET).featured.includes(m))!;
    expect(applyCommand(world, { kind: "trade", characterId: 2, placeId: MARKET.id, mode: "buy", goods: [[raw, 1]] })).toEqual({
      ok: false,
      reason: "not-sold-here",
    });
    world.state.guild.gold = 0;
    const offered = priceList(world.map, MARKET).featured[0]!;
    expect(applyCommand(world, { kind: "trade", characterId: 2, placeId: MARKET.id, mode: "buy", goods: [[offered, 1]] })).toEqual({
      ok: false,
      reason: "gold",
    });
    applyCommand(world, { kind: "move", characterId: 2, target: offsetToHex(2, 1) });
    advance(world, FAR);
    expect(sell([["tools", 1]])).toEqual({ ok: false, reason: "not-at-guild" });
    world.state.fog.state.fill(0);
    expect(sell([["tools", 1]])).toEqual({ ok: false, reason: "unexplored" });
  });

  it("il magazzino pieno trattiene solo quello che ci sta", () => {
    const world = plain();
    const m = priceList(world.map, MARKET).featured[0]!;
    world.state.guild.stock[m] = STORAGE_CAPACITY - 4;
    applyCommand(world, { kind: "trade", characterId: 2, placeId: MARKET.id, mode: "buy", goods: [[m, 10]] });
    advance(world, FAR);
    expect(world.state.guild.stock[m]).toBe(STORAGE_CAPACITY);
  });
});

describe("commercio nel tempo", () => {
  function trading(): World {
    const world = plain();
    world.state.guild.stock.tools = 20;
    applyCommand(world, { kind: "trade", characterId: 2, placeId: TOWN.id, mode: "sell", goods: [["tools", 20]] });
    return world;
  }

  it("avanzare in un colpo o a piccoli passi dà lo stesso mondo", () => {
    const once = trading();
    const steps = trading();
    advance(once, FAR);
    for (let t = START_TIME; t <= FAR; t += 777_777) advance(steps, t);
    advance(steps, FAR);
    expect(serializeWorld(steps)).toBe(serializeWorld(once));
  });

  it("salva e ricarica a metà viaggio, con il carico", () => {
    // La mappa si rigenera dal seme: serve un mondo generato, non disegnato a mano.
    const world = createWorld({ seed: "trade", width: 48, height: 36, speed: 60, realNow: 0 });
    world.state.fog.state.fill(1);
    const town = world.map.places.find((p) => p.kind === "town")!;
    const c = world.state.characters.find((x) => x.job === "caravaneer")!;
    world.state.guild.stock.tools = 20;
    expect(applyCommand(world, { kind: "trade", characterId: c.id, placeId: town.id, mode: "sell", goods: [["tools", 20]] })).toEqual({
      ok: true,
    });
    advance(world, START_TIME + HOUR / 2);
    const loaded = deserializeWorld(serializeWorld(world))!;
    expect(loaded.state.characters.find((x) => x.id === c.id)!.cargo).toEqual([["tools", 20]]);
    advance(world, FAR);
    advance(loaded, FAR);
    expect(serializeWorld(loaded)).toBe(serializeWorld(world));
  });
});
