import { describe, expect, it } from 'vitest'

import { reminderMessageFor, shouldRemindOnOpen } from './notifications'
import type { StreakStatus } from './domain/rewards'

/** Copia del aviso: mas urgente cuando la racha se apaga hoy mismo. */

describe('reminderMessageFor', () => {
  it('racha en riesgo: menciona los dias y que se salva hoy', () => {
    const status: StreakStatus = { days: 5, atRisk: true, lost: false }
    expect(reminderMessageFor(status)).toBe('Tu racha de 5 días se apaga hoy. Una lección corta la salva.')
  })

  it('racha en riesgo con un solo dia: singular', () => {
    const status: StreakStatus = { days: 1, atRisk: true, lost: false }
    expect(reminderMessageFor(status)).toContain('1 día')
  })

  it('racha perdida: no culpa, invita a empezar otra', () => {
    const status: StreakStatus = { days: 0, atRisk: false, lost: true }
    expect(reminderMessageFor(status)).toBe('Tu racha se reinició, pero hoy es un buen día para empezar otra.')
  })

  it('racha activa sin riesgo: menciona los dias seguidos', () => {
    const status: StreakStatus = { days: 3, atRisk: false, lost: false }
    expect(reminderMessageFor(status)).toContain('3 días seguidos')
  })

  it('sin racha ni historia: copia generica', () => {
    const status: StreakStatus = { days: 0, atRisk: false, lost: false }
    expect(reminderMessageFor(status)).toBe('Una lección corta y hoy también cuenta.')
  })
})

describe('shouldRemindOnOpen', () => {
  const base = {
    enabled: true,
    reminderHour: 20,
    lastActivityEpochDay: null,
    today: 100,
    now: new Date('2026-01-01T21:00:00'),
  }

  it('no avisa si el recordatorio esta desactivado', () => {
    expect(shouldRemindOnOpen({ ...base, enabled: false })).toBe(false)
  })

  it('no avisa si ya se estudio hoy', () => {
    expect(shouldRemindOnOpen({ ...base, lastActivityEpochDay: 100 })).toBe(false)
  })

  it('no avisa antes de la hora elegida', () => {
    expect(shouldRemindOnOpen({ ...base, now: new Date('2026-01-01T19:00:00') })).toBe(false)
  })

  it('avisa si no se estudio hoy y ya paso la hora', () => {
    expect(shouldRemindOnOpen(base)).toBe(true)
  })
})
