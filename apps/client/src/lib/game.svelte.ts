import {
  applyCommand,
  createWorld,
  deserializeWorld,
  gameTimeAt,
  grantGold,
  hexEquals,
  nextEventAt,
  outpostAt,
  placeAt,
  serializeWorld,
  setSpeed,
  skipAhead,
  syncTo,
  type Character,
  type Command,
  type CommandResult,
  type Hex,
  type MaterialId,
  type Notice,
  type RecipeId,
  type Slot,
  type World,
} from "@exp/core";
import { readSave, writeSave } from "./saves";
import { load, save } from "./storage";

export const MAP_SIZES = {
  small: { width: 40, height: 30 },
  medium: { width: 64, height: 48 },
  large: { width: 96, height: 72 },
} as const;
export type MapSize = keyof typeof MAP_SIZES;

/** Velocità del mondo provabili dagli strumenti; il gioco vero avrà x1, x3, x10. */
export const SPEEDS = [1, 10, 60, 600] as const;
const DEFAULT_SPEED = 60;
const TOAST_MS = 4000;
const SAVE_DELAY_MS = 500;

export interface Toast {
  readonly id: number;
  readonly key: string;
  readonly values: Record<string, string | number>;
  /** Valori che sono a loro volta chiavi di testo: si traducono nella lingua del momento. */
  readonly refs: Record<string, string>;
}

/** I pannelli che si aprono dal menu a sinistra. */
export type Drawer = "units" | "guild" | "options";

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** La casella su cui si trova ora un personaggio: a metà di un passo conta la più vicina. */
export function currentHex(c: Character, gameNow: number): Hex {
  if (!c.step) return c.hex;
  const half = (c.step.departAt + c.step.arriveAt) / 2;
  return gameNow < half ? c.step.from : c.step.to;
}

/**
 * La partita in corso vista dall'interfaccia: il mondo della simulazione, cosa è selezionato,
 * gli avvisi. La simulazione modifica il mondo sul posto; `version` cresce a ogni modifica, così
 * chi mostra lo stato sa quando aggiornarsi.
 */
class Game {
  world = $state.raw<World | undefined>(undefined);
  version = $state(0);
  /** Ora reale, aggiornata dal ciclo di gioco: per orologio e tempi d'arrivo. */
  now = $state(Date.now());
  seed = $state(load("exp.seed") ?? randomSeed());
  size = $state<MapSize>("medium");
  speed = $state<number>(DEFAULT_SPEED);
  fogEnabled = $state(true);
  gridEnabled = $state(true);
  dayNightEnabled = $state(true);
  /** Uccelli e ombre di nuvole; spenti se il sistema chiede meno movimento. */
  ambienceEnabled = $state(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  selectedHex = $state<Hex | undefined>(undefined);
  selectedId = $state<number | undefined>(undefined);
  /** Il pannello aperto dal menu a sinistra, se ce n'è uno. */
  drawer = $state<Drawer | undefined>(undefined);
  /** Dopo "Vai": il prossimo tocco sulla mappa è la destinazione dell'unità selezionata. */
  targeting = $state(false);
  /** Una casella su cui centrare la mappa: un oggetto nuovo a ogni richiesta. */
  focus = $state<{ hex: Hex } | undefined>(undefined);
  toasts = $state<Toast[]>([]);
  /** Da dove si aprono le nuvole all'ultimo cambio; nessuno se il cambio è di colpo. */
  revealFrom: Hex | undefined = undefined;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private toastSeq = 0;

  /** Riprende la partita salvata (recuperando il tempo passato) o ne comincia una nuova. */
  async start(): Promise<void> {
    const json = await readSave();
    const world = json ? deserializeWorld(json) : null;
    if (!world) {
      this.newGame();
      return;
    }
    syncTo(world, Date.now());
    this.seed = world.state.seed;
    this.speed = world.state.clock.speed;
    this.size = (Object.keys(MAP_SIZES) as MapSize[]).find((s) => MAP_SIZES[s].width === world.state.width) ?? "medium";
    this.adopt(world);
  }

  newGame(): void {
    const { width, height } = MAP_SIZES[this.size];
    save("exp.seed", this.seed);
    this.adopt(createWorld({ seed: this.seed, width, height, speed: this.speed, realNow: Date.now() }));
    this.persist();
  }

  private adopt(world: World): void {
    this.world = world;
    this.selectedHex = undefined;
    this.selectedId = undefined;
    this.targeting = false;
    this.revealFrom = undefined;
    this.now = Date.now();
    this.version++;
  }

  /** Porta il mondo all'ora attuale. Lo chiama il ciclo di gioco, più volte al secondo. */
  tick(): void {
    this.now = Date.now();
    const world = this.world;
    if (!world) return;
    // Raccolti e cicli dei laboratori cambiano il mondo senza avvisi: conta che sia successo
    // qualcosa, non solo che ci sia un avviso, altrimenti magazzino e laboratori restano fermi.
    const due = nextEventAt(world);
    const notices = syncTo(world, this.now);
    if (notices.length > 0 || (due !== undefined && due <= world.state.time)) this.handle(notices);
  }

  private handle(notices: Notice[]): void {
    const world = this.world;
    if (!world) return;
    const character = (id: number) => world.state.characters.find((c) => c.id === id);
    const outpostKind = (id: number) => `outpost.${world.state.outposts.find((o) => o.id === id)?.kind}`;
    let reveal: Hex | undefined;
    for (const n of notices) {
      switch (n.kind) {
        case "revealed":
          reveal = n.origin;
          break;
        case "discovered": {
          const place = world.map.places.find((p) => p.id === n.placeId);
          if (place) this.toast("notice.discovered", { name: place.name }, { kind: `place.${place.kind}` });
          break;
        }
        case "arrived":
        case "blocked": {
          const c = character(n.characterId);
          if (c) this.toast(n.kind === "arrived" ? "notice.arrived" : "notice.blocked", { name: c.name, gender: c.gender });
          break;
        }
        case "build_started": {
          const c = character(n.characterId);
          if (c) this.toast("notice.buildStarted", { name: c.name }, { kind: outpostKind(n.outpostId) });
          break;
        }
        case "build_failed": {
          const c = character(n.characterId);
          if (c) this.toast("notice.buildFailed", { name: c.name }, { reason: `reason.${n.reason}` });
          break;
        }
        case "outpost_ready":
          this.toast("notice.outpostReady", {}, { kind: outpostKind(n.outpostId) });
          break;
        case "sold":
        case "bought": {
          const c = character(n.characterId);
          const place = world.map.places.find((p) => p.id === n.placeId);
          if (c && place) {
            this.toast(n.kind === "sold" ? "notice.sold" : "notice.bought", { name: c.name, place: place.name, units: n.units, gold: n.gold });
          }
          break;
        }
        case "unloaded": {
          const c = character(n.characterId);
          if (c) this.toast("notice.unloaded", { name: c.name, gender: c.gender, units: n.units });
          break;
        }
        case "paid":
          this.toast("notice.paid", { gold: n.gold, count: n.count });
          break;
        case "unpaid": {
          const c = character(n.characterId);
          if (c) this.toast("notice.unpaid", { name: c.name, gender: c.gender });
          break;
        }
        case "left":
        case "lost": {
          const place = world.map.places.find((p) => p.id === n.placeId)?.name ?? "";
          this.toast(n.kind === "left" ? "notice.left" : "notice.lost", { name: n.name, gender: n.gender, place });
          break;
        }
        case "hired": {
          const c = character(n.characterId);
          const place = world.map.places.find((p) => p.id === n.placeId);
          if (c && place) this.toast("notice.hired", { name: c.name, place: place.name });
          break;
        }
        case "expedition_started": {
          const place = world.map.places.find((p) => p.id === n.placeId);
          if (place) this.toast("notice.expeditionStarted", { place: place.name });
          break;
        }
        case "expedition_done": {
          const place = world.map.places.find((p) => p.id === n.placeId);
          const empty = n.gold + n.units + n.items + n.relics === 0;
          if (place && empty) {
            this.toast(n.complete ? "notice.expeditionNothing" : "notice.expeditionRetreatEmpty", { place: place.name });
          } else if (place) {
            this.toast(n.complete ? "notice.expeditionDone" : "notice.expeditionRetreat", {
              place: place.name,
              gold: n.gold,
              units: n.units,
              items: n.items,
              relics: n.relics,
            });
          }
          break;
        }
        case "wounded":
        case "healed": {
          const c = character(n.characterId);
          if (c) this.toast(n.kind === "wounded" ? "notice.wounded" : "notice.healed", { name: c.name, gender: c.gender });
          break;
        }
        case "scar": {
          const c = character(n.characterId);
          if (c) this.toast("notice.scar", { name: c.name, gender: c.gender }, { stat: `stat.${n.stat}` });
          break;
        }
        case "workshop_ready": {
          const w = world.state.workshops.find((x) => x.id === n.workshopId);
          if (w) this.toast("notice.workshopReady", {}, { kind: `workshop.${w.recipe}` });
          break;
        }
      }
    }
    // Chi se n'è andato, o non è tornato, non può restare selezionato.
    if (this.selectedId !== undefined && !world.state.characters.some((c) => c.id === this.selectedId)) {
      this.selectedId = undefined;
    }
    this.revealFrom = reveal;
    this.version++;
    this.persist();
  }

  /**
   * Un tocco sulla mappa. Dopo "Vai" sceglie la destinazione dell'unità selezionata. Altrimenti
   * seleziona quello che c'è sulla casella: chi ci sta (un tocco dopo l'altro si passa al
   * successivo), poi l'edificio, oppure il terreno. Toccare la sede apre il suo pannello.
   */
  tapHex(hex: Hex): void {
    const world = this.world;
    if (!world) return;
    if (this.targeting && this.selectedId !== undefined) {
      this.selectedHex = hex;
      return;
    }
    const { state, map } = world;
    const gameNow = gameTimeAt(state.clock, Date.now());
    const choices: (number | "hex")[] = state.characters.filter((c) => hexEquals(currentHex(c, gameNow), hex)).map((c) => c.id);
    const guild = hexEquals(hex, state.guild.hex);
    const building = guild || placeAt(map, hex) !== undefined || outpostAt(state, hex) !== undefined;
    if (building || choices.length === 0) choices.push("hex");
    const current =
      this.selectedId !== undefined
        ? choices.indexOf(this.selectedId)
        : this.selectedHex && hexEquals(this.selectedHex, hex)
          ? choices.indexOf("hex")
          : -1;
    const next = choices[(current + 1) % choices.length]!;
    this.targeting = false;
    if (next !== "hex") {
      this.selectedId = next;
      this.selectedHex = undefined;
    } else if (guild) {
      this.clearSelection();
      this.drawer = "guild";
    } else {
      this.selectedId = undefined;
      this.selectedHex = hex;
    }
  }

  /** "Vai": il prossimo tocco sulla mappa sceglie dove mandare l'unità selezionata. */
  startTargeting(): void {
    if (this.selectedId === undefined) return;
    this.targeting = true;
    this.selectedHex = undefined;
  }

  cancelTargeting(): void {
    this.targeting = false;
    this.selectedHex = undefined;
  }

  /** Seleziona un personaggio; con `focus`, la mappa si centra su di lui. */
  selectCharacter(id: number, focus = false): void {
    this.selectedId = id;
    this.selectedHex = undefined;
    this.targeting = false;
    const world = this.world;
    const c = world?.state.characters.find((x) => x.id === id);
    if (focus && world && c) this.focus = { hex: currentHex(c, gameTimeAt(world.state.clock, Date.now())) };
  }

  clearSelection(): void {
    this.selectedId = undefined;
    this.selectedHex = undefined;
    this.targeting = false;
  }

  /** Apre un pannello del menu, o lo chiude se è già aperto. */
  toggleDrawer(drawer: Drawer): void {
    this.drawer = this.drawer === drawer ? undefined : drawer;
  }

  /** Manda il personaggio selezionato verso la casella selezionata. */
  sendSelected(): CommandResult | undefined {
    const target = this.selectedHex;
    if (!target || this.selectedId === undefined) return undefined;
    const result = this.command({ kind: "move", characterId: this.selectedId, target });
    if (result?.ok) this.cancelTargeting();
    return result;
  }

  stopSelected(): void {
    if (this.selectedId === undefined) return;
    this.command({ kind: "stop", characterId: this.selectedId });
  }

  /** Il costruttore selezionato va sulla casella selezionata e ci fonda un avamposto. */
  buildOutpost(): CommandResult | undefined {
    const target = this.selectedHex;
    if (!target || this.selectedId === undefined) return undefined;
    const result = this.command({ kind: "build_outpost", characterId: this.selectedId, target });
    if (result?.ok) this.cancelTargeting();
    return result;
  }

  buildWorkshop(recipe: RecipeId): CommandResult | undefined {
    return this.command({ kind: "build_workshop", recipe });
  }

  /** Il carovaniere selezionato va a vendere (o comprare) queste merci nel luogo indicato. */
  trade(placeId: number, mode: "sell" | "buy", goods: [MaterialId, number][]): CommandResult | undefined {
    if (this.selectedId === undefined) return undefined;
    const result = this.command({ kind: "trade", characterId: this.selectedId, placeId, mode, goods });
    if (result?.ok) this.cancelTargeting();
    return result;
  }

  /** Ingaggia chi è nella locanda di una cittadina. */
  hire(placeId: number, slot: number): CommandResult | undefined {
    const result = this.command({ kind: "hire", placeId, slot });
    const world = this.world;
    if (result?.ok && world) {
      const c = world.state.characters.at(-1)!;
      const place = world.map.places.find((p) => p.id === placeId)!;
      this.toast("notice.hired", { name: c.name, place: place.name });
    }
    return result;
  }

  equip(itemId: number): CommandResult | undefined {
    if (this.selectedId === undefined) return undefined;
    return this.command({ kind: "equip", characterId: this.selectedId, itemId });
  }

  unequip(slot: Slot): CommandResult | undefined {
    if (this.selectedId === undefined) return undefined;
    return this.command({ kind: "unequip", characterId: this.selectedId, slot });
  }

  /** Manda una squadra di mercenari nel dungeon, fino al livello `depth`. */
  expedition(placeId: number, members: number[], depth: number): CommandResult | undefined {
    const result = this.command({ kind: "expedition", placeId, members, depth });
    if (result?.ok) this.cancelTargeting();
    return result;
  }

  toggleWorkshop(workshopId: number): void {
    this.command({ kind: "toggle_workshop", workshopId });
  }

  /** Esegue un comando all'ora attuale del mondo. */
  private command(command: Command): CommandResult | undefined {
    const world = this.world;
    if (!world) return undefined;
    this.tick();
    const result = applyCommand(world, command);
    this.version++;
    this.persist();
    return result;
  }

  changeSpeed(speed: number): void {
    this.speed = speed;
    const world = this.world;
    if (!world) return;
    this.tick();
    setSpeed(world, speed, Date.now());
    this.version++;
    this.persist();
  }

  /** Strumento di prova: il mondo va avanti di qualche ora. */
  skip(hours: number): void {
    const world = this.world;
    if (!world) return;
    this.tick();
    const notices = skipAhead(world, hours * 3_600_000, Date.now());
    this.handle(notices);
    this.now = Date.now();
    this.version++;
    this.persist();
  }

  /** Strumento di prova: monete in regalo. */
  addGold(amount: number): void {
    const world = this.world;
    if (!world) return;
    grantGold(world, amount);
    this.version++;
    this.persist();
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  private toast(key: string, values: Record<string, string | number>, refs: Record<string, string> = {}): void {
    const id = ++this.toastSeq;
    this.toasts = [...this.toasts.slice(-2), { id, key, values, refs }];
    setTimeout(() => this.dismissToast(id), TOAST_MS);
  }

  /** Salva poco dopo l'ultimo cambiamento, per non scrivere a ogni passo. */
  private persist(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), SAVE_DELAY_MS);
  }

  saveNow(): void {
    clearTimeout(this.saveTimer);
    if (this.world) void writeSave(serializeWorld(this.world));
  }
}

export const game = new Game();
