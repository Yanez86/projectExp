/**
 * Le materie: quelle prime arrivano dagli avamposti, le altre escono dai laboratori della gilda.
 * Il nome visibile sta nei file di lingua, alla chiave `material.<id>`.
 */
export const RAW_MATERIAL_IDS = ["grain", "timber", "clay", "iron_ore", "herbs", "sand", "hides"] as const;
export const PRODUCT_IDS = [
  "flour",
  "bread",
  "planks",
  "charcoal",
  "bricks",
  "iron",
  "tools",
  "glass",
  "leather",
  "salve",
] as const;
export const MATERIAL_IDS = [...RAW_MATERIAL_IDS, ...PRODUCT_IDS] as const;

export type RawMaterialId = (typeof RAW_MATERIAL_IDS)[number];
export type MaterialId = (typeof MATERIAL_IDS)[number];
export type Stock = Record<MaterialId, number>;

export function emptyStock(): Stock {
  return Object.fromEntries(MATERIAL_IDS.map((id) => [id, 0])) as Stock;
}
