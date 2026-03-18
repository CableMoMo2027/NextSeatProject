import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['nextseat.cableskr.space', 'api.cabkeskr.space'], // เพิ่มบรรทัดนี้เพื่ออนุญาตให้เข้าผ่านโดเมนนี้ได้
    proxy: {
      '/users': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/movies': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/screenings': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/bookings': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/payments': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/places': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/cinemas': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/translate': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/internal': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/slips': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  }
})
