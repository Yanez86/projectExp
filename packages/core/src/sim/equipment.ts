import { ITEMS, slotsFor, type Slot } from "../content/items";
import { hexEquals } from "../hex";
import type { Character, World } from "./state";

export type EquipProblem = "not-at-guild" | "unknown-item" | "wrong-slot" | "empty-slot";

/** Si cambia equipaggiamento solo alla sede, fermi, e non durante una spedizione. */
export function atGuildToEquip(world: World, c: Character): boolean {
  return !c.step && !c.task && hexEquals(c.hex, world.state.guild.hex);
}

/** Prende un oggetto dal forziere e lo mette; quello che c'era torna nel forziere. */
export function equip(world: World, c: Character, itemId: number): { ok: true } | { ok: false; reason: EquipProblem } {
  const { guild } = world.state;
  if (!atGuildToEquip(world, c)) return { ok: false, reason: "not-at-guild" };
  const index = guild.items.findIndex((i) => i.id === itemId);
  if (index < 0) return { ok: false, reason: "unknown-item" };
  const item = guild.items[index]!;
  const slot = ITEMS[item.kind].slot;
  if (!slotsFor(c.job).includes(slot)) return { ok: false, reason: "wrong-slot" };
  guild.items.splice(index, 1);
  const previous = c.equipment[slot];
  if (previous) guild.items.push(previous);
  c.equipment[slot] = item;
  return { ok: true };
}

/** Toglie l'oggetto da uno slot e lo rimette nel forziere. */
export function unequip(world: World, c: Character, slot: Slot): { ok: true } | { ok: false; reason: EquipProblem } {
  if (!atGuildToEquip(world, c)) return { ok: false, reason: "not-at-guild" };
  const item = c.equipment[slot];
  if (!item) return { ok: false, reason: "empty-slot" };
  c.equipment[slot] = null;
  world.state.guild.items.push(item);
  return { ok: true };
}
