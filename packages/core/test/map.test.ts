import { describe, expect, it } from "vitest";
import { BIOME_IDS } from "../src/content/biomes";
import { distance } from "../src/hex";
import {
  FOG_EXPLORED,
  FOG_UNEXPLORED,
  FOG_VISIBLE,
  createFog,
  fogAt,
  updateVisibility,
} from "../src/map/fog";
import { generateMap } from "../src/map/generate";
import { biomeAt, hexAt, inBounds } from "../src/map/world";

describe("generateMap", () => {
  it("è deterministica", () => {
    const a = generateMap({ seed: "round-1", width: 48, height: 36 });
    const b = generateMap({ seed: "round-1", width: 48, height: 36 });
    expect(a.biomes).toEqual(b.biomes);
    expect(a.variants).toEqual(b.variants);
    expect(a.start).toEqual(b.start);
  });

  it("cambia con il seed", () => {
    const a = generateMap({ seed: "round-1", width: 48, height: 36 });
    const b = generateMap({ seed: "round-2", width: 48, height: 36 });
    expect(a.biomes).not.toEqual(b.biomes);
  });

  it("ha mare ai bordi, terre all'interno e una partenza su terra", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const map = generateMap({ seed, width: 64, height: 48 });
      const counts = new Map<string, number>();
      for (const b of map.biomes) {
        const id = BIOME_IDS[b] as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const total = map.width * map.height;
      const water = (counts.get("deep_water") ?? 0) + (counts.get("shallow_water") ?? 0);
      expect(water / total).toBeGreaterThan(0.2);
      expect(water / total).toBeLessThan(0.7);
      expect(biomeAt(map, hexAt(map, 0))?.water).toBe(true);
      expect(inBounds(map, map.start)).toBe(true);
      expect(biomeAt(map, map.start)?.water).toBe(false);
      // Almeno sei biomi diversi su una mappa media.
      expect(counts.size).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("fog", () => {
  it("scopre attorno alle fonti e ricorda ciò che è stato visto", () => {
    const map = generateMap({ seed: "fog", width: 32, height: 24 });
    const fog = createFog(map);
    expect(fogAt(fog, map, map.start)).toBe(FOG_UNEXPLORED);

    updateVisibility(fog, map, [{ hex: map.start, radius: 2 }]);
    expect(fogAt(fog, map, map.start)).toBe(FOG_VISIBLE);
    const visible = fog.state.filter((s) => s === FOG_VISIBLE).length;
    expect(visible).toBeLessThanOrEqual(19);

    updateVisibility(fog, map, []);
    expect(fogAt(fog, map, map.start)).toBe(FOG_EXPLORED);
    for (let i = 0; i < fog.state.length; i++) {
      if (fog.state[i] !== FOG_UNEXPLORED) expect(distance(hexAt(map, i), map.start)).toBeLessThanOrEqual(2);
    }
  });
});
