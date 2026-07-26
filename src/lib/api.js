/**
 * Chiamate al server locale. Sono cinque: se questo file cresce, molto
 * probabilmente sta entrando nel progetto qualcosa che non gli appartiene.
 */

async function json(percorso, opzioni) {
  const risposta = await fetch(percorso, opzioni)
  if (!risposta.ok) {
    const dettaglio = await risposta.json().catch(() => ({}))
    throw new Error(dettaglio.errore || `il server ha risposto ${risposta.status}`)
  }
  return risposta.json()
}

export const leggiStato = () => json('/api/stato')

export const leggiTemplate = () => json('/api/template')

export const chiediCompilazione = (richiesta, segnale) =>
  json('/api/compila', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(richiesta),
    signal: segnale
  })

export async function scaricaPdf() {
  const risposta = await fetch('/api/pdf', { cache: 'no-store' })
  if (!risposta.ok) throw new Error('nessun PDF disponibile')
  return risposta.blob()
}

export async function scaricaSorgenteComposto() {
  const risposta = await fetch('/api/sorgente-composto', { cache: 'no-store' })
  if (!risposta.ok) throw new Error('nessun sorgente composto')
  return risposta.text()
}

export const inviaAsset = (nome, dati) =>
  json('/api/assets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome, dati })
  })

export const svuotaAssets = () => json('/api/assets', { method: 'DELETE' })
