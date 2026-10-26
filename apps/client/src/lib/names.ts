import { ITEMS, WEAPON_STRENGTH, WOUND_ARMOR, type Character, type Item, type Translate } from "@exp/core";

/** Nome e soprannome: "Brunilde Sbeccata", "Brunilde the Chipped". */
export function fullName(t: Translate, c: Pick<Character, "name" | "epithet" | "ethnicity" | "gender">): string {
  const epithet = t(`epithet.${c.ethnicity}.${c.epithet}`, { gender: c.gender });
  return t("character.fullName", { name: c.name, epithet });
}

/** Cosa fa un oggetto, in breve: "+2 Occhio", "+3 forza nei dungeon". */
export function itemBonus(t: Translate, item: Item): string {
  const info = ITEMS[item.kind];
  if (info.slot === "trinket" && info.stat) return t("item.bonus.stat", { n: item.rarity, stat: t(`stat.${info.stat}`) });
  if (info.slot === "weapon") return t("item.bonus.weapon", { n: item.rarity * WEAPON_STRENGTH });
  return t("item.bonus.armor", { n: item.rarity * WOUND_ARMOR });
}
