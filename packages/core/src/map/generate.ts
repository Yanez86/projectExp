import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { biomeIndex, type BiomeId } from "../content/biomes";
import { offsetToHex, type Hex } from "../hex";
import { createRng, hashSeed, pick, type Rng } from "../rng";
import { generatePlaces } from "./places";
import type { WorldMap } from "./world";

/** Da cambiare quando cambia la generazione: lo stesso seed darebbe un'altra mappa. */
export const MAP_GENERATOR_VERSION = 2;

export interface MapOptions {
  readonly seed: string;
  readonly width: number;
  readonly height: number;
}

/** Altezza di una riga rispetto alla larghezza di un esagono regolare con la punta in alto. */
const ROW_HEIGHT = Math.sqrt(3) / 2;

const SEA_LEVEL = 0.4;
const DEEP_LEVEL = 0.33;
const HILLS_LEVEL = 0.7;
const MOUNTAINS_LEVEL = 0.8;

/** Rumore frattale in [-1, 1]: più ottave sovrapposte danno coste e rilievi irregolari. */
function fbm(noise: NoiseFunction2D, x: number, y: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function chooseBiome(elevation: number, moisture: number, temperature: number): BiomeId {
  if (elevation < DEEP_LEVEL) return "deep_water";
  if (elevation < SEA_LEVEL) return "shallow_water";
  if (elevation > MOUNTAINS_LEVEL) return "mountains";
  if (elevation > HILLS_LEVEL) return "hills";
  if (temperature < 0.22) return "tundra";
  if (temperature > 0.62 && moisture < 0.48) return "desert";
  if (moisture > 0.62 && elevation < 0.5) return "swamp";
  if (moisture > 0.5) return "forest";
  return "plains";
}

/** Genera la mappa di un round. Stesso seed e stesse dimensioni danno sempre la stessa mappa. */
export function generateMap(options: MapOptions): WorldMap {
  const { seed, width, height } = options;
  const rng = createRng(hashSeed(seed));
  const elevationNoise = createNoise2D(rng);
  const moistureNoise = createNoise2D(rng);
  const temperatureNoise = createNoise2D(rng);

  const biomes = new Uint8Array(width * height);
  const variants = new Uint8Array(width * height);
  // La scala del rumore segue la larghezza, così mappe più grandi hanno più terre, non terre più grandi.
  const scale = 1 / 18;
  const worldH = height * ROW_HEIGHT;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const x = col + (row & 1) * 0.5;
      const y = row * ROW_HEIGHT;
      // Distanza dal centro normalizzata: i bordi della mappa sprofondano nel mare.
      const nx = (x / width) * 2 - 1;
      const ny = (y / worldH) * 2 - 1;
      const edge = Math.max(Math.abs(nx), Math.abs(ny)) * 0.6 + Math.hypot(nx, ny) * 0.4;

      const relief = fbm(elevationNoise, x * scale, y * scale, 5);
      const elevation = 0.6 + relief * 0.6 - smoothstep(0.62, 1.05, edge) * 0.55;

      const moisture = (fbm(moistureNoise, x * scale * 0.8 + 100, y * scale * 0.8, 4) + 1) / 2;
      // Nord freddo, sud caldo; le alture sono più fredde.
      const latitude = y / worldH;
      const temperature =
        0.12 +
        latitude * 0.78 +
        fbm(temperatureNoise, x * scale * 0.5, y * scale * 0.5, 3) * 0.18 -
        Math.max(0, elevation - SEA_LEVEL) * 0.35;

      const i = row * width + col;
      biomes[i] = biomeIndex(chooseBiome(elevation, moisture, temperature));
      variants[i] = Math.floor(rng() * 256);
    }
  }

  const start = chooseStart(rng, biomes, width, height);
  const places = generatePlaces({ width, height, biomes, start }, createRng(hashSeed(`${seed}/places`)));
  return { seed, width, height, biomes, variants, start, places };
}

/** Sceglie una pianura nella parte centrale della mappa (in mancanza, una terra qualsiasi). */
function chooseStart(rng: Rng, biomes: Uint8Array, width: number, height: number): Hex {
  const plains = biomeIndex("plains");
  const water = [biomeIndex("deep_water"), biomeIndex("shallow_water")];
  const central: Hex[] = [];
  const land: Hex[] = [];
  for (let row = 2; row < height - 2; row++) {
    for (let col = 2; col < width - 2; col++) {
      const b = biomes[row * width + col] as number;
      if (water.includes(b)) continue;
      const h = offsetToHex(col, row);
      land.push(h);
      const inner =
        col > width * 0.25 && col < width * 0.75 && row > height * 0.25 && row < height * 0.75;
      if (inner && b === plains) central.push(h);
    }
  }
  if (central.length > 0) return pick(rng, central);
  if (land.length > 0) return pick(rng, land);
  return offsetToHex(Math.floor(width / 2), Math.floor(height / 2));
}
