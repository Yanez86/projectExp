import type { EventBody, GameEvent, World } from "./state";

/** Mette in coda un evento: la coda resta in ordine di orario e, a pari orario, di inserimento. */
export function schedule(world: World, at: number, body: EventBody): void {
  const { state } = world;
  const event = { ...body, at, seq: state.nextSeq++ } as GameEvent;
  let lo = 0;
  let hi = state.events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const e = state.events[mid]!;
    if (e.at < event.at || (e.at === event.at && e.seq < event.seq)) lo = mid + 1;
    else hi = mid;
  }
  state.events.splice(lo, 0, event);
}
