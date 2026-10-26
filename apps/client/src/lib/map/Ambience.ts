import { Container, Sprite, type Texture } from "pixi.js";

/** Un rettangolo in pixel del mondo: la parte di mappa sullo schermo. */
export interface ViewRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface AmbienceTextures {
  bird: readonly Texture[];
  birdShadow: Texture;
  cloudShadows: readonly Texture[];
}

/** Vento, in pixel del mondo al secondo: porta le ombre delle nuvole. */
const WIND_X = 5;
const WIND_Y = 1.5;
const CLOUD_SHADOW_ALPHA = 0.42;
/** Area di schermo (pixel del mondo) per ogni ombra di nuvola. */
const AREA_PER_SHADOW = 260 * 180;
const BIRD_SPEED = 26;
const FLAP_MS = 170;
/** Gli uccelli volano alti: la loro ombra cade lontano, in basso a destra. */
const BIRD_SHADOW_DX = 10;
const BIRD_SHADOW_DY = 30;
const FLOCK_GAP_MIN_MS = 6000;
const FLOCK_GAP_MAX_MS = 18000;
const MARGIN = 90;

interface Drifter {
  sprite: Sprite;
  x: number;
  y: number;
}

interface Bird {
  sprite: Sprite;
  shadow: Sprite;
  dx: number;
  dy: number;
  phase: number;
}

interface Flock {
  birds: Bird[];
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Vita sulla mappa che non fa parte del gioco: ombre di nuvole portate dal vento e stormi di
 * uccelli con la loro ombra. Solo estetica: usa numeri casuali veri e non tocca la simulazione.
 */
export class Ambience {
  private shadows: Drifter[] = [];
  private flocks: Flock[] = [];
  private last = 0;
  private nextFlockAt = 0;
  /** Di notte gli uccelli non partono (quelli già in volo finiscono il giro). */
  birdsAllowed = true;

  constructor(
    private readonly groundLayer: Container,
    private readonly skyLayer: Container,
    private readonly textures: AmbienceTextures,
  ) {}

  clear(): void {
    for (const s of this.shadows) s.sprite.destroy();
    for (const f of this.flocks) for (const b of f.birds) {
      b.sprite.destroy();
      b.shadow.destroy();
    }
    this.shadows = [];
    this.flocks = [];
    this.last = 0;
  }

  /** Avanza al tempo `now` (ms); restituisce true se qualcosa si è spostato di almeno un pixel. */
  step(now: number, view: ViewRect): boolean {
    const dt = this.last === 0 ? 0 : Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    let changed = this.stepShadows(dt, view);
    changed = this.stepBirds(now, dt, view) || changed;
    return changed;
  }

  private stepShadows(dt: number, view: ViewRect): boolean {
    const width = view.right - view.left;
    const height = view.bottom - view.top;
    const wanted = Math.max(2, Math.min(10, Math.round((width * height) / AREA_PER_SHADOW)));
    while (this.shadows.length < wanted) {
      const texture = this.textures.cloudShadows[this.shadows.length % this.textures.cloudShadows.length]!;
      const sprite = new Sprite(texture);
      sprite.alpha = CLOUD_SHADOW_ALPHA;
      this.groundLayer.addChild(sprite);
      this.shadows.push({ sprite, x: random(view.left - 80, view.right), y: random(view.top - 40, view.bottom) });
    }
    while (this.shadows.length > wanted) this.shadows.pop()!.sprite.destroy();

    let changed = false;
    for (const s of this.shadows) {
      s.x += WIND_X * dt;
      s.y += WIND_Y * dt;
      const w = s.sprite.width;
      const h = s.sprite.height;
      const gone = s.x > view.right + MARGIN || s.y > view.bottom + MARGIN;
      const lost = s.x + w < view.left - width || s.y + h < view.top - height;
      if (gone || lost) {
        // Rientra dal lato da cui soffia il vento.
        if (Math.random() < width / (width + height)) {
          s.x = view.left - w - random(0, MARGIN);
          s.y = random(view.top - h, view.bottom);
        } else {
          s.x = random(view.left - w, view.right);
          s.y = view.top - h - random(0, MARGIN);
        }
      }
      changed = place(s.sprite, s.x, s.y) || changed;
    }
    return changed;
  }

  private stepBirds(now: number, dt: number, view: ViewRect): boolean {
    if (this.nextFlockAt === 0) this.nextFlockAt = now + random(1500, 5000);
    if (now >= this.nextFlockAt && this.flocks.length < 2 && this.birdsAllowed) {
      this.spawnFlock(view);
      this.nextFlockAt = now + random(FLOCK_GAP_MIN_MS, FLOCK_GAP_MAX_MS);
    }
    let changed = false;
    for (const flock of this.flocks) {
      flock.x += flock.vx * dt;
      flock.y += flock.vy * dt;
      for (const b of flock.birds) {
        const x = flock.x + b.dx;
        const y = flock.y + b.dy;
        changed = place(b.sprite, x, y) || changed;
        changed = place(b.shadow, x + BIRD_SHADOW_DX, y + BIRD_SHADOW_DY) || changed;
        const frame = this.textures.bird[Math.floor(now / FLAP_MS + b.phase) % this.textures.bird.length]!;
        if (b.sprite.texture !== frame) {
          b.sprite.texture = frame;
          changed = true;
        }
      }
    }
    // Via gli stormi usciti dallo schermo.
    this.flocks = this.flocks.filter((f) => {
      const out =
        f.x < view.left - MARGIN * 2 ||
        f.x > view.right + MARGIN * 2 ||
        f.y < view.top - MARGIN * 2 ||
        f.y > view.bottom + MARGIN * 2;
      if (out) for (const b of f.birds) {
        b.sprite.destroy();
        b.shadow.destroy();
      }
      return !out;
    });
    return changed;
  }

  /** Uno stormo entra da sinistra o da destra e attraversa lo schermo, un po' in diagonale. */
  private spawnFlock(view: ViewRect): void {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? view.left - MARGIN : view.right + MARGIN;
    const y = random(view.top, view.bottom);
    const tx = fromLeft ? view.right + MARGIN : view.left - MARGIN;
    const ty = random(view.top, view.bottom);
    const len = Math.hypot(tx - x, ty - y);
    const vx = ((tx - x) / len) * BIRD_SPEED;
    const vy = ((ty - y) / len) * BIRD_SPEED;
    const count = 3 + Math.floor(Math.random() * 3);
    // In formazione a V, dietro al capofila.
    const back = { x: -vx / BIRD_SPEED, y: -vy / BIRD_SPEED };
    const side = { x: -back.y, y: back.x };
    const birds: Bird[] = [];
    for (let i = 0; i < count; i++) {
      const rank = Math.ceil(i / 2);
      const wing = i === 0 ? 0 : i % 2 === 1 ? 1 : -1;
      const sprite = new Sprite(this.textures.bird[0]);
      sprite.anchor.set(0.5);
      const shadow = new Sprite(this.textures.birdShadow);
      shadow.anchor.set(0.5);
      this.skyLayer.addChild(sprite);
      this.groundLayer.addChild(shadow);
      birds.push({
        sprite,
        shadow,
        dx: back.x * rank * 9 + side.x * wing * rank * 7,
        dy: back.y * rank * 9 + side.y * wing * rank * 7,
        phase: Math.random() * 2,
      });
    }
    this.flocks.push({ birds, x, y, vx, vy });
  }
}

/** Sposta uno sprite su pixel interi; true se si è mosso. */
function place(sprite: Sprite, x: number, y: number): boolean {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (sprite.x === rx && sprite.y === ry) return false;
  sprite.position.set(rx, ry);
  return true;
}
