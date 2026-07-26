# Modifiche

Le voci descrivono ciò che cambia per chi usa il programma.

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
