import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/merchants': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/orders': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/labels': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/payments': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/tracking': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/adminpanel': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/secureupi': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
