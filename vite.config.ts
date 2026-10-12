import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('@react-three') || id.includes('camera-controls') || id.includes('three-stdlib')) return 'r3f'
        },
      },
    },
  },
})
