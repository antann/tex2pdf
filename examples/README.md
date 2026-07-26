# Documenti di esempio

Sorgenti LaTeX da trascinare sulla finestra di TEX2PDF per vedere come si
comporta la composizione.

| File | Che cosa mostra |
| ---- | --------------- |
| [`documento-esempio.tex`](documento-esempio.tex) | Titoli su due livelli, elenco numerato e puntato annidato, tabella con `booktabs`, blocco di codice con `listings`, formule in linea e isolate, nota a piè di pagina. È lo stesso documento che il programma carica all'avvio. Non contiene `\documentclass`: è un **corpo**, la veste la mette il template. |
| [`documento-completo.tex`](documento-completo.tex) | Un documento che porta già il proprio preambolo. Serve a provare il riconoscimento della modalità *documento completo* e il pulsante *estrai il corpo*. |

Per usarne uno: apri TEX2PDF, trascina il file sulla finestra, poi cambia
template dal pannello di sinistra e guarda come cambia la composizione senza che
il testo venga toccato.

Il documento caricato all'avvio vive in `src/lib/esempio.js`: se modifichi
`documento-esempio.tex`, riporta la stessa modifica anche lì.
