import { describe, expect, it } from 'vitest'

import { REMINDER_HOUR_OPTIONS, usualPracticeHour } from './practiceHours'

/** Hora sugerida para el recordatorio: la mas frecuente, redondeada a una opcion del selector. */

describe('usualPracticeHour', () => {
  it('con menos de 3 muestras no sugiere nada', () => {
    expect(usualPracticeHour([20, 20])).toBeNull()
  })

  it('devuelve la hora con mas repeticiones', () => {
    expect(usualPracticeHour([20, 20, 21, 20])).toBe(20)
  })

  it('redondea cada muestra a la opcion mas cercana antes de contar', () => {
    // 13 esta a 1 hora de 12 y a 2 de 15: cae en el cajon de las 12.
    expect(usualPracticeHour([13, 13, 13])).toBe(12)
  })

  it('en un empate, gana la opcion que aparece primero en la lista', () => {
    expect(usualPracticeHour([8, 8, 20, 20], [8, 12, 15, 18, 20, 21, 22])).toBe(8)
  })

  it('acepta una lista de candidatos personalizada', () => {
    expect(usualPracticeHour([9, 9, 9], [9, 17])).toBe(9)
  })

  it('las opciones por defecto son las que ya usaba el selector de Ajustes', () => {
    expect(REMINDER_HOUR_OPTIONS).toEqual([8, 12, 15, 18, 20, 21, 22])
  })
})
