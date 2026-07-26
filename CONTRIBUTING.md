# Contribuire a TEX2PDF

Grazie dell'interesse. Questo documento dice come proporre una modifica e quali
vincoli il progetto dà per acquisiti: conoscerli in anticipo evita di scrivere
codice che verrà respinto per ragioni di impostazione, non di qualità.

## Prima di aprire una pull request

Apri prima una issue, salvo che si tratti di un refuso o di una correzione di
poche righe. Una modifica concordata si rivede in fretta; una modifica grossa
arrivata senza preavviso rischia di scontrarsi con scelte già prese.

## Ambiente

```bash
npm install
npm run servi      # il compilatore, su 4180
npm run dev        # l'interfaccia, su 5173, in un altro terminale
npm run build      # compilazione di produzione
npm run verifica   # verifiche automatiche
npm run scalda     # ricompila tutti i template col documento di prova
```

Serve Node.js 18 o successivo. Per compilare davvero serve il motore: su
Windows lo installa `installa-motore.bat`, altrove va messo a mano in `motore/`
o installato di sistema — se è nel `PATH`, l'applicazione lo trova da sé.

`npm run verifica` non richiede il motore: prova la lettura del registro, la
generazione dei file e il riconoscimento del sorgente, che sono le tre cose che
sbagliano in silenzio.

## Vincoli del progetto

Sono scelte, non dimenticanze.

1. **L'anteprima è il PDF.** Non una sua approssimazione, non un rendering
   alternativo del sorgente: il file prodotto dal motore, mostrato con pdf.js.
   Ogni proposta che introduca una seconda rappresentazione del documento viene
   respinta, anche quando è più veloce — soprattutto quando è più veloce, perché
   una seconda rappresentazione diverge dalla prima proprio nei casi difficili.

2. **L'impaginazione non è affar nostro.** La fa TeX. Non esiste, e non deve
   esistere, codice che calcoli salti pagina, altezze o posizioni.

3. **Il corpo dell'utente è un file a sé.** `\input{corpo.tex}`, mai concatenato
   al preambolo: così TeX riporta gli errori come «corpo.tex riga *N*», e *N* è
   la riga nell'editor, senza scostamenti da calcolare. Da questo dipendono la
   marcatura delle righe errate e il registro cliccabile. Concatenare i file li
   romperebbe entrambi, in modo silenzioso.

4. **La struttura del documento composto è identica per tutti i template.**
   Cambia il contenuto dei file inclusi, mai il loro ordine. Se un template ha
   bisogno di una struttura sua, è la struttura a essere sbagliata, non il
   template: le differenze vivono nel preambolo e nelle macro.

5. **`opzioni.tex` viene dopo `preambolo.tex`**, perché le scelte fatte dal
   modulo devono poter scavalcare il template. Il template decide i margini,
   l'utente decide il foglio.

6. **I metadati si proteggono, il corpo no.** `proteggi()` in `composizione.js`
   vale per i campi del modulo, che diventano argomenti di macro. Il corpo è
   LaTeX: proteggerlo renderebbe il programma inutile.

7. **Al motore si passano solo gli argomenti che il sottocomando dichiara.**
   `compile` accetta `--keep-logs`, `--keep-intermediates`, `--untrusted`.
   Un argomento non previsto fa rifiutare l'intera riga di comando: nessun
   template compila e il registro resta vuoto, un guasto identico a un motore
   mancante. Prima di aggiungerne uno, controllalo con
   `tectonic -X compile --help` e aggiungilo alla verifica corrispondente.

8. **Niente backend remoto, niente database, niente autenticazione.**
   L'applicazione gira in locale, per un solo utente.

9. **Nessuna dipendenza nuova per problemi che si risolvono in venti righe.**
   Se una serve davvero, spiega nella issue che cosa la rende necessaria.

## Lingua

Codice, commenti, documentazione e interfaccia sono **in italiano**, compresi i
nomi di variabili e funzioni del dominio (`compila`, `sorgente`, `preambolo`,
`corpo`, `registro`, `diagnostica`). Restano in inglese solo le parole imposte
dalle librerie e dal linguaggio. Nei commenti si spiega il **perché**: il cosa
si legge dal codice.

## Stile

- React 18 con Vite, JavaScript, nessun TypeScript.
- CSS scritto a mano in un unico foglio: niente framework, niente CSS-in-JS.
- Nessuna gestione di stato esterna: `useState` in `App.jsx` è sufficiente.
- Backend in moduli nativi di Node: niente Express, le rotte sono cinque e
  stanno in un file.
- Il file `.editorconfig` copre indentazione e fine riga.

## Aggiungere un template

Si crea una cartella in `template/`, non si tocca il programma. La struttura è
descritta in [`docs/template.md`](docs/template.md), insieme alle trappole già
incontrate — l'argomento opzionale di `\titleformat`, il blocco *before* di
titlesec, i pacchetti che `opzioni.tex` carica già e che il preambolo non deve
ricaricare.

## Verifiche prima di proporre la modifica

1. `npm run verifica` — le verifiche passano tutte.
2. `npm run build` — l'interfaccia compila senza errori.
3. `npm run scalda` — i quattro template compilano, col documento di prova.
4. Un sorgente con `\documentclass` viene riconosciuto come documento completo,
   e l'estrazione del corpo restituisce un sorgente che compila col template.
5. Un errore di sintassi nel corpo produce una voce con la riga giusta, il
   collegamento porta a quella riga, e l'ultima anteprima valida resta a
   schermo.
6. Una compilazione interrotta non lascia processi orfani.

Il punto 3 è quello che si dimentica, ed è quello che trova i guasti veri: i
difetti dei template non si vedono leggendo il codice.

## Commit

Il progetto usa i [Conventional Commits](https://www.conventionalcommits.org/it/v1.0.0/),
con oggetto in italiano:

```
feat(registro): collega anche gli avvisi alla riga del corpo
fix(compilatore): non lasciare processi orfani all'annullamento
docs(template): spiega l'argomento opzionale di titleformat
```

I tipi in uso: `feat`, `fix`, `docs`, `refactor`, `perf`, `style`, `build`,
`ci`, `chore`. Un `feat` alza la minore, un `fix` la patch, un
`BREAKING CHANGE:` nel corpo alza la maggiore.

## Changelog

Ogni modifica che l'utente percepisce va annotata in `CHANGELOG.md`, sotto la
versione in preparazione. Le modifiche interne che non cambiano nulla per chi
usa il programma non ci vanno.

## Licenza

Proponendo una modifica accetti che venga distribuita sotto la licenza MIT del
progetto.
