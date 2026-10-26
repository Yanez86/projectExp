import { ETHNICITIES, ETHNICITY_IDS, JOB_IDS, type JobId } from "../content/ethnicities";
import { TAVERN_MAX, TAVERN_MIN, TAVERN_PERIOD_MS } from "../content/guild";
import { FOG_UNEXPLORED, fogAt } from "../map/fog";
import type { Place } from "../map/places";
import { createRng, hashSeed, pick, randInt } from "../rng";
import { hireCost, rollCharacter, wage } from "./characters";
import { START_TIME, type Character, type Notice, type World } from "./state";

export interface Candidate {
  /** Il posto nella locanda: con il periodo, dice chi è. */
  readonly slot: number;
  /** Il personaggio, ancora senza numero: lo prende quando viene ingaggiato. */
  readonly character: Character;
  readonly cost: number;
  readonly wage: number;
}

/** In quale periodo della locanda cade un istante: ogni due giorni arriva gente nuova. */
export function tavernPeriod(time: number): number {
  return Math.floor((time - START_TIME) / TAVERN_PERIOD_MS);
}

/** Quando cambia la gente della locanda (tempo di gioco). */
export function nextTavernChange(time: number): number {
  return START_TIME + (tavernPeriod(time) + 1) * TAVERN_PERIOD_MS;
}

/**
 * Chi c'è nella locanda di una cittadina adesso: nasce dal seme, dalla cittadina e dal periodo,
 * quindi non si salva; si ricordano solo quelli già ingaggiati. Metà delle volte un mercenario,
 * perché la gilda parte senza; spesso dell'etnia che ha il talento per il suo mestiere.
 */
export function tavernCandidates(world: World, place: Place, time = world.state.time): Candidate[] {
  if (place.kind !== "town") return [];
  const period = tavernPeriod(time);
  const rng = createRng(hashSeed(`${world.map.seed}/tavern/${place.id}/${period}`));
  const count = randInt(rng, TAVERN_MIN, TAVERN_MAX);
  // Niente omonimi di chi è già nella gilda: si cambia solo il nome, il resto del sorteggio no.
  const used = new Set(world.state.characters.map((c) => c.name));
  const out: Candidate[] = [];
  for (let slot = 0; slot < count; slot++) {
    const job: JobId = rng() < 0.5 ? "mercenary" : pick(rng, JOB_IDS);
    const talented = ETHNICITY_IDS.find((id) => ETHNICITIES[id].talent === job)!;
    const ethnicity = rng() < 0.5 ? talented : pick(rng, ETHNICITY_IDS);
    const character = rollCharacter(rng, 0, ethnicity, job, place.hex, used);
    used.add(character.name);
    const taken = world.state.hires.some((h) => h.placeId === place.id && h.period === period && h.slot === slot);
    if (!taken) out.push({ slot, character, cost: hireCost(character), wage: wage(character) });
  }
  return out;
}

export type HireProblem = "wrong-place" | "unexplored" | "gone" | "gold";

/** Ingaggia un personaggio della locanda: paga e lo fa partire dalla cittadina. */
export function hire(world: World, placeId: number, slot: number, notices: Notice[]): { ok: true } | { ok: false; reason: HireProblem } {
  const { state, map } = world;
  const place = map.places.find((p) => p.id === placeId);
  if (!place || place.kind !== "town") return { ok: false, reason: "wrong-place" };
  if (fogAt(state.fog, map, place.hex) === FOG_UNEXPLORED) return { ok: false, reason: "unexplored" };
  const candidate = tavernCandidates(world, place).find((c) => c.slot === slot);
  if (!candidate) return { ok: false, reason: "gone" };
  if (state.guild.gold < candidate.cost) return { ok: false, reason: "gold" };
  state.guild.gold -= candidate.cost;
  const character: Character = { ...candidate.character, id: state.nextCharacterId++ };
  state.characters.push(character);
  state.hires.push({ placeId, period: tavernPeriod(state.time), slot });
  notices.push({ kind: "hired", at: state.time, characterId: character.id, placeId });
  return { ok: true };
}
