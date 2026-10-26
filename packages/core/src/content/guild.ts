/** Le monete con cui parte la gilda. */
export const START_GOLD = 400;
/** Quanto tiene il magazzino della sede, per ogni materia. */
export const STORAGE_CAPACITY = 100;
/** Quanti laboratori stanno nella sede, quanto costano e quanto ci vuole a costruirli. */
export const WORKSHOP_SLOTS = 4;
export const WORKSHOP_COST = 80;
export const WORKSHOP_BUILD_MS = 2 * 3_600_000;

/**
 * La paga: ogni giorno alle 8 la gilda paga tutti, un ventesimo di quanto costerebbe
 * ingaggiarli; chi resta senza paga per due giorni se ne va.
 */
export const WAGE_DIVISOR = 20;
export const UNPAID_LIMIT = 2;

/** Quanto costa ingaggiare un personaggio: dieci monete per punto oltre i 18, venti in più per il talento. */
export const HIRE_MIN = 40;
export const HIRE_MAX = 150;
export const HIRE_PER_POINT = 10;
export const HIRE_FREE_POINTS = 18;
export const HIRE_TALENT = 20;

/** Ogni cittadina ha una locanda con qualche personaggio da ingaggiare, che cambia ogni due giorni. */
export const TAVERN_MIN = 2;
export const TAVERN_MAX = 3;
export const TAVERN_PERIOD_MS = 2 * 24 * 3_600_000;
