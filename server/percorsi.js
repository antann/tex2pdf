/**
 * Percorsi del progetto e individuazione del motore di compilazione.
 *
 * Le radici sono due perché l'applicazione ha due modi di vivere. Dal
 * repository coincidono, e tutto ciò che il programma scrive resta dentro la
 * cartella di progetto: la cache dei pacchetti compresa, così un'installazione
 * si cancella eliminando una sola cartella. Installata, il codice sta in una
 * cartella di sola lettura e i dati vanno altrove: chi la impacchetta lo dice
 * con due variabili d'ambiente, e questo file è l'unico che deve saperlo.
 */
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const RADICE_CODICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Sola lettura: codice, interfaccia compilata, template, motore incluso. */
export const RADICE = process.env.TEX2PDF_RISORSE || RADICE_CODICE
/** Scrivibile: cartella di lavoro, immagini caricate, cache dei pacchetti. */
export const RADICE_DATI = process.env.TEX2PDF_DATI || RADICE_CODICE

export const CARTELLA_TEMPLATE = path.join(RADICE, 'template')
export const CARTELLA_DIST = path.join(RADICE, 'dist')
export const CARTELLA_MOTORE_INCLUSO = path.join(RADICE, 'motore')

export const CARTELLA_LAVORO = path.join(RADICE_DATI, 'lavoro')
export const CARTELLA_ASSETS = path.join(CARTELLA_LAVORO, 'assets')
export const CARTELLA_MOTORE = path.join(RADICE_DATI, 'motore')
export const CARTELLA_CACHE = path.join(CARTELLA_MOTORE, 'cache')

/**
 * Cerca l'eseguibile di Tectonic nella cartella `motore/` dei dati, poi in
 * quella delle risorse — sono la stessa se si lavora dal repository — e infine
 * nel PATH di sistema. L'ordine non è casuale: una copia messa lì dall'utente
 * deve poter scavalcare sia quella distribuita con l'applicazione sia
 * un'installazione di sistema magari più vecchia.
 */
export function trovaMotore() {
  const nome = process.platform === 'win32' ? 'tectonic.exe' : 'tectonic'

  for (const [cartella, origine] of [
    [CARTELLA_MOTORE, 'progetto'],
    [CARTELLA_MOTORE_INCLUSO, 'incluso']
  ]) {
    const candidato = path.join(cartella, nome)
    if (fs.existsSync(candidato)) return { percorso: candidato, origine }
  }

  const separatore = process.platform === 'win32' ? ';' : ':'
  for (const dir of (process.env.PATH || '').split(separatore)) {
    if (!dir) continue
    const candidato = path.join(dir, nome)
    try {
      fs.accessSync(candidato, fs.constants.X_OK)
      return { percorso: candidato, origine: 'sistema' }
    } catch {
      /* il PATH contiene abitualmente cartelle inesistenti */
    }
  }
  return null
}

/**
 * Si creano solo cartelle sotto la radice dei dati: `motore/` delle risorse è
 * di sola lettura quando l'applicazione è installata, e provare a crearla
 * farebbe fallire l'avvio per una cartella che esiste già.
 */
export function preparaCartelle() {
  for (const dir of [CARTELLA_LAVORO, CARTELLA_ASSETS, CARTELLA_MOTORE, CARTELLA_CACHE]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
