'use strict'

/**
 * Rasterizza public/logo.svg nelle icone che servono fuori dal browser.
 *
 *   npm run icone
 *
 * Il disegno vive in un file solo: la favicon è l'SVG servito com'è, mentre la
 * finestra e l'installer vogliono un .ico, che è un formato di bitmap. Qui si
 * apre l'SVG in una finestra nascosta a ogni misura richiesta e si fotografa
 * il risultato. Il motore di disegno è quello di Electron, che è già una
 * dipendenza di sviluppo: aggiungerne uno apposta per convertire un file
 * significherebbe portarsi dietro una libreria grafica intera per sei
 * rettangoli.
 *
 * Si rasterizza a ogni misura invece di ridurre l'immagine grande: a 16 e 24
 * pixel una riduzione impasta le linee, il rendering diretto no.
 */

const { app, BrowserWindow } = require('electron')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const RADICE = path.join(__dirname, '..')
const SORGENTE = path.join(RADICE, 'public', 'logo.svg')
const CARTELLA = path.join(RADICE, 'risorse')

// le misure che Windows pesca dall'.ico, più quelle utili altrove
const MISURE_ICO = [16, 24, 32, 48, 64, 128, 256]
const MISURE_PNG = [256, 512]

/**
 * Scrive la pagina che mostra l'SVG a tutta finestra, senza margini né sfondo.
 *
 * Su file e non come `data:`: il disegno supera il limite oltre il quale
 * Chromium rifiuta l'indirizzo, e il rifiuto arriva come un ERR_FAILED che
 * non dice quale sia il problema.
 */
async function scriviPagina(svg, misura) {
  const file = path.join(os.tmpdir(), `tex2pdf-icona-${misura}.html`)
  await fs.writeFile(
    file,
    `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}
svg{display:block;width:${misura}px;height:${misura}px}</style>
${svg}`,
    'utf8'
  )
  return file
}

async function rasterizza(svg, misura) {
  const pagina = await scriviPagina(svg, misura)
  const finestra = new BrowserWindow({
    width: misura,
    height: misura,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false }
  })
  try {
    await finestra.loadFile(pagina)
    const immagine = await finestra.webContents.capturePage()
    return immagine.toPNG()
  } finally {
    finestra.destroy()
    await fs.rm(pagina, { force: true })
  }
}

/**
 * Impacchetta i PNG in un .ico.
 *
 * Il formato accetta le immagini come PNG dalla versione di Windows Vista in
 * poi: non serve convertirle in BMP. Nella tabella la misura 256 si scrive 0,
 * perché il campo è di un solo byte.
 */
function componiIco(voci) {
  const intestazione = Buffer.alloc(6)
  intestazione.writeUInt16LE(0, 0) // riservato
  intestazione.writeUInt16LE(1, 2) // 1 = icona
  intestazione.writeUInt16LE(voci.length, 4)

  const tabella = Buffer.alloc(16 * voci.length)
  let scostamento = intestazione.length + tabella.length

  voci.forEach((voce, indice) => {
    const base = indice * 16
    tabella.writeUInt8(voce.misura >= 256 ? 0 : voce.misura, base + 0)
    tabella.writeUInt8(voce.misura >= 256 ? 0 : voce.misura, base + 1)
    tabella.writeUInt8(0, base + 2) // colori della tavolozza: nessuna
    tabella.writeUInt8(0, base + 3) // riservato
    tabella.writeUInt16LE(1, base + 4) // piani
    tabella.writeUInt16LE(32, base + 6) // bit per pixel
    tabella.writeUInt32LE(voce.dati.length, base + 8)
    tabella.writeUInt32LE(scostamento, base + 12)
    scostamento += voce.dati.length
  })

  return Buffer.concat([intestazione, tabella, ...voci.map((voce) => voce.dati)])
}

app.disableHardwareAcceleration()

// Le finestre si aprono e si chiudono una alla volta: senza questo, alla prima
// che si chiude Electron considera finito il programma e esce con successo,
// lasciando la cartella vuota e nessun errore da leggere.
app.on('window-all-closed', () => {})

app.whenReady().then(async () => {
  try {
    const svg = await fs.readFile(SORGENTE, 'utf8')
    await fs.mkdir(CARTELLA, { recursive: true })

    const voci = []
    for (const misura of MISURE_ICO) {
      voci.push({ misura, dati: await rasterizza(svg, misura) })
    }
    await fs.writeFile(path.join(CARTELLA, 'icona.ico'), componiIco(voci))

    for (const misura of MISURE_PNG) {
      await fs.writeFile(path.join(CARTELLA, `logo-${misura}.png`), await rasterizza(svg, misura))
    }

    console.log(`  Icone generate in risorse/ — ico(${MISURE_ICO.join(', ')}) e png(${MISURE_PNG.join(', ')}).`)
    app.exit(0)
  } catch (errore) {
    console.error(`  Generazione fallita: ${errore.message}`)
    app.exit(1)
  }
})
