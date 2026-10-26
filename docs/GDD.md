# Documento di design (bozza v0.9)

> Stato: bozza stabile per partire. I dettagli (luoghi, dungeon, ricette, ricerche) si definiscono
> tappa per tappa. Il piano tecnico è in [TECH.md](TECH.md).
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
- [Deciso] Ciò che non è ancora esplorato è coperto da nuvole in pixel art, che si aprono e
  scivolano via man mano che il giocatore scopre la mappa. Le zone esplorate ma fuori vista
  restano scoperte, un po' più scure.
- [Deciso] Il giocatore può costruire avamposti sulla mappa per raccogliere materie prime, che
  vengono mandate alla gilda.
- [Proposta] Movimento: in pianura una casella costa 10 minuti di gioco a Passo 5; gli altri
  biomi costano di più (deserto ×1,3, foresta ×1,5, tundra ×1,6, colline ×1,7, palude ×2,
  montagne ×2,6); l'acqua non si attraversa a piedi. Un bioma congeniale all'etnia costa
  ×0,75, uno ostile ×1,4. Il Passo accorcia o allunga ogni passo.
- [Deciso] Vista: in pianura si vede fino a 4 caselle. Le montagne bloccano la vista di ciò che
  sta dietro (la montagna si vede). Attraverso una foresta si vede la foresta e solo una casella
  dietro.
- [Proposta] Le caselle esplorate ma fuori vista hanno un velo leggero di foschia: si vedono,
  ma è l'ultima situazione nota.
- [Proposta] Atmosfera (solo estetica): il giorno e la notte seguono l'orologio del mondo (alba,
  giorno, tramonto, notte blu con le finestre della sede accese); ombre sotto alberi, montagne,
  colline e sede; ombre di nuvole portate dal vento; stormi di uccelli con la loro ombra, di
  giorno. Uccelli e ombre di nuvole si spengono se il sistema chiede meno movimento.
- [Proposta] Gli altri terreni aperti (deserto, tundra, palude) vedono come la pianura, a 4
  caselle. Dalle colline si vede a 5, dalle montagne a 6, e dalle alture si vede sopra le
  foreste (non sopra le montagne). Con Occhio 7 o più si vede una casella in più. La sede vede
  come un personaggio sulla sua casella.
- [Proposta] La gilda parte con due esploratori: un Cartiglio e uno di un'altra etnia.
- [Deciso] Cinque tipi di luoghi di interesse, sparsi sulla mappa e nascosti dalle nuvole finché
  qualcuno non li vede: **cittadine**, **mercati**, **castelli**, **torri del mago** e
  **ingressi di dungeon**. Ogni luogo ha un nome generato; quando un personaggio lo scopre arriva
  un avviso.
- [Proposta] Cosa offrono (arriva con le prossime tappe):
  - **cittadina**: compra le merci della gilda, con richieste e prezzi propri (§8);
  - **mercato**: vende materie prime e permette scambi;
  - **castello**: il signore della regione dà incarichi e permessi (per esempio per costruire
    avamposti nelle sue terre);
  - **torre del mago**: un mago solitario che insegna segreti utili alle ricerche (§9);
  - **ingresso di un dungeon**: lo esplorano i mercenari (§7).
- [Proposta] Quanti e dove: una cittadina ogni 240 caselle di terra circa (almeno 3), un mercato
  ogni 500 (almeno 2), un castello e una torre ogni 700 (almeno uno), un dungeon ogni 300
  (almeno 2). Le cittadine stanno volentieri vicino all'acqua e in pianura, una non lontano dalla
  sede; castelli e mercati a qualche casella da una cittadina; le torri lontane da tutto; i
  dungeon su colline e montagne, più spesso lontano dalla sede. Tutti raggiungibili a piedi dalla
  sede e mai a meno di 4 caselle da essa.

## 6. Personaggi, etnie e background

### Mestieri [Deciso]

Il giocatore assolda personaggi già fatti, non li crea. Quattro mestieri:

- **esploratori**: scoprono la mappa e i luoghi di interesse;
- **costruttori**: fondano gli avamposti;
- **carovanieri**: portano le merci alle città;
- **mercenari**: trovano ed esplorano i dungeon.

### Etnie

- [Deciso] Si parte con quattro etnie, fuori dagli schemi classici (niente elfi, nani, orchi).
- [Deciso] L'etnia dà a ogni personaggio un'affinità con alcuni biomi (si muove ed esplora meglio
  in certi terreni) e un talento in un mestiere.
- [Deciso] Le quattro etnie:
  - **Cartigli** (EN: Paperfolk). Nati da mappe dimenticate, fatti di carta piegata: ciò che
    esplorano si disegna sulla loro pelle. Talento: esploratori. A loro agio in pianure e
    deserti; temono paludi, pioggia e fuoco.
  - **Lumacai** (EN: Shellfolk). Portano sulla schiena un guscio che è casa e bottega,
    ereditato e decorato da generazioni. Lenti ma capienti. Talento: carovanieri. A loro agio
    in foreste e paludi; nei deserti si seccano.
  - **Cocciai** (EN: Sherdkin). Persone di terracotta: quando si rompono si riparano con l'oro,
    e ogni cicatrice dorata è una storia e un tratto in più. Talento: mercenari. A loro agio
    su colline e montagne; temono l'acqua e il gelo.
  - **Micelidi** (EN: Mycelings). Funghi ambulanti che condividono i ricordi tramite spore.
    Talento: costruttori, perché fanno crescere gli avamposti e il loro micelio li collega
    sotto terra. A loro agio nelle foreste e nel buio dei dungeon; temono deserti e
    gelo.
- Con quattro etnie e quattro mestieri, ogni etnia ha il suo mestiere di punta; chiunque può
  comunque fare qualsiasi mestiere.
- Idea per il futuro: **Gente di Sale** (EN: Saltborn), cristalli di sale viventi, mercanti nati
  nei deserti, che la pioggia scioglie.

### Background e "DNA"

- [Deciso] Ogni personaggio ha un background generato a caso, che gli dà colore e costruisce il
  suo DNA: tratti e statistiche nascono dalla sua storia.
- [Deciso] La storia si compone di quattro capitoli estratti da tabelle:
  1. **Origine**: dove è nato. Dà un'affinità di bioma in più.
  2. **Mestiere precedente**: cosa faceva prima. Dà un bonus a una statistica.
  3. **Evento segnante**: cosa gli è successo. Dà un tratto.
  4. **Mania**: un vizio o una fissazione. Dà un piccolo difetto o una stranezza.
- [Deciso] Cinque statistiche:
  - **Vigore**: resiste ai pericoli;
  - **Passo**: velocità sulla mappa;
  - **Occhio**: trova luoghi e bottino;
  - **Parlantina**: tratta prezzi e ingaggi;
  - **Fegato**: affronta i rischi senza tirarsi indietro.
- [Deciso] Valore di ogni statistica = base dell'etnia + capitoli della storia. Più un
  personaggio è dotato, più costa ingaggiarlo.
- [Deciso] La storia continua: viaggi e dungeon aggiungono capitoli nuovi (per i Cocciai,
  nuove cicatrici d'oro).
- [Deciso] Il testo si compone da frammenti tradotti in italiano e inglese.
- Esempi:

  > **Brunilde Sbeccata**, cocciaia, mercenaria. Nata nelle fornaci delle colline rosse. Per
  > anni buttafuori in una locanda (+Vigore). Caduta in un pozzo, ne è uscita con tre
  > cicatrici d'oro (tratto *Già rotta una volta*: +Fegato). Conta ad alta voce ogni moneta
  > (−Parlantina: i mercanti si spazientiscono).

  > **Foglio Settimo**, cartiglio, esploratore. Piegato da una mappa di un regno che non esiste
  > più. Per vent'anni segnalibro in una biblioteca (+Occhio). Sopravvissuto a un incendio con
  > un angolo bruciacchiato (tratto *Paura del fuoco*). Corregge le mappe di tutti, anche
  > quando nessuno gliel'ha chiesto.

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

## 13. Note tecniche

Vedi [TECH.md](TECH.md).

## 14. Prime tappe [Proposta]

1. Mappa: generazione a esagoni, biomi, nuvole sull'inesplorato, navigazione con mouse e touch.
2. Sede della gilda, motore a eventi, primi esploratori sulla mappa. (fatta)
3. Avamposti e materie prime; prime linee di produzione.
4. Città, mercato e carovane.
5. Mercenari e dungeon.
6. Albero tecnologico, gilde rivali IA, condizioni di vittoria: primo single player completo.
7. Multiplayer con lobby.
8. Espansione: fazioni.

## 15. Domande aperte

Nessuna per ora.
