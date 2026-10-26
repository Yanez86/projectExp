import {
  Application,
  Assets,
  Container,
  Sprite,
  TextureSource,
  type Spritesheet,
  type Texture,
} from "pixi.js";
import {
  BIOME_IDS,
  FOG_EXPLORED,
  FOG_UNEXPLORED,
  hexAt,
  hexToOffset,
  tileIndex,
  type Fog,
  type Hex,
  type WorldMap,
} from "@exp/core";
import { COL_STEP, ROW_STEP, TILE_H, TILE_W, hexAtPoint, hexCenter, tileOrigin } from "./layout";

/** Tinta delle caselle esplorate ma fuori vista. */
const EXPLORED_TINT = 0x8a8aa6;
/** Spostamento oltre il quale un tocco diventa un trascinamento, in pixel CSS. */
const TAP_SLOP = 8;

export interface MapViewOptions {
  /** Chiamata quando il giocatore tocca un esagono (non quando trascina). */
  onTap: (hex: Hex) => void;
}

interface Pointer {
  x: number;
  y: number;
}

/**
 * Disegna la mappa con Pixi e gestisce la visuale: trascinamento, zoom con rotella e pizzico,
 * tocco. Lo zoom è sempre un numero intero di pixel del dispositivo per pixel dell'arte, così la
 * pixel art resta nitida. Si ridisegna solo quando qualcosa cambia.
 */
export class MapView {
  private app = new Application();
  private world = new Container({ sortableChildren: true });
  private overlay = new Container();
  private textures = new Map<string, Texture>();
  private variants = new Map<string, Texture[]>();
  private tiles: Sprite[] = [];
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

  private pointers = new Map<number, Pointer>();
  private gesture:
    | { kind: "drag"; startX: number; startY: number; camX: number; camY: number; moved: boolean }
    | { kind: "pinch"; dist: number; zoom: number; midX: number; midY: number; camX: number; camY: number }
    | undefined;
  private renderQueued = false;
  private resizeObserver: ResizeObserver | undefined;
  private viewW = 0;
  private viewH = 0;
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
    this.viewW = this.host.clientWidth;
    this.viewH = this.host.clientHeight;
    if (this.destroyed) return;
    this.app.ticker.stop();
    const canvas = this.app.canvas;
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    this.host.appendChild(canvas);
    this.app.stage.addChild(this.world, this.overlay);

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
    this.resizeObserver?.disconnect();
    this.app.destroy(true, { children: true });
  }

  setMap(map: WorldMap, fog: Fog): void {
    this.map = map;
    this.fog = fog;
    this.world.removeChildren().forEach((child) => child.destroy());
    this.tiles = [];
    for (let i = 0; i < map.width * map.height; i++) {
      const h = hexAt(map, i);
      const { row } = hexToOffset(h);
      const sprite = new Sprite(this.biomeTexture(map, i));
      const o = tileOrigin(h);
      sprite.position.set(o.x, o.y);
      sprite.zIndex = row * 2;
      this.tiles.push(sprite);
      this.world.addChild(sprite);
    }
    const guildTexture = this.textures.get("guild");
    if (guildTexture) {
      this.guild = new Sprite(guildTexture);
      this.guild.anchor.set(0.5, 1);
      const c = hexCenter(map.start);
      this.guild.position.set(c.x, c.y + 7);
      this.guild.zIndex = hexToOffset(map.start).row * 2 + 1;
      this.world.addChild(this.guild);
    }
    this.selection?.destroy();
    this.selection = undefined;
    this.refreshFog();
    this.centerOn(map.start);
  }

  setFogEnabled(enabled: boolean): void {
    this.fogEnabled = enabled;
    this.refreshFog();
  }

  /** Da chiamare dopo aver cambiato lo stato della nebbia. */
  refreshFog(): void {
    const { map, fog } = this;
    if (!map || !fog) return;
    const fogTexture = this.textures.get("fog");
    this.tiles.forEach((sprite, i) => {
      const state = this.fogEnabled ? fog.state[i] : undefined;
      if (state === FOG_UNEXPLORED && fogTexture) {
        sprite.texture = fogTexture;
        sprite.tint = 0xffffff;
      } else {
        sprite.texture = this.biomeTexture(map, i);
        sprite.tint = state === FOG_EXPLORED ? EXPLORED_TINT : 0xffffff;
      }
    });
    if (this.guild) {
      this.guild.visible = !this.fogEnabled || fog.state[tileIndex(map, map.start)] !== FOG_UNEXPLORED;
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
      this.selection = new Sprite(this.textures.get("select"));
      this.overlay.addChild(this.selection);
    }
    const o = tileOrigin(h);
    this.selection.position.set(o.x, o.y);
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

  // ---------------------------------------------------------------- visuale

  private get dpr(): number {
    return this.app.renderer?.resolution ?? (window.devicePixelRatio || 1);
  }

  private get minZoom(): number {
    return 1;
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
    const zoom = Math.min(this.maxZoom, Math.max(this.minZoom, Math.round(target)));
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
    for (const layer of [this.world, this.overlay]) {
      layer.scale.set(scale);
      layer.position.set(this.camX, this.camY);
    }
    this.cull();
    this.requestRender();
  }

  /** Nasconde i tile fuori dallo schermo: meno lavoro per la scheda grafica. */
  private cull(): void {
    const scale = this.zoom / this.dpr;
    const left = -this.camX / scale - TILE_W;
    const top = -this.camY / scale - TILE_H;
    const right = (this.host.clientWidth - this.camX) / scale;
    const bottom = (this.host.clientHeight - this.camY) / scale;
    for (const sprite of this.tiles) {
      sprite.visible = sprite.x > left && sprite.x < right && sprite.y > top && sprite.y < bottom;
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

  private requestRender(): void {
    if (this.renderQueued || this.destroyed) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      if (!this.destroyed) this.app.render();
    });
  }

  private biomeTexture(map: WorldMap, index: number): Texture {
    const id = BIOME_IDS[map.biomes[index] as number] as string;
    const list = this.variants.get(id) ?? [];
    const texture = list[(map.variants[index] as number) % Math.max(1, list.length)];
    if (!texture) throw new Error(`Manca il tile del bioma ${id}`);
    return texture;
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
