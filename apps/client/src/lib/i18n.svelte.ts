import { createTranslator, detectLocale, isLocale, type Locale, type Messages } from "@exp/core";
import en from "@exp/core/locales/en.json";
import it from "@exp/core/locales/it.json";
import { load, save } from "./storage";

const MESSAGES: Record<Locale, Messages> = { it, en };
const STORAGE_KEY = "exp.locale";

function initialLocale(): Locale {
  const stored = load(STORAGE_KEY);
  if (stored && isLocale(stored)) return stored;
  return detectLocale(navigator.languages ?? [navigator.language]);
}

/** Lingua corrente; `i18n.t` si aggiorna da solo quando cambia. */
class I18n {
  locale = $state<Locale>(initialLocale());
  t = $derived(createTranslator(this.locale, MESSAGES[this.locale]));

  constructor() {
    document.documentElement.lang = this.locale;
  }

  setLocale(locale: Locale): void {
    this.locale = locale;
    document.documentElement.lang = locale;
    save(STORAGE_KEY, locale);
  }
}

export const i18n = new I18n();
