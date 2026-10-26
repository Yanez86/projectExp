import { describe, expect, it } from "vitest";
import { PLACE_GAP, PLACE_GUILD_GAP, PLACE_KINDS, PLACE_RULES } from "../src/content/places";
import { TERRAIN_COST } from "../src/content/movement";
import { distance, hexKey, neighbors, type Hex } from "../src/hex";
import { generateMap } from "../src/map/generate";
import { biomeIdAt, placeAt, type WorldMap } from "../src/map/world";

function reachable(map: WorldMap): Set<string> {
  const seen = new Set([hexKey(map.start)]);
  const queue: Hex[] = [map.start];
  while (queue.length > 0) {
    const h = queue.shift()!;
    for (const n of neighbors(h)) {
      const biome = biomeIdAt(map, n);
      if (!biome || TERRAIN_COST[biome] === null || seen.has(hexKey(n))) continue;
      seen.add(hexKey(n));
      queue.push(n);
    }
  }
  return seen;
}

describe("luoghi di interesse", () => {
  it("sono sempre gli stessi per lo stesso seed", () => {
    const a = generateMap({ seed: "places", width: 64, height: 48 });
    const b = generateMap({ seed: "places", width: 64, height: 48 });
    expect(a.places).toEqual(b.places);
  });

  it("rispettano biomi, distanze e raggiungibilità, su molte mappe", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const map = generateMap({ seed, width: 64, height: 48 });
      const land = reachable(map);
      for (const kind of PLACE_KINDS) expect(map.places.some((p) => p.kind === kind), `${seed}: ${kind}`).toBe(true);
      for (const p of map.places) {
        const rule = PLACE_RULES.find((r) => r.kind === p.kind)!;
        expect(rule.biomes).toContain(biomeIdAt(map, p.hex));
        expect(land.has(hexKey(p.hex)), `${seed}: ${p.name} raggiungibile`).toBe(true);
        expect(distance(p.hex, map.start)).toBeGreaterThanOrEqual(PLACE_GUILD_GAP);
        expect(placeAt(map, p.hex)).toBe(p);
        for (const q of map.places) {
          if (q === p) continue;
          expect(distance(p.hex, q.hex)).toBeGreaterThanOrEqual(q.kind === p.kind ? rule.spacing : PLACE_GAP);
        }
      }
      expect(new Set(map.places.map((p) => p.name)).size).toBe(map.places.length);
    }
  });

  it("mettono una cittadina non lontana dalla sede", () => {
    for (const seed of ["a", "b", "c", "d"]) {
      const map = generateMap({ seed, width: 64, height: 48 });
      const towns = map.places.filter((p) => p.kind === "town");
      expect(Math.min(...towns.map((t) => distance(t.hex, map.start)))).toBeLessThanOrEqual(12);
    }
  });
});
