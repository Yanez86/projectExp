import { IntlMessageFormat } from "intl-messageformat";

export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";

export type Messages = Readonly<Record<string, string>>;
export type MessageValues = Record<string, string | number>;
export type Translate = (key: string, values?: MessageValues) => string;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** La prima lingua supportata tra quelle preferite dal browser. */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0] ?? "";
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/**
 * Traduttore in formato ICU (plurali, genere, select). Una chiave mancante si vede subito:
 * viene mostrata tra parentesi quadre.
 */
export function createTranslator(locale: Locale, messages: Messages): Translate {
  const cache = new Map<string, IntlMessageFormat>();
  return (key, values) => {
    const source = messages[key];
    if (source === undefined) return `[${key}]`;
    let format = cache.get(key);
    if (!format) {
      format = new IntlMessageFormat(source, locale);
      cache.set(key, format);
    }
    return String(format.format(values));
  };
}
