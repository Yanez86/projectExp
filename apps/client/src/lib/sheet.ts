/**
 * Lo sprite sheet della mappa. Dati e immagine sono importati, non presi da `public/`: il JSON
 * finisce dentro il codice e l'immagine prende un nome con l'impronta del contenuto, così una
 * versione nuova del gioco non può mai trovarsi in cache la grafica di quella vecchia.
 */
import data from "../assets/tiles.json";
import imageUrl from "../assets/tiles.png";

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

export const SHEET_DATA = data;
export const SHEET_IMAGE = imageUrl;

const info: SheetInfo = {
  image: imageUrl,
  width: data.meta.size.w,
  height: data.meta.size.h,
  frames: Object.fromEntries(Object.entries(data.frames).map(([name, f]) => [name, f.frame])),
};

export function loadSheet(): Promise<SheetInfo> {
  return Promise.resolve(info);
}
