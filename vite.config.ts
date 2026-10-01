import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base relativa para que el build funcione tanto en GitHub Pages como en cualquier subruta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/')
          if (path.split('?')[0].endsWith('.css')) return undefined
          if (!path.includes('/node_modules/')) return undefined
          if (path.includes('/@phosphor-icons/react/')) return 'icons'
          if (path.includes('/@supabase/')) return 'supabase'
          if (
            path.includes('/react/') ||
            path.includes('/react-dom/') ||
            path.includes('/react-router/') ||
            path.includes('/react-router-dom/') ||
            path.includes('/scheduler/') ||
            path.includes('/zustand/')
          ) {
            return 'framework'
          }
          return 'vendor'
        },
      },
    },
  },
})
