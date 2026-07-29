import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { ThemePreference } from '../../core/store/useMirabiStore'
import { XP_PER_GOAL_MINUTE, useMirabiStore } from '../../core/store/useMirabiStore'
import { isSpeechAvailable } from '../../core/audio/speech'
import { MirabiButton, MirabiCard, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
]

const GOALS = [5, 10, 15, 20]

export function SettingsScreen() {
  const theme = useMirabiStore((state) => state.theme)
  const setTheme = useMirabiStore((state) => state.setTheme)
  const audioEnabled = useMirabiStore((state) => state.audioEnabled)
  const setAudioEnabled = useMirabiStore((state) => state.setAudioEnabled)
  const displayName = useMirabiStore((state) => state.displayName)
  const setDisplayName = useMirabiStore((state) => state.setDisplayName)
  const dailyGoalMinutes = useMirabiStore((state) => state.dailyGoalMinutes)
  const setDailyGoalMinutes = useMirabiStore((state) => state.setDailyGoalMinutes)
  const subscriptionType = useMirabiStore((state) => state.subscriptionType)
  const resetProgress = useMirabiStore((state) => state.resetProgress)

  const [name, setName] = useState(displayName ?? '')
  const [confirmingReset, setConfirmingReset] = useState(false)

  return (
    <Screen title="Ajustes">
      <SectionTitle>Cuenta</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <label className="block">
          <span className="text-sm font-semibold">Nombre</span>
          <input
            value={name}
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setDisplayName(name.trim())}
            placeholder="Tu nombre"
            className="mt-1 w-full rounded-[16px] border border-[var(--outline)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)]"
          />
        </label>
        <p className="mt-3 text-xs text-[var(--on-surface-variant)]">
          Mirabi funciona sin cuenta: tu progreso se guarda en este navegador.
        </p>
      </MirabiCard>

      <SectionTitle>Tema</SectionTitle>
      <MirabiCard className="mb-5 p-2">
        <div className="flex gap-1">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={[
                'flex-1 rounded-[14px] py-2.5 text-sm font-semibold transition',
                theme === option.value
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'text-[var(--on-surface-variant)]',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </MirabiCard>

      <SectionTitle>Audio</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Pronunciación</span>
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={(event) => setAudioEnabled(event.target.checked)}
            className="h-6 w-11 appearance-none rounded-full bg-[var(--surface-variant)] transition checked:bg-[var(--primary)] relative before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition checked:before:translate-x-5"
          />
        </label>
        {!isSpeechAvailable() && (
          <p className="mt-3 text-xs text-[var(--on-surface-variant)]">
            Este navegador no tiene una voz japonesa instalada, así que los botones de audio no
            aparecen.
          </p>
        )}
      </MirabiCard>

      <SectionTitle>Objetivo diario</SectionTitle>
      <MirabiCard className="mb-5 p-2">
        <div className="flex gap-1">
          {GOALS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setDailyGoalMinutes(minutes)}
              className={[
                'flex-1 rounded-[14px] py-2.5 text-sm font-semibold transition',
                dailyGoalMinutes === minutes
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'text-[var(--on-surface-variant)]',
              ].join(' ')}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <p className="px-3 py-2 text-xs text-[var(--on-surface-variant)]">
          Equivale a {dailyGoalMinutes * XP_PER_GOAL_MINUTE} XP al día.
        </p>
      </MirabiCard>

      <SectionTitle>Mirabi Plus</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <p className="text-sm font-semibold">
          {subscriptionType === 'PLUS' ? 'Plus activo' : 'Plan gratuito'}
        </p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Plus mejora la comodidad. Nunca bloquea el aprendizaje.
        </p>
        <Link
          to="/premium"
          className="mt-3 block text-sm font-semibold text-[var(--primary)]"
        >
          Ver detalles →
        </Link>
      </MirabiCard>

      <SectionTitle>Tienda Sakura</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <Link to="/tienda" className="text-sm font-semibold text-[var(--primary)]">
          Abrir tienda →
        </Link>
      </MirabiCard>

      <SectionTitle>Datos</SectionTitle>
      <MirabiCard className="p-5">
        <p className="text-sm font-semibold">Reiniciar progreso</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Borra racha, XP, Sakura, dominio y repasos de este navegador. No se puede deshacer.
        </p>
        {confirmingReset ? (
          <div className="mt-3 flex gap-2">
            <MirabiButton
              variant="danger"
              onClick={() => {
                resetProgress()
                setConfirmingReset(false)
              }}
            >
              Sí, borrar todo
            </MirabiButton>
            <MirabiButton variant="secondary" onClick={() => setConfirmingReset(false)}>
              Cancelar
            </MirabiButton>
          </div>
        ) : (
          <MirabiButton className="mt-3" variant="secondary" onClick={() => setConfirmingReset(true)}>
            Reiniciar progreso
          </MirabiButton>
        )}
      </MirabiCard>
    </Screen>
  )
}
