import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import en from "../locales/en.json";
import it_ from "../locales/it.json";
import { BIOME_IDS } from "../src/content/biomes";
import { ETHNICITY_IDS, JOB_IDS, STAT_IDS } from "../src/content/ethnicities";
import { MATERIAL_IDS } from "../src/content/materials";
import { OUTPOST_KINDS } from "../src/content/outposts";
import { PLACE_KINDS } from "../src/content/places";
import { RECIPE_IDS } from "../src/content/recipes";
import { ITEM_KINDS, SLOTS } from "../src/content/items";
import { EPITHETS, EVENT_IDS, MANIA_IDS, ORIGIN_BIOMES, PAST_JOB_IDS } from "../src/content/stories";
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
    for (const id of PLACE_KINDS) {
      expect(it_).toHaveProperty(`place.${id}`);
      expect(it_).toHaveProperty(`place.${id}.about`);
    }
  });

  it("ha un nome per ogni materia, avamposto e laboratorio, e un motivo per ogni rifiuto", () => {
    for (const id of MATERIAL_IDS) expect(it_).toHaveProperty(`material.${id}`);
    for (const id of OUTPOST_KINDS) expect(it_).toHaveProperty(`outpost.${id}`);
    for (const id of RECIPE_IDS) expect(it_).toHaveProperty(`workshop.${id}`);
    for (const id of ["unexplored", "water", "guild", "place", "outpost", "near-outpost", "gold"]) {
      expect(it_).toHaveProperty(`reason.${id}`);
    }
  });

  it("ha i testi di storie, soprannomi e oggetti", () => {
    for (const id of ORIGIN_BIOMES) expect(it_).toHaveProperty(`story.origin.${id}`);
    for (const id of PAST_JOB_IDS) expect(it_).toHaveProperty(`story.pastJob.${id}`);
    for (const id of EVENT_IDS) {
      expect(it_).toHaveProperty(`story.event.${id}`);
      expect(it_).toHaveProperty(`story.trait.${id}`);
    }
    for (const id of MANIA_IDS) expect(it_).toHaveProperty(`story.mania.${id}`);
    for (const [ethnicity, n] of Object.entries(EPITHETS)) {
      for (let i = 0; i < n; i++) expect(it_).toHaveProperty(`epithet.${ethnicity}.${i}`);
    }
    for (const id of ITEM_KINDS) expect(it_).toHaveProperty(`item.${id}`);
    for (const id of SLOTS) expect(it_).toHaveProperty(`slot.${id}`);
  });

  it("riconosce la lingua del browser", () => {
    expect(detectLocale(["en-US", "it"])).toBe("en");
    expect(detectLocale(["fr-FR", "it-IT"])).toBe("it");
    expect(detectLocale(["de"])).toBe("it");
  });
});
