/**
 * Salvataggio della partita in IndexedDB, nel browser. Se IndexedDB non c'è o rifiuta
 * (navigazione privata), si ripiega su localStorage; se manca anche quello, la partita vale solo
 * per questa sessione.
 */
import { load, save } from "./storage";

const DB_NAME = "projectexp";
const STORE = "saves";
const KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB non disponibile"));
  });
}

export async function readSave(): Promise<string | undefined> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : undefined);
      request.onerror = () => reject(request.error ?? new Error("Lettura non riuscita"));
    });
  } catch {
    return load(`exp.${KEY}`);
  }
}

export async function writeSave(json: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(json, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Scrittura non riuscita"));
    });
  } catch {
    save(`exp.${KEY}`, json);
  }
}
