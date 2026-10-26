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
export type Activity = "idle" | "moving" | "building";

export interface UnitStatus {
  readonly activity: Activity;
  readonly text: string;
}

/** Cosa sta facendo un personaggio, a parole, con i tempi reali che mancano. */
export function unitStatus(world: World, c: Character, realNow: number, t: Translate): UnitStatus {
  const { clock } = world.state;
  const wait = (gameTime: number) => formatDuration(t, realDelay(clock, gameTime, realNow));
  const task = c.task;
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
