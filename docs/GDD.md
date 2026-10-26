# Documento di design (bozza v0.3)

> Stato: bozza in discussione. Niente codice finché questo documento non è stabile.
>
> Legenda: **[Deciso]** concordato · **[Proposta]** da confermare · **[Aperto]** da discutere

## 1. Il concetto [Deciso]

Il giocatore guida una **gilda di mercanti** in un mondo fantasy a esagoni. Esplora le terre
selvagge per trovare luoghi di interesse, assolda mercenari per trovare i dungeon e gestisce un
mercato fatto di linee di produzione.

## 2. Vincoli di base [Deciso]

- Browser game per PC e mobile.
- Single player contro IA per primo; multiplayer con lobby in una fase successiva.
- Italiano e inglese.
- Pixel art, prodotta con la skill pxl.
- Mappa fantasy a esagoni, nuova a ogni round, da esplorare.
- La base del giocatore è la sede della gilda.
- Le unità si muovono sulla mappa a gruppi: tocchi il gruppo, poi la destinazione.
- Tempo reale da orologio e round di ampio respiro, come in Travian e OGame.
- Economia ed esplorazione al centro; il combattimento è secondario.
- Ci saranno etnie e fazioni (ruolo da definire).

## 3. Il ciclo di gioco

1. Esplori le terre selvagge e trovi luoghi di interesse.
2. Assoldi mercenari per trovare i dungeon.
3. Ciò che trovi alimenta le linee di produzione.
4. Vendi sul mercato.
5. Reinvesti: sede, esploratori, mercenari, nuove linee.

## 4. Esplorazione delle terre selvagge

- [Deciso] La mappa parte coperta: la gilda manda i suoi a scoprire le terre selvagge e i luoghi
  di interesse.
- [Aperto] Quali luoghi di interesse esistono e cosa offrono.

## 5. Mercenari e dungeon

- [Deciso] La gilda assolda mercenari per trovare i dungeon.
- [Deciso] L'esplorazione non si gioca nel dettaglio: si vede il risultato.
- [Aperto] Cosa riportano i mercenari dai dungeon.

## 6. Mercato e linee di produzione

- [Deciso] La parte di mercato è fatta di linee di produzione, con un sistema di trasformazione
  delle materie profondo.
- [Deciso] Leggera all'inizio, espandibile nel tempo.
- [Aperto] Dove stanno le linee, da dove arrivano le materie, a chi si vende.

## 7. Riferimenti

- **Travian, OGame**: il ritmo in tempo reale e i round lunghi.
- **Heroes of Might and Magic, Civilization**: la mappa e lo stile visivo.

## 8. Note tecniche preliminari [Proposta]

- Simulazione a eventi datati (produzione, viaggi, spedizioni), separata dalla grafica, con lo
  stesso codice nel browser e, più avanti, sul server.
- Il mondo avanza anche a gioco chiuso: alla riapertura si calcola cosa è successo.
- Contenuti (materie, ricette, luoghi) definiti come dati; tutti i testi tramite chiavi it/en.

## 9. Domande aperte

1. **Mercato**: dove e a chi vende la gilda? Città sparse sulla mappa, ognuna con richieste e
   prezzi propri, o un mercato unico?
2. **Linee di produzione**: stanno nella sede della gilda o anche sulla mappa? Le materie prime
   vengono dai luoghi esplorati, dai dungeon o si comprano?
3. **Rivali**: gli avversari sono altre gilde di mercanti (IA ora, giocatori poi) che si
   contendono luoghi, dungeon e mercati?
4. **Etnie e fazioni**: che ruolo hanno con una gilda al centro?
5. **Fine del round**: vince la gilda più ricca, o c'è un altro obiettivo?
