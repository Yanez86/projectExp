import { BIOMES, BIOME_IDS, type BiomeId } from "../content/biomes";
import { TERRAIN_COST } from "../content/movement";
import { placeName } from "../content/names";
import { PLACE_GAP, PLACE_GUILD_GAP, PLACE_RULES, type PlaceKind } from "../content/places";
import { distance, hexEquals, hexKey, neighbors, type Hex } from "../hex";
import type { Rng } from "../rng";

export interface Place {
  readonly id: number;
  readonly kind: PlaceKind;
  readonly hex: Hex;
  readonly name: string;
}

/** Quello che serve per piazzare i luoghi: la mappa ancora in costruzione. */
interface Ground {
  readonly width: number;
  readonly height: number;
  readonly biomes: Uint8Array;
  readonly start: Hex;
}

function biomeOf(ground: Ground, h: Hex): BiomeId | undefined {
  const col = h.q + (h.r - (h.r & 1)) / 2;
  if (col < 0 || h.r < 0 || col >= ground.width || h.r >= ground.height) return undefined;
  return BIOME_IDS[ground.biomes[h.r * ground.width + col] as number];
}

/** Le caselle raggiungibili a piedi dalla sede: i luoghi stanno tutti lì. */
function reachableLand(ground: Ground): Hex[] {
  const seen = new Set<string>([hexKey(ground.start)]);
  const queue: Hex[] = [ground.start];
  const out: Hex[] = [];
  while (queue.length > 0) {
    const h = queue.shift()!;
    out.push(h);
    for (const n of neighbors(h)) {
      const biome = biomeOf(ground, n);
      if (!biome || TERRAIN_COST[biome] === null || seen.has(hexKey(n))) continue;
      seen.add(hexKey(n));
      queue.push(n);
    }
  }
  return out;
}

const nearWater = (ground: Ground, h: Hex) =>
  neighbors(h).some((n) => {
    const b = biomeOf(ground, n);
    return b !== undefined && BIOMES[BIOME_IDS.indexOf(b)]!.water;
  });

/**
 * Piazza i luoghi di interesse sulla terra raggiungibile dalla sede. Ogni tipo ha i suoi biomi e
 * una distanza minima dai suoi simili; tra i candidati vince il punteggio più alto: un po' di caso
 * più le preferenze del tipo (cittadine vicino all'acqua, castelli vicino a una cittadina, torri
 * lontane da tutti, dungeon su terreni aspri).
 */
export function generatePlaces(ground: Ground, rng: Rng): Place[] {
  const land = reachableLand(ground);
  const margin = 2;
  const inside = (h: Hex) => {
    const col = h.q + (h.r - (h.r & 1)) / 2;
    return col >= margin && h.r >= margin && col < ground.width - margin && h.r < ground.height - margin;
  };
  const places: Place[] = [];
  const names = new Set<string>();
  const nearest = (h: Hex, kind?: PlaceKind) => {
    let best = Infinity;
    for (const p of places) if (!kind || p.kind === kind) best = Math.min(best, distance(h, p.hex));
    return best;
  };

  for (const rule of PLACE_RULES) {
    const count = Math.max(rule.min, Math.round(land.length / rule.landPerPlace));
    for (let n = 0; n < count; n++) {
      let best: Hex | undefined;
      let bestScore = -Infinity;
      for (const h of land) {
        const biome = biomeOf(ground, h);
        if (!biome || !rule.biomes.includes(biome) || !inside(h)) continue;
        if (distance(h, ground.start) < PLACE_GUILD_GAP || hexEquals(h, ground.start)) continue;
        if (nearest(h) < PLACE_GAP || nearest(h, rule.kind) < rule.spacing) continue;
        const fromGuild = distance(h, ground.start);
        let score = rng();
        if (rule.kind === "town") {
          if (nearWater(ground, h)) score += 0.6;
          if (biome === "plains") score += 0.4;
          // La prima cittadina non troppo lontana dalla sede.
          if (places.length === 0) score += fromGuild >= 5 && fromGuild <= 9 ? 2 : 0;
        } else if (rule.kind === "castle") {
          const town = nearest(h, "town");
          if (town >= 3 && town <= 6) score += 1;
          if (biome === "hills") score += 0.6;
        } else if (rule.kind === "market") {
          const town = nearest(h, "town");
          if (town >= 3 && town <= 7) score += 0.8;
        } else if (rule.kind === "wizard_tower") {
          score += Math.min(nearest(h), 12) * 0.08;
          if (biome === "hills" || biome === "mountains") score += 0.4;
        } else if (rule.kind === "dungeon") {
          if (biome === "mountains" || biome === "hills") score += 0.6;
          score += Math.min(fromGuild, 15) * 0.03;
        }
        if (score > bestScore) {
          bestScore = score;
          best = h;
        }
      }
      if (!best) break;
      places.push({ id: places.length + 1, kind: rule.kind, hex: best, name: placeName(rng, names) });
    }
  }
  return places;
}
