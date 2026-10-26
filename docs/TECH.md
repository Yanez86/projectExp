# Piano tecnico (bozza v0.1)

> Stato: proposta da approvare prima di scrivere codice. Il design del gioco è in [GDD.md](GDD.md).

## 1. Obiettivi

- Gira nel browser su PC e mobile, anche su telefoni non recenti.
- Il mondo avanza a gioco chiuso e alla riapertura recupera in fretta.
- La stessa logica di gioco serve al single player e, più avanti, al server multiplayer.
- Contenuti e testi stanno fuori dal codice, per bilanciare e tradurre senza toccare il motore.

## 2. Scelte principali

| Cosa | Scelta | Perché |
|---|---|---|
| Linguaggio | TypeScript | un solo linguaggio per gioco, server e strumenti |
| Build | Vite | veloce, standard per i giochi web |
| Mappa | PixiJS | disegna solo la mappa: leggero e adatto alla pixel art |
| Interfaccia | Svelte, in HTML sopra la mappa | il gioco è soprattutto interfaccia (gilda, produzione, mercato, ingaggi, ricerche): in HTML è più facile adattarla agli schermi e tradurla |
| Testi | file it/en in formato ICU | gestisce plurali e genere ("nato/nata" nei background) |
| Salvataggi | IndexedDB, nel browser | spazio sufficiente, funziona offline |
| Test | Vitest | si integra con Vite |
| Pubblicazione | GitHub Pages | sito statico gratuito, già legato al repository |
| Server (più avanti) | Node.js + WebSocket | stesso codice della simulazione; dettagli quando arriva il multiplayer |

Le versioni delle librerie si fissano al momento dell'installazione, scegliendo l'ultima stabile.

## 3. Struttura del repository

```
apps/client/     il gioco nel browser: mappa (Pixi) e interfaccia (Svelte)
packages/core/   logica di gioco e contenuti, condivisi con il futuro server
  src/sim/       la simulazione
  src/content/   i dati: etnie, mestieri, biomi, materie, ricette, luoghi, ricerche, background
  locales/       it.json, en.json
art/             sorgenti pxl (.px.js) da cui escono gli sprite sheet del client
docs/            design e piano tecnico
```

Il server andrà in `apps/server/`.

## 4. La simulazione

- **Pura**: niente grafica, niente rete, niente orologio di sistema. Riceve l'ora corrente e i
  comandi del giocatore, restituisce il nuovo stato.
- **Deterministica**: stesso seed e stessi comandi danno lo stesso mondo, su qualsiasi
  dispositivo. Numeri casuali da un generatore con seed, quantità intere (i decimali possono dare
  risultati diversi su dispositivi diversi).
- **A eventi con flussi**: tra un evento e l'altro le materie scorrono a ritmo costante (avamposti
  → gilda → linee di produzione). Il motore calcola quando qualcosa cambia (un magazzino si svuota
  o si riempie, un viaggio finisce, una ricerca termina) e salta direttamente lì. Recuperare
  giorni di assenza costa quindi poche operazioni, non un calcolo secondo per secondo.
- Le gilde IA ragionano a intervalli regolari, anche loro come eventi.
- Tempo di gioco = tempo reale × velocità del mondo.
- Gira in un Web Worker, così il recupero offline non blocca l'interfaccia.
- Lo stato si salva come JSON.

## 5. La mappa

- Esagoni in coordinate assiali, con gli algoritmi di Red Blob Games: vicini, distanze, percorsi
  (A*), campo visivo.
- Generazione: rumore con seed per altitudine e umidità, da cui escono i biomi; poi città, luoghi
  di interesse, dungeon, tana del drago e posizioni di partenza bilanciate per le gilde.
- Disegno: esagoni con la punta in alto, come in Civilization; tile con un rilievo che sborda
  verso l'alto (montagne, alberi). Lo zoom va solo a multipli interi (1×, 2×, 3×…), così i pixel
  restano nitidi. Si disegna solo la parte visibile.
- Nebbia a tre stati, come livello sopra la mappa.
- Comandi: trascini per spostarti, rotella o pizzico per lo zoom, tocco per selezionare.

## 6. Grafica

- Sorgenti `.px.js` in `art/`, compilate da pxl in sprite sheet PNG + JSON che Pixi carica
  direttamente.
- Gli sprite sheet generati si committano: la build del gioco non dipende dalla skill.
- Una palette unica, definita all'inizio e condivisa da tutti gli asset.

## 7. Testi e lingue

- Ogni testo ha una chiave, con traduzione in `it.json` ed `en.json`.
- Formato ICU per plurali e genere: i background generati devono accordarsi in italiano.
- Lingua presa dal browser e cambiabile in gioco.
- Un test controlla che ogni chiave esista in entrambe le lingue.

## 8. Qualità

- TypeScript in modalità rigorosa, ESLint.
- Test sulla logica: determinismo, generazione della mappa, flussi delle materie.
- GitHub Actions a ogni push: controllo dei tipi, test e build. Pubblicazione su GitHub Pages dal
  branch principale.

## 9. Prima tappa: la mappa

Obiettivo: aprire il gioco su telefono e PC e girare per una mappa generata.

- Setup del repository: struttura, Vite, TypeScript, test, CI, pubblicazione.
- `core`: matematica degli esagoni, generatore casuale con seed, generazione dei biomi, dati
  della nebbia.
- `art`: palette e primo set di tile dei biomi con pxl.
- `client`: mappa disegnata con Pixi, spostamento e zoom con mouse e touch, nebbia, pannello di
  prova per cambiare seed, scelta della lingua.

È finita quando, su telefono e PC, si genera una mappa da un seed, ci si muove in modo fluido e
la nebbia copre ciò che non è stato esplorato.

## 10. Domande aperte

1. Su mobile il gioco va solo in orizzontale o anche in verticale?
