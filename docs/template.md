# Scrivere un template

Un template è una cartella dentro `template/`. Aggiungerne uno non richiede di
toccare il programma: la galleria scandisce la cartella all'avvio e mostra ciò
che trova.

## La cartella

```
template/<slug>/
  template.json     obbligatorio
  preambolo.tex     obbligatorio
  apertura.tex      obbligatorio
  chiusura.tex      obbligatorio
  *.sty             facoltativo — macro proprie del template
  anteprima.png     facoltativo — miniatura per la galleria
```

Lo *slug* è il nome della cartella: minuscole, senza spazi. Compare negli
indirizzi, non nell'interfaccia.

Una cartella con i quattro file obbligatori compare nella galleria da sé. Se ne
manca uno, compare comunque, marcata come non valida e con l'elenco di ciò che
manca: un template rotto deve essere visibile, non invisibile.

## `template.json`

```json
{
  "nome": "Tecnico",
  "descrizione": "Documentazione di prodotto e specifiche. Colonna densa, codice in evidenza.",
  "specifiche": "Helvetica · 10 pt · margini 22/20 mm",
  "accento": "#0090a8",
  "classe": "article",
  "opzioniClasse": ["10pt"],
  "supporta": {
    "indice": true,
    "copertina": true,
    "fronteRetro": true,
    "piede": true
  }
}
```

| Campo           | A che serve                                                        |
| --------------- | ------------------------------------------------------------------ |
| `nome`          | Il titolo nella galleria.                                           |
| `descrizione`   | Una riga o due: per che genere di documento è pensato.              |
| `specifiche`    | Font, corpo, margini. Si legge sotto la miniatura.                  |
| `accento`       | Il colore che la galleria usa per la scheda.                        |
| `classe`        | La classe LaTeX (`article`, `report`, …).                           |
| `opzioniClasse` | Opzioni della classe. `twoside` lo aggiunge il programma se serve.  |
| `supporta`      | Quali interruttori del modulo il template rispetta davvero.         |

## Come viene composto il documento

Il programma genera un `documento.tex` di struttura fissa, identica per tutti i
template:

```latex
\documentclass[opzioni]{classe}   % classe e opzioniClasse del template, più twoside
\input{metadati.tex}              % generato dal modulo
\input{preambolo.tex}             % tuo
\input{opzioni.tex}               % generato dal modulo — ha l'ultima parola
\input{aggiunte.tex}              % preambolo extra dell'utente
\begin{document}
\input{apertura.tex}              % tuo
\input{corpo.tex}                 % il testo dell'utente, intatto
\input{chiusura.tex}              % tuo
\end{document}
```

Cambia il contenuto dei file, mai il loro ordine. Se un template ha bisogno di
una struttura sua, è la struttura a essere sbagliata, non il template: le
differenze vivono nel preambolo e nelle macro.

`opzioni.tex` viene **dopo** `preambolo.tex` perché le scelte fatte nel modulo
devono poter scavalcare il template. Il template decide i margini, l'utente
decide il foglio.

## Comandi a disposizione

Definiti da `metadati.tex`, sempre definiti anche quando la casella è vuota:

`\titolo` `\sottotitolo` `\autore` `\dataDocumento` `\versione`
`\riferimento` `\ente`

Definiti da `opzioni.tex`:

`\ifindice` `\ifcopertina` `\piede`

Uso tipico in `apertura.tex`:

```latex
\ifcopertina
  \begin{titlepage}
    \centering
    {\Huge\bfseries\titolo\par}
    \vspace{4mm}
    {\Large\sottotitolo\par}
    \vfill
    {\large\autore\par}
    {\dataDocumento\par}
  \end{titlepage}
\fi

\ifindice
  \tableofcontents
  \clearpage
\fi
```

## Regole

**Non caricare `babel`, non chiamare `\setcounter{tocdepth}`, non impostare
`paperwidth`.** Se ne occupa `opzioni.tex`. Caricarli due volte è un errore di
compilazione, e l'errore che ne esce non dice che il problema è un doppio
caricamento.

**Font PSNFSS, non `fontspec`.** `helvet`, `mathpazo`, `avant`, `courier`,
`charter` fanno parte della dotazione minima di ogni installazione LaTeX. La
resa non deve dipendere dai font installati sulla macchina di chi compila. La
famiglia TeX Gyre è più bella ma manca nelle distribuzioni parziali: è stata
provata e scartata per questo.

**`listings`, non `minted`.** `minted` richiede `--shell-escape` e Python
installato: due dipendenze esterne per un blocco di codice colorato. E
`--shell-escape` è esattamente ciò che l'invocazione `--untrusted` del motore
impedisce.

**Attenzione all'argomento opzionale di `\titleformat`.** Un `\titlerule[1.2pt]`
scritto nudo dentro le parentesi quadre rompe il parsing, e l'errore che ne esce
parla di un `\begin{document}` mancante, cioè indica tutt'altro. Va racchiuso
fra graffe:

```latex
\titleformat{\section}[hang]{\Large\bfseries}{\thesection}{1em}{}[{\titlerule[1.2pt]}]
```

**Nel blocco *before* di `\titleformat` non si scrive `#1`.** titlesec passa il
titolo come argomento all'ultimo comando del blocco: si dichiara il comando con
un parametro e lo si chiama nudo.

```latex
% sbagliato
\titleformat{\section}[block]{\normalfont}{}{0pt}{\barratitolo{#1}}

% giusto
\newcommand{\barratitolo}[1]{\colorbox{accento}{\parbox{\linewidth}{#1}}}
\titleformat{\section}[block]{\normalfont}{}{0pt}{\barratitolo}
```

## Provarlo

```bash
npm run scalda
```

Compila una volta ciascun template col documento di prova, che di proposito
contiene gli elementi che si comportano male quando cambia l'impaginazione:
indice, elenchi annidati, tabelle, blocchi di codice, formule, note a piè di
pagina. È il passaggio che trova i guasti veri — i difetti dei template non si
vedono leggendo il codice.

Il documento di prova è in `examples/documento-esempio.tex` e, in forma di
stringa, in `src/lib/esempio.js`.

## La miniatura

`anteprima.png`, circa 320×420 pixel. Il modo più semplice per ottenerla: apri
il documento di prova col template, salva il PDF, esporta la prima pagina in
PNG e ridimensionala. Senza il file, la galleria mostra un riquadro col colore
d'accento: il template funziona lo stesso.
