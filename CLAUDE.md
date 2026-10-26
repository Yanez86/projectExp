# projectExp

Browser game di strategia ed economia su mappa a esagoni (PC e mobile, italiano e inglese).
Design in `docs/GDD.md`, piano tecnico in `docs/TECH.md`: leggili prima di proporre modifiche al
gioco, e aggiornali quando una decisione cambia.

## Convenzioni

- Committa e pusha direttamente su `main` (richiesta esplicita del proprietario del progetto).
- Documenti, commenti e messaggi all'utente in italiano; nomi nel codice in inglese.
- Ogni testo visibile passa da una chiave in `packages/core/locales/it.json` ed `en.json`
  (formato ICU); un test controlla che le due lingue abbiano le stesse chiavi.
- La logica di gioco sta in `packages/core`: pura, deterministica (RNG con seed, niente
  `Date.now()` né `Math.random()`), senza DOM. La grafica e l'interfaccia stanno in `apps/client`.
- La grafica si scrive in `art/*.px.js` con la skill pxl (installata da
  `.claude/hooks/install-pxl.sh`); `npm run art` rigenera gli sprite sheet in
  `apps/client/src/assets/`, che si committano. Il client li importa (mai da `public/`), così il
  loro nome cambia a ogni versione e la cache del browser non mescola versioni diverse.

## Comandi

- `npm run dev`: il gioco in locale, con ricarica automatica.
- `npm run check`: controllo dei tipi, lint e test. Va lanciato prima di ogni push.
- `npm run build`: build di produzione in `apps/client/dist/`.
- `npm run art`: ricompila la grafica.
