import { describe, expect, it } from "vitest";
import { createRng, hashSeed, randInt } from "../src/rng";

describe("rng", () => {
  it("dà la stessa sequenza con lo stesso seed", () => {
    const a = createRng(hashSeed("gilda"));
    const b = createRng(hashSeed("gilda"));
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("dà sequenze diverse con seed diversi", () => {
    expect(createRng(hashSeed("a"))()).not.toBe(createRng(hashSeed("b"))());
  });

  it("resta negli estremi", () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = randInt(rng, 2, 5);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});
