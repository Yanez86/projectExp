import { Application, Assets, Container, Sprite, Spritesheet, TextureSource, type SpritesheetData, type Texture } from "pixi.js";
import {
  FOG_EXPLORED,
  FOG_UNEXPLORED,
  gameTimeAt,
  hexAt,
  hexEquals,
  hexKey,
  hexToOffset,
  placeAt,
  tileIndex,
  type Fog,
  type Hex,
  type World,
  type WorldMap,
} from "@exp/core";
import { COL_STEP, HEX_TOP, ROW_STEP, TILE_H, TILE_W, hexAtPoint, hexCenter, tileOrigin } from "./layout";
import { Ambience } from "./Ambience";
import { RELIEF, biomeIdOf, edgeOverlays } from "./transitions";

/** Velo di foschia sulle caselle esplorate ma fuori vista: il velo delle nuvole, trasparente. */
const MIST_ALPHA = 0.32;
/** Spostamento oltre il quale un tocco diventa un trascinamento, in pixel CSS. */
const TAP_SLOP = 8;
/** Quanto durano e quanto si allontanano le nuvole che si aprono. */
const REVEAL_MS = 1400;
const REVEAL_DRIFT = 22;
/** Ondeggiare delle nuvole ferme: ampiezza in pixel dell'arte e pausa tra un controllo e l'altro. */
const WOBBLE_PX = 1.2;
const WOBBLE_CHECK_MS = 150;
/** Margine attorno a una casella per decidere se è sullo schermo: le nuvole sbordano. */
const CULL_MARGIN = 8;
/** I piedi di un personaggio rispetto al centro della casella; sulla sede, davanti alla casa. */
const FEET_DY = 5;
const FEET_DY_GUILD = 13;
/** Distanza tra personaggi fermi sulla stessa casella, e saltello di chi cammina. */
const CROWD_DX = 10;
const HOP_MS = 160;

export interface MapViewOptions {
  /** Chiamata quando il giocatore tocca un esagono (non quando trascina). */
  onTap: (hex: Hex) => void;
}

interface Pointer {
  x: number;
  y: number;
}

/** Gli sprite di una casella, uno per strato. */
interface HexSprites {
  x: number;
  y: number;
  ground: Sprite;
  edges: Sprite[];
  /** Il rilievo, oppure il luogo di interesse che sorge sulla casella. */
  relief: Sprite | undefined;
  /** Le luci notturne del luogo, se ce n'è uno. */
  glow: Sprite | undefined;
  grid: Sprite;
  cloudBase: Sprite;
  cloud: Sprite;
  /** Posizione di riposo del batuffolo e fase del suo ondeggiare. */
  cloudX: number;
  cloudY: number;
  phase: number;
}

interface Reveal {
  start: number;
  dx: number;
  dy: number;
  /** Quanto velo resta alla fine: foschia se la casella è esplorata ma già fuori vista. */
  mist: number;
}

type CloudState = "covered" | "mist" | "clear";

interface CharacterSprites {
  token: Sprite;
  shadow: Sprite;
}

/**
 * Disegna la mappa con Pixi e gestisce la visuale: trascinamento, zoom con rotella e pizzico,
 * tocco. Lo zoom è sempre un numero intero di pixel del dispositivo per pixel dell'arte, così la
 * pixel art resta nitida. Si ridisegna solo quando qualcosa cambia o si muove.
 *
 * Strati, dal basso: terreno, transizioni tra biomi, griglia, rilievo, sede e personaggi (in
 * ordine di profondità), ombre di nuvole e uccelli, velo delle nuvole, batuffoli, uccelli in volo;
 * tutti questi prendono la luce del giorno. Sopra, senza luce: le finestre accese della sede, il
 * percorso (visibile anche sulle nuvole), la selezione.
 */
export class MapView {
  private app = new Application();
  private world = new Container();
  /** Tutto ciò che prende la luce del giorno e della notte. */
  private scene = new Container();
  private groundLayer = new Container();
  private edgeLayer = new Container();
  private gridLayer = new Container({ alpha: 0.14 });
  private objectLayer = new Container({ sortableChildren: true });
  private routeLayer = new Container();
  private cloudBaseLayer = new Container();
  private cloudLayer = new Container({ sortableChildren: true });
  /** Ombre di nuvole e di uccelli, sul terreno; uccelli in volo, sopra le nuvole. */
  private ambientGround = new Container();
  private sky = new Container();
  /** Luci che non si spengono con la notte (le finestre della sede). */
  private lights = new Container({ alpha: 0 });
  private overlay = new Container();
  private ambience: Ambience | undefined;
  private ambienceEnabled = true;
  private daylightTint = 0xffffff;
  private textures = new Map<string, Texture>();
  private variants = new Map<string, Texture[]>();
  private hexes: HexSprites[] = [];
  /** 1 se la casella è sotto le nuvole. */
  private covered = new Uint8Array(0);
  private reveals = new Map<number, Reveal>();
  private selection: Sprite | undefined;
  private guild: Sprite | undefined;
  private map: WorldMap | undefined;
  private fog: Fog | undefined;
  private game: World | undefined;
  private characters = new Map<number, CharacterSprites>();
  private ring: Sprite | undefined;
  private selectedCharacter: number | undefined;
  private fogEnabled = true;

  /** Zoom in pixel del dispositivo per pixel dell'arte. */
  private zoom = 2;
  /** Posizione del mondo sullo schermo, in pixel CSS. */
  private camX = 0;
  private camY = 0;
  private viewW = 0;
  private viewH = 0;

  private pointers = new Map<number, Pointer>();
  private gesture:
    | { kind: "drag"; startX: number; startY: number; camX: number; camY: number; moved: boolean }
    | { kind: "pinch"; dist: number; zoom: number; midX: number; midY: number; camX: number; camY: number }
    | undefined;
  private dirty = false;
  private frameQueued = false;
  private wobbleTimer: ReturnType<typeof setTimeout> | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private destroyed = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly options: MapViewOptions,
  ) {}

  /** Prepara Pixi e la grafica; lancia un errore se il browser non riesce a disegnare. */
  async init(sheetData: SpritesheetData, sheetImage: string): Promise<void> {
    TextureSource.defaultOptions.scaleMode = "nearest";
    await this.app.init({
      background: "#1a1423",
      antialias: false,
      autoStart: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      roundPixels: true,
      width: this.host.clientWidth || 1,
      height: this.host.clientHeight || 1,
    });
    if (this.destroyed) return;
    this.app.ticker.stop();
    this.viewW = this.host.clientWidth;
    this.viewH = this.host.clientHeight;
    const canvas = this.app.canvas;
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    this.host.appendChild(canvas);
    this.scene.addChild(
      this.groundLayer,
      this.edgeLayer,
      this.gridLayer,
      this.objectLayer,
      this.ambientGround,
      this.cloudBaseLayer,
      this.cloudLayer,
      this.sky,
    );
    this.world.addChild(this.scene, this.lights, this.routeLayer, this.overlay);
    this.app.stage.addChild(this.world);

    const sheet = new Spritesheet(await Assets.load<Texture>(sheetImage), sheetData);
    await sheet.parse();
    for (const [name, texture] of Object.entries(sheet.textures)) {
      this.textures.set(name, texture);
      const match = /^(.*)_(\d+)$/.exec(name);
      if (match) {
        const list = this.variants.get(match[1] as string) ?? [];
        list[Number(match[2])] = texture;
        this.variants.set(match[1] as string, list);
      }
    }
    this.zoom = Math.max(1, Math.round(2 * this.dpr));
    this.ambience = new Ambience(this.ambientGround, this.sky, {
      bird: [this.texture("bird_0"), this.texture("bird_1")],
      birdShadow: this.texture("bird_shadow"),
      cloudShadows: this.variants.get("cloud_shadow") ?? [],
    });

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
  }

  destroy(): void {
    this.destroyed = true;
    clearTimeout(this.wobbleTimer);
    this.resizeObserver?.disconnect();
    this.app.destroy(true, { children: true });
  }

  setMap(map: WorldMap, fog: Fog): void {
    this.map = map;
    this.fog = fog;
    this.ambience?.clear();
    for (const layer of [this.groundLayer, this.edgeLayer, this.gridLayer, this.objectLayer, this.routeLayer, this.cloudBaseLayer, this.cloudLayer, this.lights]) {
      layer.removeChildren().forEach((child) => child.destroy());
    }
    this.hexes = [];
    this.characters.clear();
    this.ring = undefined;
    this.guild = undefined;
    this.reveals.clear();
    this.covered = new Uint8Array(map.width * map.height);
    const gridTexture = this.texture("grid");
    const cloudBaseTexture = this.texture("cloud_base");
    const clouds = this.variants.get("cloud") ?? [];

    for (let i = 0; i < map.width * map.height; i++) {
      const h = hexAt(map, i);
      const { row } = hexToOffset(h);
      const { x, y } = tileOrigin(h);
      const id = biomeIdOf(map, i);
      const variant = map.variants[i] as number;

      const ground = this.addSprite(this.groundLayer, this.pick(id, variant), x, y + HEX_TOP);
      const edges = edgeOverlays(map, h).map((name) => this.addSprite(this.edgeLayer, this.texture(name), x, y + HEX_TOP));
      const grid = this.addSprite(this.gridLayer, gridTexture, x, y + HEX_TOP);
      let relief: Sprite | undefined;
      let glow: Sprite | undefined;
      const place = placeAt(map, h);
      if (place) {
        relief = this.addSprite(this.objectLayer, this.texture(`place_${place.kind}`), x, y);
        relief.zIndex = row * 2;
        glow = this.addSprite(this.lights, this.texture(`place_${place.kind}_glow`), x, y);
      } else if (RELIEF.has(id)) {
        // Terreno e rilievo scelgono la variante da bit diversi dello stesso numero: si combinano.
        relief = this.addSprite(this.objectLayer, this.pick(`${id}_top`, variant >> 3), x, y);
        relief.zIndex = row * 2;
      }
      const cloudBase = this.addSprite(this.cloudBaseLayer, cloudBaseTexture, x, y + HEX_TOP);
      // Ogni batuffolo spostato a caso dal centro e di forma diversa, così il mare di nuvole non
      // sembra una griglia.
      const c = hexCenter(h);
      const jitter = (variant * 37 + i * 101) & 255;
      const cloudX = c.x + (jitter & 15) - 7;
      const cloudY = c.y + ((jitter >> 4) & 7) - 4;
      const cloud = this.addSprite(this.cloudLayer, clouds[variant % clouds.length] ?? cloudBaseTexture, cloudX, cloudY);
      cloud.anchor.set(0.5);
      cloud.zIndex = cloudY;
      this.hexes.push({ x, y, ground, edges, relief, glow, grid, cloudBase, cloud, cloudX, cloudY, phase: (variant / 256) * Math.PI * 2 });
    }

    const c = hexCenter(map.start);
    const guildDepth = hexToOffset(map.start).row * 2 + 1;
    const shadow = this.addSprite(this.objectLayer, this.texture("guild_shadow"), c.x + 3, c.y + 6);
    shadow.anchor.set(0.5);
    shadow.zIndex = guildDepth - 0.01;
    this.guild = this.addSprite(this.objectLayer, this.texture("guild"), c.x, c.y + 7);
    this.guild.anchor.set(0.5, 1);
    this.guild.zIndex = guildDepth;
    // Le luci dei luoghi sono già nel livello delle luci: quelle della sede vanno dopo, sopra.
    this.addSprite(this.lights, this.texture("guild_glow"), c.x, c.y + 7).anchor.set(0.5, 1);

    this.selection?.destroy();
    this.selection = undefined;
    this.refreshFog();
    this.centerOn(map.start);
    this.scheduleWobble();
  }

  /** I personaggi da mostrare: la vista legge le loro posizioni dalla simulazione a ogni frame. */
  setWorld(world: World): void {
    this.game = world;
    for (const { token, shadow } of this.characters.values()) {
      token.destroy();
      shadow.destroy();
    }
    this.characters.clear();
    for (const c of world.state.characters) {
      const shadow = this.addSprite(this.objectLayer, this.texture("char_shadow"), 0, 0);
      shadow.anchor.set(0.5);
      shadow.alpha = 0.3;
      const token = this.addSprite(this.objectLayer, this.texture(`char_${c.ethnicity}`), 0, 0);
      token.anchor.set(0.5, 1);
      this.characters.set(c.id, { token, shadow });
    }
    this.ring ??= this.addSprite(this.objectLayer, this.texture("char_ring"), 0, 0);
    this.ring.anchor.set(0.5);
    this.refreshCharacters();
  }

  setSelectedCharacter(id: number | undefined): void {
    this.selectedCharacter = id;
    this.refreshCharacters();
  }

  /** Da chiamare quando i personaggi cambiano (un ordine, un arrivo). */
  refreshCharacters(): void {
    this.updateCharacters();
    this.requestRender();
  }

  /**
   * Il percorso da mostrare: un puntino per casella e la bandierina sulla destinazione.
   * `preview`: un percorso ancora da confermare, più trasparente.
   */
  setRoute(route: readonly Hex[], destination: Hex | undefined, preview: boolean): void {
    this.routeLayer.removeChildren().forEach((child) => child.destroy());
    this.routeLayer.alpha = preview ? 0.65 : 1;
    for (const h of route) {
      if (destination && hexEquals(h, destination)) continue;
      const c = hexCenter(h);
      this.addSprite(this.routeLayer, this.texture("route_dot"), c.x, c.y).anchor.set(0.5);
    }
    if (destination) {
      const c = hexCenter(destination);
      this.addSprite(this.routeLayer, this.texture("route_flag"), c.x + 2, c.y + 4).anchor.set(0.5, 1);
    }
    this.requestRender();
  }

  setFogEnabled(enabled: boolean): void {
    this.fogEnabled = enabled;
    this.refreshFog();
  }

  /** La luce del momento: un colore che moltiplica la mappa e quanto sono accese le luci. */
  setDaylight(tint: number, glow: number): void {
    if (tint === this.daylightTint && glow === this.lights.alpha) return;
    this.daylightTint = tint;
    this.scene.tint = tint;
    this.lights.alpha = glow;
    if (this.ambience) this.ambience.birdsAllowed = glow < 0.5;
    this.requestRender();
  }

  /** Uccelli e ombre di nuvole: si possono spegnere (e lo sono se il sistema chiede meno movimento). */
  setAmbienceEnabled(enabled: boolean): void {
    this.ambienceEnabled = enabled;
    this.ambientGround.visible = enabled;
    this.sky.visible = enabled;
    if (!enabled) this.ambience?.clear();
    this.requestRender();
  }

  setGridEnabled(enabled: boolean): void {
    this.gridLayer.visible = enabled;
    this.requestRender();
  }

  /**
   * Da chiamare dopo aver cambiato la nebbia. Con `revealFrom` le nuvole delle caselle appena
   * scoperte si aprono allontanandosi da quel punto; senza, tutto cambia di colpo.
   */
  refreshFog(revealFrom?: Hex): void {
    const { map, fog } = this;
    if (!map || !fog) return;
    const now = performance.now();
    const origin = revealFrom ? hexCenter(revealFrom) : undefined;
    this.hexes.forEach((hs, i) => {
      const state = this.fogEnabled ? fog.state[i] : undefined;
      const covered = state === FOG_UNEXPLORED;
      const wasCovered = this.covered[i] === 1;
      this.covered[i] = covered ? 1 : 0;

      const mist = state === FOG_EXPLORED;
      if (hs.relief) hs.relief.visible = !covered;
      if (hs.glow) hs.glow.visible = !covered;

      if (covered) {
        this.reveals.delete(i);
        this.resetCloud(hs, "covered");
      } else if (wasCovered && origin) {
        const c = { x: hs.cloudX, y: hs.cloudY };
        let dx = c.x - origin.x;
        let dy = c.y - origin.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) {
          dx = Math.cos(hs.phase);
          dy = Math.sin(hs.phase);
        } else {
          dx /= len;
          dy /= len;
        }
        this.reveals.set(i, { start: now, dx, dy, mist: mist ? MIST_ALPHA : 0 });
      } else {
        const reveal = this.reveals.get(i);
        if (reveal) reveal.mist = mist ? MIST_ALPHA : 0;
        else this.resetCloud(hs, mist ? "mist" : "clear");
      }
    });
    if (this.guild) {
      this.guild.visible = this.covered[tileIndex(map, map.start)] !== 1;
    }
    this.requestRender();
  }

  select(h: Hex | undefined): void {
    if (!h) {
      if (this.selection) this.selection.visible = false;
      this.requestRender();
      return;
    }
    if (!this.selection) {
      this.selection = this.addSprite(this.overlay, this.texture("select"), 0, 0);
    }
    const o = tileOrigin(h);
    this.selection.position.set(o.x, o.y + HEX_TOP);
    this.selection.visible = true;
    this.requestRender();
  }

  centerOn(h: Hex): void {
    const c = hexCenter(h);
    const scale = this.zoom / this.dpr;
    this.camX = this.host.clientWidth / 2 - c.x * scale;
    this.camY = this.host.clientHeight / 2 - c.y * scale;
    this.applyCamera();
  }

  /** Cambia lo zoom di `steps` scatti, tenendo fermo il punto dello schermo indicato. */
  zoomBy(steps: number, screenX = this.host.clientWidth / 2, screenY = this.host.clientHeight / 2): void {
    const step = Math.max(1, Math.round(this.dpr / 2));
    this.setZoom(this.zoom + steps * step, screenX, screenY, this.camX, this.camY, this.zoom);
  }

  // ---------------------------------------------------------------- sprite

  private texture(name: string): Texture {
    const texture = this.textures.get(name);
    if (!texture) throw new Error(`Manca il tile ${name}`);
    return texture;
  }

  /** Una delle varianti di un tile, scelta dal numero casuale della casella. */
  private pick(name: string, variant: number): Texture {
    const list = this.variants.get(name) ?? [];
    const texture = list[variant % Math.max(1, list.length)];
    if (!texture) throw new Error(`Manca il tile ${name}`);
    return texture;
  }

  private addSprite(layer: Container, texture: Texture, x: number, y: number): Sprite {
    const sprite = new Sprite(texture);
    sprite.position.set(x, y);
    layer.addChild(sprite);
    return sprite;
  }

  /** Coperta dalle nuvole, velata di foschia o libera. */
  private resetCloud(hs: HexSprites, state: CloudState): void {
    hs.cloudBase.visible = state !== "clear";
    hs.cloudBase.alpha = state === "mist" ? MIST_ALPHA : 1;
    hs.cloud.visible = state === "covered";
    hs.cloud.alpha = 1;
    hs.cloud.position.set(hs.cloudX, hs.cloudY);
  }

  // ---------------------------------------------------------------- animazione

  private requestRender(): void {
    this.dirty = true;
    this.queueFrame();
  }

  private queueFrame(): void {
    if (this.frameQueued || this.destroyed) return;
    this.frameQueued = true;
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    this.frameQueued = false;
    if (this.destroyed) return;
    if (this.reveals.size > 0) {
      this.stepReveals(now);
      this.dirty = true;
    }
    const moving = this.updateCharacters();
    if (moving) this.dirty = true;
    const ambient = this.ambienceEnabled && this.ambience !== undefined && this.map !== undefined;
    if (ambient && this.ambience!.step(now, this.viewRect())) this.dirty = true;
    if (this.dirty) {
      this.dirty = false;
      this.app.render();
    }
    if (this.reveals.size > 0 || moving || ambient) this.queueFrame();
  };

  /** La parte di mondo sullo schermo, in pixel del mondo. */
  private viewRect(): { left: number; top: number; right: number; bottom: number } {
    const scale = this.zoom / this.dpr;
    return {
      left: -this.camX / scale,
      top: -this.camY / scale,
      right: (this.host.clientWidth - this.camX) / scale,
      bottom: (this.host.clientHeight - this.camY) / scale,
    };
  }

  /**
   * Mette ogni personaggio dove si trova ora: a metà di un passo, tra le due caselle, con un
   * piccolo saltello. Restituisce true se qualcuno sta camminando.
   */
  private updateCharacters(): boolean {
    const world = this.game;
    if (!world) return false;
    const gameNow = gameTimeAt(world.state.clock, Date.now());
    const hop = Math.floor(performance.now() / HOP_MS) % 2;
    const guildKey = hexKey(world.state.guild.hex);
    // Chi è fermo sulla stessa casella si mette in fila, uno accanto all'altro.
    const crowds = new Map<string, number[]>();
    for (const c of world.state.characters) {
      if (c.step) continue;
      const key = hexKey(c.hex);
      crowds.set(key, [...(crowds.get(key) ?? []), c.id]);
    }
    let moving = false;
    for (const c of world.state.characters) {
      const sprites = this.characters.get(c.id);
      if (!sprites) continue;
      let x: number;
      let y: number;
      let lift = 0;
      if (c.step) {
        const a = hexCenter(c.step.from);
        const b = hexCenter(c.step.to);
        const span = Math.max(1, c.step.arriveAt - c.step.departAt);
        const t = Math.min(1, Math.max(0, (gameNow - c.step.departAt) / span));
        x = a.x + (b.x - a.x) * t;
        y = a.y + (b.y - a.y) * t + FEET_DY;
        lift = hop;
        moving = true;
      } else {
        const key = hexKey(c.hex);
        const crowd = crowds.get(key) ?? [c.id];
        const center = hexCenter(c.hex);
        x = center.x + (crowd.indexOf(c.id) - (crowd.length - 1) / 2) * CROWD_DX;
        y = center.y + (key === guildKey ? FEET_DY_GUILD : FEET_DY);
      }
      x = Math.round(x);
      y = Math.round(y);
      const depth = ((y - HEX_TOP - 16) / ROW_STEP) * 2 + 1.5;
      sprites.shadow.position.set(x, y);
      sprites.shadow.zIndex = depth;
      sprites.token.position.set(x, y + 1 - lift);
      sprites.token.zIndex = depth + 0.02;
      if (this.ring && c.id === this.selectedCharacter) {
        this.ring.position.set(x, y);
        this.ring.zIndex = depth + 0.01;
      }
    }
    if (this.ring) this.ring.visible = this.selectedCharacter !== undefined && this.characters.has(this.selectedCharacter);
    return moving;
  }

  /** Le nuvole scoperte scivolano via dal punto di scoperta e svaniscono. */
  private stepReveals(now: number): void {
    for (const [i, reveal] of this.reveals) {
      const hs = this.hexes[i];
      if (!hs) continue;
      const t = Math.min(1, (now - reveal.start) / REVEAL_MS);
      const ease = 1 - (1 - t) ** 3;
      hs.cloud.position.set(
        Math.round(hs.cloudX + reveal.dx * REVEAL_DRIFT * ease),
        Math.round(hs.cloudY + reveal.dy * REVEAL_DRIFT * ease),
      );
      hs.cloud.alpha = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      hs.cloudBase.alpha = Math.max(reveal.mist, 1 - t * 2.5);
      if (t >= 1) {
        this.resetCloud(hs, reveal.mist > 0 ? "mist" : "clear");
        this.reveals.delete(i);
      }
    }
  }

  /** Le nuvole ferme ondeggiano di un pixel, piano: si ridisegna solo quando uno si sposta. */
  private scheduleWobble(): void {
    clearTimeout(this.wobbleTimer);
    this.wobbleTimer = setTimeout(() => {
      if (this.destroyed) return;
      const now = performance.now();
      let moved = false;
      this.hexes.forEach((hs, i) => {
        if (!hs.cloud.visible || hs.cloud.culled || this.reveals.has(i)) return;
        const x = hs.cloudX + Math.round(Math.sin(now / 2400 + hs.phase) * WOBBLE_PX);
        if (x !== hs.cloud.x) {
          hs.cloud.x = x;
          moved = true;
        }
      });
      if (moved) this.requestRender();
      this.scheduleWobble();
    }, WOBBLE_CHECK_MS);
  }

  // ---------------------------------------------------------------- visuale

  private get dpr(): number {
    return this.app.renderer?.resolution ?? (window.devicePixelRatio || 1);
  }

  private get maxZoom(): number {
    return Math.max(4, Math.round(8 * this.dpr));
  }

  private setZoom(
    target: number,
    screenX: number,
    screenY: number,
    fromCamX: number,
    fromCamY: number,
    fromZoom: number,
  ): void {
    const zoom = Math.min(this.maxZoom, Math.max(1, Math.round(target)));
    // Il punto del mondo sotto (screenX, screenY) resta lì dopo lo zoom.
    const fromScale = fromZoom / this.dpr;
    const worldX = (screenX - fromCamX) / fromScale;
    const worldY = (screenY - fromCamY) / fromScale;
    const scale = zoom / this.dpr;
    this.zoom = zoom;
    this.camX = screenX - worldX * scale;
    this.camY = screenY - worldY * scale;
    this.applyCamera();
  }

  private applyCamera(): void {
    const map = this.map;
    const scale = this.zoom / this.dpr;
    if (map) {
      // La mappa non può uscire del tutto dallo schermo.
      const mapW = (map.width * COL_STEP + COL_STEP / 2) * scale;
      const mapH = ((map.height - 1) * ROW_STEP + TILE_H) * scale;
      const w = this.host.clientWidth;
      const h = this.host.clientHeight;
      const margin = Math.min(w, h) / 3;
      this.camX = Math.min(w - margin, Math.max(margin - mapW, this.camX));
      this.camY = Math.min(h - margin, Math.max(margin - mapH, this.camY));
    }
    // Posizione allineata ai pixel del dispositivo.
    const snap = (v: number) => Math.round(v * this.dpr) / this.dpr;
    this.camX = snap(this.camX);
    this.camY = snap(this.camY);
    this.world.scale.set(scale);
    this.world.position.set(this.camX, this.camY);
    this.cull();
    this.requestRender();
  }

  /** Esclude dal disegno le caselle fuori dallo schermo: meno lavoro per la scheda grafica. */
  private cull(): void {
    const scale = this.zoom / this.dpr;
    const left = -this.camX / scale - TILE_W - CULL_MARGIN;
    const top = -this.camY / scale - TILE_H - CULL_MARGIN;
    const right = (this.host.clientWidth - this.camX) / scale + CULL_MARGIN;
    const bottom = (this.host.clientHeight - this.camY) / scale + CULL_MARGIN;
    for (const hs of this.hexes) {
      const culled = !(hs.x > left && hs.x < right && hs.y > top && hs.y < bottom);
      if (hs.ground.culled === culled) continue;
      hs.ground.culled = culled;
      for (const edge of hs.edges) edge.culled = culled;
      if (hs.relief) hs.relief.culled = culled;
      if (hs.glow) hs.glow.culled = culled;
      hs.grid.culled = culled;
      hs.cloudBase.culled = culled;
      hs.cloud.culled = culled;
    }
  }

  /** Al cambio di dimensioni (rotazione del telefono) resta fermo il centro della visuale. */
  private resize(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w === 0 || h === 0) return;
    this.camX += (w - this.viewW) / 2;
    this.camY += (h - this.viewH) / 2;
    this.viewW = w;
    this.viewH = h;
    this.app.renderer.resize(w, h);
    this.applyCamera();
  }

  // ---------------------------------------------------------------- input

  private localPoint(e: PointerEvent | WheelEvent): Pointer {
    const rect = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onPointerDown = (e: PointerEvent): void => {
    try {
      this.app.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Alcuni puntatori (sintetici o già rilasciati) non si possono catturare: va bene lo stesso.
    }
    this.pointers.set(e.pointerId, this.localPoint(e));
    this.startGesture();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, this.localPoint(e));
    const g = this.gesture;
    if (!g) return;
    if (g.kind === "drag") {
      const p = this.firstPointer();
      if (!p) return;
      const dx = p.x - g.startX;
      const dy = p.y - g.startY;
      if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
      g.moved = true;
      this.camX = g.camX + dx;
      this.camY = g.camY + dy;
      this.applyCamera();
    } else {
      const [a, b] = [...this.pointers.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      // Lo zoom segue le dita, il mondo si sposta con il punto medio.
      const target = (g.zoom * dist) / Math.max(1, g.dist);
      this.setZoom(target, g.midX, g.midY, g.camX, g.camY, g.zoom);
      this.camX += midX - g.midX;
      this.camY += midY - g.midY;
      this.applyCamera();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const g = this.gesture;
    const wasTap = g?.kind === "drag" && !g.moved && this.pointers.size === 1;
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (wasTap && p && this.map) {
      const scale = this.zoom / this.dpr;
      this.options.onTap(hexAtPoint((p.x - this.camX) / scale, (p.y - this.camY) / scale));
    }
    this.startGesture();
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const p = this.localPoint(e);
    this.zoomBy(e.deltaY < 0 ? 1 : -1, p.x, p.y);
  };

  private firstPointer(): Pointer | undefined {
    return this.pointers.values().next().value;
  }

  /** Ricomincia il gesto con le dita rimaste: uno trascina, due fanno lo zoom. */
  private startGesture(): void {
    const points = [...this.pointers.values()];
    const [a, b] = points;
    if (points.length === 1 && a) {
      const moved = this.gesture !== undefined;
      this.gesture = { kind: "drag", startX: a.x, startY: a.y, camX: this.camX, camY: this.camY, moved };
    } else if (points.length >= 2 && a && b) {
      this.gesture = {
        kind: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: this.zoom,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        camX: this.camX,
        camY: this.camY,
      };
    } else {
      this.gesture = undefined;
    }
  }
}
