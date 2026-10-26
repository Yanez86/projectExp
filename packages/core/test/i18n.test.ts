import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import en from "../locales/en.json";
import it_ from "../locales/it.json";
import { BIOME_IDS } from "../src/content/biomes";
import { createTranslator, detectLocale } from "../src/i18n";

const locales: Record<string, Record<string, string>> = { it: it_, en };

describe("i18n", () => {
  it("ha le stesse chiavi in tutte le lingue", () => {
    const keys = Object.keys(it_).sort();
    for (const [name, messages] of Object.entries(locales)) {
      expect(Object.keys(messages).sort(), name).toEqual(keys);
    }
  });

  it("ha tutti i messaggi in formato ICU valido", () => {
    for (const [name, messages] of Object.entries(locales)) {
      for (const [key, source] of Object.entries(messages)) {
        expect(() => new IntlMessageFormat(source, name), `${name}:${key}`).not.toThrow();
      }
    }
  });

  it("ha un nome per ogni bioma", () => {
    for (const id of BIOME_IDS) expect(it_).toHaveProperty(`biome.${id}`);
  });

  it("gestisce i plurali", () => {
    const t = createTranslator("it", it_);
    expect(t("map.size", { width: 1, height: 1, count: 1 })).toBe("1 × 1 · 1 esagono");
    expect(t("map.size", { width: 2, height: 2, count: 4 })).toBe("2 × 2 · 4 esagoni");
    expect(t("missing.key")).toBe("[missing.key]");
  });

  it("riconosce la lingua del browser", () => {
    expect(detectLocale(["en-US", "it"])).toBe("en");
    expect(detectLocale(["fr-FR", "it-IT"])).toBe("it");
    expect(detectLocale(["de"])).toBe("it");
  });
});
