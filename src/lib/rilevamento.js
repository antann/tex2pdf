/**
 * Riconoscimento del tipo di sorgente.
 *
 * Il pannello accetta due cose diverse: un corpo, a cui il template aggiunge il
 * preambolo, e un documento già completo, che porta il proprio. La distinzione
 * si mostra sempre in interfaccia: applicarla di nascosto darebbe l'impressione
 * che i template «a volte non funzionino».
 */

/** Toglie i commenti, perché un `\documentclass` commentato non conta. */
function senzaCommenti(sorgente) {
  return sorgente.replace(/(^|[^\\])%.*$/gm, '$1')
}

export function rilevaModalita(sorgente) {
  return /\\documentclass\s*(\[[^\]]*\])?\s*\{[^}]+\}/.test(senzaCommenti(sorgente))
    ? 'completo'
    : 'corpo'
}

/**
 * Separa un documento completo nelle due parti che servono alla modalità corpo:
 * ciò che sta fra `\begin{document}` e `\end{document}` diventa il corpo, il
 * preambolo dell'utente (meno la riga di classe) diventa preambolo aggiuntivo.
 *
 * È un'operazione distruttiva sul contenuto dell'editor: chi la invoca deve
 * chiederne conferma e tenere da parte il testo di partenza.
 */
export function estraiCorpo(sorgente) {
  const apertura = sorgente.search(/\\begin\s*\{document\}/)
  const chiusura = sorgente.search(/\\end\s*\{document\}/)
  if (apertura < 0) return null

  const dopoApertura = sorgente.slice(apertura).replace(/^\\begin\s*\{document\}[^\n]*\n?/, '')
  const corpo = (chiusura > apertura
    ? dopoApertura.slice(0, dopoApertura.search(/\\end\s*\{document\}/))
    : dopoApertura
  ).replace(/^\n+/, '')

  const preambolo = sorgente
    .slice(0, apertura)
    .replace(/\\documentclass\s*(\[[^\]]*\])?\s*\{[^}]+\}[^\n]*\n?/, '')
    .trim()

  return { corpo, aggiunte: preambolo }
}
