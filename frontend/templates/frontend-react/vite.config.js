import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Em produção o Flask serve a partir de /static/dist, então base = '/'
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    // Proxy só é usado no dev local (npm run dev)
    proxy: {
      '/api':        { target: 'http://localhost:5000', changeOrigin: true },
      '/video_feed': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
