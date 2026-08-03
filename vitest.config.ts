import { defineConfig } from 'vitest/config'

/*
 * Entorno node con un localStorage minimo en vez de jsdom: lo que se prueba es
 * el dominio y el store reales, no el DOM. Asi la suite arranca en milisegundos
 * y la persistencia sigue siendo la de verdad, migraciones incluidas.
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
})
