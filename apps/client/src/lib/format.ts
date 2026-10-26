import { calendar, type Translate } from "@exp/core";

/** Una durata reale in ms, a parole: "2 min 30 s". */
export function formatDuration(t: Translate, ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return t("duration.hours", { h, m });
  if (m > 0) return t("duration.minutes", { m, s });
  return t("duration.seconds", { s });
}

/** L'ora del mondo: "Giorno 3 · 14:05". */
export function formatClock(t: Translate, gameTime: number): string {
  const { day, hours, minutes } = calendar(gameTime);
  const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return t("clock", { day, time });
}
