import { describe, expect, it } from "vitest";
import { BIOME_IDS, ETHNICITY_IDS, ITEM_KINDS, MATERIAL_IDS, OUTPOST_KINDS, PLACE_KINDS } from "@exp/core";
import data from "../src/assets/tiles.json";
import { RELIEF } from "../src/lib/map/transitions";

const frames = new Set(Object.keys(data.frames));

/**
 * Tutto quello che il gioco chiede allo sprite sheet: se un disegno sparisce dal sorgente pxl,
 * il test lo dice prima che sparisca dallo schermo.
 */
describe("sprite sheet", () => {
  it("ha le icone dell'interfaccia", () => {
    for (const name of ["ui_units", "ui_options", "ui_sun", "ui_moon", "ui_relic", "coin", "guild", "guild_glow", "guild_shadow"]) {
      expect(frames, name).toContain(name);
    }
  });

  it("ha mappa, nuvole, percorso e selezione", () => {
    for (const name of ["grid", "select", "cloud_base", "route_dot", "route_flag", "char_ring", "char_shadow", "bird_0", "bird_1", "bird_shadow"]) {
      expect(frames, name).toContain(name);
    }
    for (const biome of BIOME_IDS) expect(frames, biome).toContain(`${biome}_0`);
    for (const biome of RELIEF) expect(frames, `${biome}_top`).toContain(`${biome}_top_0`);
  });

  it("ha un segnalino per ogni etnia, un'icona per ogni materia e oggetto", () => {
    for (const id of ETHNICITY_IDS) expect(frames, id).toContain(`char_${id}`);
    for (const id of MATERIAL_IDS) expect(frames, id).toContain(`mat_${id}`);
    for (const id of ITEM_KINDS) expect(frames, id).toContain(`item_${id}`);
  });

  it("ha i luoghi e gli avamposti, con le loro luci", () => {
    for (const kind of PLACE_KINDS) {
      expect(frames, kind).toContain(`place_${kind}`);
      expect(frames, kind).toContain(`place_${kind}_glow`);
    }
    for (const kind of OUTPOST_KINDS) {
      expect(frames, kind).toContain(`outpost_${kind}`);
      expect(frames, kind).toContain(`outpost_${kind}_glow`);
    }
    expect(frames).toContain("outpost_site");
  });
});
