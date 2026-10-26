import { neighbors, hexEquals, distance, type Hex } from "../hex";
import { stepDuration, fastestStep } from "../content/movement";
import { FOG_UNEXPLORED, type Fog } from "../map/fog";
import { biomeIdAt, tileIndex, type WorldMap } from "../map/world";
import { effectiveStats } from "./characters";
import type { Character } from "./state";

/**
 * Quanto ci mette `character` a entrare in `h` secondo quello che la gilda sa: sotto le nuvole
 * la casella si presume attraversabile, con una fatica media. null: non si attraversa.
 */
export function knownStepDuration(map: WorldMap, fog: Fog, character: Character, h: Hex): number | null {
  const i = tileIndex(map, h);
  if (i < 0) return null;
  const known = fog.state[i] !== FOG_UNEXPLORED;
  return stepDuration(character.ethnicity, effectiveStats(character).pace, known ? biomeIdAt(map, h) : undefined, character.story.origin);
}

/** Coda con priorità minima su un array: abbastanza per le mappe del gioco. */
class MinHeap<T> {
  private items: { key: number; order: number; value: T }[] = [];
  private counter = 0;

  get size(): number {
    return this.items.length;
  }

  push(key: number, value: T): void {
    const items = this.items;
    items.push({ key, order: this.counter++, value });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      [items[i], items[parent]] = [items[parent]!, items[i]!];
      i = parent;
    }
  }

  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0 && last) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && this.less(l, m)) m = l;
        if (r < items.length && this.less(r, m)) m = r;
        if (m === i) break;
        [items[i], items[m]] = [items[m]!, items[i]!];
        i = m;
      }
    }
    return top?.value;
  }

  private less(a: number, b: number): boolean {
    const x = this.items[a]!;
    const y = this.items[b]!;
    return x.key < y.key || (x.key === y.key && x.order < y.order);
  }
}

/**
 * Il percorso più rapido (A*) da `from` (esclusa) a `to` (inclusa) per questo personaggio,
 * secondo quello che la gilda sa della mappa. null se non c'è.
 */
export function findRoute(map: WorldMap, fog: Fog, character: Character, from: Hex, to: Hex): Hex[] | null {
  if (hexEquals(from, to)) return [];
  if (knownStepDuration(map, fog, character, to) === null) return null;
  const minStep = fastestStep(effectiveStats(character).pace);
  const start = tileIndex(map, from);
  const goal = tileIndex(map, to);
  if (start < 0 || goal < 0) return null;

  const cost = new Map<number, number>([[start, 0]]);
  const cameFrom = new Map<number, Hex>();
  const open = new MinHeap<Hex>();
  open.push(distance(from, to) * minStep, from);

  while (open.size > 0) {
    const current = open.pop()!;
    const ci = tileIndex(map, current);
    if (ci === goal) break;
    const base = cost.get(ci)!;
    for (const next of neighbors(current)) {
      const ni = tileIndex(map, next);
      if (ni < 0) continue;
      const step = knownStepDuration(map, fog, character, next);
      if (step === null) continue;
      const total = base + step;
      const previous = cost.get(ni);
      if (previous !== undefined && previous <= total) continue;
      cost.set(ni, total);
      cameFrom.set(ni, current);
      open.push(total + distance(next, to) * minStep, next);
    }
  }

  if (!cost.has(goal)) return null;
  const route: Hex[] = [];
  let h = to;
  while (!hexEquals(h, from)) {
    route.push(h);
    const prev = cameFrom.get(tileIndex(map, h));
    if (!prev) return null;
    h = prev;
  }
  return route.reverse();
}

/** Durata prevista di un percorso già calcolato, secondo quello che la gilda sa. */
export function routeDuration(map: WorldMap, fog: Fog, character: Character, route: readonly Hex[]): number {
  let total = 0;
  for (const h of route) total += knownStepDuration(map, fog, character, h) ?? 0;
  return total;
}
