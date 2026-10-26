# Documento di design (bozza v0.13)

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
- Interfaccia: la mappa occupa tutto lo schermo; a sinistra un menu a icone apre i pannelli. Il
  primo è **Unità**: l'elenco delle unità della gilda, con il mestiere e cosa stanno facendo
  (ferme, in viaggio, al lavoro); toccandone una la si seleziona e la si comanda dalla sua scheda.
  Poi la **Sede** (monete, magazzino, laboratori, avamposti) e le **Opzioni**.
  In alto a destra, in colonna, le risorse della gilda: solo icona e quantità, prima le monete
  e poi le materie che ha in magazzino o che i suoi avamposti e laboratori muovono.

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
- [Proposta] La gilda parte con due esploratori (un Cartiglio e uno di un'altra etnia), un
  costruttore micelide e una carovaniera o un carovaniere lumacaio. I mercenari si trovano nelle
  locande (§7).
- [Proposta] Avamposti:
  - li fonda un costruttore: va sulla casella, paga 60 monete e ci lavora 4 ore di gioco (3 se
    ha il talento del mestiere, come i Micelidi); intanto resta sul cantiere;
  - ogni bioma di terra ha il suo avamposto e la sua materia prima: **fattoria** (pianura,
    grano), **campo dei boscaioli** (foresta, legname), **cava d'argilla** (colline, argilla),
    **miniera** (montagne, ferro grezzo), **capanno delle erbe** (palude, erbe), **cava di
    sabbia** (deserto, sabbia), **rifugio dei cacciatori** (tundra, pelli);
  - ogni ora di gioco manda alla sede 2 unità, più una ogni due caselle vicine dello stesso
    bioma (da 2 a 5): conviene costruire in mezzo al bioma;
  - si costruisce solo dove si è esplorato, non sull'acqua, sulla sede, sui luoghi di interesse
    né accanto a un altro avamposto;
  - il raccolto arriva subito al magazzino della sede (più avanti potrebbero servire le
    carovane); l'avamposto vede le caselle intorno, fino a 2 di distanza.
- [Deciso] Cinque tipi di luoghi di interesse, sparsi sulla mappa e nascosti dalle nuvole finché
  qualcuno non li vede: **cittadine**, **mercati**, **castelli**, **torri del mago** e
  **ingressi di dungeon**. Ogni luogo ha un nome generato; quando un personaggio lo scopre arriva
  un avviso.
- [Proposta] Cosa offrono (castelli, torri e dungeon arrivano con le prossime tappe):
  - **cittadina**: compra le merci della gilda, con prezzi propri e due merci che cerca (§8);
  - **mercato**: vende tre materie prime (§8);
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
- [Deciso] Ogni personaggio ha un nome e un soprannome della sua etnia (Brunilde Sbeccata,
  Folio Bianco); l'origine gli dà un bioma in cui si muove bene.
- [Proposta] Le tabelle della prima versione: 7 origini (una per bioma di terra), 10 mestieri
  precedenti (+1 a una statistica), 8 eventi segnanti (un tratto, con un effetto da −1 a +1), 8
  manie (−1 a una statistica, o solo una stranezza).
- Esempi:

  > **Brunilde Sbeccata**, cocciaia, mercenaria. Nata nelle fornaci delle colline rosse. Per
  > anni buttafuori in una locanda (+Vigore). Caduta in un pozzo, ne è uscita con tre
  > cicatrici d'oro (tratto *Già rotta una volta*: +Fegato). Conta ad alta voce ogni moneta
  > (−Parlantina: i mercanti si spazientiscono).

  > **Foglio Settimo**, cartiglio, esploratore. Piegato da una mappa di un regno che non esiste
  > più. Per vent'anni segnalibro in una biblioteca (+Occhio). Sopravvissuto a un incendio con
  > un angolo bruciacchiato (tratto *Paura del fuoco*). Corregge le mappe di tutti, anche
  > quando nessuno gliel'ha chiesto.

### Equipaggiamento

- [Deciso] Ogni personaggio ha uno slot per un **ninnolo** (EN: trinket); i mercenari ne hanno
  due in più, **arma** e **armatura**.
- [Deciso] Gli oggetti da equipaggiare si trovano nel bottino dei dungeon (§7).
- [Proposta] Un ninnolo dà un punto (o due, o tre, secondo la rarità) a una statistica, e quindi
  a ciò che ne dipende: Passo la velocità, Occhio la vista, Vigore il carico dei carovanieri,
  Vigore e Fegato le spedizioni. Qualcuno ha anche una stranezza.
- [Proposta] L'arma aiuta a ripulire i livelli di un dungeon, l'armatura protegge dalle ferite.
  Contano solo nei dungeon.
- [Proposta] Tre rarità: comune (+1), raro (+2), leggendario (+3); più si scende in un dungeon,
  più sono rare.
- [Proposta] Gli oggetti trovati vanno nel forziere della sede; si mettono e si tolgono dalla
  scheda del personaggio quando è alla sede.
- [Proposta] Primi oggetti:
  - ninnoli: **Bussola storta** (Occhio), **Campanella da lumaca** (Passo), **Moneta col
    buco** (Parlantina), **Dente di troll** (Fegato), **Ditale di ferro** (Vigore);
  - armi: **Coltellaccio**, **Lancia di frassino**, **Martello di ferro lunare**;
  - armature: **Giubba imbottita**, **Corazza di cocci**, **Guscio rinforzato**.

## 7. Mercenari e dungeon

- [Deciso] La gilda assolda mercenari per trovare i dungeon.
- [Deciso] L'esplorazione dei dungeon non si gioca nel dettaglio: si vede il risultato.
- [Deciso] Ogni dungeon ha più livelli di profondità. Un livello ripulito resta vuoto per molto
  tempo, poi si ripopola.
- [Deciso] Il rischio: se una spedizione va male, un mercenario può tornare ferito (fermo per un
  po') o non tornare. Per i Cocciai una ferita può diventare una cicatrice d'oro, con un tratto
  nuovo.
- [Deciso] Il bottino: monete, materie rare che si trovano solo nei dungeon, reperti per le
  ricerche (§9) e oggetti da equipaggiare (§6).
- [Deciso] Assoldare: ogni cittadina ha una **locanda** con 2 o 3 personaggi già fatti, di
  qualsiasi mestiere (spesso mercenari), con la loro storia in quattro capitoli (§6); cambiano
  ogni 2 giorni di gioco. L'ingaggio costa da 40 a 150 monete secondo le statistiche (dieci
  monete per punto oltre i 18, venti in più se ha il talento del suo mestiere); il nuovo
  arrivato parte dalla cittadina. La gilda parte senza mercenari: il primo si trova in una
  locanda.
- [Deciso] La paga: ogni personaggio chiede una paga, ogni giorno; se non lo paghi se ne va.
- [Proposta] La paga è un ventesimo del costo d'ingaggio (da 2 a 8 monete al giorno) e si
  paga ogni mattina alle 8, in ordine di arrivo nella gilda, finché bastano le monete; chi resta
  senza paga due volte di fila se ne va, e lascia nel forziere quello che aveva addosso.
- [Deciso] La spedizione: una squadra da 1 a 3 mercenari va all'ingresso (ognuno con il suo
  passo; quando ci sono tutti entra) e il giocatore sceglie fino a che livello scendere. Ogni
  livello dura 2 ore di gioco. Per ogni livello si tira la riuscita: forza della squadra
  (Vigore, Fegato e armi) contro la difficoltà del livello.
  - riuscito: il bottino del livello è della squadra, e si scende al successivo;
  - fallito: la squadra risale con quello che ha trovato fin lì; ognuno rischia una ferita
    (meno con l'armatura): fermo alla sede per un giorno di gioco. Raramente un ferito non
    torna più.
  - Cocciai: una ferita su due diventa una cicatrice d'oro, +1 a Vigore o a Fegato e un capitolo
    in più nella storia.
- [Proposta] Da 2 a 4 livelli per dungeon, più profondi lontano dalla sede; difficoltà e bottino
  crescono con la profondità. Un livello ripulito si ripopola dopo 7 giorni di gioco.
- [Proposta] I numeri della prima versione:
  - riuscita = forza / (forza + difficoltà); la difficoltà del livello N è 4 + 6×N; ogni punto
    d'arma vale due di forza (un mercenario medio da solo ha circa una possibilità su due al
    primo livello, una squadra di tre circa tre su quattro);
  - se un livello va male, ognuno ha il 50% di ferirsi (−10% per punto d'armatura) e un ferito
    ha il 12% di non tornare (−3% per punto d'armatura); un Cocciaio ferito ha il 50% di prendere
    una cicatrice d'oro;
  - bottino di un livello N: da 10 a 25 monete × N, da 1 a 2 unità × N di una materia rara, un
    oggetto con il 25% + 10%×N (di più se la squadra ha l'Occhio buono), un reperto con il
    10% + 10%×N.
- [Proposta] Prime materie dei dungeon, un po' strane come le etnie: **ferro lunare** (pallido,
  pesa la metà), **cristallo d'eco** (ripete l'ultimo suono che ha sentito), **muschio
  lucente** (fa luce per anni), **seta d'ombra**. Entrano in quattro ricette nuove (§8).
- [Proposta] Il drago resta per la tappa 6, con le condizioni di vittoria.

## 8. Linee di produzione e mercato

- [Deciso] Il mercato è fatto di linee di produzione, con un sistema di trasformazione delle
  materie profondo, leggero all'inizio ed espandibile nel tempo.
- [Deciso] Le materie prime arrivano dalla mappa (avamposti) e dai dungeon.
- [Deciso] Si vende alle città sparse sulla mappa.
- [Proposta] Ogni città ha richieste e prezzi propri.
- [Proposta] La gilda parte con 400 monete e le guadagna vendendo alle cittadine.
- [Proposta] La sede ha un magazzino, che tiene fino a 100 unità di ogni materia (quello che non
  ci sta va perso), e posto per 4 laboratori.
- [Proposta] Un laboratorio costa 80 monete, si costruisce in 2 ore di gioco e lavora una
  ricetta a cicli: all'inizio del ciclo prende le materie, alla fine mette in magazzino i
  prodotti. Se manca una materia o il prodotto non ci sta, aspetta; si può mettere in pausa.
- [Proposta] Le prime ricette (la durata è di un ciclo, in ore di gioco):

  | Laboratorio | Prende | Dà | Ore |
  |---|---|---|---|
  | Mulino | 2 grano | 1 farina | 1 |
  | Forno | 2 farina, 1 legname | 3 pane | 2 |
  | Segheria | 2 legname | 1 asse | 1 |
  | Carbonaia | 3 legname | 2 carbone | 2 |
  | Fornace | 2 argilla, 1 carbone | 2 mattoni | 2 |
  | Fonderia | 2 ferro grezzo, 1 carbone | 1 lingotto di ferro | 2 |
  | Fucina | 1 lingotto di ferro, 1 asse | 1 attrezzi | 2 |
  | Vetreria | 2 sabbia, 1 carbone | 1 vetro | 2 |
  | Conceria | 2 pelli, 1 erbe | 2 cuoio | 2 |
  | Erboristeria | 3 erbe | 1 unguento | 2 |
  | Fonderia lunare | 1 ferro lunare, 1 carbone | 1 acciaio lunare | 2 |
  | Carillonaio | 1 cristallo d'eco, 1 asse | 1 carillon | 2 |
  | Lanternaio | 1 muschio lucente, 1 vetro | 1 lanterna perpetua | 2 |
  | Sartoria d'ombra | 1 seta d'ombra, 1 cuoio | 1 mantello d'ombra | 3 |

  La catena più lunga per ora arriva agli attrezzi: legname → carbone e assi, ferro grezzo +
  carbone → lingotti, lingotti + assi → attrezzi. Le materie dei dungeon (tappa 5) allungheranno
  le catene.
- [Proposta] Ogni materia ha un valore di base in monete, che cresce lungo le catene: grano,
  legname e argilla 2, sabbia 1, ferro grezzo, erbe e pelli 3; farina 5, pane 6, assi 5,
  carbone 3, mattoni 4, lingotti di ferro 12, attrezzi 26, vetro 8, cuoio 7, unguento 13; dai
  dungeon ferro lunare 14, cristallo d'eco 18, muschio lucente 12, seta d'ombra 20; acciaio
  lunare 30, carillon 45, lanterna perpetua 40, mantello d'ombra 55.
- [Proposta] Commercio con le carovane:
  - lo fa il carovaniere: parte dalla sede con il carico scelto dal magazzino, vende tutto alla
    cittadina e torna; oppure va a un mercato, compra e torna a scaricare in magazzino; durante
    il viaggio non prende altri ordini;
  - porta 10 unità più 2 per punto di Vigore, la metà in più se ha il talento (i Lumacai,
    "lenti ma capienti");
  - ogni cittadina paga le materie prime tra il 60 e il 100% del valore, i prodotti tra l'80 e
    il 120%, e le due merci che cerca tra il 150 e il 180%; ogni mercato vende tre materie prime
    tra il 110 e il 140% del valore;
  - ogni unità venduta in una cittadina abbassa del 4% il prezzo delle successive (ogni unità
    comprata a un mercato lo alza del 4%); il luogo dimentica un'unità ogni 20 minuti di gioco,
    così vendere sempre la stessa merce nello stesso posto rende sempre meno;
  - al mercato si compra finché bastano le monete; quello che non ci sta in magazzino va perso.
- [Aperto] Rotte ripetute (la carovana rifà da sola lo stesso viaggio) e carovane rivali.
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
3. Avamposti e materie prime; prime linee di produzione. (fatta)
4. Città, mercato e carovane. (fatta)
5. Mercenari e dungeon. (fatta)
6. Albero tecnologico, gilde rivali IA, condizioni di vittoria: primo single player completo.
7. Multiplayer con lobby.
8. Espansione: fazioni.

## 15. Domande aperte

Nessuna per ora.
