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
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

console.log('\nGuscio dell’applicazione')

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PERCORSI = new URL('./percorsi.js', import.meta.url).href

/**
 * Rilegge `percorsi.js` in un processo a parte con l'ambiente indicato: le
 * costanti si calcolano una volta sola all'import, e qui sono già state
 * calcolate con l'ambiente di chi lancia le verifiche.
 */
function radiciCon(ambiente) {
  const codice = `import(${JSON.stringify(PERCORSI)}).then((m) => console.log(JSON.stringify({
    template: m.CARTELLA_TEMPLATE, dist: m.CARTELLA_DIST, motoreIncluso: m.CARTELLA_MOTORE_INCLUSO,
    lavoro: m.CARTELLA_LAVORO, assets: m.CARTELLA_ASSETS, motore: m.CARTELLA_MOTORE, cache: m.CARTELLA_CACHE
  })))`
  const uscita = execFileSync(process.execPath, ['--input-type=module', '-e', codice], {
    env: { ...process.env, TEX2PDF_RISORSE: '', TEX2PDF_DATI: '', ...ambiente },
    encoding: 'utf8'
  })
  return JSON.parse(uscita)
}

prova('senza variabili d’ambiente le due radici coincidono con il progetto', () => {
  const p = radiciCon({})
  for (const cartella of Object.values(p)) {
    assert.equal(path.resolve(cartella, '..').startsWith(RADICE) || cartella.startsWith(RADICE), true,
      `${cartella} è fuori dal progetto`)
  }
  assert.equal(p.template, path.join(RADICE, 'template'))
  assert.equal(p.lavoro, path.join(RADICE, 'lavoro'))
})

prova('installata, ciò che si scrive sta fuori dalla cartella dell’applicazione', () => {
  const risorse = path.join(RADICE, 'finta-installazione')
  const dati = path.join(RADICE, 'finti-dati')
  const p = radiciCon({ TEX2PDF_RISORSE: risorse, TEX2PDF_DATI: dati })

  // sola lettura: codice, interfaccia, template, motore distribuito
  for (const cartella of [p.template, p.dist, p.motoreIncluso]) {
    assert.ok(cartella.startsWith(risorse), `${cartella} dovrebbe stare fra le risorse`)
  }
  // scrivibili: nessuna di queste deve finire dentro l'installazione
  for (const cartella of [p.lavoro, p.assets, p.motore, p.cache]) {
    assert.ok(cartella.startsWith(dati), `${cartella} dovrebbe stare fra i dati`)
  }
})

prova('il pacchetto dichiara tutto ciò che serve a far partire la finestra', () => {
  const pacchetto = JSON.parse(readFileSync(path.join(RADICE, 'package.json'), 'utf8'))
  assert.ok(existsSync(path.join(RADICE, pacchetto.main)), `manca ${pacchetto.main}`)
  assert.ok(existsSync(path.join(RADICE, 'electron', 'preload.cjs')), 'manca il preload')

  // Il server gira dentro il processo principale: se `server/` o `template/`
  // restassero fuori dal pacchetto, l'applicazione installata si aprirebbe su
  // una finestra che non compila nulla.
  for (const atteso of ['dist/**/*', 'electron/**/*', 'server/**/*', 'template/**/*', 'risorse/**/*', 'motore/tectonic.exe']) {
    assert.ok(pacchetto.build.files.includes(atteso), `il pacchetto non include ${atteso}`)
  }
  assert.equal(pacchetto.build.asar, false, 'con l’asar il motore non è eseguibile e gli ESM non si caricano')
})

prova('il disegno del logo è uno solo, e da lì passano finestra, installer e favicon', () => {
  // Un secondo disegno diverge dal primo, e diverge senza che se ne accorga
  // nessuno: l'icona della finestra e quella della scheda del browser non si
  // guardano mai insieme.
  const pacchetto = JSON.parse(readFileSync(path.join(RADICE, 'package.json'), 'utf8'))
  assert.equal(pacchetto.build.win.icon, 'risorse/icona.ico')
  for (const voce of ['installerIcon', 'uninstallerIcon', 'installerHeaderIcon']) {
    assert.equal(pacchetto.build.nsis[voce], 'risorse/icona.ico', `nsis.${voce} punta altrove`)
  }
  assert.match(
    readFileSync(path.join(RADICE, 'electron', 'main.cjs'), 'utf8'),
    /'risorse',\s*'icona\.ico'/,
    'la finestra non chiede l’icona generata'
  )
  assert.match(
    readFileSync(path.join(RADICE, 'index.html'), 'utf8'),
    /rel="icon"[^>]*href="\/logo\.svg"/,
    'la pagina non dichiara la favicon'
  )
  assert.ok(existsSync(path.join(RADICE, 'public', 'logo.svg')), 'manca il disegno di partenza')
})

prova('la selezione della pubblicazione porta con sé ciò che il codice pretende', () => {
  // `publish.json` è un elenco a inclusione, e non è pubblicato: un file nuovo
  // resta indietro in silenzio, e il guasto si vede solo sulla repository
  // pubblica, dove il codice che lo cerca è arrivato e lui no. Qui non c'è:
  // nella copia pubblica questa verifica non ha nulla da controllare.
  const percorso = path.join(RADICE, 'publish.json')
  if (!existsSync(percorso)) return

  const config = JSON.parse(readFileSync(percorso, 'utf8'))
  // `escludi` è la seconda rete e vince su `includi`: un file nominato di là
  // non viene pubblicato per quanto lo si includa di qua.
  const glob = (modello) =>
    new RegExp(`^${modello.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/(?<!\.)\*/g, '[^/]*')}$`)
  const coperto = (file) =>
    config.includi.some((m) => glob(m).test(file)) && !config.escludi.some((m) => glob(m).test(file))

  for (const file of ['public/logo.svg', 'risorse/icona.ico', 'scripts/genera-icone.cjs']) {
    assert.ok(coperto(file), `${file} non finirebbe nella repository pubblica`)
  }
})

prova('l’icona generata è un .ico vero e contiene le misure piccole', () => {
  // Un file corrotto o troncato non fa fallire electron-builder: costruisce
  // l'installer e mette l'icona di Electron, e la differenza si vede solo a
  // installazione fatta.
  const percorso = path.join(RADICE, 'risorse', 'icona.ico')
  assert.ok(existsSync(percorso), 'manca risorse/icona.ico: lancia npm run icone')
  const dati = readFileSync(percorso)
  assert.equal(dati.readUInt16LE(0), 0, 'intestazione .ico non riconoscibile')
  assert.equal(dati.readUInt16LE(2), 1, 'il file non si dichiara come icona')

  const quante = dati.readUInt16LE(4)
  const misure = new Set()
  for (let i = 0; i < quante; i++) misure.add(dati.readUInt8(6 + i * 16) || 256)
  // 16 e 32 sono quelle che Windows usa nella barra e nelle liste: se
  // mancassero le ricaverebbe riducendo la grande, e verrebbero impastate
  for (const misura of [16, 32, 256]) {
    assert.ok(misure.has(misura), `l’icona non contiene la misura ${misura}`)
  }
})

prova('l’interfaccia non conosce percorsi assoluti verso il server', () => {
  // La finestra carica una porta scelta dal sistema: un indirizzo scritto a
  // mano funzionerebbe in sviluppo e fallirebbe una volta installata.
  const api = readFileSync(path.join(RADICE, 'src', 'lib', 'api.js'), 'utf8')
  assert.doesNotMatch(api, /https?:\/\//, 'le chiamate al server devono restare relative')
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
