<img src="risorse/logo-256.png" alt="" width="128" align="right" />

# TEX2PDF

[![Compilazione](https://github.com/antann/tex2pdf/actions/workflows/build.yml/badge.svg)](https://github.com/antann/tex2pdf/actions/workflows/build.yml)
[![Licenza MIT](https://img.shields.io/badge/licenza-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-%E2%89%A518-informational.svg)](https://nodejs.org)

Compila documenti LaTeX in PDF applicando un template grafico. L'anteprima non
è un'approssimazione del risultato: è il PDF, compilato davvero e mostrato
pagina per pagina.

Applicazione locale, monoutente: gira sulla tua macchina, i file non la
lasciano. Il server ascolta soltanto su `127.0.0.1` e non è raggiungibile dalla
rete.

---

## Requisiti

- **Node.js 18 o successivo** — <https://nodejs.org>
- Una connessione attiva alla prima installazione, per scaricare il motore di
  composizione e i pacchetti LaTeX che i template richiedono. Dopo, no.

Non serve installare TeX Live né MiKTeX: il motore arriva con
`installa-motore.bat` e vive dentro la cartella del progetto, cache compresa.
Per disinstallare tutto basta cancellare la cartella.

## Installazione (Windows)

```
installa-motore.bat
```

Scarica Tectonic, lo mette in `motore\`, poi compila una volta ciascun template
per riempire la cache dei pacchetti. La prima compilazione richiede qualche
minuto: sta scaricando decine di megabyte di LaTeX. Le successive sono immediate.

## Avvio (Windows)

```
avvia.bat              apre l'applicazione, con ricarica automatica
avvia.bat --build      apre l'applicazione sull'interfaccia compilata
avvia.bat --browser    apre nel browser: interfaccia 5173, compilatore 4180
arresta.bat            ferma tutto
```

Al primo avvio `avvia.bat` installa da sé le dipendenze — Electron compreso,
quindi può volerci qualche minuto. La finestra si apre da sola: prima parte il
server, poi compare la finestra. Il browser non viene usato, se non con
`--browser`.

## Avvio da riga di comando (qualsiasi sistema)

```bash
npm install
npm run desktop        # apre la finestra, con ricarica automatica
npm run desktop:build  # compila l'interfaccia e apre la finestra
npm run servi          # solo compilatore su 4180, senza finestra
npm run dev            # solo interfaccia su 5173, in un altro terminale
npm run build          # compila l'interfaccia in dist/
npm run verifica       # verifiche automatiche
npm run scalda         # ricompila tutti i template, per riempire la cache
```

Nella finestra e nel browser l'applicazione è la stessa: la finestra carica
l'indirizzo del server locale, non una copia dei file. Le uniche differenze
sono il menu e i dialoghi di apertura e salvataggio, che nel browser diventano
il consueto scaricamento.

## Costruire l'installer (Windows)

```bash
npm run dist
```

Produce `installer\TEX2PDF Setup <versione>.exe`. Prima di lanciarlo serve il
motore in `motore\tectonic.exe` — `installa-motore.bat` lo scarica — perché
viene incluso nell'installer: chi riceve il pacchetto non deve procurarselo.
Il comando si ferma con un messaggio se manca il motore o l'interfaccia
compilata, invece di produrre un installer monco.

L'installer va costruito sul sistema di destinazione: `electron-builder` non
compila per piattaforme diverse dalla propria.

Una volta installata, l'applicazione tiene il codice e i template nella cartella
d'installazione, che resta di sola lettura, e scrive tutto il resto — cartella di
lavoro, immagini caricate, cache dei pacchetti — in `%APPDATA%\TEX2PDF`.

Su Linux e macOS il motore va messo a mano in `motore/` (l'eseguibile si chiama
`tectonic`), oppure installato di sistema: se è nel `PATH`, l'applicazione lo
trova da sé.

---

## Come si usa

1. **Sorgente** — trascina un file `.tex` sulla finestra, usa *apri file*,
   oppure scrivi direttamente nell'editor. Trascinando anche le immagini citate
   nel documento, queste vengono affiancate al sorgente in fase di compilazione.

2. **Template** — quattro vesti grafiche. Cambiarle ricompone il documento
   senza toccare il testo.

3. **Metadati e opzioni** — titolo, autore, versione, riferimento; e poi
   formato del foglio, orientamento, fronte-retro, indice, copertina, piè di
   pagina, lingua. Nulla di tutto questo modifica il tuo file: vale per la
   generazione in corso.

4. **Aggiunte** — i `\usepackage` e le macro che il tuo testo richiede e che il
   template non prevede. Finiscono in coda al preambolo.

5. **Registro** — errori e avvisi della compilazione. Le voci che riguardano il
   tuo testo sono cliccabili e portano alla riga esatta nell'editor.

6. **Salva PDF** — scrive il file. *Esporta .tex* salva invece il sorgente
   composto per intero, template incluso, se vuoi proseguire con un altro
   strumento.

### Le due modalità del sorgente

L'applicazione riconosce da sé che cosa hai incollato, e lo dichiara nella barra
in alto.

**Corpo + template.** Il sorgente non contiene `\documentclass`. Scrivi solo il
contenuto — sezioni, testo, tabelle — e il template mette classe, font, margini,
intestazioni e frontespizio. È il modo previsto.

**Documento completo.** Il sorgente contiene `\documentclass`, quindi porta già
il proprio preambolo: il template non ha nulla da aggiungere e viene disattivato,
il documento si compila com'è. Il pulsante *estrai il corpo* fa la conversione:
prende ciò che sta fra `\begin{document}` e `\end{document}` come nuovo sorgente
e sposta il resto del preambolo fra le aggiunte. L'operazione si annulla.

### Compilazione automatica

Attiva per impostazione predefinita: circa un secondo dopo l'ultima modifica il
documento si ricompila. Su documenti lenti conviene spegnerla dalla barra in
basso e premere *Compila* quando serve.

Quando la compilazione fallisce l'ultimo PDF valido resta a schermo, marcato
come non aggiornato. La posizione di lettura non si perde fra una compilazione
e l'altra.

---

## I template

| Template  | Per che cosa                | Impostazione                                |
| --------- | --------------------------- | ------------------------------------------- |
| Tecnico   | specifiche, documentazione  | Helvetica, colonna densa, codice in evidenza |
| Relazione | report, documenti formali   | Palatino, margini ampi, copertina centrata   |
| Manuale   | guide operative, procedure  | Avant Garde nei titoli, barre di sezione     |
| Appunti   | note di lavoro, verbali     | Courier, scala di grigi, testata a due colonne |

I template sono cartelle dentro `template/`: aggiungerne uno significa creare
una cartella, non modificare il programma. La struttura di ciascuna è descritta
in [`docs/template.md`](docs/template.md).

## Cartelle

```
server/      il server locale e la logica di compilazione
src/         l'interfaccia
electron/    la finestra dell'applicazione
template/    i template, una cartella ciascuno
motore/      l'eseguibile di Tectonic e la cache dei pacchetti
lavoro/      cartella di lavoro e immagini caricate
```

`motore/` e `lavoro/` si possono cancellare in qualunque momento: la prima si
ricrea con `installa-motore.bat`, la seconda alla compilazione successiva.

## Quando qualcosa non va

**«Motore assente» nella barra di stato.** Manca `motore\tectonic.exe`: esegui
`installa-motore.bat`. Nell'applicazione installata il motore è già incluso; se
manca lo stesso, metti l'eseguibile in `%APPDATA%\TEX2PDF\motore\`, che ha la
precedenza su quello distribuito.

**La finestra non si apre.** Se la finestra non compare ma resta il terminale,
il messaggio è lì. Il caso consueto è la porta 4180 occupata da un altro server
avviato a mano: `arresta.bat` la libera.

**La prima compilazione impiega minuti.** È il motore che scarica i pacchetti.
Succede una volta; `npm run scalda` lo fa succedere quando decidi tu.

**Un pacchetto non si scarica.** Compare fra gli errori del registro con
origine *motore*. Quasi sempre è la connessione, o un antivirus che blocca la
cartella `motore\cache`.

**Il documento non compila e l'errore indica il template.** Segnala il file e la
riga: sono i file dentro `template/<nome>/`, che puoi aprire e correggere. Il
programma non li protegge, sono tuoi.

---

## Documentazione

| Documento                                        | Per chi                                          |
| ------------------------------------------------ | ------------------------------------------------ |
| [`docs/template.md`](docs/template.md)           | Chi vuole aggiungere o modificare un template.    |
| [`docs/architettura.md`](docs/architettura.md)   | Chi mette mano al codice.                         |
| [`examples/`](examples/)                         | Sorgenti di prova da trascinare sulla finestra.   |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)             | Come proporre una modifica.                       |
| [`ROADMAP.md`](ROADMAP.md)                       | Che cosa arriva, che cosa non arriverà.           |
| [`SECURITY.md`](SECURITY.md)                     | Modello di rischio e segnalazioni riservate.      |
| [`CHANGELOG.md`](CHANGELOG.md)                   | Che cosa è cambiato, versione per versione.       |

## Licenza

MIT — vedi [LICENSE](LICENSE). Il motore di composizione e i pacchetti LaTeX
che scarica portano licenze proprie, elencate in [NOTICE](NOTICE).
