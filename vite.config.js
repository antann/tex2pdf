import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Il documento parla solo con il server locale. `blob:` compare dove serve a
// pdf.js: il PDF arriva come blob e il suo lavoratore parte da lì.
const POLITICA = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self' blob:",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'self' blob:"
].join('; ')

/**
 * La politica vale solo nella build, che è ciò che finisce nella finestra.
 * In sviluppo il plugin di React inserisce uno script in linea per la ricarica
 * a caldo: applicare lì la stessa politica significherebbe o allentarla fino a
 * renderla inutile, o rompere il server di sviluppo.
 */
const politicaSicurezza = () => ({
  name: 'politica-sicurezza',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${POLITICA}" />`
    )
})

// In sviluppo l'interfaccia sta su 5173 e il server di compilazione su 4180:
// il proxy evita di dover parlare di CORS per una cosa che gira tutta in locale.
export default defineConfig({
  plugins: [react(), politicaSicurezza()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:4180' }
  },
  build: { outDir: 'dist', emptyOutDir: true }
})
