import { STORAGE_CAPACITY } from "../content/guild";
import { MATERIAL_IDS, PRODUCT_IDS, RAW_MATERIAL_IDS, type MaterialId } from "../content/materials";
import type { Amounts } from "../content/recipes";
import {
  CARGO_BASE,
  CARGO_PER_VIGOR,
  CARGO_TALENT,
  MATERIAL_VALUE,
  OFFERS_PER_MARKET,
  RECOVERY_MS,
  SATURATION_STEP,
  WANTED_PER_TOWN,
} from "../content/trade";
import type { Place } from "../map/places";
import type { WorldMap } from "../map/world";
import { createRng, hashSeed, randInt, shuffle } from "../rng";
import { effectiveStats, hasTalent } from "./characters";
import type { Character, Notice, World } from "./state";

/** Prezzi di una cittadina o di un mercato, in percentuale del valore di base di ogni materia. */
export interface PriceList {
  readonly factors: Record<MaterialId, number>;
  /** Le merci che una cittadina cerca (pagate di più), o le materie che un mercato vende. */
  readonly featured: readonly MaterialId[];
}

/**
 * I prezzi di un luogo: nascono dal seme della mappa, quindi non si salvano. Una cittadina paga
 * le materie prime un po' meno del loro valore, i prodotti intorno al valore e le merci che
 * cerca molto di più; un mercato vende poche materie prime, un po' sopra il valore.
 */
export function priceList(map: WorldMap, place: Place): PriceList {
  const rng = createRng(hashSeed(`${map.seed}/trade/${place.id}`));
  const factors = {} as Record<MaterialId, number>;
  if (place.kind === "market") {
    for (const m of MATERIAL_IDS) factors[m] = randInt(rng, 110, 140);
    return { factors, featured: shuffle(rng, [...RAW_MATERIAL_IDS]).slice(0, OFFERS_PER_MARKET) };
  }
  for (const m of MATERIAL_IDS) factors[m] = (RAW_MATERIAL_IDS as readonly string[]).includes(m) ? randInt(rng, 60, 100) : randInt(rng, 80, 120);
  const wanted = shuffle(rng, [...PRODUCT_IDS]).slice(0, WANTED_PER_TOWN);
  for (const m of wanted) factors[m] = randInt(rng, 150, 180);
  return { factors, featured: wanted };
}

/** Quanto può portare un carovaniere. */
export function cargoCapacity(character: Character): number {
  const base = CARGO_BASE + CARGO_PER_VIGOR * effectiveStats(character).vigor;
  const talent = hasTalent(character);
  return Math.floor((base * (talent ? CARGO_TALENT : 100)) / 100);
}

export function cargoUnits(goods: Amounts): number {
  return goods.reduce((sum, [, n]) => sum + n, 0);
}

/** Quante unità di una materia il luogo ricorda di aver scambiato da poco, all'istante `at`. */
function saturationAt(world: World, placeId: number, material: MaterialId, at: number): number {
  const s = world.state.markets.find((x) => x.placeId === placeId && x.material === material);
  if (!s) return 0;
  return Math.max(0, s.amount - Math.floor((at - s.at) / RECOVERY_MS));
}

/** Registra che il luogo ha appena scambiato `amount` unità di una materia. */
function saturate(world: World, placeId: number, material: MaterialId, amount: number, at: number): void {
  const { markets } = world.state;
  let s = markets.find((x) => x.placeId === placeId && x.material === material);
  if (!s) {
    s = { placeId, material, amount: 0, at };
    markets.push(s);
  }
  // Il recupero va a unità intere: l'avanzo di tempo resta per la prossima.
  const recovered = Math.floor((at - s.at) / RECOVERY_MS);
  if (recovered >= s.amount) {
    s.amount = 0;
    s.at = at;
  } else {
    s.amount -= recovered;
    s.at += recovered * RECOVERY_MS;
  }
  s.amount += amount;
}

/** Il prezzo di un'unità dopo `saturation` unità già scambiate, a numeri interi. */
function unitPrice(base: number, factor: number, saturation: number, selling: boolean): number {
  const step = 100 + saturation * SATURATION_STEP;
  return selling
    ? Math.max(1, Math.floor((base * factor) / step))
    : Math.max(1, Math.ceil((base * factor * step) / 10_000));
}

/** Quanto pagherebbe ora una cittadina per queste merci, vendute una dopo l'altra. */
export function quoteSale(world: World, place: Place, goods: Amounts, at = world.state.time): number {
  return quote(world, place, goods, at, true);
}

/** Quanto costerebbero ora queste materie a un mercato, comprate una dopo l'altra. */
export function quotePurchase(world: World, place: Place, goods: Amounts, at = world.state.time): number {
  return quote(world, place, goods, at, false);
}

function quote(world: World, place: Place, goods: Amounts, at: number, selling: boolean): number {
  const { factors } = priceList(world.map, place);
  let total = 0;
  for (const [m, n] of goods) {
    const s = saturationAt(world, place.id, m, at);
    for (let i = 0; i < n; i++) total += unitPrice(MATERIAL_VALUE[m], factors[m], s + i, selling);
  }
  return total;
}

/** Il prezzo della prossima unità di una materia in un luogo. */
export function unitQuote(world: World, place: Place, material: MaterialId, at = world.state.time): number {
  return quote(world, place, [[material, 1]], at, place.kind !== "market");
}

/** Il carovaniere vende tutto il carico alla cittadina. */
export function sellCargo(world: World, character: Character, place: Place, at: number, notices: Notice[]): void {
  const goods = character.cargo;
  const revenue = quoteSale(world, place, goods, at);
  for (const [m, n] of goods) saturate(world, place.id, m, n, at);
  world.state.guild.gold += revenue;
  character.cargo = [];
  notices.push({ kind: "sold", at, characterId: character.id, placeId: place.id, units: cargoUnits(goods), gold: revenue });
}

/** Il carovaniere compra al mercato quello che gli è stato chiesto, finché bastano le monete. */
export function buyGoods(world: World, character: Character, place: Place, order: Amounts, at: number, notices: Notice[]): void {
  const { guild } = world.state;
  const { factors, featured } = priceList(world.map, place);
  let spent = 0;
  const cargo: [MaterialId, number][] = [];
  for (const [m, n] of order) {
    if (!featured.includes(m)) continue;
    const s = saturationAt(world, place.id, m, at);
    let bought = 0;
    while (bought < n) {
      const price = unitPrice(MATERIAL_VALUE[m], factors[m], s + bought, false);
      if (guild.gold < price) break;
      guild.gold -= price;
      spent += price;
      bought++;
    }
    if (bought > 0) {
      saturate(world, place.id, m, bought, at);
      cargo.push([m, bought]);
    }
  }
  character.cargo = cargo;
  notices.push({ kind: "bought", at, characterId: character.id, placeId: place.id, units: cargoUnits(cargo), gold: spent });
}

/** Il carico entra in magazzino (quello che non ci sta va perso). */
export function unloadCargo(world: World, character: Character, at: number, notices: Notice[]): void {
  const { stock } = world.state.guild;
  const units = cargoUnits(character.cargo);
  for (const [m, n] of character.cargo) stock[m] = Math.min(STORAGE_CAPACITY, stock[m] + n);
  character.cargo = [];
  if (units > 0) notices.push({ kind: "unloaded", at, characterId: character.id, units });
}
