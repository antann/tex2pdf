/**
 * Pannelli laterali: template, metadati, opzioni, preambolo aggiuntivo.
 *
 * Nessuno di questi campi modifica il file dell'utente: valgono per la
 * generazione in corso e basta.
 */

export function PannelloTemplate({ catalogo, scelto, onScegli, modalita }) {
  if (modalita === 'completo') {
    return (
      <div className="avviso-pannello">
        <b>Template non applicabile</b>
        <p>
          Il sorgente contiene <code>\documentclass</code>, quindi porta già il proprio preambolo:
          aggiungerne un secondo produrrebbe solo errori. Il documento viene compilato così com'è.
        </p>
        <p>
          Per usare un template, estrai il corpo dalla barra in alto: il testo fra{' '}
          <code>\begin&#123;document&#125;</code> e <code>\end&#123;document&#125;</code> diventa il
          sorgente, il resto del preambolo finisce fra le aggiunte.
        </p>
      </div>
    )
  }

  return (
    <div className="galleria">
      {catalogo.map((template) => (
        <button
          key={template.slug}
          type="button"
          className="scheda"
          aria-pressed={template.slug === scelto}
          onClick={() => onScegli(template.slug)}
          disabled={!template.valido}
        >
          {template.anteprima ? (
            <img
              className="miniatura"
              src={`/api/template/${template.slug}/anteprima.png`}
              alt=""
              style={{ borderColor: template.accento || '#5b636e' }}
              onError={(evento) => {
                evento.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <span className="pastiglia" style={{ background: template.accento || '#5b636e' }} />
          )}
          <span className="testo">
            <b>{template.nome || template.slug}</b>
            <span className="descrizione">{template.descrizione || template.motivo}</span>
            {template.specifiche && <span className="specifiche">{template.specifiche}</span>}
          </span>
        </button>
      ))}
      {!catalogo.length && (
        <div className="avviso-pannello">
          <b>Nessun template</b>
          <p>
            La cartella <code>template/</code> è vuota. Ogni sottocartella con{' '}
            <code>template.json</code>, <code>preambolo.tex</code>, <code>apertura.tex</code> e{' '}
            <code>chiusura.tex</code> compare qui senza altro da configurare.
          </p>
        </div>
      )}
    </div>
  )
}

const CAMPI = [
  ['titolo', 'Titolo'],
  ['sottotitolo', 'Sottotitolo'],
  ['autore', 'Autore'],
  ['dataDocumento', 'Data'],
  ['versione', 'Versione'],
  ['riferimento', 'Riferimento'],
  ['ente', 'Ente']
]

export function PannelloMetadati({ metadati, onCambia, opzioni, onOpzioni, formati, lingue }) {
  const modifica = (chiave) => (evento) => onCambia({ ...metadati, [chiave]: evento.target.value })
  const opzione = (chiave, valore) => onOpzioni({ ...opzioni, [chiave]: valore })

  return (
    <div className="modulo">
      <div className="gruppo">
        <span className="etichetta-gruppo">Metadati</span>
        {CAMPI.map(([chiave, etichetta]) => (
          <label key={chiave}>
            <span>{etichetta}</span>
            <input type="text" value={metadati[chiave] || ''} onChange={modifica(chiave)} />
          </label>
        ))}
      </div>

      <div className="gruppo">
        <span className="etichetta-gruppo">Foglio</span>
        <label>
          <span>Formato</span>
          <select value={opzioni.carta} onChange={(e) => opzione('carta', e.target.value)}>
            {Object.entries(formati).map(([chiave, formato]) => (
              <option key={chiave} value={chiave}>
                {formato.nome} — {formato.larghezza}×{formato.altezza} mm
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Orientamento</span>
          <select
            value={opzioni.orientamento}
            onChange={(e) => opzione('orientamento', e.target.value)}
          >
            <option value="verticale">Verticale</option>
            <option value="orizzontale">Orizzontale</option>
          </select>
        </label>
        <label className="interruttore">
          <input
            type="checkbox"
            checked={opzioni.fronteRetro}
            onChange={(e) => opzione('fronteRetro', e.target.checked)}
          />
          <span>Fronte e retro</span>
        </label>
      </div>

      <div className="gruppo">
        <span className="etichetta-gruppo">Struttura</span>
        <label className="interruttore">
          <input
            type="checkbox"
            checked={opzioni.indice}
            onChange={(e) => opzione('indice', e.target.checked)}
          />
          <span>Indice</span>
        </label>
        <label>
          <span>Profondità</span>
          <select
            value={opzioni.profonditaIndice}
            disabled={!opzioni.indice}
            onChange={(e) => opzione('profonditaIndice', Number(e.target.value))}
          >
            <option value={1}>Solo sezioni</option>
            <option value={2}>Fino alle sottosezioni</option>
            <option value={3}>Tre livelli</option>
          </select>
        </label>
        <label className="interruttore">
          <input
            type="checkbox"
            checked={opzioni.copertina}
            onChange={(e) => opzione('copertina', e.target.checked)}
          />
          <span>Copertina dedicata</span>
        </label>
        <label>
          <span>Piè di pagina</span>
          <input
            type="text"
            value={opzioni.piede}
            onChange={(e) => opzione('piede', e.target.value)}
          />
        </label>
        <label>
          <span>Lingua</span>
          <select value={opzioni.lingua} onChange={(e) => opzione('lingua', e.target.value)}>
            {Object.entries(lingue).map(([chiave, nome]) => (
              <option key={chiave} value={chiave}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

export function PannelloAggiunte({ valore, onCambia, modalita }) {
  return (
    <div className="aggiunte">
      <p className="nota">
        {modalita === 'completo'
          ? 'In modalità documento completo il preambolo lo scrivi direttamente nel sorgente: questo campo resta inutilizzato.'
          : "Righe inserite dopo il preambolo del template: qui vanno i \\usepackage e le macro che il tuo testo richiede e che il template non prevede."}
      </p>
      <textarea
        value={valore}
        spellCheck={false}
        disabled={modalita === 'completo'}
        onChange={(evento) => onCambia(evento.target.value)}
        placeholder={'\\usepackage{tikz}\n\\newcommand{\\prodotto}{Nome prodotto}'}
      />
    </div>
  )
}
