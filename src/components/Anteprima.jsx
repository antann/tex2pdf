import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import lavoratore from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = lavoratore

/**
 * Anteprima del PDF.
 *
 * Non è un'approssimazione del risultato: è il risultato. Non esiste, e non
 * deve esistere, un secondo modo di rappresentare il documento — sarebbe la
 * prima cosa a divergere dalla stampa.
 *
 * La posizione di lettura sopravvive alla ricompilazione: si annota la
 * proporzione di scorrimento prima di sostituire il documento e la si
 * ripristina dopo. Senza questo, correggere una virgola a pagina 14
 * riporterebbe ogni volta a pagina 1.
 */
export default function Anteprima({ url, scala, aggiornata, onPagine }) {
  const contenitore = useRef(null)
  const proporzione = useRef(0)
  const [documento, setDocumento] = useState(null)
  const [pagine, setPagine] = useState(0)

  useEffect(() => {
    if (!url) {
      setDocumento(null)
      setPagine(0)
      return
    }
    let annullato = false
    const compito = pdfjs.getDocument({ url })
    compito.promise
      .then((doc) => {
        if (annullato) return doc.destroy()
        setDocumento(doc)
        setPagine(doc.numPages)
        onPagine?.(doc.numPages)
      })
      .catch(() => {
        if (!annullato) setDocumento(null)
      })
    return () => {
      annullato = true
      compito.destroy?.()
    }
  }, [url, onPagine])

  const annota = () => {
    const nodo = contenitore.current
    if (!nodo || nodo.scrollHeight <= nodo.clientHeight) return
    proporzione.current = nodo.scrollTop / (nodo.scrollHeight - nodo.clientHeight)
  }

  useLayoutEffect(() => {
    const nodo = contenitore.current
    if (!nodo || !documento) return
    const orologio = setTimeout(() => {
      const scorrimento = nodo.scrollHeight - nodo.clientHeight
      if (scorrimento > 0) nodo.scrollTop = proporzione.current * scorrimento
    }, 60)
    return () => clearTimeout(orologio)
  }, [documento])

  if (!url) {
    return (
      <div className="anteprima vuota" ref={contenitore}>
        <div className="messaggio">
          <b>Nessun documento compilato</b>
          <span>Scrivi qualcosa nel pannello sorgente e premi Compila.</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="anteprima"
      ref={contenitore}
      onScroll={annota}
      data-aggiornata={aggiornata ? 'si' : 'no'}
    >
      {Array.from({ length: pagine }, (_, indice) => (
        <Pagina key={indice} documento={documento} numero={indice + 1} scala={scala} />
      ))}
    </div>
  )
}

function Pagina({ documento, numero, scala }) {
  const tela = useRef(null)
  const involucro = useRef(null)

  useEffect(() => {
    if (!documento) return
    let annullato = false
    let disegno = null

    documento.getPage(numero).then((pagina) => {
      if (annullato) return
      const nodo = tela.current
      if (!nodo) return

      const base = pagina.getViewport({ scale: 1 })
      const larghezzaUtile = (involucro.current?.parentElement?.clientWidth || 900) - 56
      const fattore = scala === 'adatta' ? larghezzaUtile / base.width : scala
      // Su schermi a densità doppia una tela alla scala nominale mostra il testo
      // sgranato: si disegna al doppio e si riduce via CSS.
      const densita = Math.min(window.devicePixelRatio || 1, 2)
      const vista = pagina.getViewport({ scale: fattore * densita })

      nodo.width = Math.floor(vista.width)
      nodo.height = Math.floor(vista.height)
      nodo.style.width = `${Math.floor(vista.width / densita)}px`
      nodo.style.height = `${Math.floor(vista.height / densita)}px`

      disegno = pagina.render({ canvasContext: nodo.getContext('2d'), viewport: vista })
      disegno.promise.catch(() => {})
    })

    return () => {
      annullato = true
      disegno?.cancel()
    }
  }, [documento, numero, scala])

  return (
    <div className="foglio" ref={involucro}>
      <canvas ref={tela} />
      <span className="numero">{numero}</span>
    </div>
  )
}
