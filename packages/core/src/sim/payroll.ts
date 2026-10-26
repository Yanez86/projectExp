import { UNPAID_LIMIT } from "../content/guild";
import { removeCharacter, wage } from "./characters";
import { schedule } from "./events";
import { DAY_MS, type Notice, type World } from "./state";

/**
 * Il giorno di paga: la gilda paga tutti, in ordine di arrivo, finché bastano le monete. Chi resta
 * senza paga se lo ricorda; alla seconda volta di fila se ne va, e lascia nel forziere quello che
 * aveva addosso.
 */
export function payday(world: World, at: number, notices: Notice[]): void {
  const { state } = world;
  let paid = 0;
  let count = 0;
  for (const c of [...state.characters]) {
    const due = wage(c);
    if (state.guild.gold >= due) {
      state.guild.gold -= due;
      c.unpaid = 0;
      paid += due;
      count++;
      continue;
    }
    c.unpaid++;
    if (c.unpaid >= UNPAID_LIMIT) {
      removeCharacter(world, c.id, true);
      notices.push({ kind: "left", at, name: c.name, gender: c.gender });
    } else {
      notices.push({ kind: "unpaid", at, characterId: c.id, days: c.unpaid });
    }
  }
  if (count > 0) notices.push({ kind: "paid", at, gold: paid, count });
  schedule(world, at + DAY_MS, { kind: "payday" });
}

/** Quanto costano in tutto le paghe di un giorno. */
export function dailyWages(world: World): number {
  return world.state.characters.reduce((sum, c) => sum + wage(c), 0);
}
