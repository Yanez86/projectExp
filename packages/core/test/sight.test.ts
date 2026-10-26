import { describe, expect, it } from "vitest";
import { biomeIndex, type BiomeId } from "../src/content/biomes";
import { visionRange } from "../src/content/vision";
import { distance, hex, hexAdd, hexKey, hexLine, hexesInRange, offsetToHex, type Hex } from "../src/hex";
import { sightFrom } from "../src/map/sight";
import { tileIndex, type WorldMap } from "../src/map/world";

/** Una mappa 15×15 di pianura, con il punto di vista al centro. */
function plainsMap(): { map: WorldMap; viewer: Hex } {
  const size = 15;
  const biomes = new Uint8Array(size * size).fill(biomeIndex("plains"));
  const viewer = offsetToHex(7, 7);
  return { map: { seed: "s", width: size, height: size, biomes, variants: new Uint8Array(size * size), start: viewer, places: [] }, viewer };
}

function set(map: WorldMap, h: Hex, biome: BiomeId): void {
  map.biomes[tileIndex(map, h)] = biomeIndex(biome);
}

const EAST = hex(1, 0);
const east = (h: Hex, n: number): Hex => hex(h.q + EAST.q * n, h.r + EAST.r * n);

function sees(map: WorldMap, viewer: Hex, range: number, target: Hex): boolean {
  return sightFrom(map, viewer, range).some((h) => hexKey(h) === hexKey(target));
}

describe("hexLine", () => {
  it("va da un estremo all'altro passando per caselle vicine", () => {
    const a = hex(0, 0);
    const b = hex(4, -2);
    const line = hexLine(a, b);
    expect(line).toHaveLength(distance(a, b) + 1);
    expect(line[0]).toEqual(a);
    expect(line.at(-1)).toEqual(b);
    for (let i = 1; i < line.length; i++) expect(distance(line[i - 1]!, line[i]!)).toBe(1);
  });
});

describe("vista", () => {
  it("in pianura arriva a 4 caselle in ogni direzione", () => {
    const { map, viewer } = plainsMap();
    expect(visionRange("plains")).toBe(4);
    expect(sightFrom(map, viewer, 4)).toHaveLength(hexesInRange(viewer, 4).length);
  });

  it("si ferma contro una montagna, che però si vede", () => {
    const { map, viewer } = plainsMap();
    set(map, east(viewer, 1), "mountains");
    expect(sees(map, viewer, 4, east(viewer, 1))).toBe(true);
    expect(sees(map, viewer, 4, east(viewer, 2))).toBe(false);
    expect(sees(map, viewer, 4, east(viewer, 4))).toBe(false);
    // Di lato alla montagna la vista è libera.
    expect(sees(map, viewer, 4, hexAdd(viewer, hex(0, -2)))).toBe(true);
  });

  it("attraverso una foresta vede solo una casella dietro", () => {
    const { map, viewer } = plainsMap();
    set(map, east(viewer, 1), "forest");
    expect(sees(map, viewer, 4, east(viewer, 1))).toBe(true);
    expect(sees(map, viewer, 4, east(viewer, 2))).toBe(true);
    expect(sees(map, viewer, 4, east(viewer, 3))).toBe(false);
  });

  it("due foreste di fila: si vede la seconda e nient'altro", () => {
    const { map, viewer } = plainsMap();
    set(map, east(viewer, 1), "forest");
    set(map, east(viewer, 2), "forest");
    expect(sees(map, viewer, 4, east(viewer, 2))).toBe(true);
    expect(sees(map, viewer, 4, east(viewer, 3))).toBe(false);
  });

  it("dalle colline si vede più lontano e sopra le foreste, non sopra le montagne", () => {
    const { map, viewer } = plainsMap();
    set(map, viewer, "hills");
    set(map, east(viewer, 1), "forest");
    expect(visionRange("hills")).toBe(5);
    expect(sees(map, viewer, 5, east(viewer, 4))).toBe(true);
    set(map, east(viewer, 2), "mountains");
    expect(sees(map, viewer, 5, east(viewer, 3))).toBe(false);
  });

  it("un buon Occhio vede una casella in più", () => {
    expect(visionRange("plains", 7)).toBe(5);
    expect(visionRange("plains", 6)).toBe(4);
  });
});
