# Piano tecnico (bozza v0.1)

> Stato: approvato; prime cinque tappe fatte. Il design del gioco è in [GDD.md](GDD.md).

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
- **A eventi**: il motore tiene una coda di eventi (un passo finito, un raccolto, un ciclo di
  laboratorio finito, un cantiere chiuso) e salta dall'uno all'altro, senza calcolare secondo per
  secondo. Anche l'economia va a cicli e non a flussi continui: ogni raccolto e ogni ciclo è un
  evento, con quantità intere. Una settimana di assenza con dieci avamposti e quattro laboratori
  sono circa duemila eventi, una decina di millisecondi; con i flussi continui servirebbero
  decimali e regole per dividere una materia scarsa tra più laboratori. Se un giorno il recupero
  diventerà pesante, si potranno riassumere più cicli in un evento solo.
- Le gilde IA ragionano a intervalli regolari, anche loro come eventi.
- Tempo di gioco = tempo reale × velocità del mondo. L'orologio del mondo ricorda un istante in
  cui tempo reale e di gioco erano allineati e la velocità: cambiare velocità lo riallinea.
- I personaggi si muovono una casella alla volta: ogni passo è un evento d'arrivo. A ogni arrivo
  si ricalcolano la vista e il percorso (A*), perché ciò che si scopre può cambiare la strada
  migliore; sotto le nuvole una casella si presume attraversabile, con una fatica media.
- Un test controlla che avanzare in un colpo solo o a piccoli passi dia lo stesso mondo: è la
  garanzia che il recupero offline sia corretto.
- Per ora la simulazione gira sul thread principale, perché è leggera; passerà in un Web Worker
  quando il recupero offline diventerà pesante.
- Lo stato si salva come JSON (la nebbia compressa) in IndexedDB; la mappa non si salva, si
  rigenera dal seed. Il salvataggio porta la versione del formato e del generatore di mappe:
  se non coincidono, si comincia una partita nuova.

## 5. La mappa

- Esagoni in coordinate assiali, con gli algoritmi di Red Blob Games: vicini, distanze, percorsi
  (A*), campo visivo.
- Generazione: rumore con seed per altitudine e umidità, da cui escono i biomi; poi città, luoghi
  di interesse, dungeon, tana del drago e posizioni di partenza bilanciate per le gilde.
- Disegno: esagoni con la punta in alto, come in Civilization; tile con un rilievo che sborda
  verso l'alto (montagne, alberi). Lo zoom va solo a multipli interi (1×, 2×, 3×…), così i pixel
  restano nitidi. Si disegna solo la parte visibile.
- La mappa si disegna a strati: terreno, transizioni tra biomi (il bioma più "forte" sconfina
  nel vicino con una fascia frastagliata; sulle coste spiaggia e schiuma), griglia leggera,
  rilievo, nuvole.
- Ciò che non è esplorato è coperto da un mare di nuvole in pixel art; quando una zona viene
  scoperta, le nuvole si aprono e scivolano via dal punto di scoperta. Le zone esplorate ma fuori
  vista restano scoperte, un po' più scure.
- Luoghi di interesse (`map/places.ts`, regole in `content/places.ts`): dopo i biomi, una visita
  in ampiezza trova la terra raggiungibile a piedi dalla sede; per ogni tipo, nell'ordine, si
  sceglie la casella col punteggio migliore (un po' di caso più le preferenze del tipo) tra quelle
  dei biomi ammessi, rispettando le distanze minime dalla sede, dagli altri luoghi e dai simili. I
  nomi nascono da sillabe (`content/names.ts`). Il generatore ha un suo flusso di numeri casuali
  (`seed/places`), così aggiungere luoghi non cambia i biomi. Nel client il luogo prende il posto
  del rilievo della casella e ha le sue luci per la notte.
- Ogni cambio al generatore ne alza la versione (`MAP_GENERATOR_VERSION`, ora 2): i salvataggi
  vecchi non coincidono più e si comincia una partita nuova.
- Comandi: trascini per spostarti, rotella o pizzico per lo zoom, tocco per selezionare.
- Interfaccia (`App.svelte`): a sinistra il menu (`Rail.svelte`: ora, Unità, Sede, zoom,
  Opzioni) e accanto il pannello aperto (`Drawer.svelte`), che sugli schermi stretti copre la
  mappa invece di spingerla; in alto a destra le risorse (`Resources.svelte`); in basso, solo
  quando qualcosa è selezionato, la scheda (`ContextPanel.svelte`) con i comandi. Cosa fa
  un'unità, a parole, sta in `lib/status.ts` e serve sia all'elenco sia alla scheda.
- Tocchi (`game.tapHex`): senza "Vai" selezionano chi c'è sulla casella (un tocco dopo l'altro si
  passa al successivo), poi l'edificio, oppure il terreno; la sede apre il suo pannello. Dopo
  "Vai" (`game.targeting`) il tocco sceglie la destinazione: la mappa disegna percorso e
  bandierina, la scheda mostra conferma, annulla e le azioni del luogo. Esc annulla.
- Vista con linea di visuale: per ogni casella entro il raggio si traccia la retta di esagoni dal
  punto di vista; le caselle in mezzo possono fermarla (montagne) o lasciarla passare per poco
  (foreste). Si provano due rette spostate di un soffio da parti opposte: se una è libera, la
  casella si vede, così la vista lungo i lati non dipende da un arrotondamento. Le regole stanno
  in `packages/core/src/content/vision.ts`.
- Atmosfera, solo nel client: un contenitore con tutta la scena prende la tinta dell'ora
  (`daylight.ts`); sopra, senza tinta, le luci della sede. Ombre di nuvole, stormi e pesci che
  saltano (`Ambience.ts`) usano numeri casuali veri perché non toccano la simulazione; si
  ridisegna solo quando qualcosa si sposta di un pixel intero.
- Mare animato: i tile d'acqua e della costa hanno 8 fotogrammi (il primo col nome del tile, poi
  `_f1`…`_f7`). `MapView` li fa girare a scatti di 200 ms, la risacca a 400; ogni casella d'acqua
  parte da un fotogramma suo, la risacca da uno che cala verso il basso a destra, così l'onda corre
  lungo la costa. Si aggiornano solo le caselle sullo schermo; con le animazioni spente il mare
  resta al primo fotogramma.

## 6. Grafica

- Ogni bioma ha più varianti di terreno e di rilievo (montagne disegnate da una vetta
  parametrica: apice, fianchi frastagliati, cresta, canaloni, neve). Terreno e rilievo scelgono la
  variante da bit diversi del numero casuale della casella, così si combinano; in pianura,
  deserto e palude molte varianti di rilievo sono vuote, perché gli oggetti restino rari.

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
- GitHub Actions a ogni push: controllo dei tipi, lint, test e build.
- Pubblicazione su GitHub Pages dal branch principale, appena Pages è attivo sul repository con
  sorgente "GitHub Actions" (Settings → Pages): il workflow lo controlla da solo.

## 9. Prima tappa: la mappa (fatta)

Obiettivo: aprire il gioco su telefono e PC e girare per una mappa generata.

- Setup del repository: struttura, Vite, TypeScript, test, CI, pubblicazione.
- `core`: matematica degli esagoni, generatore casuale con seed, generazione dei biomi, dati
  dell'esplorazione.
- `art`: palette e primo set di tile dei biomi con pxl.
- `client`: mappa disegnata con Pixi, spostamento e zoom con mouse e touch, nuvole, pannello di
  prova per cambiare seed, scelta della lingua.

È finita quando, su telefono e PC, si genera una mappa da un seed, ci si muove in modo fluido e
le nuvole coprono ciò che non è stato esplorato.

## 10. Seconda tappa: la sede e i primi esploratori (fatta)

- `core`: motore a eventi con orologio e velocità, comandi (muovi, fermati), percorsi A* con
  costi di terreno ed etnia, vista dei personaggi, salvataggi.
- `art`: i segnalini delle quattro etnie, l'anello di selezione, i puntini del percorso e la
  bandierina.
- `client`: il ciclo di gioco (quattro volte al secondo porta il mondo all'ora attuale), i
  personaggi che camminano tra le caselle, l'anteprima del percorso con il tempo d'arrivo, l'elenco
  degli esploratori, l'orologio del mondo, gli avvisi, il salvataggio e il recupero del tempo
  passato a gioco chiuso.

## 11. Terza tappa: avamposti e laboratori (fatta)

- `core`: materie, avamposti e ricette come dati (`content/materials.ts`, `outposts.ts`,
  `recipes.ts`, `guild.ts`); monete e magazzino della gilda; comandi per fondare un avamposto
  (il costruttore ci va e apre il cantiere all'arrivo), costruire un laboratorio, metterlo in
  pausa; eventi di cantiere, raccolto e ciclo (`sim/economy.ts`). Il formato dei salvataggi è
  alla versione 2: quelli vecchi ricominciano.
- `art`: i sette avamposti, il cantiere, le icone delle materie e la moneta.
- `client`: gli avamposti sulla mappa al posto del rilievo, con le luci di notte; il pulsante
  "Costruisci qui" per il costruttore, con il raccolto previsto o il motivo per cui non si può;
  il pannello della sede (magazzino, laboratori, avamposti) dal pulsante con le monete in alto.

## 12. Quarta tappa: cittadine, mercati e carovane (fatta)

- `core`: valori delle materie e regole del commercio (`content/trade.ts`); i prezzi di ogni luogo
  nascono dal seme della mappa e dal numero del luogo (`priceList`), quindi non si salvano. Si
  salva solo il ricordo degli scambi recenti (`markets`): quante unità e da quando conta il
  recupero, che va a unità intere e tiene l'avanzo di tempo, così il conto non dipende da quante
  volte si guarda. I prezzi sono a numeri interi. Il viaggio di commercio è un compito del
  personaggio (`task: trade`) con il carico (`cargo`): all'arrivo vende o compra, poi riparte
  per la sede e scarica. Salvataggi alla versione 3.
- `client`: il modulo del carico nella scheda del carovaniere (`TradeForm.svelte`: prezzi del
  momento, quantità, capienza, conto previsto); nelle schede di cittadine e mercati, le merci
  cercate o vendute. Le destinazioni si scelgono dopo "Vai" (vedi la mappa, §5).

## 12. Quinta tappa: mercenari, dungeon, equipaggiamento e paga (fatta)

- `core`: le storie dei personaggi (`content/stories.ts`: tabelle dei quattro capitoli con i loro
  effetti) e la loro creazione (`sim/characters.ts`: nome, soprannome, storia, statistiche;
  costo d'ingaggio e paga; statistiche con l'equipaggiamento, usate da passo, vista e carico).
  L'origine passa al calcolo dei passi come bioma congeniale in più.
- Paga (`sim/payroll.ts`): un evento `payday` ogni giorno; chi resta senza paga due volte se ne
  va. Un personaggio che se ne va (o non torna) viene tolto dalla lista: gli eventi che lo
  riguardano trovano che non c'è più e non fanno niente.
- Locanda (`sim/tavern.ts`): chi c'è nasce dal seme, dalla cittadina e dal periodo di due giorni,
  come i prezzi; si salvano solo gli ingaggi già fatti. I nomi evitano quelli di chi è già nella
  gilda.
- Equipaggiamento (`content/items.ts`, `sim/equipment.ts`): oggetti con numero, tipo e rarità;
  forziere della gilda; si cambia alla sede, da fermi.
- Dungeon (`content/dungeons.ts`, `sim/dungeon.ts`): i livelli dipendono dalla distanza dalla
  sede; si salvano solo i livelli ripuliti, con l'ora. La spedizione è un oggetto con la
  squadra e il bottino; i membri hanno il compito `expedition` e, quando sono tutti
  all'ingresso, un evento `delve` ogni due ore risolve un livello con un generatore che nasce
  da seme, spedizione e livello. Ferite con un evento `healed`. Salvataggi alla versione 4.
- `client`: nella scheda dell'unità il nome con il soprannome, la paga, le statistiche con il
  bonus dell'equipaggiamento, gli slot (e la scelta dal forziere, alla sede) e la storia; nella
  scheda di una cittadina la locanda; in quella di un dungeon i livelli; per un mercenario il
  modulo della spedizione (squadra, profondità, probabilità di ogni livello); nella sede la
  paga del giorno, i reperti e il forziere. Il segnalino di chi arriva o se ne va compare o
  sparisce dalla mappa.

## 13. Domande aperte

1. Su mobile il gioco va solo in orizzontale o anche in verticale?
