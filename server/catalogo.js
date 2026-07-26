/**
 * Catalogo dei template.
 *
 * Un template è una cartella su disco, non una voce in un file di codice:
 * aggiungerne uno significa creare `template/<slug>/` con i suoi file, senza
 * toccare il programma. La scansione avviene a ogni richiesta perché costa
 * pochi millisecondi e permette di lavorare a un template con l'applicazione
 * già avviata.
 */
import fs from 'node:fs'
import path from 'node:path'
import { CARTELLA_TEMPLATE } from './percorsi.js'

/** File che ogni template deve avere perché la composizione funzioni. */
const OBBLIGATORI = ['template.json', 'preambolo.tex', 'apertura.tex', 'chiusura.tex']

export function leggiCatalogo() {
  if (!fs.existsSync(CARTELLA_TEMPLATE)) return []

  const voci = []
  for (const slug of fs.readdirSync(CARTELLA_TEMPLATE).sort()) {
    const dir = path.join(CARTELLA_TEMPLATE, slug)
    if (!fs.statSync(dir).isDirectory()) continue

    const mancanti = OBBLIGATORI.filter((f) => !fs.existsSync(path.join(dir, f)))
    if (mancanti.length) {
      voci.push({ slug, valido: false, motivo: `file mancanti: ${mancanti.join(', ')}` })
      continue
    }

    try {
      const scheda = JSON.parse(fs.readFileSync(path.join(dir, 'template.json'), 'utf8'))
      voci.push({
        slug,
        valido: true,
        nome: scheda.nome || slug,
        descrizione: scheda.descrizione || '',
        specifiche: scheda.specifiche || '',
        accento: scheda.accento || '#5b636e',
        classe: scheda.classe || 'article',
        opzioniClasse: Array.isArray(scheda.opzioniClasse) ? scheda.opzioniClasse : [],
        supporta: scheda.supporta || {},
        anteprima: fs.existsSync(path.join(dir, 'anteprima.png'))
      })
    } catch (errore) {
      voci.push({ slug, valido: false, motivo: `template.json illeggibile: ${errore.message}` })
    }
  }
  return voci
}

export function leggiTemplate(slug) {
  const voce = leggiCatalogo().find((t) => t.slug === slug && t.valido)
  if (!voce) return null
  return { ...voce, cartella: path.join(CARTELLA_TEMPLATE, slug) }
}
