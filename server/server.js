/**
 * Server locale.
 *
 * Esiste per una ragione sola: una pagina web non può eseguire un programma
 * nativo, e il motore di composizione è un programma nativo. Tutto ciò che non
 * serve a compilare non appartiene a questo file — niente basi di dati, niente
 * autenticazione, niente sessioni.
 *
 * Ascolta su 127.0.0.1: non deve essere raggiungibile dalla rete locale.
 */
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { leggiCatalogo } from './catalogo.js'
import { compila, percorsoPdfCorrente, percorsoSorgenteComposto } from './compilatore.js'
import {
  CARTELLA_ASSETS,
  CARTELLA_DIST,
  CARTELLA_TEMPLATE,
  preparaCartelle,
  trovaMotore
} from './percorsi.js'
import { FORMATI, LINGUE } from './composizione.js'

const PORTA = Number(process.env.PORTA || 4180)
const LIMITE_CORPO = 12 * 1024 * 1024

const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2'
}

preparaCartelle()

const server = http.createServer(async (richiesta, risposta) => {
  const url = new URL(richiesta.url, 'http://127.0.0.1')
  try {
    if (url.pathname.startsWith('/api/')) return await instrada(richiesta, risposta, url)
    return await serviStatico(risposta, url.pathname)
  } catch (errore) {
    invia(risposta, 500, { errore: errore.message })
  }
})

async function instrada(richiesta, risposta, url) {
  const rotta = `${richiesta.method} ${url.pathname}`

  if (rotta === 'GET /api/stato') {
    const motore = trovaMotore()
    return invia(risposta, 200, {
      motore: motore ? { presente: true, origine: motore.origine } : { presente: false },
      formati: FORMATI,
      lingue: LINGUE
    })
  }

  if (rotta === 'GET /api/template') {
    return invia(risposta, 200, { template: leggiCatalogo() })
  }

  const anteprima = /^\/api\/template\/([a-z0-9._-]+)\/anteprima\.png$/i.exec(url.pathname)
  if (richiesta.method === 'GET' && anteprima) {
    const file = path.join(CARTELLA_TEMPLATE, anteprima[1], 'anteprima.png')
    if (!fs.existsSync(file)) return invia(risposta, 404, { errore: 'anteprima assente' })
    risposta.writeHead(200, { 'content-type': 'image/png' })
    return fs.createReadStream(file).pipe(risposta)
  }

  if (rotta === 'POST /api/compila') {
    const corpo = await leggiCorpo(richiesta)
    const esito = await compila({
      modalita: corpo.modalita === 'completo' ? 'completo' : 'corpo',
      sorgente: String(corpo.sorgente || ''),
      templateSlug: corpo.templateSlug,
      metadati: corpo.metadati || {},
      opzioni: corpo.opzioni || {},
      aggiunte: corpo.aggiunte || ''
    })
    return invia(risposta, 200, esito)
  }

  if (rotta === 'GET /api/pdf') {
    const file = percorsoPdfCorrente()
    if (!fs.existsSync(file)) return invia(risposta, 404, { errore: 'nessun PDF disponibile' })
    const dati = await fsp.readFile(file)
    risposta.writeHead(200, {
      'content-type': 'application/pdf',
      'content-length': dati.length,
      'cache-control': 'no-store'
    })
    return risposta.end(dati)
  }

  if (rotta === 'GET /api/sorgente-composto') {
    const file = percorsoSorgenteComposto()
    if (!fs.existsSync(file)) return invia(risposta, 404, { errore: 'nessun sorgente composto' })
    risposta.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    return risposta.end(await fsp.readFile(file))
  }

  if (rotta === 'POST /api/assets') {
    const corpo = await leggiCorpo(richiesta)
    const nome = path.basename(String(corpo.nome || '')).replace(/[^\w.\-]/g, '_')
    if (!nome) return invia(risposta, 400, { errore: 'nome file mancante' })
    await fsp.writeFile(path.join(CARTELLA_ASSETS, nome), Buffer.from(corpo.dati || '', 'base64'))
    return invia(risposta, 200, { nome, assets: await fsp.readdir(CARTELLA_ASSETS) })
  }

  if (rotta === 'DELETE /api/assets') {
    for (const nome of await fsp.readdir(CARTELLA_ASSETS)) {
      await fsp.rm(path.join(CARTELLA_ASSETS, nome), { force: true })
    }
    return invia(risposta, 200, { assets: [] })
  }

  if (rotta === 'GET /api/assets') {
    return invia(risposta, 200, { assets: await fsp.readdir(CARTELLA_ASSETS) })
  }

  return invia(risposta, 404, { errore: 'rotta inesistente' })
}

async function serviStatico(risposta, percorso) {
  if (!fs.existsSync(CARTELLA_DIST)) {
    risposta.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return risposta.end(
      '<meta charset="utf-8"><body style="font:14px system-ui;padding:40px">' +
        "<h1>Interfaccia non compilata</h1><p>Esegui <code>npm run build</code>, oppure avvia il server di sviluppo con <code>npm run dev</code> e apri <a href='http://localhost:5173'>localhost:5173</a>.</p>"
    )
  }
  const richiesto = percorso === '/' ? '/index.html' : percorso
  let file = path.join(CARTELLA_DIST, path.normalize(richiesto).replace(/^(\.\.[/\\])+/, ''))
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(CARTELLA_DIST, 'index.html')
  }
  const dati = await fsp.readFile(file)
  risposta.writeHead(200, { 'content-type': TIPI[path.extname(file)] || 'application/octet-stream' })
  risposta.end(dati)
}

function leggiCorpo(richiesta) {
  return new Promise((risolvi, rifiuta) => {
    let dati = ''
    richiesta.on('data', (pezzo) => {
      dati += pezzo
      if (dati.length > LIMITE_CORPO) {
        rifiuta(new Error('richiesta troppo grande'))
        richiesta.destroy()
      }
    })
    richiesta.on('end', () => {
      try {
        risolvi(dati ? JSON.parse(dati) : {})
      } catch {
        rifiuta(new Error('corpo della richiesta non è JSON valido'))
      }
    })
  })
}

function invia(risposta, codice, oggetto) {
  const dati = JSON.stringify(oggetto)
  risposta.writeHead(codice, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(dati),
    'cache-control': 'no-store'
  })
  risposta.end(dati)
}

server.listen(PORTA, '127.0.0.1', () => {
  const motore = trovaMotore()
  console.log(`TEX2PDF — server su http://localhost:${PORTA}`)
  console.log(
    motore
      ? `Motore: ${motore.percorso} (${motore.origine})`
      : 'Motore assente: esegui installa-motore.bat prima di compilare.'
  )
})
