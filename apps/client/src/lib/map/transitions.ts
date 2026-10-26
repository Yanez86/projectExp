import { BIOME_IDS, DIRECTIONS, biomeAt, hexAdd, type BiomeId, type Hex, type WorldMap } from "@exp/core";

/**
 * Chi sconfina in chi: lungo un lato tra due biomi diversi, quello con priorità più alta entra
 * con una fascia frastagliata nella casella dell'altro. Terra e acqua non si mescolano: sul lato
 * dell'acqua compaiono spiaggia e schiuma.
 */
const PRIORITY: Record<BiomeId, number> = {
  deep_water: 0,
  shallow_water: 1,
  swamp: 2,
  desert: 3,
  plains: 4,
  hills: 5,
  tundra: 6,
  forest: 7,
  mountains: 8,
};

/** Nomi dei tile da sovrapporre al terreno di una casella, dal basso verso l'alto. */
export function edgeOverlays(map: WorldMap, h: Hex): string[] {
  const own = biomeAt(map, h);
  if (!own) return [];
  const overlays: { name: string; priority: number }[] = [];
  DIRECTIONS.forEach((dir, d) => {
    const other = biomeAt(map, hexAdd(h, dir));
    if (!other || other.id === own.id) return;
    if (own.water && !other.water) {
      overlays.push({ name: `shore_${d}`, priority: 99 });
    } else if (own.water === other.water && PRIORITY[other.id] > PRIORITY[own.id]) {
      overlays.push({ name: `edge_${other.id}_${d}`, priority: PRIORITY[other.id] });
    }
  });
  return overlays.sort((a, b) => a.priority - b.priority).map((o) => o.name);
}

/** Biomi con un rilievo (alberi, colline, montagne) disegnato sopra il terreno. */
export const RELIEF = new Set<BiomeId>(["forest", "hills", "mountains", "tundra"]);

export function biomeIdOf(map: WorldMap, index: number): BiomeId {
  return BIOME_IDS[map.biomes[index] as number] as BiomeId;
}

