import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import en from "../locales/en.json";
import it_ from "../locales/it.json";
import { BIOME_IDS } from "../src/content/biomes";
import { ETHNICITY_IDS, JOB_IDS, STAT_IDS } from "../src/content/ethnicities";
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

  it("accorda il genere e segnala le chiavi mancanti", () => {
    const t = createTranslator("it", it_);
    expect(t("notice.arrived", { name: "Glossa", gender: "f" })).toBe("Glossa è arrivata a destinazione.");
    expect(t("notice.arrived", { name: "Folio", gender: "m" })).toBe("Folio è arrivato a destinazione.");
    expect(t("missing.key")).toBe("[missing.key]");
  });

  it("ha un nome per ogni etnia, mestiere e statistica", () => {
    for (const id of ETHNICITY_IDS) expect(it_).toHaveProperty(`ethnicity.${id}`);
    for (const id of JOB_IDS) expect(it_).toHaveProperty(`job.${id}`);
    for (const id of STAT_IDS) expect(it_).toHaveProperty(`stat.${id}`);
  });

  it("riconosce la lingua del browser", () => {
    expect(detectLocale(["en-US", "it"])).toBe("en");
    expect(detectLocale(["fr-FR", "it-IT"])).toBe("it");
    expect(detectLocale(["de"])).toBe("it");
  });
});
