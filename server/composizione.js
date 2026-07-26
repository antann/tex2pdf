/**
 * Composizione del documento da consegnare al motore.
 *
 * La struttura di `documento.tex` è identica per tutti i template: cambia il
 * contenuto dei file inclusi, mai il loro ordine. Se un template avesse bisogno
 * di una struttura sua, sarebbe la struttura a essere sbagliata, non il
 * template.
 *
 * Il corpo scritto dall'utente finisce in `corpo.tex` e viene incluso, non
 * concatenato: così TeX riporta gli errori come «corpo.tex riga N», dove N
 * corrisponde alla riga nell'editor senza scostamenti da calcolare.
 */

/** Formati carta, misure in millimetri. */
export const FORMATI = {
  a4: { larghezza: 210, altezza: 297, nome: 'A4' },
  letter: { larghezza: 215.9, altezza: 279.4, nome: 'Letter' }
}

export const LINGUE = {
  italian: 'Italiano',
  english: 'Inglese',
  french: 'Francese',
  german: 'Tedesco',
  spanish: 'Spagnolo'
}

/**
 * Protegge un valore destinato a diventare argomento di una macro.
 * Riguarda solo i metadati compilati nel modulo: il corpo è LaTeX e resta
 * intatto, altrimenti il programma diventerebbe inutile.
 */
export function proteggi(valore) {
  return String(valore ?? '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .trim()
}

const CAMPI = ['titolo', 'sottotitolo', 'autore', 'dataDocumento', 'versione', 'riferimento', 'ente']

/**
 * `metadati.tex` — solo definizioni di testo, nessun pacchetto.
 * Un campo non compilato produce comunque un comando definito e vuoto: un
 * comando indefinito farebbe fallire la compilazione per una casella lasciata
 * in bianco, che è un errore dell'utente su cui non ha alcun controllo.
 */
export function componiMetadati(metadati = {}) {
  const righe = ['% generato da TEX2PDF — metadati del documento', '\\makeatletter']
  for (const campo of CAMPI) {
    righe.push(`\\newcommand{\\${campo}}{${proteggi(metadati[campo])}}`)
  }
  righe.push('\\makeatother', '')
  return righe.join('\n')
}

/**
 * `opzioni.tex` — incluso dopo il preambolo del template, quindi ha l'ultima
 * parola su carta, indice e lingua. Il template decide i margini, l'utente
 * decide il foglio.
 */
export function componiOpzioni(opzioni = {}) {
  const formato = FORMATI[opzioni.carta] || FORMATI.a4
  const orizzontale = opzioni.orientamento === 'orizzontale'
  const larghezza = orizzontale ? formato.altezza : formato.larghezza
  const altezza = orizzontale ? formato.larghezza : formato.altezza
  const lingua = LINGUE[opzioni.lingua] ? opzioni.lingua : 'italian'
  const profondita = Number.isInteger(opzioni.profonditaIndice) ? opzioni.profonditaIndice : 2

  return [
    '% generato da TEX2PDF — opzioni scelte nel modulo',
    `\\geometry{paperwidth=${larghezza}mm,paperheight=${altezza}mm}`,
    `\\newif\\ifindice \\indice${opzioni.indice === false ? 'false' : 'true'}`,
    `\\newif\\ifcopertina \\copertina${opzioni.copertina ? 'true' : 'false'}`,
    `\\setcounter{tocdepth}{${profondita}}`,
    `\\setcounter{secnumdepth}{${Math.max(profondita, 2)}}`,
    `\\newcommand{\\piede}{${proteggi(opzioni.piede)}}`,
    `\\usepackage[${lingua}]{babel}`,
    ''
  ].join('\n')
}

/** `documento.tex` in modalità corpo: struttura fissa, uguale per tutti. */
export function componiDocumento(template, opzioni = {}) {
  const opzioniClasse = [...(template.opzioniClasse || [])]
  if (opzioni.fronteRetro) opzioniClasse.push('twoside')
  const elenco = opzioniClasse.length ? `[${opzioniClasse.join(',')}]` : ''

  return [
    '% generato da TEX2PDF — non modificare a mano: viene riscritto a ogni compilazione',
    `\\documentclass${elenco}{${template.classe}}`,
    '\\input{metadati.tex}',
    '\\input{preambolo.tex}',
    '\\input{opzioni.tex}',
    '\\input{aggiunte.tex}',
    '\\begin{document}',
    '\\input{apertura.tex}',
    '\\input{corpo.tex}',
    '\\input{chiusura.tex}',
    '\\end{document}',
    ''
  ].join('\n')
}

export function componiAggiunte(aggiunte) {
  const testo = String(aggiunte || '').trim()
  return `% preambolo aggiuntivo dell'utente\n${testo}\n`
}
