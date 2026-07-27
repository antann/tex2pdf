'use strict'

/**
 * Processo principale.
 *
 * Tiene insieme due cose: il server locale, che qui gira dentro questo stesso
 * processo, e la finestra che lo mostra.
 *
 * La finestra carica sempre un indirizzo http, mai un file. Il motivo è che
 * l'interfaccia parla con il server per percorsi relativi (`/api/...`): letta
 * da `file://` non avrebbe più nessuno con cui parlare. Caricando l'indirizzo
 * del server, dentro la finestra vale esattamente ciò che vale nel browser, e
 * le due modalità non possono divergere.
 *
 * Il server sta qui e non in un processo figlio perché così la porta si sa
 * senza doversela far dire, e alla chiusura non resta nulla in giro.
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const { pathToFileURL } = require('node:url')

const SVILUPPO = !!process.env.TEX2PDF_DEV_URL
const URL_SVILUPPO = process.env.TEX2PDF_DEV_URL || ''
// in sviluppo la porta è quella che il proxy di Vite si aspetta; altrimenti la
// sceglie il sistema, così l'applicazione installata non litiga con un server
// avviato a mano dal repository
const PORTA = SVILUPPO ? 4180 : 0

const RADICE = path.join(__dirname, '..')

let finestra = null
let server = null
let fermaCompilazione = () => {}

/* ── finestra ── */
function creaFinestra(indirizzo) {
  finestra = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#1d1f21',
    // installata l'icona la prende l'eseguibile dall'installer; questa serve
    // in sviluppo, dove altrimenti la barra mostrerebbe quella di Electron
    icon: path.join(RADICE, 'risorse', 'icona.ico'),
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  finestra.once('ready-to-show', () => finestra.show())
  finestra.loadURL(indirizzo)

  // i collegamenti esterni non devono aprirsi dentro l'applicazione
  finestra.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  return finestra
}

/* ── menu ── */
function inviaAlDocumento(comando) {
  finestra?.webContents.send('menu:comando', comando)
}

function creaMenu() {
  const visualizza = [{ role: 'reload', label: 'Ricarica' }]
  if (SVILUPPO) visualizza.push({ role: 'toggleDevTools', label: 'Strumenti di sviluppo' })

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Apri .tex…', accelerator: 'CmdOrCtrl+O', click: () => inviaAlDocumento('apri') },
        { label: 'Salva PDF…', accelerator: 'CmdOrCtrl+S', click: () => inviaAlDocumento('salva') },
        { label: 'Esporta .tex composto…', click: () => inviaAlDocumento('esporta') },
        { type: 'separator' },
        { role: 'quit', label: 'Esci' }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo', label: 'Annulla' },
        { role: 'redo', label: 'Ripristina' },
        { type: 'separator' },
        { role: 'cut', label: 'Taglia' },
        { role: 'copy', label: 'Copia' },
        { role: 'paste', label: 'Incolla' },
        { role: 'selectAll', label: 'Seleziona tutto' }
      ]
    },
    { label: 'Visualizza', submenu: visualizza },
    {
      label: 'Aiuto',
      submenu: [
        {
          label: 'Informazioni su TEX2PDF',
          click: () =>
            dialog.showMessageBox(finestra, {
              type: 'info',
              title: 'TEX2PDF',
              message: `TEX2PDF ${app.getVersion()}`,
              detail:
                'Compila documenti LaTeX in PDF applicando un template.\n' +
                'Applicazione locale: i documenti non lasciano questa macchina.'
            })
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
}

/* ── capacità di sistema ──
 * Ogni gestore restituisce un oggetto e non lancia mai: il documento riceve
 * `{ annullato }`, `{ errore }` o l'esito, e non deve incapsulare nulla. */

ipcMain.handle('documento:apri', async () => {
  const scelta = await dialog.showOpenDialog(finestra, {
    title: 'Apri un sorgente LaTeX',
    properties: ['openFile'],
    filters: [
      { name: 'LaTeX', extensions: ['tex', 'latex', 'txt'] },
      { name: 'Tutti i file', extensions: ['*'] }
    ]
  })
  if (scelta.canceled || !scelta.filePaths.length) return { annullato: true }

  const percorso = scelta.filePaths[0]
  try {
    return { nome: path.basename(percorso), percorso, testo: await fs.readFile(percorso, 'utf8') }
  } catch (e) {
    return { errore: e.message }
  }
})

ipcMain.handle('documento:salva', async (_evento, nomeSuggerito, dati) => {
  const estensione = path.extname(nomeSuggerito || '').replace('.', '') || 'pdf'
  const scelta = await dialog.showSaveDialog(finestra, {
    title: 'Salva il documento',
    defaultPath: nomeSuggerito || 'documento.pdf',
    filters: [{ name: estensione.toUpperCase(), extensions: [estensione] }]
  })
  if (scelta.canceled || !scelta.filePath) return { annullato: true }

  try {
    await fs.writeFile(scelta.filePath, Buffer.from(dati))
    return { ok: true, percorso: scelta.filePath }
  } catch (e) {
    return { errore: e.message }
  }
})

ipcMain.handle('documento:mostra', async (_evento, percorso) => {
  if (percorso) shell.showItemInFolder(percorso)
})

/* ── avvio ── */
async function avviaServer() {
  // Installata, l'applicazione sta in una cartella di sola lettura: il codice e
  // i template restano lì, tutto ciò che si scrive va nel profilo dell'utente.
  // Dal repository non si imposta nulla e le due radici tornano a coincidere.
  if (app.isPackaged) {
    process.env.TEX2PDF_RISORSE = app.getAppPath()
    process.env.TEX2PDF_DATI = app.getPath('userData')
  }

  const modulo = await import(pathToFileURL(path.join(RADICE, 'server', 'server.js')).href)
  const compilatore = await import(pathToFileURL(path.join(RADICE, 'server', 'compilatore.js')).href)
  fermaCompilazione = compilatore.fermaCompilazione

  const esito = await modulo.avvia(PORTA)
  server = esito.server
  return esito.porta
}

app.whenReady().then(async () => {
  let porta
  try {
    porta = await avviaServer()
  } catch (e) {
    // una finestra bianca senza spiegazione è il guasto più difficile da
    // capire: meglio dire subito che cosa non è partito
    dialog.showErrorBox(
      'TEX2PDF non si avvia',
      `Il server locale non è partito.\n\n${e.message}\n\n` +
        (SVILUPPO ? `Controlla che la porta ${PORTA} sia libera: arresta.bat.` : '')
    )
    app.exit(1)
    return
  }

  creaMenu()
  creaFinestra(SVILUPPO ? URL_SVILUPPO : `http://127.0.0.1:${porta}`)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      creaFinestra(SVILUPPO ? URL_SVILUPPO : `http://127.0.0.1:${porta}`)
    }
  })
})

app.on('before-quit', () => {
  fermaCompilazione()
  server?.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
