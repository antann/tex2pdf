/**
 * Scalda la cache dei pacchetti.
 *
 * Alla prima compilazione Tectonic scarica da sé i pacchetti che il documento
 * richiede: sono decine di megabyte e qualche minuto di attesa. Farlo capitare
 * mentre l'utente aspetta un'anteprima è il modo migliore per fargli credere
 * che il programma sia lento. Lo si fa qui, una volta, dichiarandolo.
 *
 *   npm run scalda
 */
import { compila } from './compilatore.js'
import { leggiCatalogo } from './catalogo.js'
import { trovaMotore } from './percorsi.js'
import { ESEMPIO } from '../src/lib/esempio.js'

const motore = trovaMotore()
if (!motore) {
  console.error('Motore assente: esegui prima installa-motore.bat.')
  process.exit(1)
}

const template = leggiCatalogo().filter((t) => t.valido)
console.log(`Motore: ${motore.percorso}`)
console.log(`Template da provare: ${template.length}\n`)
console.log('Il primo scarica i pacchetti e può richiedere qualche minuto.\n')

let guasti = 0
for (const uno of template) {
  process.stdout.write(`  ${uno.nome.padEnd(14)} `)
  const esito = await compila({
    modalita: 'corpo',
    sorgente: ESEMPIO,
    templateSlug: uno.slug,
    metadati: { titolo: 'Prova', autore: 'TEX2PDF', dataDocumento: '—', versione: '1.0' },
    opzioni: { carta: 'a4', orientamento: 'verticale', indice: true, profonditaIndice: 2, copertina: true, lingua: 'italian' },
    aggiunte: ''
  })
  if (esito.ok) {
    console.log(`ok — ${esito.pagine} pagine in ${(esito.durata / 1000).toFixed(1)} s`)
  } else {
    guasti++
    console.log('NON COMPILA')
    for (const voce of esito.diagnostica.filter((v) => v.livello === 'errore').slice(0, 3)) {
      console.log(`       ${voce.origine}${voce.riga ? ':' + voce.riga : ''} — ${voce.messaggio}`)
    }
  }
}

console.log(
  guasti
    ? `\n${guasti} template su ${template.length} non compilano.\n`
    : '\nCache pronta: le compilazioni successive non scaricano più nulla.\n'
)
process.exit(guasti ? 1 : 0)
