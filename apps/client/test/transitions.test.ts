import { describe, expect, it } from "vitest";
import { biomeIndex, hex, offsetToHex, type BiomeId, type WorldMap } from "@exp/core";
import { edgeOverlays } from "../src/lib/map/transitions";

/** Una mappa 3×3 tutta di un bioma, con la casella centrale di un altro. */
function mapWith(center: BiomeId, around: BiomeId): WorldMap {
  const biomes = new Uint8Array(9).fill(biomeIndex(around));
  biomes[4] = biomeIndex(center);
  return { seed: "t", width: 3, height: 3, biomes, variants: new Uint8Array(9), start: hex(0, 0) };
}

describe("edgeOverlays", () => {
  const middle = offsetToHex(1, 1);

  it("fa sconfinare il bioma più forte in quello più debole", () => {
    expect(edgeOverlays(mapWith("plains", "forest"), middle)).toHaveLength(6);
    expect(edgeOverlays(mapWith("plains", "forest"), middle)[0]).toBe("edge_forest_0");
    expect(edgeOverlays(mapWith("forest", "plains"), middle)).toEqual([]);
  });

  it("mette spiaggia e schiuma sull'acqua che tocca terra, e niente sulla terra", () => {
    expect(edgeOverlays(mapWith("shallow_water", "plains"), middle)).toEqual(
      [0, 1, 2, 3, 4, 5].map((d) => `shore_${d}`),
    );
    expect(edgeOverlays(mapWith("plains", "shallow_water"), middle)).toEqual([]);
  });

  it("sfuma le acque basse in quelle profonde", () => {
    expect(edgeOverlays(mapWith("deep_water", "shallow_water"), middle)).toHaveLength(6);
  });
});
