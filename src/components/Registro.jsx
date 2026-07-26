import { useState } from 'react'

/**
 * Elenco delle voci del registro.
 *
 * Le voci che riguardano `corpo.tex` (o `documento.tex` in modalità documento
 * completo) sono cliccabili: la riga corrisponde uno-a-uno a quella
 * dell'editor, perché il testo dell'utente viene incluso come file a sé e non
 * concatenato al preambolo.
 */

const NOMI = {
  corpo: 'sorgente',
  documento: 'sorgente',
  aggiunte: 'aggiunte',
  template: 'template',
  esterno: 'pacchetto',
  motore: 'motore'
}

export default function Registro({ voci, registro, modalita, onVaiA }) {
  const [mostraTipografia, setMostraTipografia] = useState(false)
  const [mostraGrezzo, setMostraGrezzo] = useState(false)

  const collegabile = (voce) =>
    voce.riga &&
    (voce.origine === 'aggiunte' ||
      (modalita === 'corpo' && voce.origine === 'corpo') ||
      (modalita === 'completo' && voce.origine === 'documento'))

  const visibili = voci.filter((voce) => mostraTipografia || voce.livello !== 'tipografia')
  const conteggio = {
    errore: voci.filter((v) => v.livello === 'errore').length,
    avviso: voci.filter((v) => v.livello === 'avviso').length,
    tipografia: voci.filter((v) => v.livello === 'tipografia').length
  }

  return (
    <div className="registro">
      <div className="filtri">
        <span className="conta errore">{conteggio.errore} errori</span>
        <span className="conta avviso">{conteggio.avviso} avvisi</span>
        <button
          type="button"
          className="linkish"
          aria-pressed={mostraTipografia}
          onClick={() => setMostraTipografia((v) => !v)}
        >
          {mostraTipografia ? 'nascondi' : 'mostra'} {conteggio.tipografia} note tipografiche
        </button>
        <span className="spinta" />
        <button
          type="button"
          className="linkish"
          aria-pressed={mostraGrezzo}
          onClick={() => setMostraGrezzo((v) => !v)}
        >
          registro completo
        </button>
      </div>

      {mostraGrezzo ? (
        <pre className="grezzo">{registro || 'Nessun registro disponibile.'}</pre>
      ) : (
        <ul className="voci">
          {visibili.map((voce, indice) => (
            <li key={indice} data-livello={voce.livello}>
              <button
                type="button"
                className="voce"
                disabled={!collegabile(voce)}
                onClick={() => collegabile(voce) && onVaiA(voce.riga)}
              >
                <span className="dove">
                  {NOMI[voce.origine] || voce.origine}
                  {voce.riga ? `:${voce.riga}` : ''}
                </span>
                <span className="cosa">{voce.messaggio}</span>
                {voce.contesto && <span className="contesto">{voce.contesto}</span>}
              </button>
            </li>
          ))}
          {!visibili.length && <li className="niente">Nessuna voce da segnalare.</li>}
        </ul>
      )}
    </div>
  )
}
