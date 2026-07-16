import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: nombre del repo, porque se publica en GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: '/kaizentransform/',
  build: { outDir: 'dist' },
})
