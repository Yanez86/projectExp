import {
  applyCommand,
  createWorld,
  deserializeWorld,
  gameTimeAt,
  hexEquals,
  serializeWorld,
  setSpeed,
  skipAhead,
  syncTo,
  type Character,
  type CommandResult,
  type Hex,
  type Notice,
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
}

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
    this.selectedId = world.state.characters[0]?.id;
    this.revealFrom = undefined;
    this.now = Date.now();
    this.version++;
  }

  /** Porta il mondo all'ora attuale. Lo chiama il ciclo di gioco, più volte al secondo. */
  tick(): void {
    this.now = Date.now();
    const world = this.world;
    if (!world) return;
    const notices = syncTo(world, this.now);
    if (notices.length > 0) this.handle(notices);
  }

  private handle(notices: Notice[]): void {
    let reveal: Hex | undefined;
    for (const n of notices) {
      if (n.kind === "revealed") reveal = n.origin;
      else if (n.kind === "discovered") {
        const place = this.world?.map.places.find((p) => p.id === n.placeId);
        if (place) this.toast("notice.discovered", { name: place.name, kind: `place.${place.kind}` });
      } else {
        const c = this.world?.state.characters.find((x) => x.id === n.characterId);
        if (c) this.toast(n.kind === "arrived" ? "notice.arrived" : "notice.blocked", { name: c.name, gender: c.gender });
      }
    }
    this.revealFrom = reveal;
    this.version++;
    this.persist();
  }

  /** Un tocco sulla mappa: seleziona chi c'è su quella casella, altrimenti la casella. */
  tapHex(hex: Hex): void {
    const world = this.world;
    if (!world) return;
    const gameNow = gameTimeAt(world.state.clock, Date.now());
    const here = world.state.characters.filter((c) => hexEquals(currentHex(c, gameNow), hex));
    if (here.length > 0) {
      const index = here.findIndex((c) => c.id === this.selectedId);
      // Più personaggi sulla stessa casella: ogni tocco passa al successivo.
      this.selectedId = here[(index + 1) % here.length]!.id;
      this.selectedHex = undefined;
      return;
    }
    this.selectedHex = hex;
  }

  selectCharacter(id: number): void {
    this.selectedId = id;
    this.selectedHex = undefined;
  }

  /** Manda il personaggio selezionato verso la casella selezionata. */
  sendSelected(): CommandResult | undefined {
    const world = this.world;
    const target = this.selectedHex;
    if (!world || !target || this.selectedId === undefined) return undefined;
    this.tick();
    const result = applyCommand(world, { kind: "move", characterId: this.selectedId, target });
    if (result.ok) this.selectedHex = undefined;
    this.version++;
    this.persist();
    return result;
  }

  stopSelected(): void {
    const world = this.world;
    if (!world || this.selectedId === undefined) return;
    this.tick();
    applyCommand(world, { kind: "stop", characterId: this.selectedId });
    this.version++;
    this.persist();
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

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  private toast(key: string, values: Record<string, string | number>): void {
    const id = ++this.toastSeq;
    this.toasts = [...this.toasts.slice(-2), { id, key, values }];
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
