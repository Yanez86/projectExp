# Documento di design (bozza v0.2)

> Stato: bozza in discussione. Niente codice finché questo documento non è stabile.
>
> Legenda: **[Deciso]** concordato · **[Proposta]** da confermare · **[Aperto]** da discutere

## 1. In una frase

Gestionale strategico fantasy in tempo reale "da orologio", alla Travian/OGame, centrato su
economia ed esplorazione. Una mappa a esagoni nuova a ogni round, avventurieri da ingaggiare per
esplorare rovine e luoghi perduti, un'economia di trasformazione delle materie profonda e una
pixel art ispirata a Heroes of Might and Magic e Civilization. Il combattimento c'è, ma è
secondario.

## 2. Vincoli di base [Deciso]

- Browser game per PC e mobile.
- Single player contro IA per primo; multiplayer con lobby in una fase successiva.
- Italiano e inglese.
- Pixel art, prodotta con la skill pxl.
- Mappa fantasy a esagoni, nuova a ogni round, da esplorare.
- Il giocatore ha una base e guida unità sulla mappa.
- Tempo reale.
- Il gioco ruota attorno a economia ed esplorazione più che al combattimento.

## 3. Pilastri

1. **Un mondo nuovo a ogni round**: mappa generata, da scoprire esagono per esagono.
2. **Un'economia che si approfondisce**: poche materie prime all'inizio, catene di trasformazione
   complesse più avanti.
3. **Avventurieri e scoperte**: si ingaggiano avventurieri per esplorare rovine e luoghi speciali.
   Ciò che trovano (materie rare, ricette, artefatti) arricchisce l'economia.
4. **Tempo da orologio**: il mondo va avanti anche quando non giochi; si gioca in sessioni brevi
   più volte al giorno, con piani che maturano in ore e giorni.
5. **Identità**: etnie e fazioni con stili di gioco davvero diversi.
6. **Giocabile ovunque**: mobile e PC, italiano e inglese.

Il combattimento non è un pilastro: esiste, ma resta in secondo piano.

## 4. Riferimenti

- **Travian, OGame**: il ritmo. Code di costruzione, viaggi che durano ore, round lunghi. Da
  OGame anche le spedizioni, risolte senza giocarle.
- **Heroes of Might and Magic (II–III)**: la mappa d'avventura, le taverne dove si ingaggiano
  personaggi, miniere, rovine, artefatti, città diverse per fazione.
- **Civilization**: mappa a esagoni, esplorazione, territorio che cresce, civiltà diverse.
- [Proposta] **Anno, The Settlers**: le catene produttive.

## 5. Il round

- [Deciso] Ampio respiro: un round dura settimane e ogni round ha un mondo nuovo.
- [Proposta] Velocità del mondo scelta alla creazione: x1 (settimane), x3, x10 (giorni). Serve
  soprattutto al single player e ai test.
- [Proposta] Il mondo avanza anche a gioco chiuso: alla riapertura si calcola tutto ciò che è
  successo nel frattempo, mosse dell'IA comprese.
- [Proposta] Fasi:
  - **avvio**: esplorazione dei dintorni ed economia di base;
  - **espansione**: territorio, commercio, prime spedizioni nelle rovine, rivalità per i
    giacimenti;
  - **finale**: corsa all'obiettivo.
- [Proposta] Fine del round: al centro della mappa, nelle terre antiche, si costruisce la
  **Grande Opera**, un'opera che richiede materiali del livello più alto e reperti trovati nelle
  rovine. Vince il primo che la completa. Così economia ed esplorazione diventano la strada per
  la vittoria.
- [Aperto] Altre condizioni di vittoria (ricchezza, scoperte, alleanze).

## 6. La mappa

- [Deciso] Esagoni, generata da un seed, nebbia di guerra.
- [Proposta] Generazione da elevazione e umidità, da cui escono i biomi; poi fiumi, laghi, coste.
- [Proposta] Ogni bioma offre materie prime diverse:

  | Bioma | Materie prime |
  |---|---|
  | Pianura | grano, cavalli |
  | Foresta | legname, selvaggina |
  | Colline | argilla, rame, carbone |
  | Montagna | pietra, ferro, oro, mithril (raro) |
  | Palude | erbe, torba |
  | Deserto | sabbia, sale |
  | Tundra | pellicce |
  | Acqua | pesce |

- [Proposta] Luoghi speciali: rovine, tane di mostri, villaggi neutrali (commercio), nodi di
  mana, giacimenti rari. Sono le mete delle spedizioni (§9).
- [Proposta] Nebbia a tre stati: inesplorato (nero), esplorato ma fuori vista (ultima situazione
  nota), in vista (vicino alle tue unità o ai tuoi edifici).
- [Proposta] Struttura: i regni partono ai margini; al centro le terre antiche, più ricche, più
  pericolose e sede dell'obiettivo finale.
- [Aperto] Dimensione della mappa e numero di regni: da trovare con i test. In single player si
  potrebbe partire da 6–10 regni IA.
- [Aperto] Orientamento degli esagoni e dimensione delle tile: decisione artistica.

## 7. Base e territorio

- [Deciso] Il giocatore ha una base (capitale).
- [Proposta] Modello ibrido:
  - **estrazione sulla mappa**: edifici sugli esagoni del proprio territorio (miniera sul
    giacimento, segheria nella foresta), come in Civilization;
  - **trasformazione in città**: schermata della capitale con spazi per gli edifici di
    lavorazione, come in Travian.
- [Proposta] Il territorio cresce con gli avamposti.
- [Aperto] Una sola capitale con avamposti, o più città come in Travian?

## 8. Unità sulla mappa

- [Deciso] Gruppi per esagono: tocchi il gruppo, poi la destinazione. Il viaggio dura tempo
  reale (minuti o ore) secondo distanza, terreno e velocità.
- [Proposta] Tipi di unità:
  - **esploratori**: svelano la mappa;
  - **coloni**: fondano avamposti;
  - **carovane**: commercio e trasporto verso avamposti lontani;
  - **compagnie di avventurieri**: spedizioni nei luoghi speciali (§9);
  - **guardie**: difendono territorio e carovane da mostri e banditi.
- [Proposta] Combattimento automatico quando serve (mostri, banditi, eventuali rivali), con un
  rapporto che ne riassume l'esito.
- [Proposta] Anche le guardie costano materiali lavorati (armi, armature) e il mantenimento si
  paga in cibo.
- [Aperto] Quanto conta il conflitto tra regni:
  - a) nessuna conquista: i regni competono per giacimenti, rovine, mercato e Grande Opera; le
    minacce vengono solo da mostri e banditi;
  - b) guerra possibile, ma costosa e secondaria.

## 9. Avventurieri e spedizioni

- [Deciso] Il giocatore ingaggia avventurieri per esplorare rovine e luoghi speciali.
  L'esplorazione è astratta: nessun dungeon da giocare, si vede il risultato.
- [Proposta] **Ingaggio**: nella capitale c'è una gilda (o taverna) con candidati che si
  rinnovano nel tempo. Ognuno ha etnia, classe (guerriero, ranger, mago, ladro, chierico…),
  livello, tratti, un costo d'ingaggio e una paga.
- [Proposta] **Compagnie** da 1 a 4 avventurieri, equipaggiate con prodotti della tua economia:
  razioni, torce, corde, pozioni, armi. Un equipaggiamento migliore rende le spedizioni più
  redditizie e più sicure: l'economia alimenta l'esplorazione.
- [Proposta] **Spedizione**: la compagnia viaggia sulla mappa in tempo reale (e scopre la nebbia
  lungo la strada), esplora il luogo per un certo tempo e torna. L'esito dipende da livello,
  classi, equipaggiamento e pericolosità del luogo.
- [Proposta] **Esiti possibili**: materie rare, artefatti, oro, ricette e conoscenze nuove, mappe
  che rivelano altri luoghi; esperienza per gli avventurieri; feriti e, a volte, caduti. Un
  breve resoconto racconta la spedizione.
- [Proposta] **Luoghi**: ogni luogo ha un livello di difficoltà; alcuni hanno più livelli da
  esplorare in spedizioni successive. Le rovine sono contese: chi arriva prima prende il meglio.
- Il ciclo: economia → equipaggiamento → spedizioni → scoperte → economia più ricca.
- [Aperto] Gli avventurieri possono morire per sempre?
- [Aperto] La mappa la svelano solo gli esploratori, o anche le compagnie?

## 10. Economia e trasformazione delle materie

- [Deciso] Leggera all'inizio ma espandibile, con un sistema di trasformazione profondo.
- [Proposta] Principi:
  1. Si parte con quattro materie prime; le altre si sbloccano con edifici, conoscenze, luoghi
     scoperti e reperti delle spedizioni.
  2. **Produzione continua**: un edificio ripete la sua ricetta finché ha materiali in ingresso e
     spazio in magazzino (come in Anno). Niente crafting a click, così funziona anche a gioco
     chiuso.
  3. Le materie rare stanno in luoghi precisi della mappa: l'esplorazione ha uno scopo e quei
     luoghi diventano contesi.
  4. Materie, ricette ed edifici sono definiti come dati: si aggiungono catene senza toccare il
     motore.
  5. Ogni etnia ha catene o varianti sue.
- [Proposta] Livelli:

  | Livello | Esempi |
  |---|---|
  | 0. Grezze | legname, pietra, minerale di ferro, grano, argilla, erbe, cristalli di mana |
  | 1. Lavorate | assi, blocchi, lingotti, farina, mattoni, cuoio, vetro, essenze |
  | 2. Manufatti | attrezzi, pane, pozioni, pergamene, carri, armi, razioni, torce, corde |
  | 3. Eccellenze | strumenti runici, artefatti restaurati, materiali della Grande Opera |

- Esempi di catene:
  - **Ferro**: minerale di ferro + carbone → lingotto → attrezzi / armi / armature
  - **Cibo**: grano → farina → pane; selvaggina + sale → carne affumicata → razioni da spedizione
  - **Legno**: tronchi → assi → carri, attrezzi, torce
  - **Magia**: cristalli di mana + erbe → essenza → pozioni, pergamene, rune;
    rune + attrezzo → strumento runico
  - **Edilizia**: argilla → mattoni; pietra → blocchi; sabbia → vetro
  - **Reperti**: frammento antico (dalle rovine) + strumenti → artefatto restaurato
- [Aperto] Logistica. [Proposta] I materiali sono disponibili in tutto il proprio territorio. Le
  carovane, visibili sulla mappa e attaccabili, servono solo per il commercio e per gli avamposti
  lontani.
- [Proposta] Commercio con i regni IA tramite mercato e carovane.

## 11. Etnie e fazioni

- [Deciso] Ci saranno etnie e fazioni.
- [Proposta] **Etnia**: il popolo, scelto all'inizio e fisso. Determina edifici, bonus, catene,
  avventurieri disponibili e aspetto. Le prime quattro (nomi e storia da definire):

  | Etnia | Punto forte | Catena tipica |
  |---|---|---|
  | Umani | versatili, commercio | grano, cavalli |
  | Nani | metallurgia, miniere profonde | minerali, rune |
  | Elfi | erbe e mana, luoghi antichi | legni pregiati, essenze |
  | Orchi | caccia, resistenza, lavoro a basso costo | carne, pelli, ossa |

- [Proposta] **Fazione**: un'alleanza o un credo scelto durante il round, comune a più etnie (per
  esempio Ordine della Luce, Patto dell'Ombra, Circolo Antico, Lega dei Mercanti). Dà vantaggi e
  conoscenze esclusive e cambia i rapporti con l'IA. In multiplayer diventa la base delle
  alleanze tra giocatori.
- [Aperto] È questa la distinzione tra etnia e fazione?

## 12. Single player e IA

- [Deciso] Primo traguardo: single player contro IA.
- [Proposta] Regni IA con etnie e personalità diverse (mercante, costruttore, esploratore,
  predone).
- [Proposta] Forze neutrali: mostri nelle tane, banditi, villaggi indipendenti.
- [Proposta] Diplomazia semplice con l'IA: accordi commerciali, rivalità.

## 13. Multiplayer (fase successiva)

- Mondi persistenti su server. La lobby è l'elenco dei mondi aperti (data di inizio, velocità,
  posti liberi), oppure una stanza privata con codice.
- Alleanze e messaggi; i dettagli si decidono più avanti.
- Requisito già da ora: la simulazione deve poter girare identica sul server.

## 14. Stile visivo

- [Deciso] Pixel art, con Heroes of Might and Magic e Civilization come riferimenti.
- [Proposta] Mappa vista dall'alto leggermente inclinata, esagoni con rilievo (montagne e alberi
  che escono dal bordo), acqua animata, palette ricca ma limitata (32–48 colori), interfaccia con
  cornici fantasy medievali.
- Serviranno molte icone (materie, edifici, avventurieri, reperti): pxl le gestisce bene con
  varianti di palette e parti riutilizzabili.

## 15. Note tecniche preliminari [Proposta]

- **Simulazione a eventi datati**: ogni azione genera eventi con un orario (costruzione finita,
  compagnia arrivata, spedizione conclusa). Le risorse si calcolano quando servono (tasso × tempo
  trascorso). La simulazione è deterministica, separata dalla grafica e usa lo stesso codice nel
  browser e sul server.
- **Recupero offline**: alla riapertura si processano in ordine gli eventi dal salvataggio a
  oggi, IA compresa.
- **Salvataggio** locale (IndexedDB) per il single player.
- Gran parte del gioco è interfaccia (città, produzione, gilda, resoconti): UI in HTML con un
  framework leggero, mappa disegnata su canvas (PixiJS o Phaser, da decidere nel piano tecnico).
- Contenuti come dati; tutti i testi tramite chiavi it/en.
- App web installabile (PWA); notifiche come "spedizione rientrata" da valutare.

## 16. Rischi

- Un single player con tempi lunghi può risultare lento: la velocità del mondo serve a questo.
- Catene profonde su uno schermo piccolo: serve una schermata di produzione molto chiara, con i
  flussi e i colli di bottiglia ben visibili.
- Resoconti delle spedizioni in due lingue: vanno composti da frammenti tradotti, non scritti
  come testo libero.
- Bilanciare etnie, catene e spedizioni: contenuti come dati e strumenti di simulazione per il
  bilanciamento.
- Il progetto è grande: si procede per tappe piccole.

## 17. Prime tappe (provvisorie)

1. Prototipo della mappa: generazione a esagoni, biomi, nebbia, navigazione con mouse e touch.
2. Motore a eventi e una base che produce materie prime con le prime ricette.
3. Unità sulla mappa: esploratori, coloni e avamposti, carovane.
4. Avventurieri: gilda, compagnie, spedizioni nelle rovine, resoconti.
5. IA avversaria: primo single player giocabile.
6. Etnie, fazioni, catene profonde, Grande Opera.
7. Multiplayer con lobby.

## 18. Domande aperte

1. Etnia e fazione: la distinzione del §11 è giusta? Quali etnie immagini?
2. Una capitale con avamposti, o più città?
3. Città: modello ibrido (estrazione sulla mappa, lavorazione in città)?
4. Conflitto tra regni: nessuna conquista, o guerra possibile ma secondaria?
5. Avventurieri: possono morire per sempre? Svelano anche la mappa?
6. In single player il mondo va avanti a gioco chiuso? Con la velocità a scelta?
7. Obiettivo finale: la Grande Opera al centro va bene?
8. Logistica: materiali comuni a tutto il territorio, o trasporto fisico?
