# Come è fatto dentro

Mappa per chi mette mano al codice. Le ragioni delle scelte, dove non sono
ovvie, sono scritte accanto: sono quelle che una modifica ragionevole in sé
rischia di rompere senza accorgersene.

## Le parti

```
server/
  percorsi.js       cartelle del progetto e ricerca del motore
  catalogo.js       scansione di template/, validazione delle cartelle
  composizione.js   generazione di documento.tex, metadati.tex, opzioni.tex
  compilatore.js    cartella di lavoro, esecuzione, timeout, annullamento
  registro.js       da .log a elenco di voci con file, riga e messaggio
  server.js         cinque rotte e file statici
  verifica.js       verifiche automatiche (npm run verifica)
  scalda.js         prima compilazione di tutti i template (npm run scalda)

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

template/<slug>/  i template — vedi template.md
motore/           eseguibile e cache, non versionati
lavoro/           cartella di lavoro e immagini caricate, non versionate
```

## Perché esiste un server

Una pagina web non può eseguire un programma nativo, e il motore di
composizione è un programma nativo. Tutto ciò che non serve a compilare non
appartiene a `server.js`: niente basi di dati, niente autenticazione, niente
sessioni. Ascolta su `127.0.0.1` e non è raggiungibile dalla rete.

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
