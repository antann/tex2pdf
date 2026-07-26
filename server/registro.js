/**
 * Lettura del registro di compilazione.
 *
 * TeX non produce errori strutturati: produce un diario. Questo modulo lo
 * riduce a un elenco di voci con file, riga e messaggio, perché è l'unica forma
 * su cui l'interfaccia possa costruire un collegamento cliccabile.
 *
 * L'attribuzione del file si ricava dalle parentesi che TeX apre e chiude
 * mentre legge i sorgenti. È un'euristica: le parentesi presenti nel testo
 * normale possono sbilanciarla. Per non accumulare disallineamenti si impila
 * un segnaposto per **ogni** parentesi aperta, con o senza nome, e se ne toglie
 * uno per ogni parentesi chiusa; il file corrente è l'ultimo segnaposto che
 * porta un nome.
 */

const ESTENSIONI = /\.(tex|sty|cls|def|cfg|clo|ldf|fd|aux)$/i

function aggiornaPila(pila, riga) {
  for (let i = 0; i < riga.length; i++) {
    const carattere = riga[i]
    if (carattere === '(') {
      let j = i + 1
      let nome = ''
      while (j < riga.length && !'(){}[] '.includes(riga[j])) nome += riga[j++]
      pila.push(ESTENSIONI.test(nome) ? nome : null)
      i = j - 1
    } else if (carattere === ')') {
      pila.pop()
    }
  }
}

function fileCorrente(pila) {
  for (let i = pila.length - 1; i >= 0; i--) {
    if (pila[i]) return pila[i].split(/[\\/]/).pop()
  }
  return null
}

/** I file che l'utente può davvero correggere nell'editor. */
function origineDi(file) {
  if (file === 'corpo.tex') return 'corpo'
  if (file === 'aggiunte.tex') return 'aggiunte'
  if (file === 'documento.tex') return 'documento'
  if (['preambolo.tex', 'apertura.tex', 'chiusura.tex', 'opzioni.tex', 'metadati.tex'].includes(file)) {
    return 'template'
  }
  return 'esterno'
}

/**
 * @param {string} registro contenuto del file .log
 * @param {string} uscita   ciò che il motore ha scritto su stdout/stderr
 */
export function leggiRegistro(registro = '', uscita = '') {
  // Il motore colora la propria uscita quando crede di parlare a un terminale.
  // Le sequenze di controllo finirebbero dentro i messaggi d'errore, dove non
  // si vedono ma sporcano il confronto e la visualizzazione.
  uscita = uscita.replace(/\u001b\[[0-9;]*m/g, '')

  const voci = []
  const righe = registro.split(/\r?\n/)
  const pila = []

  for (let i = 0; i < righe.length; i++) {
    const riga = righe[i]

    if (riga.startsWith('! ')) {
      // Il messaggio prosegue sulle righe seguenti finché non compare il
      // riferimento «l.N», che chiude il blocco d'errore.
      let messaggio = riga.slice(2).trim()
      let numeroRiga = null
      let contesto = ''
      for (let j = i + 1; j < Math.min(i + 12, righe.length); j++) {
        const corrispondenza = /^l\.(\d+)\s?(.*)$/.exec(righe[j])
        if (corrispondenza) {
          numeroRiga = Number(corrispondenza[1])
          contesto = corrispondenza[2].trim()
          i = j
          break
        }
        if (righe[j].trim() && !righe[j].startsWith('<')) messaggio += ' ' + righe[j].trim()
      }
      const file = fileCorrente(pila)
      voci.push({
        livello: 'errore',
        messaggio: messaggio.replace(/\s+/g, ' ').trim(),
        file,
        origine: origineDi(file),
        riga: numeroRiga,
        contesto
      })
      continue
    }

    const avviso = /^(?:LaTeX|Package\s+\S+|Class\s+\S+)\s+Warning:\s*(.+)$/.exec(riga)
    if (avviso) {
      let messaggio = avviso[1].trim()
      let numeroRiga = null
      const suRiga = /input line (\d+)/.exec(riga) || /input line (\d+)/.exec(righe[i + 1] || '')
      if (suRiga) numeroRiga = Number(suRiga[1])
      if (!/\.$/.test(messaggio) && righe[i + 1] && righe[i + 1].startsWith('(')) {
        /* continuazione dell'avviso: non aggiunge informazione utile */
      }
      const file = fileCorrente(pila)
      voci.push({
        livello: 'avviso',
        messaggio: messaggio.replace(/\s+/g, ' ').trim(),
        file,
        origine: origineDi(file),
        riga: numeroRiga,
        contesto: ''
      })
      aggiornaPila(pila, riga)
      continue
    }

    const scatola = /^(Overfull|Underfull) \\([hv])box .* at lines? (\d+)(?:--(\d+))?/.exec(riga)
    if (scatola) {
      const file = fileCorrente(pila)
      voci.push({
        livello: 'tipografia',
        messaggio: riga.trim(),
        file,
        origine: origineDi(file),
        riga: Number(scatola[3]),
        contesto: ''
      })
      continue
    }

    aggiornaPila(pila, riga)
  }

  // Tectonic segnala su stdout/stderr anche i guasti che non arrivano al log:
  // pacchetto non scaricabile, cache non scrivibile, bundle irraggiungibile.
  for (const riga of uscita.split(/\r?\n/)) {
    const guasto = /^error:\s*(.+)$/.exec(riga.trim())
    if (guasto && !/halted on potentially-recoverable/.test(guasto[1])) {
      voci.push({
        livello: 'errore',
        messaggio: spiega(guasto[1].trim()),
        file: null,
        origine: 'motore',
        riga: null,
        contesto: ''
      })
    }
  }

  const pagine = /Output written on \S+ \((\d+) pages?/.exec(registro)

  return {
    voci: deduplica(voci),
    pagine: pagine ? Number(pagine[1]) : null
  }
}

/**
 * Traduce i guasti del motore che, letti così come sono, non dicono all'utente
 * né che cosa è successo né che cosa può farci.
 */
function spiega(messaggio) {
  if (/wasn't expected, or isn't valid in this context/.test(messaggio)) {
    return (
      `Il motore ha rifiutato la riga di comando (${messaggio}). ` +
      'Di solito significa che la versione di Tectonic installata non è quella ' +
      'attesa: cancella motore/ e riesegui installa-motore.bat.'
    )
  }
  if (/HTTP response code|connect|dns|network|timed out/i.test(messaggio)) {
    return (
      `${messaggio} — il motore non riesce a scaricare i pacchetti LaTeX. ` +
      'Controlla la connessione e che nulla blocchi la cartella motore/cache.'
    )
  }
  return messaggio
}

/** Lo stesso avviso ripetuto per ogni passata non aggiunge informazione. */
function deduplica(voci) {
  const visti = new Set()
  return voci.filter((voce) => {
    const chiave = `${voce.livello}|${voce.file}|${voce.riga}|${voce.messaggio}`
    if (visti.has(chiave)) return false
    visti.add(chiave)
    return true
  })
}
