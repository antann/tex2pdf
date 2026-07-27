# Modifiche

Le voci descrivono ciò che cambia per chi usa il programma.

## Non ancora pubblicato

### Aggiunto

- **L'applicazione ha un logo.** Un «2» disegnato come una lettera, tagliato a
  metà: a sinistra il blu del sorgente, a destra il ciano della pagina
  composta, e sotto il foglio dell'anteprima su cui la barra poggia. Sul
  fianco sinistro il profilo esce in una punta: è la vita di una graffa. Lo
  stesso disegno è la favicon nella scheda del browser, l'icona della finestra
  e quella dell'installer.

## 1.1.0 — 28 luglio 2026

### Aggiunto

- **L'applicazione ha una finestra propria.** `avvia.bat` non apre più il
  browser: apre l'applicazione. Il server parte da sé dentro la finestra, su una
  porta scelta dal sistema, e si ferma quando la finestra si chiude — comprese
  le compilazioni ancora in corso.
- Menu in italiano con le scorciatoie consuete, e dialoghi di sistema per aprire
  un `.tex` e per salvare: il PDF e il sorgente composto si scrivono dove
  decidi, invece di finire nella cartella degli scaricamenti.
- `npm run dist` costruisce un installer per Windows, con il motore incluso.
  L'applicazione installata tiene i propri file di lavoro e la cache in
  `%APPDATA%\TEX2PDF`, lasciando intatta la cartella d'installazione.
- `avvia.bat --browser` conserva il modo di prima, per chi lo preferisce.
  Nel browser l'applicazione funziona esattamente come sempre.

## 1.0.1 — 25 luglio 2026

### Corretto

- **Nessun template compilava.** Il programma passava al motore l'opzione
  `--color`, che Tectonic accetta solo prima del sottocomando: messa dopo, il
  motore rifiutava l'intera riga di comando e non compilava nulla. L'opzione è
  stata tolta — senza un terminale il motore non colora comunque la propria
  uscita.
- I guasti del motore ora spiegano che cosa fare: un argomento rifiutato
  rimanda alla reinstallazione del motore, un download non riuscito alla
  connessione e alla cartella `motore/cache`, invece di riportare il messaggio
  grezzo del compilatore.
- *Salva PDF* salvava il file presente sul disco anziché quello mostrato a
  schermo: dopo una compilazione fallita i due potevano differire, perché il
  motore lascia in cartella un PDF parziale.

## 1.0.0 — 25 luglio 2026

Prima versione.

### Compilazione

- Documenti LaTeX compilati in PDF con Tectonic, incluso nel progetto: non
  serve installare TeX Live né MiKTeX.
- Anteprima del PDF prodotto, pagina per pagina, con ingrandimento adattato
  alla finestra o fisso.
- Compilazione automatica circa un secondo dopo l'ultima modifica,
  disattivabile per i documenti lenti.
- Quando la compilazione fallisce, l'ultimo PDF valido resta a schermo marcato
  come non aggiornato; la posizione di lettura non si perde fra una
  compilazione e l'altra.
- Compilazioni che non terminano interrotte dopo novanta secondi.

### Sorgente

- Apertura di un `.tex` per trascinamento o da dialogo, oppure scrittura
  diretta nell'editor.
- Editor con evidenziazione LaTeX, numeri di riga e marcatura delle righe in
  errore.
- Riconoscimento automatico fra testo da impaginare col template e documento
  già completo di preambolo, dichiarato nella barra in alto.
- Estrazione del corpo da un documento completo, per recuperare l'uso dei
  template; l'operazione si annulla.
- Immagini affiancate al sorgente per trascinamento.

### Template

- Quattro vesti grafiche: tecnico, relazione, manuale, appunti.
- Galleria con miniatura e specifiche tipografiche.
- Nuovi template si aggiungono creando una cartella in `template/`, senza
  toccare il programma.

### Metadati e opzioni

- Titolo, sottotitolo, autore, data, versione, riferimento, ente.
- Formato del foglio, orientamento, fronte-retro, indice e sua profondità,
  copertina dedicata, piè di pagina, lingua del documento.
- Campo per i `\usepackage` e le macro che il testo richiede e il template non
  prevede.

### Registro

- Errori, avvisi e note tipografiche in elenco, con file e riga.
- Le voci che riguardano il testo scritto dall'utente portano alla riga esatta
  nell'editor.
- Registro completo consultabile in forma grezza.

### Uscita

- Salvataggio del PDF.
- Esportazione del sorgente `.tex` composto per intero, template incluso.

### Contorno

- `installa-motore.bat` scarica il motore e compila una volta ogni template,
  così la prima compilazione vera non aspetta il download dei pacchetti.
- `avvia.bat`, con `--build` per compilare l'interfaccia prima di avviare, e
  `arresta.bat`.
- `npm run verifica` — diciotto verifiche automatiche su lettura del registro,
  composizione dei file e riconoscimento del sorgente.
