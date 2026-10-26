/** localStorage può mancare o rifiutare (navigazione privata): il gioco va avanti comunque. */
export function load(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Niente da fare: la preferenza vale solo per questa sessione.
  }
}
