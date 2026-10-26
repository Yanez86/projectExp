import {
  biomeIdAt,
  estimateArrival,
  outpostKindFor,
  realDelay,
  type Character,
  type Translate,
  type World,
} from "@exp/core";
import { formatDuration } from "./format";

/** Cosa sta facendo un personaggio, a grandi linee: decide il colore del pallino. */
export type Activity = "idle" | "moving" | "building" | "trading" | "dungeon" | "wounded";

export interface UnitStatus {
  readonly activity: Activity;
  readonly text: string;
}

/** Cosa sta facendo un personaggio, a parole, con i tempi reali che mancano. */
export function unitStatus(world: World, c: Character, realNow: number, t: Translate): UnitStatus {
  const { clock } = world.state;
  const wait = (gameTime: number) => formatDuration(t, realDelay(clock, gameTime, realNow));
  const task = c.task;
  if (c.woundedUntil !== null && c.woundedUntil > world.state.time) {
    return { activity: "wounded", text: t("status.wounded", { gender: c.gender, eta: wait(c.woundedUntil) }) };
  }
  if (task?.kind === "expedition") {
    const e = world.state.expeditions.find((x) => x.id === task.expeditionId);
    const place = world.map.places.find((p) => p.id === e?.placeId)?.name ?? "";
    const arrival = estimateArrival(world, c);
    if (arrival !== null) return { activity: "dungeon", text: t("status.toDungeon", { place, eta: wait(arrival) }) };
    if (e && e.level > 0) return { activity: "dungeon", text: t("status.inDungeon", { place, level: e.level, depth: e.depth }) };
    return { activity: "dungeon", text: t("status.waitingSquad", { place }) };
  }
  if (task?.kind === "building") {
    const outpost = world.state.outposts.find((o) => o.id === task.outpostId);
    if (outpost?.readyAt) {
      return {
        activity: "building",
        text: t("status.building", { kind: t(`outpost.${outpost.kind}`), eta: wait(outpost.readyAt) }),
      };
    }
  }
  const arrival = estimateArrival(world, c);
  if (arrival !== null && task?.kind === "trade") {
    const place = world.map.places.find((p) => p.id === task.placeId)?.name ?? "";
    const key = task.returning ? "status.returning" : task.mode === "sell" ? "status.goingToSell" : "status.goingToBuy";
    return { activity: "trading", text: t(key, { place, eta: wait(arrival) }) };
  }
  if (arrival !== null) {
    const kind = task?.kind === "build" ? outpostKindFor(biomeIdAt(world.map, task.hex)) : undefined;
    return {
      activity: "moving",
      text: kind
        ? t("status.goingToBuild", { kind: t(`outpost.${kind}`), eta: wait(arrival) })
        : t("status.travelling", { eta: wait(arrival) }),
    };
  }
  return { activity: "idle", text: t("status.idle", { gender: c.gender }) };
}
