import { describe, expect, it } from "vitest";
import { daylight } from "../src/lib/map/daylight";

const at = (hours: number) => hours * 3_600_000;

describe("daylight", () => {
  it("di giorno non cambia i colori e le luci sono spente", () => {
    expect(daylight(at(12))).toEqual({ tint: 0xffffff, glow: 0, night: false });
  });

  it("di notte è blu e le luci sono accese", () => {
    const night = daylight(at(24 + 2));
    expect(night.tint).toBe(0x5c68a8);
    expect(night.glow).toBe(1);
    expect(night.night).toBe(true);
  });

  it("all'alba e al tramonto sfuma", () => {
    const dawn = daylight(at(6.5));
    expect(dawn.tint).toBe(0xf2c0a8);
    expect(dawn.glow).toBe(0);
    expect(daylight(at(19.75)).glow).toBeCloseTo(0.5);
  });
});
