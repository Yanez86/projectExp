import { BLOCKS_SIGHT, HIGH_GROUND, SCREENS_SIGHT, SCREEN_DEPTH } from "../content/vision";
import { hexLine, hexesInRange, type Hex } from "../hex";
import { biomeIdAt, inBounds, type WorldMap } from "./world";

/**
 * La linea da `viewer` a `target` è libera? Si guarda ogni casella in mezzo (non gli estremi):
 * una montagna ferma la vista; una foresta la lascia passare solo per SCREEN_DEPTH caselle.
 */
function lineClear(map: WorldMap, line: readonly Hex[], overScreens: boolean): boolean {
  const last = line.length - 1;
  for (let i = 1; i < last; i++) {
    const biome = biomeIdAt(map, line[i]!);
    if (!biome) continue;
    if (BLOCKS_SIGHT.includes(biome)) return false;
    if (!overScreens && SCREENS_SIGHT.includes(biome) && last > i + SCREEN_DEPTH) return false;
  }
  return true;
}

/**
 * Le caselle che si vedono da `viewer` entro `range`. Una casella si vede se almeno una delle due
 * rette leggermente spostate che la raggiungono è libera: sui lati la vista non dipende da un
 * arrotondamento.
 */
export function sightFrom(map: WorldMap, viewer: Hex, range: number): Hex[] {
  const standing = biomeIdAt(map, viewer);
  const overScreens = standing !== undefined && HIGH_GROUND.includes(standing);
  return hexesInRange(viewer, range).filter(
    (target) =>
      inBounds(map, target) &&
      (lineClear(map, hexLine(viewer, target, 1), overScreens) ||
        lineClear(map, hexLine(viewer, target, -1), overScreens)),
  );
}
