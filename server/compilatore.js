/**
 * Esecuzione del motore.
 *
 * Regole che il resto del programma dà per acquisite:
 *
 * 1. Una compilazione alla volta. Se ne arriva un'altra mentre la prima è in
 *    corso, la prima viene interrotta: il suo risultato riguarda un testo che
 *    non esiste più. Se invece la richiesta è identica a quella in corso, si
 *    attende lo stesso risultato invece di ricompilare.
 * 2. Una cartella di lavoro sola, riusata. I file ausiliari che TeX produce
 *    (indice, riferimenti incrociati) servono alla passata successiva: buttarli
 *    ogni volta significherebbe rendere l'indice sbagliato a ogni ricompilazione.
 *    Si azzerano solo quando cambia il template, perché a quel punto non
 *    descrivono più lo stesso documento.
 * 3. Un processo che non termina viene ucciso dal timeout. Un documento con una
 *    ricorsione infinita è un caso normale, non un incidente.
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { CARTELLA_LAVORO, CARTELLA_ASSETS, CARTELLA_CACHE, trovaMotore } from './percorsi.js'
import { leggiTemplate } from './catalogo.js'
import { leggiRegistro } from './registro.js'
import {
  componiDocumento,
  componiMetadati,
  componiOpzioni,
  componiAggiunte
} from './composizione.js'

const CARTELLA_CORRENTE = path.join(CARTELLA_LAVORO, 'corrente')
const TIMEOUT = 90_000

let inCorso = null // { firma, promessa, processo, annullata }
let ultimoTemplate = null
let contatore = 0

const firmaDi = (richiesta) =>
  createHash('sha1').update(JSON.stringify(richiesta)).digest('hex').slice(0, 12)

export async function compila(richiesta) {
  const firma = firmaDi(richiesta)

  if (inCorso) {
    if (inCorso.firma === firma) return inCorso.promessa
    interrompi(inCorso)
    await inCorso.promessa.catch(() => {})
  }

  const stato = { firma, processo: null, annullata: false }
  stato.promessa = esegui(richiesta, stato).finally(() => {
    if (inCorso === stato) inCorso = null
  })
  inCorso = stato
  return stato.promessa
}

function interrompi(stato) {
  stato.annullata = true
  if (stato.processo && !stato.processo.killed) stato.processo.kill('SIGKILL')
}

async function esegui(richiesta, stato) {
  const motore = trovaMotore()
  if (!motore) {
    return {
      ok: false,
      motoreAssente: true,
      diagnostica: [
        {
          livello: 'errore',
          origine: 'motore',
          messaggio:
            'Motore di compilazione non trovato. Esegui installa-motore.bat, oppure metti l\u2019eseguibile di Tectonic nella cartella motore/.',
          file: null,
          riga: null,
          contesto: ''
        }
      ],
      pagine: null,
      registro: ''
    }
  }

  const cartella = await preparaCartella(richiesta)
  if (stato.annullata) return annullata()

  const avvio = Date.now()
  const esito = await lancia(motore.percorso, cartella, stato)
  if (stato.annullata) return annullata()

  const percorsoRegistro = path.join(cartella, 'documento.log')
  const registro = fs.existsSync(percorsoRegistro)
    ? await fsp.readFile(percorsoRegistro, 'utf8')
    : ''
  const { voci, pagine } = leggiRegistro(registro, esito.uscita)

  const percorsoPdf = path.join(cartella, 'documento.pdf')
  const pdfPresente = fs.existsSync(percorsoPdf) && esito.codice === 0

  if (esito.scaduto) {
    voci.unshift({
      livello: 'errore',
      origine: 'motore',
      messaggio: `Compilazione interrotta dopo ${TIMEOUT / 1000} secondi.`,
      file: null,
      riga: null,
      contesto: ''
    })
  }

  return {
    ok: pdfPresente,
    id: pdfPresente ? String(++contatore) : null,
    diagnostica: voci,
    pagine,
    registro,
    durata: Date.now() - avvio
  }
}

const annullata = () => ({ ok: false, annullata: true, diagnostica: [], pagine: null, registro: '' })

async function preparaCartella(richiesta) {
  const { modalita, sorgente, templateSlug, metadati, opzioni, aggiunte } = richiesta

  const cambioTemplate = `${modalita}:${templateSlug}:${opzioni?.fronteRetro}`
  if (ultimoTemplate !== cambioTemplate) {
    await fsp.rm(CARTELLA_CORRENTE, { recursive: true, force: true })
    ultimoTemplate = cambioTemplate
  }
  await fsp.mkdir(CARTELLA_CORRENTE, { recursive: true })

  if (modalita === 'completo') {
    // Il documento porta il proprio preambolo: il template non ha niente da
    // dire, e sovrapporgliene un secondo produrrebbe solo errori confusi.
    await fsp.writeFile(path.join(CARTELLA_CORRENTE, 'documento.tex'), sorgente, 'utf8')
  } else {
    const template = leggiTemplate(templateSlug)
    if (!template) throw new Error(`template sconosciuto: ${templateSlug}`)

    for (const file of ['preambolo.tex', 'apertura.tex', 'chiusura.tex']) {
      await fsp.copyFile(path.join(template.cartella, file), path.join(CARTELLA_CORRENTE, file))
    }
    for (const extra of await fsp.readdir(template.cartella)) {
      if (/\.(sty|cls|clo)$/i.test(extra)) {
        await fsp.copyFile(path.join(template.cartella, extra), path.join(CARTELLA_CORRENTE, extra))
      }
    }

    await scrivi('documento.tex', componiDocumento(template, opzioni))
    await scrivi('metadati.tex', componiMetadati(metadati))
    await scrivi('opzioni.tex', componiOpzioni(opzioni))
    await scrivi('aggiunte.tex', componiAggiunte(aggiunte))
    await scrivi('corpo.tex', sorgente)
  }

  await copiaAssets()
  return CARTELLA_CORRENTE
}

const scrivi = (nome, contenuto) =>
  fsp.writeFile(path.join(CARTELLA_CORRENTE, nome), contenuto, 'utf8')

async function copiaAssets() {
  if (!fs.existsSync(CARTELLA_ASSETS)) return
  for (const nome of await fsp.readdir(CARTELLA_ASSETS)) {
    await fsp.copyFile(path.join(CARTELLA_ASSETS, nome), path.join(CARTELLA_CORRENTE, nome))
  }
}

function lancia(eseguibile, cartella, stato) {
  return new Promise((risolvi) => {
    // Gli argomenti sono soltanto quelli che il sottocomando `compile`
    // dichiara nel proprio aiuto. `--color` è un'opzione globale, valida prima
    // di `-X` e non dopo: passata qui, Tectonic 0.15 rifiuta l'intera riga di
    // comando e non compila nulla. Non serve comunque — senza un terminale il
    // motore non colora la propria uscita — e ogni argomento in più è un
    // appiglio per un'incompatibilità con la versione successiva.
    const processo = spawn(
      eseguibile,
      ['-X', 'compile', 'documento.tex', '--keep-logs', '--keep-intermediates', '--untrusted'],
      {
        cwd: cartella,
        env: { ...process.env, TECTONIC_CACHE_DIR: CARTELLA_CACHE },
        windowsHide: true
      }
    )
    stato.processo = processo

    let uscita = ''
    const raccogli = (pezzo) => {
      uscita += pezzo
      if (uscita.length > 200_000) uscita = uscita.slice(-200_000)
    }
    processo.stdout.on('data', raccogli)
    processo.stderr.on('data', raccogli)

    const orologio = setTimeout(() => {
      stato.scaduto = true
      processo.kill('SIGKILL')
    }, TIMEOUT)

    processo.on('error', (errore) => {
      clearTimeout(orologio)
      risolvi({ codice: -1, uscita: `error: ${errore.message}`, scaduto: false })
    })
    processo.on('close', (codice) => {
      clearTimeout(orologio)
      risolvi({ codice, uscita, scaduto: Boolean(stato.scaduto) })
    })
  })
}

export function percorsoPdfCorrente() {
  return path.join(CARTELLA_CORRENTE, 'documento.pdf')
}

export function percorsoSorgenteComposto() {
  return path.join(CARTELLA_CORRENTE, 'documento.tex')
}

export function cartellaCorrente() {
  return CARTELLA_CORRENTE
}
