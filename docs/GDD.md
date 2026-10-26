# Documento di design (bozza v0.5)

> Stato: bozza in discussione. Niente codice finché questo documento non è stabile.
>
> Legenda: **[Deciso]** concordato · **[Proposta]** da confermare · **[Aperto]** da discutere

## 1. Il concetto [Deciso]

Il giocatore guida una **gilda di mercanti** in un mondo fantasy a esagoni, in competizione con
altre gilde. Esplora le terre selvagge per trovare luoghi di interesse, costruisce avamposti per
raccogliere materie prime, assolda mercenari per trovare i dungeon, trasforma le materie con
linee di produzione e vende alle città sparse sulla mappa.

## 2. Vincoli di base [Deciso]

- Browser game per PC e mobile.
- Single player contro IA per primo; multiplayer con lobby in una fase successiva.
- Italiano e inglese.
- Pixel art, prodotta con la skill pxl.
- Mappa fantasy a esagoni, nuova a ogni round, da esplorare.
- La base del giocatore è la sede della gilda.
- I personaggi si muovono sulla mappa a gruppi: tocchi il gruppo, poi la destinazione.
- Tempo reale da orologio e round di ampio respiro, come in Travian e OGame.
- Economia ed esplorazione al centro; il combattimento è secondario.

## 3. Il ciclo di gioco

1. Esplori le terre selvagge e trovi luoghi di interesse.
2. Costruisci avamposti che raccolgono materie prime e le mandano alla gilda.
3. Assoldi mercenari per trovare i dungeon e riportarne il bottino.
4. Le linee di produzione trasformano le materie.
5. Vendi i prodotti alle città sulla mappa.
6. Reinvesti: sede, avamposti, personaggi, nuove linee, ricerche.

## 4. Gilde rivali [Deciso]

- Gli avversari sono altre gilde di mercanti: IA in single player, giocatori in multiplayer.
- Si contendono luoghi di interesse, dungeon e mercati.

## 5. Esplorazione e avamposti

- [Deciso] La mappa parte coperta: la gilda manda i suoi personaggi a scoprire le terre selvagge
  e i luoghi di interesse.
- [Deciso] Il giocatore può costruire avamposti sulla mappa per raccogliere materie prime, che
  vengono mandate alla gilda.
- [Aperto] Quali luoghi di interesse esistono e cosa offrono.

## 6. Personaggi ed etnie

- [Deciso] Le etnie servono alla creazione dei personaggi che poi circolano sulla mappa.
- [Deciso] Il giocatore assolda personaggi già fatti, non li crea.
- [Proposta] Quattro mestieri:
  - **esploratori**: scoprono la mappa e i luoghi di interesse;
  - **costruttori**: fondano gli avamposti;
  - **carovanieri**: portano le merci alle città;
  - **mercenari**: trovano ed esplorano i dungeon.
- [Proposta] L'etnia dà a ogni personaggio un'affinità con alcuni biomi (si muove ed esplora
  meglio in certi terreni) e un talento in un mestiere.
- [Aperto] Quali etnie.

## 7. Mercenari e dungeon

- [Deciso] La gilda assolda mercenari per trovare i dungeon.
- [Deciso] L'esplorazione dei dungeon non si gioca nel dettaglio: si vede il risultato.
- [Aperto] Cosa riportano i mercenari dai dungeon.

## 8. Linee di produzione e mercato

- [Deciso] Il mercato è fatto di linee di produzione, con un sistema di trasformazione delle
  materie profondo, leggero all'inizio ed espandibile nel tempo.
- [Deciso] Le materie prime arrivano dalla mappa (avamposti) e dai dungeon.
- [Deciso] Si vende alle città sparse sulla mappa.
- [Proposta] Ogni città ha richieste e prezzi propri.

## 9. Albero tecnologico

- [Deciso] Ci sarà un albero tecnologico.
- [Deciso] Una ricerca particolare è una delle condizioni di vittoria (§10).
- [Deciso] Quattro rami, uno per ogni parte del gioco: esplorazione, produzione, commercio,
  mercenari.
- [Deciso] Le ricerche costano risorse e tempo reale; alcune richiedono reperti trovati nei
  dungeon o nei luoghi di interesse.

## 10. Fine del round

- [Deciso] Tre modi per vincere: completare una ricerca particolare, essere la gilda più ricca,
  sconfiggere un drago.
- [Deciso, punto di partenza] Il round finisce quando una gilda completa la ricerca o sconfigge
  il drago; se non succede entro la scadenza del round, vince la gilda più ricca.

## 11. Fazioni

- [Deciso] Rimandate a un'espansione successiva.

## 12. Riferimenti

- **Travian, OGame**: il ritmo in tempo reale e i round lunghi.
- **Heroes of Might and Magic, Civilization**: la mappa e lo stile visivo.

## 13. Note tecniche preliminari [Proposta]

- Simulazione a eventi datati (produzione, viaggi, spedizioni, ricerche), separata dalla
  grafica, con lo stesso codice nel browser e, più avanti, sul server.
- Il mondo avanza anche a gioco chiuso: alla riapertura si calcola cosa è successo.
- Contenuti (materie, ricette, luoghi, ricerche) definiti come dati; tutti i testi tramite chiavi
  it/en.

## 14. Prime tappe [Proposta]

1. Mappa: generazione a esagoni, biomi, nebbia, navigazione con mouse e touch.
2. Sede della gilda, motore a eventi, primi esploratori sulla mappa.
3. Avamposti e materie prime; prime linee di produzione.
4. Città, mercato e carovane.
5. Mercenari e dungeon.
6. Albero tecnologico, gilde rivali IA, condizioni di vittoria: primo single player completo.
7. Multiplayer con lobby.
8. Espansione: fazioni.

## 15. Domande aperte

1. **Personaggi**: vanno bene i quattro mestieri e l'idea delle affinità del §6?
2. **Etnie**: quali?
