# Come è fatto dentro

Mappa per chi mette mano al codice. Le ragioni delle scelte, dove non sono
ovvie, sono scritte accanto: sono quelle che una modifica ragionevole in sé
rischia di rompere senza accorgersene.

## Le parti

```
server/
  percorsi.js       le due radici, cartelle del progetto, ricerca del motore
  catalogo.js       scansione di template/, validazione delle cartelle
  composizione.js   generazione di documento.tex, metadati.tex, opzioni.tex
  compilatore.js    cartella di lavoro, esecuzione, timeout, annullamento
  registro.js       da .log a elenco di voci con file, riga e messaggio
  server.js         le rotte, i file statici, avvia()
  verifica.js       verifiche automatiche (npm run verifica)
  scalda.js         prima compilazione di tutti i template (npm run scalda)

electron/
  main.cjs                  finestra, server, menu, dialoghi
  preload.cjs               il ponte, quattro funzioni
  avvia-desktop.cjs         avvio in sviluppo (npm run desktop)
  controlla-pacchetto.cjs   controlli prima dell'installer

src/
  App.jsx                    stato, ciclo di compilazione, telaio
  components/Editor.jsx      CodeMirror, righe errate, salto a riga
  components/Anteprima.jsx   pdf.js, conservazione della posizione
  components/Pannelli.jsx    galleria, metadati, opzioni, aggiunte
  components/Registro.jsx    elenco delle voci, collegamento all'editor
  lib/rilevamento.js         corpo o documento completo; estrazione del corpo
  lib/api.js                 chiamate al server
  lib/esempio.js             documento di prova
  styles.css                 foglio unico

scripts/
  genera-icone.cjs  da public/logo.svg alle icone (npm run icone)
  pubblica.mjs      pubblicazione di una versione

diagnostica.bat   che cosa manca all'installazione; non modifica niente

public/logo.svg   il disegno del logo, unico
risorse/          icona della finestra e dell'installer, generate da lì
template/<slug>/  i template — vedi template.md
motore/           eseguibile e cache, non versionati
lavoro/           cartella di lavoro e immagini caricate, non versionate
```

## Perché esiste un server

Una pagina web non può eseguire un programma nativo, e il motore di
composizione è un programma nativo. Tutto ciò che non serve a compilare non
appartiene a `server.js`: niente basi di dati, niente autenticazione, niente
sessioni. Ascolta su `127.0.0.1` e non è raggiungibile dalla rete.

## La finestra

Il guscio Electron non è una seconda applicazione: è la stessa, chiusa in una
finestra. Il processo principale avvia il server dentro di sé e carica
`http://127.0.0.1:<porta>`, mai `file://`. Caricando un file, l'interfaccia —
che parla col server per percorsi relativi — non avrebbe più nessuno con cui
parlare, e servirebbe una seconda strada per le stesse chiamate: due strade che
prima o poi divergono.

La porta la sceglie il sistema, tranne in sviluppo dove è 4180 perché è quella
che il proxy di Vite si aspetta. Così l'applicazione installata non litiga con
un server avviato a mano dal repository.

**Il server non sa nulla di Electron.** L'unico aggancio sono due variabili
d'ambiente lette da `percorsi.js`: `TEX2PDF_RISORSE`, dove stanno codice,
interfaccia compilata, template e motore incluso — di sola lettura quando
l'applicazione è installata — e `TEX2PDF_DATI`, dove si scrive. Chi lavora dal
repository non le imposta e le due radici tornano a coincidere.

**Il documento resta isolato.** `contextIsolation` attivo, `nodeIntegration`
spento. Ogni capacità nuova passa da una funzione dichiarata in `preload.cjs` e
da un `ipcMain.handle` in `main.cjs`; `ipcRenderer` non esce di lì. I gestori
restituiscono sempre un oggetto — `{ annullato }`, `{ errore }` o l'esito — e
non lanciano mai.

**L'applicazione deve continuare a funzionare nel solo browser.** Le funzioni di
sistema si attivano se `window.tex2pdf` esiste, altrimenti si ripiega su ciò che
il browser sa fare. `npm run dev` più `npm run servi` devono restare una via
d'uso completa, non una modalità degradata.

**Niente asar.** Il pacchetto contiene moduli ESM da importare e un binario da
eseguire: l'archivio non aggiungerebbe che modi di rompersi.

## Il logo

Il disegno vive in un file solo, `public/logo.svg`, ed è servito così com'è come
favicon. L'icona della finestra e quella dell'installer vogliono un `.ico`, che è
un formato di bitmap: `npm run icone` lo genera da lì e lo scrive in `risorse/`.

Si rasterizza a ogni misura invece di ridurre l'immagine grande, perché a sedici
e ventiquattro pixel una riduzione impasta le linee. Il motore di disegno è
quello di Electron, che è già una dipendenza di sviluppo: una libreria grafica
in più per convertire un file sarebbe sproporzionata.

L'icona generata è versionata, e non si rigenera dentro `npm run dist`: servirebbe
una sessione grafica, che su una macchina di compilazione non c'è. Chi tocca il
disegno rilancia `npm run icone` e mette nel commit anche ciò che ne esce;
`controlla-pacchetto.cjs` si accorge se manca, e le verifiche si accorgono se il
`.ico` non è un `.ico` o se ha perso le misure piccole.

**Un disegno solo.** Un secondo file diverge dal primo senza che se ne accorga
nessuno: l'icona della barra delle applicazioni e quella della scheda del
browser non si guardano mai insieme.

## Le rotte

| Rotta                                    | Scopo                                            |
| ---------------------------------------- | ------------------------------------------------ |
| `GET /api/stato`                         | motore, formati carta, lingue                    |
| `GET /api/template`                      | catalogo scoperto su disco                       |
| `GET /api/template/<slug>/anteprima.png` | miniatura                                        |
| `POST /api/compila`                      | sorgente, template, metadati, opzioni, aggiunte  |
| `GET /api/pdf`                           | il PDF prodotto                                  |
| `GET /api/sorgente-composto`             | il `.tex` composto per intero                    |
| `POST` `GET` `DELETE` `/api/assets`      | immagini affiancate al sorgente                  |

Se questo elenco cresce, probabilmente sta entrando nel progetto qualcosa che
non gli appartiene.

## Regole che il codice dà per acquisite

**Una compilazione alla volta.** Se ne arriva un'altra mentre la prima è in
corso, la prima viene uccisa: il suo risultato riguarda un testo che non esiste
più. Se la richiesta è identica a quella in corso si attende lo stesso
risultato invece di ricompilare. Non si accodano compilazioni.

**Un errore non svuota l'anteprima.** L'ultimo PDF valido resta a schermo,
marcato come non aggiornato. Perdere la pagina a ogni parentesi mancante
renderebbe l'editor inservibile.

**La posizione di lettura sopravvive alla ricompilazione.** Si annota la
proporzione di scorrimento prima di sostituire il documento e la si ripristina
dopo. Senza, correggere una virgola a pagina 14 riporterebbe ogni volta a
pagina 1.

**La cartella di lavoro è una sola e si riusa.** I file ausiliari che TeX
produce servono alla passata successiva: cancellarli a ogni compilazione
renderebbe l'indice sbagliato ogni volta. Si azzerano solo quando cambia il
template, perché a quel punto non descrivono più lo stesso documento.

**Il corpo dell'utente è un file a sé.** `\input{corpo.tex}`, mai concatenato al
preambolo: così TeX riporta gli errori come «corpo.tex riga *N*», e *N* è la
riga nell'editor. Da questo dipendono la marcatura delle righe errate e il
registro cliccabile.

**Un metadato non compilato produce un comando definito e vuoto.** Un comando
indefinito farebbe fallire la compilazione per una casella lasciata in bianco.

**I metadati si proteggono, il corpo no.** `proteggi()` vale per i campi del
modulo, che diventano argomenti di macro. Il corpo è LaTeX: proteggerlo
renderebbe il programma inutile.

**Il rilevamento della modalità si mostra sempre.** Applicarlo di nascosto
darebbe l'impressione che i template «a volte non funzionino». In modalità
documento completo la galleria è disattivata con la spiegazione accanto, e
l'estrazione del corpo è annullabile perché è distruttiva.

**Al motore si passano solo gli argomenti che il sottocomando dichiara.**
`compile` accetta `--keep-logs`, `--keep-intermediates`, `--untrusted`.
`--color` è un'opzione *globale*: valida prima di `-X`, rifiutata dopo — e il
rifiuto non riguarda la sola opzione, fa fallire l'intera riga di comando, così
nessun template compila e il registro resta vuoto. Il guasto si presenta
identico a un motore mancante. Prima di aggiungere un argomento, controllalo
con `tectonic -X compile --help` e aggiungilo alla verifica corrispondente.

**Il timeout è invalicabile.** Novanta secondi, poi `SIGKILL`. Un documento con
una ricorsione infinita è un caso normale, non un incidente.

## Dipendenze

CodeMirror è l'unica dipendenza pesante ammessa oltre a React, Vite e pdf.js.
Giustificazione: numerazione righe, evidenziazione, marcatura delle righe in
errore e salto a una riga sono quattro cose che in una `<textarea>` si
riscrivono da zero e male.

Prima di aggiungerne una, scrivi che cosa la rende necessaria. Se il problema si
risolve in venti righe, si risolve in venti righe.
