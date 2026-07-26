/**
 * Verifiche automatiche delle parti che non si possono controllare a occhio.
 *
 * Non prova la composizione tipografica — per quella serve il motore, e il
 * giudizio è visivo. Prova le tre cose che sbagliano in silenzio: la lettura
 * del registro, la generazione dei file e il riconoscimento del sorgente.
 *
 *   npm run verifica
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { leggiRegistro } from './registro.js'
import { componiDocumento, componiMetadati, componiOpzioni, proteggi } from './composizione.js'
import { rilevaModalita, estraiCorpo } from '../src/lib/rilevamento.js'

let passate = 0
const prova = (nome, corpo) => {
  try {
    corpo()
    passate++
    console.log(`  ok   ${nome}`)
  } catch (errore) {
    console.error(`  NO   ${nome}\n       ${errore.message}`)
    process.exitCode = 1
  }
}

console.log('\nLettura del registro')

const REGISTRO = String.raw`This is XeTeX, Version 3.141592653
**documento.tex
(./documento.tex
LaTeX2e <2023-11-01>
(./metadati.tex) (./preambolo.tex
(/usr/share/texmf/tex/latex/geometry/geometry.sty))
(./opzioni.tex) (./aggiunte.tex)
(./documento.aux)
(./apertura.tex)
(./corpo.tex
! Undefined control sequence.
l.14 \sezione
              {Presentazione}
LaTeX Warning: Reference \`fig:uno' on page 1 undefined on input line 22.
Overfull \hbox (12.5pt too wide) in paragraph at lines 30--31
)
(./chiusura.tex)
Output written on documento.pdf (7 pages, 84213 bytes).
`

prova('l’errore è attribuito a corpo.tex con la riga giusta', () => {
  const { voci } = leggiRegistro(REGISTRO, '')
  const errore = voci.find((v) => v.livello === 'errore')
  assert.equal(errore.file, 'corpo.tex')
  assert.equal(errore.origine, 'corpo')
  assert.equal(errore.riga, 14)
  assert.match(errore.messaggio, /Undefined control sequence/)
})

prova('il contesto della riga viene conservato', () => {
  const { voci } = leggiRegistro(REGISTRO, '')
  assert.match(voci[0].contesto, /sezione/)
})

prova('avvisi e note tipografiche sono distinti dagli errori', () => {
  const { voci } = leggiRegistro(REGISTRO, '')
  assert.equal(voci.filter((v) => v.livello === 'avviso').length, 1)
  assert.equal(voci.filter((v) => v.livello === 'tipografia').length, 1)
})

prova('il numero di pagine viene letto', () => {
  assert.equal(leggiRegistro(REGISTRO, '').pagine, 7)
})

prova('un guasto del motore compare anche senza registro', () => {
  const { voci } = leggiRegistro('', 'error: bundle non raggiungibile\nnote: qualcosa')
  assert.equal(voci.length, 1)
  assert.equal(voci[0].origine, 'motore')
})

prova('le parentesi del testo non spostano l’attribuzione', () => {
  const registro = `(./documento.tex (una parentesi qualsiasi) (./corpo.tex
! Missing $ inserted.
l.3 x_2
)
)`
  const { voci } = leggiRegistro(registro, '')
  assert.equal(voci[0].file, 'corpo.tex')
})

prova('lo stesso avviso ripetuto compare una volta sola', () => {
  const doppio = REGISTRO + REGISTRO
  const { voci } = leggiRegistro(doppio, '')
  assert.equal(voci.filter((v) => v.livello === 'errore').length, 1)
})

prova('le sequenze di colore non sporcano i messaggi', () => {
  const { voci } = leggiRegistro('', '\u001b[31merror:\u001b[0m cache non scrivibile')
  assert.equal(voci[0].messaggio, 'cache non scrivibile')
})

prova('un argomento rifiutato diventa un messaggio comprensibile', () => {
  const { voci } = leggiRegistro(
    '',
    "error: Found argument '--color' which wasn't expected, or isn't valid in this context"
  )
  assert.match(voci[0].messaggio, /installa-motore/)
})

prova('gli argomenti passati al motore sono solo quelli che accetta', () => {
  // `compile` dichiara nel proprio aiuto: --keep-intermediates, --keep-logs,
  // --untrusted. `--color` è globale e va prima di `-X`: passata al
  // sottocomando fa rifiutare l'intera riga di comando, e non compila nulla.
  const sorgente = readFileSync(new URL('./compilatore.js', import.meta.url), 'utf8')
  const riga = /spawn\(\s*eseguibile,\s*(\[[^\]]*\])/s.exec(sorgente)
  assert.ok(riga, 'la chiamata a spawn non è più riconoscibile')
  const argomenti = riga[1]
  for (const atteso of ['-X', 'compile', '--keep-logs', '--keep-intermediates', '--untrusted']) {
    assert.ok(argomenti.includes(atteso), `manca ${atteso}`)
  }
  assert.doesNotMatch(argomenti, /--color/, '--color non è valido dopo il sottocomando')
})

console.log('\nComposizione')

prova('i metadati vengono protetti prima di finire in una macro', () => {
  assert.equal(proteggi('Costi & ricavi 100% #1'), 'Costi \\& ricavi 100\\% \\#1')
})

prova('un campo vuoto produce comunque un comando definito', () => {
  const testo = componiMetadati({ titolo: 'Prova' })
  assert.match(testo, /\\newcommand\{\\titolo\}\{Prova\}/)
  assert.match(testo, /\\newcommand\{\\ente\}\{\}/)
})

prova('l’orientamento scambia le misure del foglio', () => {
  const verticale = componiOpzioni({ carta: 'a4', orientamento: 'verticale' })
  const orizzontale = componiOpzioni({ carta: 'a4', orientamento: 'orizzontale' })
  assert.match(verticale, /paperwidth=210mm,paperheight=297mm/)
  assert.match(orizzontale, /paperwidth=297mm,paperheight=210mm/)
})

prova('indice e copertina diventano condizioni TeX', () => {
  assert.match(componiOpzioni({ indice: false, copertina: true }), /\\indicefalse/)
  assert.match(componiOpzioni({ indice: false, copertina: true }), /\\copertinatrue/)
})

prova('il fronte-retro entra fra le opzioni di classe', () => {
  const template = { classe: 'article', opzioniClasse: ['11pt'] }
  assert.match(componiDocumento(template, { fronteRetro: true }), /\\documentclass\[11pt,twoside\]/)
  assert.doesNotMatch(componiDocumento(template, {}), /twoside/)
})

prova('la struttura del documento è quella attesa, nell’ordine atteso', () => {
  const testo = componiDocumento({ classe: 'article', opzioniClasse: [] }, {})
  const ordine = ['metadati.tex', 'preambolo.tex', 'opzioni.tex', 'aggiunte.tex', 'apertura.tex', 'corpo.tex', 'chiusura.tex']
  let posizione = -1
  for (const file of ordine) {
    const trovato = testo.indexOf(file)
    assert.ok(trovato > posizione, `${file} fuori ordine`)
    posizione = trovato
  }
})

console.log('\nRiconoscimento del sorgente')

prova('un corpo senza classe è un corpo', () => {
  assert.equal(rilevaModalita('\\section{Uno}\nTesto.'), 'corpo')
})

prova('un documento con classe è un documento completo', () => {
  assert.equal(rilevaModalita('\\documentclass{article}\n\\begin{document}x\\end{document}'), 'completo')
})

prova('una classe commentata non conta', () => {
  assert.equal(rilevaModalita('% \\documentclass{article}\n\\section{Uno}'), 'corpo')
})

prova('l’estrazione separa corpo e preambolo dell’utente', () => {
  const sorgente = [
    '\\documentclass[12pt]{report}',
    '\\usepackage{tikz}',
    '\\begin{document}',
    '\\section{Uno}',
    'Testo.',
    '\\end{document}'
  ].join('\n')
  const parti = estraiCorpo(sorgente)
  assert.equal(parti.corpo.trim(), '\\section{Uno}\nTesto.')
  assert.equal(parti.aggiunte, '\\usepackage{tikz}')
})

prova('senza \\begin{document} non c’è niente da estrarre', () => {
  assert.equal(estraiCorpo('\\documentclass{article}\n\\usepackage{tikz}'), null)
})

console.log(`\n${passate} verifiche superate${process.exitCode ? ', con errori' : ''}.\n`)
