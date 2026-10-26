import {
  createFog,
  generateMap,
  updateVisibility,
  type Fog,
  type Hex,
  type VisionSource,
  type WorldMap,
} from "@exp/core";
import { load, save } from "./storage";

export const MAP_SIZES = {
  small: { width: 40, height: 30 },
  medium: { width: 64, height: 48 },
  large: { width: 96, height: 72 },
} as const;
export type MapSize = keyof typeof MAP_SIZES;

/** Quanto vede la sede della gilda, e quanto scopre un tocco in modalità esplorazione. */
const GUILD_VISION = 3;
const TAP_VISION = 2;

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Stato del prototipo: la mappa, la nebbia e cosa è selezionato. */
class Game {
  seed = $state(load("exp.seed") ?? randomSeed());
  size = $state<MapSize>("medium");
  fogEnabled = $state(true);
  gridEnabled = $state(true);
  exploreOnTap = $state(false);
  selected = $state<Hex | undefined>(undefined);
  /** Cresce a ogni cambio di nebbia: la vista lo osserva per ridisegnare. */
  fogVersion = $state(0);
  /** Da dove si aprono le nuvole all'ultimo cambio di nebbia; nessuno se il cambio è di colpo. */
  revealFrom: Hex | undefined = undefined;
  map = $state.raw<WorldMap | undefined>(undefined);
  fog = $state.raw<Fog | undefined>(undefined);
  private sources: VisionSource[] = [];

  generate(): void {
    const { width, height } = MAP_SIZES[this.size];
    const map = generateMap({ seed: this.seed, width, height });
    save("exp.seed", this.seed);
    this.map = map;
    this.fog = createFog(map);
    this.sources = [{ hex: map.start, radius: GUILD_VISION }];
    this.selected = undefined;
    this.updateFog(undefined);
  }

  tap(hex: Hex): void {
    if (this.exploreOnTap && this.map) {
      // La sede vede sempre; l'ultimo punto toccato resta in vista, i precedenti solo esplorati.
      this.sources = [{ hex: this.map.start, radius: GUILD_VISION }, { hex, radius: TAP_VISION }];
      this.updateFog(hex);
    }
    this.selected = hex;
  }

  resetFog(): void {
    if (!this.map || !this.fog) return;
    this.fog.state.fill(0);
    this.sources = [{ hex: this.map.start, radius: GUILD_VISION }];
    this.updateFog(undefined);
  }

  private updateFog(revealFrom: Hex | undefined): void {
    if (!this.map || !this.fog) return;
    updateVisibility(this.fog, this.map, this.sources);
    this.revealFrom = revealFrom;
    this.fogVersion++;
  }
}

export const game = new Game();
