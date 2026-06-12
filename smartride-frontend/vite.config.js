import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // polyfill global used by sockjs-client
    global: 'window'
  },
  server: {
    port: 5173,
    proxy: {
      // FIX: Backend runs on 8081, not 8080
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
