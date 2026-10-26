import type { Rng } from "../rng";

/**
 * Nomi propri dei luoghi, da sillabe: suonano fantasy in italiano come in inglese, così non
 * vanno tradotti.
 */
const START = ["Al", "Bor", "Cal", "Dar", "El", "Fen", "Gar", "Hal", "Ir", "Kel", "Lor", "Mar", "Nor", "Or", "Pel", "Ros", "Sal", "Tor", "Ul", "Val", "Ver", "Zan"];
const MIDDLE = ["a", "e", "i", "o", "an", "en", "or", "ul", "ar"];
const END = ["dor", "mir", "vel", "nar", "thas", "ria", "vale", "mont", "fen", "gard", "wick", "stor", "lin", "rek", "dun"];

export function placeName(rng: Rng, used: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pick = (list: readonly string[]) => list[Math.floor(rng() * list.length)]!;
    const name = rng() < 0.35 ? pick(START) + pick(END) : pick(START) + pick(MIDDLE) + pick(END);
    const proper = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    if (!used.has(proper)) {
      used.add(proper);
      return proper;
    }
  }
  return `Luogo ${used.size + 1}`;
}
