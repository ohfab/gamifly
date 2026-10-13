import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // three.js is large but only loaded lazily with the 3D pages
    chunkSizeWarningLimit: 1400,
  },
})
