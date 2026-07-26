# Politica di sicurezza

## Modello di rischio

TEX2PDF è un'applicazione **locale e monoutente**. Il server ascolta su
`127.0.0.1`, non è raggiungibile dalla rete, non ha autenticazione, non ha
database e non invia documenti da nessuna parte. Gli unici accessi in rete che
compie sono lo scaricamento del motore (`installa-motore.bat`) e lo scaricamento
dei pacchetti LaTeX che il motore effettua da sé.

Questo cambia il senso di alcune scelte che altrove sarebbero difetti.

**Il sorgente dell'utente viene eseguito.** LaTeX è un linguaggio di
programmazione, e compilare un documento significa eseguirlo: è ciò per cui
esiste il programma. Filtrare il corpo lo renderebbe inutile. Tre limiti sono
comunque in vigore:

- il motore è invocato con `--untrusted`, che in Tectonic disabilita
  `\write18` e la scrittura fuori dalla cartella di lavoro;
- ogni compilazione viene uccisa dopo **novanta secondi** con `SIGKILL`, così un
  ciclo infinito o una bomba di espansione non blocca la macchina;
- tutto ciò che il programma scrive resta in `lavoro/` e `motore/cache`.

Restano fuori dalla protezione i pacchetti LaTeX che il motore scarica: hanno la
fiducia che si dà a una distribuzione TeX qualsiasi.

**Aprire un `.tex` di ignota provenienza equivale ad aprire uno script di ignota
provenienza.** Il sandboxing di `--untrusted` riduce il danno possibile, non lo
azzera.

Se il progetto diventasse multiutente o raggiungibile in rete, questa
valutazione cadrebbe per intero.

## Limite noto

Il server locale non verifica l'intestazione `Origin` delle richieste. Una
pagina web aperta nel browser mentre TEX2PDF è in esecuzione può quindi inviare
richieste a `127.0.0.1:4180` — far compilare un documento o scrivere immagini in
`lavoro/assets`. Non può **leggere** le risposte, perché la politica di stessa
origine del browser glielo impedisce: non c'è quindi esfiltrazione dei
documenti, ma c'è la possibilità di far girare LaTeX arbitrario dentro il
sandbox del motore. Il controllo dell'origine è in `ROADMAP.md`.

## Versioni supportate

Riceve correzioni la sola versione più recente pubblicata.

| Versione | Supportata |
| -------- | ---------- |
| 1.x      | sì         |

## Segnalare una vulnerabilità

**Non aprire una issue pubblica.**

Usa la segnalazione riservata di GitHub — scheda *Security* → *Report a
vulnerability* — oppure scrivi a **antann@gmail.com**.

Includi, per quanto possibile:

- versione di TEX2PDF, versione di Node, sistema operativo;
- passaggi per riprodurre il problema;
- il sorgente LaTeX minimo che lo innesca;
- l'impatto che ritieni possibile.

Tempi indicativi: riscontro entro **5 giorni lavorativi**, valutazione entro
**15 giorni**. Se la segnalazione è confermata, la correzione viene pubblicata
e il merito riconosciuto nel changelog, salvo tua richiesta contraria.

## Fuori ambito

- Esecuzione di codice LaTeX contenuto in un documento aperto volontariamente
  dall'utente: è il comportamento documentato sopra.
- Vulnerabilità di Tectonic o dei pacchetti LaTeX: vanno segnalate ai
  rispettivi progetti. Se la nostra invocazione del motore le rende più gravi
  di quanto sarebbero altrove, allora sì, è un problema nostro: segnalalo.
- Vulnerabilità delle dipendenze npm già note e senza correzione a monte.
- Consumo di CPU o disco durante una compilazione: il timeout è la difesa
  prevista.
