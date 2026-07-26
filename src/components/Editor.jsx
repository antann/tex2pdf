import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { tags } from '@lezer/highlight'
import { Decoration } from '@codemirror/view'

/**
 * Editor del sorgente.
 *
 * È l'unica dipendenza pesante del progetto. La giustificazione: numerazione
 * righe, evidenziazione, marcatura delle righe in errore e salto a una riga
 * sono quattro cose che in una `<textarea>` si riscrivono da zero, male.
 */

const segnaErrori = StateEffect.define()

const righeErrate = StateField.define({
  create: () => Decoration.none,
  update(decorazioni, transazione) {
    decorazioni = decorazioni.map(transazione.changes)
    for (const effetto of transazione.effects) {
      if (!effetto.is(segnaErrori)) continue
      const marchi = []
      for (const numero of effetto.value) {
        if (numero < 1 || numero > transazione.state.doc.lines) continue
        const riga = transazione.state.doc.line(numero)
        marchi.push(Decoration.line({ class: 'riga-errata' }).range(riga.from))
      }
      decorazioni = Decoration.set(marchi, true)
    }
    return decorazioni
  },
  provide: (campo) => EditorView.decorations.from(campo)
})

const colori = HighlightStyle.define([
  { tag: tags.tagName, color: '#7fd4e4' },
  { tag: tags.keyword, color: '#7fd4e4' },
  { tag: tags.comment, color: '#5b636e', fontStyle: 'italic' },
  { tag: tags.bracket, color: '#d0a12a' },
  { tag: tags.atom, color: '#e0a45e' },
  { tag: tags.string, color: '#c3cad2' },
  { tag: tags.number, color: '#e0a45e' },
  { tag: tags.typeName, color: '#d0a12a' }
])

const aspetto = EditorView.theme(
  {
    '&': { height: '100%', fontSize: '12.5px', backgroundColor: 'transparent', color: '#c3cad2' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.55' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#4c545e', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,.035)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#8d959f' },
    '.cm-cursor': { borderLeftColor: '#d0a12a' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(208,161,42,.22)'
    },
    '.riga-errata': { backgroundColor: 'rgba(224,72,61,.16)', boxShadow: 'inset 2px 0 0 #e0483d' }
  },
  { dark: true }
)

export default function Editor({ valore, onCambia, errori = [], vaiA }) {
  const contenitore = useRef(null)
  const vista = useRef(null)
  const ultimoValore = useRef(valore)

  useEffect(() => {
    const stato = EditorState.create({
      doc: valore,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        StreamLanguage.define(stex),
        syntaxHighlighting(colori),
        righeErrate,
        aspetto,
        EditorView.lineWrapping,
        EditorView.updateListener.of((aggiornamento) => {
          if (!aggiornamento.docChanged) return
          const testo = aggiornamento.state.doc.toString()
          ultimoValore.current = testo
          onCambia(testo)
        })
      ]
    })
    vista.current = new EditorView({ state: stato, parent: contenitore.current })
    return () => vista.current?.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Il testo può cambiare da fuori (apertura di un file, estrazione del corpo):
  // in quel caso si riscrive il documento, ma non mentre lo sta scrivendo
  // l'utente, o si perderebbe la posizione del cursore a ogni tasto premuto.
  useEffect(() => {
    const editor = vista.current
    if (!editor || valore === ultimoValore.current) return
    ultimoValore.current = valore
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: valore } })
  }, [valore])

  useEffect(() => {
    const editor = vista.current
    if (!editor) return
    editor.dispatch({ effects: segnaErrori.of(errori) })
  }, [errori])

  useEffect(() => {
    const editor = vista.current
    if (!editor || !vaiA?.riga) return
    const numero = Math.min(Math.max(vaiA.riga, 1), editor.state.doc.lines)
    const riga = editor.state.doc.line(numero)
    editor.dispatch({
      selection: { anchor: riga.from },
      effects: EditorView.scrollIntoView(riga.from, { y: 'center' })
    })
    editor.focus()
  }, [vaiA])

  return <div className="editor" ref={contenitore} />
}
