import { Application, Assets, Container, Sprite, TextureSource, type Spritesheet, type Texture } from "pixi.js";
import {
  FOG_EXPLORED,
  FOG_UNEXPLORED,
  hexAt,
  hexToOffset,
  tileIndex,
  type Fog,
  type Hex,
  type WorldMap,
} from "@exp/core";
import { COL_STEP, HEX_TOP, ROW_STEP, TILE_H, TILE_W, hexAtPoint, hexCenter, tileOrigin } from "./layout";
import { RELIEF, biomeIdOf, edgeOverlays } from "./transitions";

/** Tinta delle caselle esplorate ma fuori vista. */
const EXPLORED_TINT = 0x9a9ab4;
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
  relief: Sprite | undefined;
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
}

/**
 * Disegna la mappa con Pixi e gestisce la visuale: trascinamento, zoom con rotella e pizzico,
 * tocco. Lo zoom è sempre un numero intero di pixel del dispositivo per pixel dell'arte, così la
 * pixel art resta nitida. Si ridisegna solo quando qualcosa cambia o si muove.
 *
 * Strati, dal basso: terreno, transizioni tra biomi, griglia, rilievo e sede (in ordine di riga),
 * velo delle nuvole, batuffoli, selezione.
 */
export class MapView {
  private app = new Application();
  private world = new Container();
  private groundLayer = new Container();
  private edgeLayer = new Container();
  private gridLayer = new Container({ alpha: 0.14 });
  private objectLayer = new Container({ sortableChildren: true });
  private cloudBaseLayer = new Container();
  private cloudLayer = new Container({ sortableChildren: true });
  private overlay = new Container();
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

  async init(sheetUrl: string): Promise<void> {
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
    this.world.addChild(
      this.groundLayer,
      this.edgeLayer,
      this.gridLayer,
      this.objectLayer,
      this.cloudBaseLayer,
      this.cloudLayer,
      this.overlay,
    );
    this.app.stage.addChild(this.world);

    const sheet = await Assets.load<Spritesheet>(sheetUrl);
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
    for (const layer of [this.groundLayer, this.edgeLayer, this.gridLayer, this.objectLayer, this.cloudBaseLayer, this.cloudLayer]) {
      layer.removeChildren().forEach((child) => child.destroy());
    }
    this.hexes = [];
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
      if (RELIEF.has(id)) {
        relief = this.addSprite(this.objectLayer, this.pick(`${id}_top`, variant), x, y);
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
      this.hexes.push({ x, y, ground, edges, relief, grid, cloudBase, cloud, cloudX, cloudY, phase: (variant / 256) * Math.PI * 2 });
    }

    this.guild?.destroy();
    this.guild = this.addSprite(this.objectLayer, this.texture("guild"), 0, 0);
    this.guild.anchor.set(0.5, 1);
    const c = hexCenter(map.start);
    this.guild.position.set(c.x, c.y + 7);
    this.guild.zIndex = hexToOffset(map.start).row * 2 + 1;

    this.selection?.destroy();
    this.selection = undefined;
    this.refreshFog();
    this.centerOn(map.start);
    this.scheduleWobble();
  }

  setFogEnabled(enabled: boolean): void {
    this.fogEnabled = enabled;
    this.refreshFog();
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

      const tint = state === FOG_EXPLORED ? EXPLORED_TINT : 0xffffff;
      hs.ground.tint = tint;
      for (const edge of hs.edges) edge.tint = tint;
      if (hs.relief) {
        hs.relief.tint = tint;
        hs.relief.visible = !covered;
      }

      if (covered) {
        this.reveals.delete(i);
        this.resetCloud(hs, true);
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
        this.reveals.set(i, { start: now, dx, dy });
      } else if (!this.reveals.has(i)) {
        this.resetCloud(hs, false);
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

  private resetCloud(hs: HexSprites, visible: boolean): void {
    hs.cloudBase.visible = visible;
    hs.cloudBase.alpha = 1;
    hs.cloud.visible = visible;
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
    if (this.dirty) {
      this.dirty = false;
      this.app.render();
    }
    if (this.reveals.size > 0) this.queueFrame();
  };

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
      hs.cloudBase.alpha = Math.max(0, 1 - t * 2.5);
      if (t >= 1) {
        this.resetCloud(hs, false);
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
