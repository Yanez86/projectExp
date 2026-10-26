import { describe, expect, it } from "vitest";
import { biomeIndex, type BiomeId } from "../src/content/biomes";
import { BASE_STEP_MS, stepDuration } from "../src/content/movement";
import { hex, hexEquals, offsetToHex, type Hex } from "../src/hex";
import { FOG_UNEXPLORED, createFog } from "../src/map/fog";
import { biomeIdAt, type WorldMap } from "../src/map/world";
import {
  advance,
  applyCommand,
  createWorld,
  estimateArrival,
  setSpeed,
  skipAhead,
  syncTo,
} from "../src/sim/engine";
import { findRoute } from "../src/sim/route";
import { deserializeWorld, serializeWorld } from "../src/sim/save";
import { START_TIME, calendar, gameTimeAt, type Character, type World } from "../src/sim/state";

const LEGEND: Record<string, BiomeId> = { ".": "plains", "~": "shallow_water", f: "forest", "^": "mountains" };

/** Un mondo disegnato a mano: una riga di testo per riga di esagoni. */
function worldFrom(rows: string[], start: Hex): World {
  const height = rows.length;
  const width = rows[0]!.length;
  const biomes = new Uint8Array(width * height);
  rows.forEach((row, r) => [...row].forEach((ch, c) => (biomes[r * width + c] = biomeIndex(LEGEND[ch]!))));
  const map: WorldMap = { seed: "hand", width, height, biomes, variants: new Uint8Array(width * height), start };
  const character: Character = {
    id: 1,
    name: "Folio",
    gender: "m",
    ethnicity: "paperfolk",
    job: "explorer",
    stats: { vigor: 5, pace: 5, eye: 5, gab: 5, guts: 5 },
    hex: start,
    destination: null,
    route: [],
    step: null,
  };
  return {
    map,
    state: {
      seed: "hand",
      width,
      height,
      clock: { realAt: 0, gameAt: START_TIME, speed: 1 },
      time: START_TIME,
      fog: createFog(map),
      guild: { hex: start },
      characters: [character],
      events: [],
      nextSeq: 0,
    },
  };
}

const FAR = START_TIME + 1000 * BASE_STEP_MS;

describe("createWorld", () => {
  it("è deterministico e parte con due esploratori sulla sede", () => {
    const a = createWorld({ seed: "s", width: 32, height: 24, speed: 60, realNow: 1000 });
    const b = createWorld({ seed: "s", width: 32, height: 24, speed: 60, realNow: 1000 });
    expect(serializeWorld(a)).toBe(serializeWorld(b));
    expect(a.state.characters).toHaveLength(2);
    expect(a.state.characters[0]!.ethnicity).toBe("paperfolk");
    expect(a.state.characters[1]!.ethnicity).not.toBe("paperfolk");
    for (const c of a.state.characters) expect(hexEquals(c.hex, a.map.start)).toBe(true);
    expect(a.state.fog.state.some((v) => v !== FOG_UNEXPLORED)).toBe(true);
  });
});

describe("movimento", () => {
  it("raggiunge la destinazione in tempo reale e scopre la mappa", () => {
    const world = worldFrom(["........", "........", "........"], offsetToHex(0, 1));
    const target = offsetToHex(6, 1);
    world.state.fog.state.fill(1);
    expect(applyCommand(world, { kind: "move", characterId: 1, target })).toEqual({ ok: true });
    const eta = estimateArrival(world, world.state.characters[0]!)!;
    expect(eta).toBe(START_TIME + 6 * stepDuration("paperfolk", 5, "plains")!);

    expect(advance(world, eta - 1).some((n) => n.kind === "arrived")).toBe(false);
    const notices = advance(world, eta);
    expect(notices.some((n) => n.kind === "arrived")).toBe(true);
    const c = world.state.characters[0]!;
    expect(hexEquals(c.hex, target)).toBe(true);
    expect(c.step).toBeNull();
    expect(c.destination).toBeNull();
  });

  it("evita l'acqua che conosce e gira attorno a quella che scopre", () => {
    const rows = [".........", "....~....", "....~....", "....~....", "........."];
    const world = worldFrom(rows, offsetToHex(1, 2));
    const target = offsetToHex(7, 2);
    // Sotto le nuvole la strada dritta sembra buona; scoperta l'acqua, il percorso cambia.
    applyCommand(world, { kind: "move", characterId: 1, target });
    const visited: Hex[] = [];
    for (let t = START_TIME; t < FAR; t += BASE_STEP_MS / 4) {
      advance(world, t);
      const c = world.state.characters[0]!;
      visited.push(c.hex);
      if (!c.destination && !c.step) break;
    }
    const c = world.state.characters[0]!;
    expect(hexEquals(c.hex, target)).toBe(true);
    for (const h of visited) expect(biomeIdAt(world.map, h)).not.toBe("shallow_water");
  });

  it("si ferma se la destinazione si rivela irraggiungibile", () => {
    const world = worldFrom(["......~", "......~", "......~"], offsetToHex(0, 1));
    applyCommand(world, { kind: "move", characterId: 1, target: offsetToHex(6, 1) });
    const notices = advance(world, FAR);
    expect(notices.some((n) => n.kind === "blocked")).toBe(true);
    expect(world.state.characters[0]!.destination).toBeNull();
    expect(applyCommand(world, { kind: "move", characterId: 1, target: offsetToHex(6, 1) })).toEqual({
      ok: false,
      reason: "unreachable",
    });
  });

  it("finisce il passo in corso prima di fermarsi", () => {
    const world = worldFrom(["........"], offsetToHex(0, 0));
    applyCommand(world, { kind: "move", characterId: 1, target: offsetToHex(7, 0) });
    advance(world, START_TIME + 1);
    applyCommand(world, { kind: "stop", characterId: 1 });
    advance(world, FAR);
    expect(hexEquals(world.state.characters[0]!.hex, offsetToHex(1, 0))).toBe(true);
  });

  it("preferisce un giro in pianura a una montagna", () => {
    const world = worldFrom([".....", ".^^^.", "....."], offsetToHex(0, 1));
    // Mappa tutta nota, per confrontare i costi veri.
    world.state.fog.state.fill(1);
    const route = findRoute(world.map, world.state.fog, world.state.characters[0]!, offsetToHex(0, 1), offsetToHex(4, 1))!;
    expect(route.some((h) => biomeIdAt(world.map, h) === "mountains")).toBe(false);
  });
});

describe("tempo", () => {
  it("avanzare in un colpo o a piccoli passi dà lo stesso mondo", () => {
    const make = () => {
      const w = createWorld({ seed: "catch-up", width: 48, height: 36, speed: 60, realNow: 0 });
      const [a, b] = w.state.characters;
      applyCommand(w, { kind: "move", characterId: a!.id, target: hex(a!.hex.q + 6, a!.hex.r - 3) });
      applyCommand(w, { kind: "move", characterId: b!.id, target: hex(b!.hex.q - 5, b!.hex.r + 4) });
      return w;
    };
    const once = make();
    const steps = make();
    const end = START_TIME + 30 * BASE_STEP_MS;
    advance(once, end);
    for (let t = START_TIME; t <= end; t += 77_777) advance(steps, t);
    advance(steps, end);
    expect(serializeWorld(steps)).toBe(serializeWorld(once));
  });

  it("salta avanti eseguendo quello che succede nel frattempo", () => {
    const world = worldFrom(["........"], offsetToHex(0, 0));
    world.state.fog.state.fill(1);
    applyCommand(world, { kind: "move", characterId: 1, target: offsetToHex(5, 0) });
    const notices = skipAhead(world, 6 * 60 * 60 * 1000, 0);
    expect(notices.some((n) => n.kind === "arrived")).toBe(true);
    expect(world.state.time).toBe(START_TIME + 6 * 60 * 60 * 1000);
  });

  it("segue l'orologio reale e la velocità", () => {
    const world = createWorld({ seed: "clock", width: 32, height: 24, speed: 60, realNow: 1_000 });
    expect(gameTimeAt(world.state.clock, 2_000)).toBe(START_TIME + 60_000);
    syncTo(world, 2_000);
    setSpeed(world, 600, 2_000);
    expect(gameTimeAt(world.state.clock, 3_000)).toBe(START_TIME + 60_000 + 600_000);
    expect(calendar(START_TIME)).toEqual({ day: 1, hours: 8, minutes: 0 });
  });
});

describe("salvataggi", () => {
  it("salva e ricarica lo stesso mondo, anche a metà viaggio", () => {
    const world = createWorld({ seed: "save", width: 40, height: 30, speed: 60, realNow: 0 });
    const c = world.state.characters[0]!;
    applyCommand(world, { kind: "move", characterId: c.id, target: hex(c.hex.q + 4, c.hex.r) });
    advance(world, START_TIME + BASE_STEP_MS);
    const json = serializeWorld(world);
    const loaded = deserializeWorld(json)!;
    expect(loaded).not.toBeNull();
    expect(serializeWorld(loaded)).toBe(json);
    expect(loaded.map.biomes).toEqual(world.map.biomes);
    advance(world, FAR);
    advance(loaded, FAR);
    expect(serializeWorld(loaded)).toBe(serializeWorld(world));
  });

  it("rifiuta salvataggi rovinati o di un'altra versione", () => {
    expect(deserializeWorld("non è json")).toBeNull();
    expect(deserializeWorld(JSON.stringify({ version: 999 }))).toBeNull();
  });
});
