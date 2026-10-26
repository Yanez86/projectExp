import { MAP_GENERATOR_VERSION, generateMap } from "../map/generate";
import type { GameState, World } from "./state";

/** Da cambiare quando cambia la forma del salvataggio: i salvataggi vecchi non si caricano. */
export const SAVE_VERSION = 2;

interface SaveFile extends Omit<GameState, "fog"> {
  readonly version: number;
  readonly generator: number;
  /** La nebbia compressa: coppie [valore, ripetizioni]. */
  readonly fog: number[];
}

function encodeRuns(data: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.length; ) {
    const value = data[i]!;
    let run = 1;
    while (i + run < data.length && data[i + run] === value) run++;
    out.push(value, run);
    i += run;
  }
  return out;
}

function decodeRuns(runs: readonly number[], length: number): Uint8Array | null {
  const out = new Uint8Array(length);
  let i = 0;
  for (let r = 0; r + 1 < runs.length; r += 2) {
    const value = runs[r]!;
    const run = runs[r + 1]!;
    if (i + run > length) return null;
    out.fill(value, i, i + run);
    i += run;
  }
  return i === length ? out : null;
}

export function serializeWorld(world: World): string {
  const { fog, ...rest } = world.state;
  const file: SaveFile = { ...rest, version: SAVE_VERSION, generator: MAP_GENERATOR_VERSION, fog: encodeRuns(fog.state) };
  return JSON.stringify(file);
}

/** Ricostruisce un mondo salvato; null se il salvataggio è di una versione diversa o rovinato. */
export function deserializeWorld(json: string): World | null {
  let file: SaveFile;
  try {
    file = JSON.parse(json) as SaveFile;
  } catch {
    return null;
  }
  if (file?.version !== SAVE_VERSION || file.generator !== MAP_GENERATOR_VERSION) return null;
  const map = generateMap({ seed: file.seed, width: file.width, height: file.height });
  const fog = decodeRuns(file.fog, map.width * map.height);
  if (!fog) return null;
  const state: GameState = {
    seed: file.seed,
    width: file.width,
    height: file.height,
    clock: file.clock,
    time: file.time,
    fog: { state: fog },
    guild: file.guild,
    characters: file.characters,
    outposts: file.outposts,
    workshops: file.workshops,
    events: file.events,
    nextSeq: file.nextSeq,
  };
  return { map, state };
}
