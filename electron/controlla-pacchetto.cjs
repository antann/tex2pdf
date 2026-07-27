'use strict'

/**
 * Controlli prima di costruire l'installer.
 *
 * Servono perché i pezzi che possono mancare non si notano finché non è troppo
 * tardi: senza `dist/` l'applicazione si apre su una pagina di cortesia, senza
 * `motore/tectonic.exe` si apre e non compila niente, senza l'icona
 * electron-builder ripiega su quella di Electron. In tutti i casi il guasto si
 * scopre a installazione fatta, sulla macchina di qualcun altro.
 *
 *   node electron/controlla-pacchetto.cjs
 */

const fs = require('node:fs')
const path = require('node:path')

const RADICE = path.join(__dirname, '..')
const nomeMotore = process.platform === 'win32' ? 'tectonic.exe' : 'tectonic'

const richiesti = [
  {
    percorso: path.join(RADICE, 'dist', 'index.html'),
    manca: 'L’interfaccia non è compilata.',
    rimedio: 'Lancia:  npm run build'
  },
  {
    percorso: path.join(RADICE, 'motore', nomeMotore),
    manca: 'Il motore di compilazione non è nella cartella motore/.',
    rimedio: 'Lancia:  installa-motore.bat'
  },
  {
    percorso: path.join(RADICE, 'risorse', 'icona.ico'),
    manca: 'L’icona dell’applicazione non è stata generata.',
    rimedio: 'Lancia:  npm run icone'
  }
]

const mancanti = richiesti.filter((uno) => !fs.existsSync(uno.percorso))

if (mancanti.length) {
  console.error('\n  L’installer non si può costruire così:\n')
  for (const uno of mancanti) {
    console.error(`  ${uno.manca}`)
    console.error(`  ${uno.rimedio}\n`)
  }
  process.exit(1)
}

console.log('  Pacchetto completo: interfaccia compilata e motore presente.')
