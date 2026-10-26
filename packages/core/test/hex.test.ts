import { describe, expect, it } from "vitest";
import {
  distance,
  hex,
  hexKey,
  hexRound,
  hexToOffset,
  hexesInRange,
  neighbors,
  offsetToHex,
} from "../src/hex";

describe("hex", () => {
  it("ha sei vicini, tutti a distanza 1", () => {
    const center = hex(3, -2);
    const around = neighbors(center);
    expect(around).toHaveLength(6);
    for (const n of around) expect(distance(center, n)).toBe(1);
  });

  it("conta gli esagoni entro un raggio", () => {
    expect(hexesInRange(hex(0, 0), 0)).toHaveLength(1);
    expect(hexesInRange(hex(0, 0), 1)).toHaveLength(7);
    expect(hexesInRange(hex(5, 5), 3)).toHaveLength(37);
  });

  it("converte avanti e indietro tra righe sfalsate e assiali", () => {
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        expect(hexToOffset(offsetToHex(col, row))).toEqual({ col, row });
      }
    }
  });

  it("arrotonda all'esagono più vicino senza -0", () => {
    expect(hexRound(0.1, -0.1)).toEqual(hex(0, 0));
    expect(hexKey(hexRound(-0.2, 0.1))).toBe("0,0");
    expect(hexRound(1.4, -0.3)).toEqual(hex(1, 0));
  });
});
