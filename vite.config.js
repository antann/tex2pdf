import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In sviluppo l'interfaccia sta su 5173 e il server di compilazione su 4180:
// il proxy evita di dover parlare di CORS per una cosa che gira tutta in locale.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:4180' }
  },
  build: { outDir: 'dist', emptyOutDir: true }
})
