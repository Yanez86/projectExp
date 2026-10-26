import { biomeIndex, type BiomeId } from "../src/content/biomes";
import type { EthnicityId, JobId } from "../src/content/ethnicities";
import { START_GOLD } from "../src/content/guild";
import { emptyStock } from "../src/content/materials";
import type { Hex } from "../src/hex";
import { createFog } from "../src/map/fog";
import type { Place } from "../src/map/places";
import type { WorldMap } from "../src/map/world";
import { START_TIME, type Character, type World } from "../src/sim/state";

const LEGEND: Record<string, BiomeId> = {
  ".": "plains",
  "~": "shallow_water",
  f: "forest",
  "^": "mountains",
  h: "hills",
  s: "swamp",
  d: "desert",
  t: "tundra",
};

export function makeCharacter(id: number, hex: Hex, job: JobId = "explorer", ethnicity: EthnicityId = "paperfolk"): Character {
  return {
    id,
    name: `P${id}`,
    gender: "m",
    ethnicity,
    job,
    stats: { vigor: 5, pace: 5, eye: 5, gab: 5, guts: 5 },
    hex,
    destination: null,
    route: [],
    step: null,
    task: null,
  };
}

/** Un mondo disegnato a mano: una riga di testo per riga di esagoni, con un esploratore sulla sede. */
export function worldFrom(rows: string[], start: Hex, places: Place[] = []): World {
  const height = rows.length;
  const width = rows[0]!.length;
  const biomes = new Uint8Array(width * height);
  rows.forEach((row, r) => [...row].forEach((ch, c) => (biomes[r * width + c] = biomeIndex(LEGEND[ch]!))));
  const map: WorldMap = { seed: "hand", width, height, biomes, variants: new Uint8Array(width * height), start, places };
  return {
    map,
    state: {
      seed: "hand",
      width,
      height,
      clock: { realAt: 0, gameAt: START_TIME, speed: 1 },
      time: START_TIME,
      fog: createFog(map),
      guild: { hex: start, gold: START_GOLD, stock: emptyStock() },
      characters: [{ ...makeCharacter(1, start), name: "Folio" }],
      outposts: [],
      workshops: [],
      events: [],
      nextSeq: 0,
    },
  };
}
