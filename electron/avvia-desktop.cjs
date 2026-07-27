'use strict'

/**
 * Avvio della finestra dell'applicazione.
 *
 *   node electron/avvia-desktop.cjs                sviluppo: Vite + finestra
 *   node electron/avvia-desktop.cjs --produzione   finestra sulla build in dist/
 *
 * Qui si accende solo Vite: il server di compilazione lo avvia il processo
 * principale, dentro di sé. In produzione non serve nemmeno Vite, perché
 * l'interfaccia compilata la serve il server stesso.
 *
 * Electron viene lanciato dal suo eseguibile e non tramite npm: un passaggio in
 * meno significa un punto in meno dove la finestra può non aprirsi.
 */

const { spawn } = require('node:child_process')
const net = require('node:net')
const fs = require('node:fs')
const path = require('node:path')

const PRODUZIONE = process.argv.includes('--produzione')
const PORTA = 5173
// stessa famiglia di indirizzi dichiarata in vite.config.js: su Windows
// `localhost` puo' risolversi in ::1 e non coincidere con 127.0.0.1
const OSPITI = ['127.0.0.1', '::1']
const INDIRIZZO = `http://127.0.0.1:${PORTA}`
const RADICE = path.join(__dirname, '..')

/* ── controlli preliminari, con messaggi che dicono cosa fare ── */
let electronExe
try {
  electronExe = require('electron')
} catch {
  errore(
    'Electron non risulta installato.',
    'Lancia:  npm install     (oppure avvia.bat, che lo fa da solo)'
  )
}
if (typeof electronExe !== 'string' || !fs.existsSync(electronExe)) {
  errore(
    'Il pacchetto Electron è presente ma manca il suo eseguibile.',
    'Il download si è interrotto. Lancia:  npm install'
  )
}
if (PRODUZIONE && !fs.existsSync(path.join(RADICE, 'dist', 'index.html'))) {
  errore('La cartella dist/ non contiene una build.', 'Lancia:  npm run build')
}

/* ── avvio ── */
if (PRODUZIONE) {
  apriFinestra()
} else {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const vite = spawn(npm, ['run', 'dev'], {
    cwd: RADICE,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  console.log('\n  Avvio del server di sviluppo…')

  attendiPorta().then((pronto) => {
    if (!pronto) {
      console.error("\n  Il server e' partito ma non risponde su nessun indirizzo.")
      console.error(`  Provati: ${OSPITI.join(', ')} sulla porta ${PORTA}.`)
      console.error('  Se la porta risulta occupata da altro:  arresta.bat\n')
      vite.kill()
      process.exit(1)
    }
    const finestra = apriFinestra(INDIRIZZO)
    finestra.on('close', () => vite.kill())
  })

  const chiudi = () => {
    vite.kill()
    process.exit(0)
  }
  process.on('SIGINT', chiudi)
  process.on('SIGTERM', chiudi)
}

/* ── funzioni ── */
function apriFinestra(indirizzo) {
  console.log('  Apertura della finestra…\n')
  const ambiente = { ...process.env }
  if (indirizzo) ambiente.TEX2PDF_DEV_URL = indirizzo

  const finestra = spawn(electronExe, ['.'], {
    cwd: RADICE,
    stdio: 'inherit',
    env: ambiente
  })

  finestra.on('error', (e) => {
    console.error(`\n  Impossibile avviare Electron: ${e.message}\n`)
    process.exit(1)
  })
  finestra.on('close', (codice) => process.exit(codice ?? 0))
  return finestra
}

function inAscolto(ospite) {
  return new Promise((risolvi) => {
    const presa = net.connect({ port: PORTA, host: ospite })
    const chiudi = (esito) => {
      presa.destroy()
      risolvi(esito)
    }
    presa.setTimeout(1000, () => chiudi(false))
    presa.on('connect', () => chiudi(true))
    presa.on('error', () => chiudi(false))
  })
}

/** Risponde appena uno qualsiasi degli indirizzi accetta una connessione. */
async function attendiPorta(tentativi = 75) {
  for (let i = 0; i < tentativi; i++) {
    const esiti = await Promise.all(OSPITI.map(inAscolto))
    if (esiti.some(Boolean)) return true
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

function errore(...righe) {
  console.error('')
  righe.forEach((r) => console.error(`  ${r}`))
  console.error('')
  process.exit(1)
}
