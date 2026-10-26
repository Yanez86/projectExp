# Documento di design (bozza v0.1)

> Stato: bozza in discussione. Niente codice finché questo documento non è stabile.
>
> Legenda: **[Deciso]** concordato · **[Proposta]** da confermare · **[Aperto]** da discutere

## 1. In una frase

Strategia fantasy in tempo reale "da orologio", alla Travian/OGame, su una mappa a esagoni generata a
ogni round e tutta da esplorare, con un'economia di trasformazione delle materie profonda e una
pixel art ispirata a Heroes of Might and Magic e Civilization.

## 2. Vincoli di base [Deciso]

- Browser game per PC e mobile.
- Single player contro IA per primo; multiplayer con lobby in una fase successiva.
- Italiano e inglese.
- Pixel art, prodotta con la skill pxl.
- Mappa fantasy a esagoni, nuova a ogni round, da esplorare.
- Il giocatore ha una base e guida unità sulla mappa.
- Tempo reale.

## 3. Pilastri

1. **Un mondo nuovo a ogni round**: mappa generata, da scoprire esagono per esagono.
2. **Tempo da orologio**: il mondo va avanti anche quando non giochi; si gioca in sessioni brevi
   più volte al giorno, con piani che maturano in ore e giorni.
3. **Un'economia che si approfondisce**: poche materie prime all'inizio, catene di trasformazione
   complesse più avanti.
4. **Identità**: etnie e fazioni con stili di gioco davvero diversi.
5. **Giocabile ovunque**: mobile e PC, italiano e inglese.

## 4. Riferimenti

- **Travian, OGame**: il ritmo. Code di costruzione, eserciti in viaggio per ore, round lunghi.
- **Heroes of Might and Magic (II–III)**: la mappa d'avventura, eroi alla guida di eserciti,
  miniere, tane di mostri, artefatti, città diverse per fazione.
- **Civilization**: mappa a esagoni, esplorazione, territorio che cresce, civiltà diverse.
- [Proposta] **Anno, The Settlers**: le catene produttive.

## 5. Il round

- [Deciso] Ampio respiro: un round dura settimane e ogni round ha un mondo nuovo.
- [Proposta] Velocità del mondo scelta alla creazione: x1 (settimane), x3, x10 (giorni). Serve
  soprattutto al single player e ai test.
- [Proposta] Il mondo avanza anche a gioco chiuso: alla riapertura si calcola tutto ciò che è
  successo nel frattempo, mosse dell'IA comprese.
- [Proposta] Fasi:
  - **avvio**: esplorazione ed economia di base;
  - **espansione**: territorio, commercio, tane neutrali, primi conflitti;
  - **finale**: corsa all'obiettivo.
- [Proposta] Fine del round: al centro della mappa, nelle terre antiche, si costruisce la
  **Grande Opera**, un'opera che richiede materiali del livello più alto. Vince il primo che la
  completa e la difende. Così l'economia profonda diventa la strada per la vittoria.
- [Aperto] Altre condizioni di vittoria (dominio, alleanze).

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

- [Proposta] Luoghi speciali: tane di mostri (con bottino), rovine (artefatti, conoscenze),
  villaggi neutrali (commercio, conquista), nodi di mana, giacimenti rari.
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

## 8. Eserciti

- [Deciso] Gruppi per esagono: tocchi il gruppo, poi la destinazione. Il viaggio dura tempo
  reale (minuti o ore) secondo distanza, terreno e velocità.
- [Proposta] Ogni esercito è guidato da un eroe, come in Heroes: livelli, abilità, artefatti.
- [Proposta] Le unità costano materiali lavorati: uno spadaccino richiede una spada e
  un'armatura, un cavaliere anche un cavallo. L'economia alimenta la guerra; il mantenimento si
  paga in cibo.
- [Proposta] Ruoli: esploratori, coloni (fondano avamposti), carovane (commercio), militari.
- [Proposta] Combattimento automatico quando due eserciti si incontrano, con un rapporto di
  battaglia dettagliato come in Travian. Funziona in tempo reale e anche quando il difensore non
  è collegato.
- [Aperto] Battaglie tattiche su campo a esagoni, come in Heroes?

## 9. Economia e trasformazione delle materie

- [Deciso] Leggera all'inizio ma espandibile, con un sistema di trasformazione profondo.
- [Proposta] Principi:
  1. Si parte con quattro materie prime; le altre si sbloccano con edifici, conoscenze e
     scoperte sulla mappa.
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
  | 2. Manufatti | armi, armature, attrezzi, pane, pozioni, pergamene, carri |
  | 3. Eccellenze | armi runiche, artefatti, macchine d'assedio, materiali della Grande Opera |

- Esempi di catene:
  - **Ferro**: minerale di ferro + carbone → lingotto → spada / armatura / attrezzi
  - **Cibo**: grano → farina → pane; selvaggina + sale → carne affumicata
  - **Legno**: tronchi → assi → archi, carri, macchine d'assedio
  - **Magia**: cristalli di mana + erbe → essenza → pozioni, pergamene, rune;
    rune + arma → arma incantata
  - **Edilizia**: argilla → mattoni; pietra → blocchi; sabbia → vetro
- [Aperto] Logistica. [Proposta] I materiali sono disponibili in tutto il proprio territorio. Le
  carovane, visibili sulla mappa e attaccabili, servono solo per il commercio e per gli avamposti
  lontani.
- [Proposta] Commercio con i regni IA tramite mercato e carovane.

## 10. Etnie e fazioni

- [Deciso] Ci saranno etnie e fazioni.
- [Proposta] **Etnia**: il popolo, scelto all'inizio e fisso. Determina unità, edifici, bonus,
  catene e aspetto. Le prime quattro (nomi e storia da definire):

  | Etnia | Punto forte | Catena tipica |
  |---|---|---|
  | Umani | versatili, commercio, cavalleria | grano, cavalli |
  | Nani | metallurgia, difesa | minerali, rune |
  | Elfi | erbe e mana, arcieri | legni pregiati, essenze |
  | Orchi | guerra e razzia, costi bassi | carne, pelli, bottino |

- [Proposta] **Fazione**: un'alleanza o un credo scelto durante il round, comune a più etnie (per
  esempio Ordine della Luce, Patto dell'Ombra, Circolo Antico, Lega dei Mercanti). Dà vantaggi e
  conoscenze esclusive e cambia i rapporti con l'IA. In multiplayer diventa la base delle
  alleanze tra giocatori.
- [Aperto] È questa la distinzione tra etnia e fazione?

## 11. Single player e IA

- [Deciso] Primo traguardo: single player contro IA.
- [Proposta] Regni IA con etnie e personalità diverse (conquistatore, mercante, costruttore).
- [Proposta] Forze neutrali: mostri nelle tane, villaggi indipendenti.
- [Proposta] Diplomazia semplice con l'IA: pace, commercio, guerra.

## 12. Multiplayer (fase successiva)

- Mondi persistenti su server. La lobby è l'elenco dei mondi aperti (data di inizio, velocità,
  posti liberi), oppure una stanza privata con codice.
- Alleanze e messaggi; i dettagli si decidono più avanti.
- Requisito già da ora: la simulazione deve poter girare identica sul server.

## 13. Stile visivo

- [Deciso] Pixel art, con Heroes of Might and Magic e Civilization come riferimenti.
- [Proposta] Mappa vista dall'alto leggermente inclinata, esagoni con rilievo (montagne e alberi
  che escono dal bordo), acqua animata, palette ricca ma limitata (32–48 colori), interfaccia con
  cornici fantasy medievali.
- Serviranno molte icone (materie, unità, edifici): pxl le gestisce bene con varianti di palette
  e parti riutilizzabili.

## 14. Note tecniche preliminari [Proposta]

- **Simulazione a eventi datati**: ogni azione genera eventi con un orario (costruzione finita,
  esercito arrivato). Le risorse si calcolano quando servono (tasso × tempo trascorso). La
  simulazione è deterministica, separata dalla grafica e usa lo stesso codice nel browser e sul
  server.
- **Recupero offline**: alla riapertura si processano in ordine gli eventi dal salvataggio a
  oggi, IA compresa.
- **Salvataggio** locale (IndexedDB) per il single player.
- Gran parte del gioco è interfaccia (città, produzione, rapporti): UI in HTML con un framework
  leggero, mappa disegnata su canvas (PixiJS o Phaser, da decidere nel piano tecnico).
- Contenuti come dati; tutti i testi tramite chiavi it/en.
- App web installabile (PWA); notifiche come "attacco in arrivo" da valutare.

## 15. Rischi

- Un single player con tempi lunghi può risultare lento: la velocità del mondo serve a questo.
- Catene profonde su uno schermo piccolo: serve una schermata di produzione molto chiara, con i
  flussi e i colli di bottiglia ben visibili.
- Bilanciare etnie e catene: contenuti come dati e strumenti di simulazione per il
  bilanciamento.
- Il progetto è grande: si procede per tappe piccole.

## 16. Prime tappe (provvisorie)

1. Prototipo della mappa: generazione a esagoni, biomi, nebbia, navigazione con mouse e touch.
2. Motore a eventi e una base che produce materie prime con le prime ricette.
3. Eserciti: movimento in tempo reale, esplorazione, tane neutrali, combattimento automatico.
4. IA avversaria: primo single player giocabile.
5. Etnie, fazioni, catene profonde, obiettivo finale.
6. Multiplayer con lobby.

## 17. Domande aperte

1. Etnia e fazione: la distinzione del §10 è giusta? Quali etnie immagini?
2. Una capitale con avamposti, o più città?
3. Città: modello ibrido (estrazione sulla mappa, lavorazione in città)?
4. Eroi alla guida degli eserciti?
5. Combattimento automatico con rapporto, o battaglie tattiche?
6. In single player il mondo va avanti a gioco chiuso? Con la velocità a scelta?
7. Obiettivo finale: la Grande Opera al centro va bene?
8. Logistica: materiali comuni a tutto il territorio, o trasporto fisico?
