import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from './components/Editor.jsx'
import Anteprima from './components/Anteprima.jsx'
import Registro from './components/Registro.jsx'
import { PannelloTemplate, PannelloMetadati, PannelloAggiunte } from './components/Pannelli.jsx'
import { rilevaModalita, estraiCorpo } from './lib/rilevamento.js'
import { ESEMPIO } from './lib/esempio.js'
import * as api from './lib/api.js'

const OPZIONI_INIZIALI = {
  carta: 'a4',
  orientamento: 'verticale',
  fronteRetro: false,
  indice: true,
  profonditaIndice: 2,
  copertina: false,
  piede: '',
  lingua: 'italian'
}

const METADATI_INIZIALI = {
  titolo: 'Documento di prova',
  sottotitolo: 'Banco di prova dei template',
  autore: '',
  dataDocumento: new Date().toLocaleDateString('it-IT'),
  versione: '1.0',
  riferimento: '',
  ente: ''
}

const RITARDO = 1100

export default function App() {
  const [sorgente, setSorgente] = useState(ESEMPIO)
  const [nomeFile, setNomeFile] = useState('')
  const [aggiunte, setAggiunte] = useState('')
  const [metadati, setMetadati] = useState(METADATI_INIZIALI)
  const [opzioni, setOpzioni] = useState(OPZIONI_INIZIALI)

  const [catalogo, setCatalogo] = useState([])
  const [templateSlug, setTemplateSlug] = useState('')
  const [ambiente, setAmbiente] = useState({ motore: { presente: false }, formati: {}, lingue: {} })

  const [pannello, setPannello] = useState('sorgente')
  const [stato, setStato] = useState('inattiva') // inattiva | incorso | ok | errore
  const [diagnostica, setDiagnostica] = useState([])
  const [registro, setRegistro] = useState('')
  const [pdf, setPdf] = useState(null) // { url, pagine, durata }
  const [aggiornata, setAggiornata] = useState(true)
  const [automatico, setAutomatico] = useState(true)
  const [scala, setScala] = useState('adatta')
  const [vaiA, setVaiA] = useState(null)
  const [avviso, setAvviso] = useState('')
  const [ripristino, setRipristino] = useState(null)

  const richiestaInCorso = useRef(null)
  const primaVolta = useRef(true)

  const modalita = useMemo(() => rilevaModalita(sorgente), [sorgente])

  useEffect(() => {
    api.leggiStato().then(setAmbiente).catch(() => {})
    api
      .leggiTemplate()
      .then(({ template }) => {
        setCatalogo(template)
        const primo = template.find((t) => t.valido)
        if (primo) setTemplateSlug((corrente) => corrente || primo.slug)
      })
      .catch((errore) => setAvviso(`Catalogo template non leggibile: ${errore.message}`))
  }, [])

  const compila = useCallback(async () => {
    if (!templateSlug && modalita === 'corpo') return
    richiestaInCorso.current?.abort()
    const controllore = new AbortController()
    richiestaInCorso.current = controllore
    setStato('incorso')

    try {
      const esito = await api.chiediCompilazione(
        { modalita, sorgente, templateSlug, metadati, opzioni, aggiunte },
        controllore.signal
      )
      if (controllore.signal.aborted || esito.annullata) return

      setDiagnostica(esito.diagnostica || [])
      setRegistro(esito.registro || '')

      if (esito.ok) {
        const blob = await api.scaricaPdf()
        setPdf((precedente) => {
          if (precedente?.url) URL.revokeObjectURL(precedente.url)
          return {
            blob,
            url: URL.createObjectURL(blob),
            pagine: esito.pagine,
            durata: esito.durata
          }
        })
        setAggiornata(true)
        setStato('ok')
      } else {
        // L'ultimo PDF valido resta a schermo, marcato come non aggiornato:
        // perdere la pagina a ogni parentesi mancante renderebbe l'editor
        // inservibile.
        setAggiornata(false)
        setStato('errore')
        if (esito.diagnostica?.length) setPannello('registro')
      }
    } catch (errore) {
      if (errore.name === 'AbortError') return
      setStato('errore')
      setAvviso(errore.message)
    }
  }, [modalita, sorgente, templateSlug, metadati, opzioni, aggiunte])

  useEffect(() => {
    if (!automatico) {
      setAggiornata(false)
      return
    }
    if (primaVolta.current) {
      primaVolta.current = false
      compila()
      return
    }
    setAggiornata(false)
    const orologio = setTimeout(compila, RITARDO)
    return () => clearTimeout(orologio)
  }, [compila, automatico])

  const righeErrate = useMemo(
    () =>
      diagnostica
        .filter(
          (voce) =>
            voce.livello === 'errore' &&
            voce.riga &&
            ((modalita === 'corpo' && voce.origine === 'corpo') ||
              (modalita === 'completo' && voce.origine === 'documento'))
        )
        .map((voce) => voce.riga),
    [diagnostica, modalita]
  )

  const apriFile = async (file) => {
    if (!file) return
    setSorgente(await file.text())
    setNomeFile(file.name)
    setRipristino(null)
  }

  const caricaAssets = async (file) => {
    for (const uno of file) {
      const dati = await uno.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(dati)))
      await api.inviaAsset(uno.name, base64).catch(() => {})
    }
    compila()
  }

  const suRilascio = async (evento) => {
    evento.preventDefault()
    const file = [...evento.dataTransfer.files]
    const tex = file.find((f) => /\.tex$/i.test(f.name))
    if (tex) await apriFile(tex)
    const immagini = file.filter((f) => /\.(png|jpe?g|pdf|eps)$/i.test(f.name))
    if (immagini.length) await caricaAssets(immagini)
  }

  const estrai = () => {
    const parti = estraiCorpo(sorgente)
    if (!parti) {
      setAvviso('Nel sorgente non compare \\begin{document}: non c\u2019è un corpo da estrarre.')
      return
    }
    setRipristino({ sorgente, aggiunte })
    setSorgente(parti.corpo)
    setAggiunte([aggiunte, parti.aggiunte].filter(Boolean).join('\n\n'))
    setPannello('sorgente')
  }

  const annullaEstrazione = () => {
    if (!ripristino) return
    setSorgente(ripristino.sorgente)
    setAggiunte(ripristino.aggiunte)
    setRipristino(null)
  }

  // Si salva il PDF che è a schermo, non quello sul disco: una compilazione
  // fallita lascia in cartella un file parziale, e salvarlo darebbe all'utente
  // un documento diverso da quello che sta guardando.
  const salvaPdf = () => {
    if (!pdf?.blob) return setAvviso('Non c\u2019è ancora un PDF da salvare.')
    scarica(pdf.blob, `${nomeBase()}.pdf`)
  }

  const esportaSorgente = async () => {
    const testo = await api.scaricaSorgenteComposto().catch(() => null)
    if (!testo) return setAvviso('Non c\u2019è ancora un sorgente composto.')
    scarica(new Blob([testo], { type: 'text/plain' }), `${nomeBase()}.tex`)
  }

  const nomeBase = () =>
    (nomeFile.replace(/\.tex$/i, '') || metadati.titolo || 'documento')
      .replace(/[\\/:*?"<>|]/g, '-')
      .trim() || 'documento'

  const templateScelto = catalogo.find((t) => t.slug === templateSlug)

  return (
    <div className="app" onDragOver={(e) => e.preventDefault()} onDrop={suRilascio}>
      <header className="bar">
        <div className="brand">
          <span className="mark" />
          TEX2PDF
        </div>
        <nav className="tabs">
          {[
            ['sorgente', 'Sorgente'],
            ['template', 'Template'],
            ['metadati', 'Metadati'],
            ['aggiunte', 'Aggiunte'],
            ['registro', `Registro${diagnostica.length ? ` (${diagnostica.length})` : ''}`]
          ].map(([chiave, etichetta]) => (
            <button
              key={chiave}
              type="button"
              className="tab"
              aria-selected={pannello === chiave}
              onClick={() => setPannello(chiave)}
            >
              {etichetta}
            </button>
          ))}
        </nav>
        <div className="grow" />
        <div className="file">
          <span>modalità</span>
          <b>{modalita === 'completo' ? 'documento completo' : 'corpo + template'}</b>
        </div>
        {modalita === 'completo' && !ripristino && (
          <button type="button" className="azione" onClick={estrai}>
            Estrai il corpo
          </button>
        )}
        {ripristino && (
          <button type="button" className="azione" onClick={annullaEstrazione}>
            Annulla estrazione
          </button>
        )}
      </header>

      <div className="work">
        <aside className="side">
          <div className="pane" data-open={pannello === 'sorgente'}>
            <div className="pane-label">
              Sorgente
              <span className="spinta" />
              <label className="apri">
                apri file
                <input
                  type="file"
                  accept=".tex,.txt"
                  onChange={(e) => apriFile(e.target.files?.[0])}
                />
              </label>
            </div>
            <Editor
              valore={sorgente}
              onCambia={setSorgente}
              errori={righeErrate}
              vaiA={vaiA}
            />
          </div>

          <div className="pane" data-open={pannello === 'template'}>
            <div className="pane-label">Template</div>
            <div className="scorrevole">
              <PannelloTemplate
                catalogo={catalogo}
                scelto={templateSlug}
                onScegli={setTemplateSlug}
                modalita={modalita}
              />
            </div>
          </div>

          <div className="pane" data-open={pannello === 'metadati'}>
            <div className="pane-label">Metadati e opzioni</div>
            <div className="scorrevole">
              <PannelloMetadati
                metadati={metadati}
                onCambia={setMetadati}
                opzioni={opzioni}
                onOpzioni={setOpzioni}
                formati={ambiente.formati}
                lingue={ambiente.lingue}
              />
            </div>
          </div>

          <div className="pane" data-open={pannello === 'aggiunte'}>
            <div className="pane-label">Preambolo aggiuntivo</div>
            <PannelloAggiunte valore={aggiunte} onCambia={setAggiunte} modalita={modalita} />
          </div>

          <div className="pane" data-open={pannello === 'registro'}>
            <div className="pane-label">Registro di compilazione</div>
            <Registro
              voci={diagnostica}
              registro={registro}
              modalita={modalita}
              onVaiA={(riga) => {
                setPannello('sorgente')
                setVaiA({ riga, quando: Date.now() })
              }}
            />
          </div>
        </aside>

        <main className="lato-anteprima">
          <Anteprima url={pdf?.url} scala={scala} aggiornata={aggiornata} />
          {!aggiornata && pdf && <div className="banda-vecchia">anteprima non aggiornata</div>}
        </main>
      </div>

      <footer className="stato">
        <span className="pallino" data-stato={stato} />
        <span className="voce-stato">
          {stato === 'incorso' && 'compilazione in corso'}
          {stato === 'ok' && `${pdf?.pagine ?? '—'} pagine · ${pdf?.durata ?? 0} ms`}
          {stato === 'errore' && 'compilazione non riuscita'}
          {stato === 'inattiva' && 'in attesa'}
        </span>
        <span className="voce-stato debole">
          {ambiente.motore?.presente
            ? `motore: Tectonic (${ambiente.motore.origine})`
            : 'motore assente — esegui installa-motore.bat'}
        </span>
        <span className="voce-stato debole">
          {modalita === 'corpo' ? templateScelto?.nome || 'nessun template' : 'preambolo del documento'}
        </span>
        <span className="spinta" />
        {avviso && (
          <button type="button" className="avviso" onClick={() => setAvviso('')}>
            {avviso} · chiudi
          </button>
        )}
        <label className="interruttore compatto">
          <input
            type="checkbox"
            checked={automatico}
            onChange={(e) => setAutomatico(e.target.checked)}
          />
          <span>compila da sé</span>
        </label>
        <select value={scala} onChange={(e) => setScala(e.target.value === 'adatta' ? 'adatta' : Number(e.target.value))}>
          <option value="adatta">adatta</option>
          <option value={0.75}>75%</option>
          <option value={1}>100%</option>
          <option value={1.5}>150%</option>
        </select>
        <button type="button" className="azione" onClick={compila}>
          Compila
        </button>
        <button type="button" className="azione" onClick={esportaSorgente}>
          Esporta .tex
        </button>
        <button type="button" className="azione primaria" onClick={salvaPdf} disabled={!pdf}>
          Salva PDF
        </button>
      </footer>
    </div>
  )
}

function scarica(blob, nome) {
  const url = URL.createObjectURL(blob)
  const collegamento = document.createElement('a')
  collegamento.href = url
  collegamento.download = nome
  collegamento.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
