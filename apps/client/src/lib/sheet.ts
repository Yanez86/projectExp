/** I riquadri dello sprite sheet, per mostrare la pixel art anche nell'interfaccia HTML. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SheetInfo {
  image: string;
  width: number;
  height: number;
  frames: Record<string, Frame>;
}

interface SheetJson {
  frames: Record<string, { frame: Frame }>;
  meta: { image: string; size: { w: number; h: number } };
}

export const SHEET_URL = `${import.meta.env.BASE_URL}assets/tiles.json`;

let pending: Promise<SheetInfo> | undefined;

export function loadSheet(): Promise<SheetInfo> {
  pending ??= fetch(SHEET_URL)
    .then((r) => r.json() as Promise<SheetJson>)
    .then((json) => ({
      image: new URL(json.meta.image, new URL(SHEET_URL, location.href)).href,
      width: json.meta.size.w,
      height: json.meta.size.h,
      frames: Object.fromEntries(Object.entries(json.frames).map(([name, f]) => [name, f.frame])),
    }));
  return pending;
}
