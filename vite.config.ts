import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base relativa para que el build funcione tanto en GitHub Pages como en cualquier subruta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
