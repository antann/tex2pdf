# Prospetto di sviluppo

Quello che segue è un ordine di priorità, non un calendario. Le voci si
spostano quando una issue mostra che una serve più delle altre.

## Prossimo

- **Bibliografia con biber.** Oggi una `\bibliography` non viene risolta: manca
  la passata di biber fra le due di TeX. È la mancanza che si sente di più nei
  documenti lunghi.
- **Controllo dell'origine sulle richieste locali.** Il server accetta oggi
  qualunque richiesta arrivi a `127.0.0.1`, compresa quella di una pagina web
  aperta nel browser. Rifiutare le richieste con `Origin` estranea chiude il
  problema descritto in `SECURITY.md`.

## In valutazione

- **Documenti su più file**, con `\include` e `\input` risolti rispetto alla
  cartella del sorgente aperto.
- **SyncTeX bidirezionale**: dal punto nel PDF alla riga nell'editor e
  viceversa. Il motore lo produce già, manca la lettura del file `.synctex`.
- **Sorveglianza di una cartella**, per ricompilare quando il `.tex` cambia sul
  disco invece che nell'editor.
- **Conversione a lotti** di più sorgenti con lo stesso template.
- **Storico delle compilazioni**, per tornare all'ultimo PDF che funzionava.

## Fuori ambito

Non sono rinvii: sono direzioni che il progetto non prende.

- **Una seconda resa del documento.** L'anteprima è il PDF prodotto dal motore.
  Qualunque approssimazione più veloce diverge dall'originale, e diverge proprio
  nei casi difficili, che sono quelli per cui serve un'anteprima.
- **Impaginazione calcolata dal programma.** Salti pagina, altezze e posizioni
  li decide TeX. Non esiste, e non deve esistere, codice nostro che li calcoli.
- Editing visuale del documento; modifica dei template dall'interfaccia.
- Multiutenza, esecuzione remota, sincronizzazione in rete, persistenza oltre i
  file su disco.

Una proposta che ricade qui può comunque essere discussa in una issue, ma parte
in salita: serve una ragione che valga il cambio d'impostazione.
