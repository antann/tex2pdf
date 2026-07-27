'use strict'

/**
 * Ponte fra il documento e il processo principale.
 *
 * Espone quattro funzioni e nient'altro: il documento non vede né Node né il
 * filesystem, e `ipcRenderer` non esce di qui. Una capacità nuova si aggiunge
 * dichiarandola qui e scrivendo il gestore corrispondente in `main.cjs`.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tex2pdf', {
  desktop: true,
  apriFile: () => ipcRenderer.invoke('documento:apri'),
  salvaFile: (nomeSuggerito, dati) => ipcRenderer.invoke('documento:salva', nomeSuggerito, dati),
  mostraNellaCartella: (percorso) => ipcRenderer.invoke('documento:mostra', percorso),
  suComando: (callback) => {
    const ascoltatore = (_evento, comando) => callback(comando)
    ipcRenderer.on('menu:comando', ascoltatore)
    return () => ipcRenderer.removeListener('menu:comando', ascoltatore)
  }
})
