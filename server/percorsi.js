/**
 * Percorsi del progetto e individuazione del motore di compilazione.
 *
 * Tutto ciò che il programma scrive resta dentro la cartella di progetto:
 * la cache dei pacchetti compresa. Un'installazione si cancella eliminando
 * una sola cartella, senza lasciare residui nel profilo dell'utente.
 */
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

export const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const CARTELLA_TEMPLATE = path.join(RADICE, 'template')
export const CARTELLA_LAVORO = path.join(RADICE, 'lavoro')
export const CARTELLA_ASSETS = path.join(CARTELLA_LAVORO, 'assets')
export const CARTELLA_MOTORE = path.join(RADICE, 'motore')
export const CARTELLA_CACHE = path.join(CARTELLA_MOTORE, 'cache')
export const CARTELLA_DIST = path.join(RADICE, 'dist')

/**
 * Cerca l'eseguibile di Tectonic prima nella cartella `motore/` del progetto,
 * poi nel PATH di sistema. L'ordine non è casuale: una copia locale deve poter
 * scavalcare un'installazione di sistema magari più vecchia.
 */
export function trovaMotore() {
  const nome = process.platform === 'win32' ? 'tectonic.exe' : 'tectonic'
  const locale = path.join(CARTELLA_MOTORE, nome)
  if (fs.existsSync(locale)) return { percorso: locale, origine: 'progetto' }

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

export function preparaCartelle() {
  for (const dir of [CARTELLA_LAVORO, CARTELLA_ASSETS, CARTELLA_MOTORE, CARTELLA_CACHE]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
