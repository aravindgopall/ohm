import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: { sourcemap: false},
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  }
})
