import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'

import {
  disableBackgroundReminder,
  enableBackgroundReminder,
  reminderSupport,
  requestNotificationPermission,
  type ReminderSupport,
} from '../../core/notifications'

import type { ThemePreference } from '../../core/store/useMirabiStore'
import { XP_PER_GOAL_MINUTE, useMirabiStore } from '../../core/store/useMirabiStore'
import { isSpeechAvailable } from '../../core/audio/speech'
import { REMINDER_HOUR_OPTIONS, usualPracticeHour } from '../../core/domain/practiceHours'
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
  const exportProgress = useMirabiStore((state) => state.exportProgress)
  const importProgress = useMirabiStore((state) => state.importProgress)

  const reminderEnabled = useMirabiStore((state) => state.reminderEnabled)
  const reminderHour = useMirabiStore((state) => state.reminderHour)
  const setReminder = useMirabiStore((state) => state.setReminder)
  const recentActivityHours = useMirabiStore((state) => state.recentActivityHours)
  const suggestedHour = usualPracticeHour(recentActivityHours)

  const [name, setName] = useState(displayName ?? '')
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [dataMessage, setDataMessage] = useState<string | null>(null)
  const [support, setSupport] = useState<ReminderSupport>('UNSUPPORTED')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void reminderSupport().then(setSupport)
  }, [])

  /*
   * Se dice exactamente lo que va a pasar. Prometer un aviso en segundo plano
   * en un navegador que no lo soporta es la peor version de esta funcion.
   */
  const reminderNote =
    support === 'UNSUPPORTED'
      ? 'Este navegador no permite notificaciones.'
      : !reminderEnabled
        ? 'Sin recordatorio.'
        : support === 'BACKGROUND'
          ? 'Aviso en segundo plano una vez al día, y también al abrir la app.'
          : 'Tu navegador solo avisa al abrir la app: instálala para recibirlo en segundo plano.'

  const toggleReminder = async (enabled: boolean) => {
    if (!enabled) {
      setReminder(false)
      await disableBackgroundReminder()
      return
    }
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      setReminder(false)
      setDataMessage('Sin permiso de notificaciones no podemos avisarte.')
      return
    }
    setReminder(true)
    await enableBackgroundReminder()
  }

  /** Descarga local: nada sale de este navegador. */
  const downloadBackup = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mirabi-progreso-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setDataMessage('Copia descargada.')
  }

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const ok = importProgress(await file.text())
    setDataMessage(
      ok ? 'Progreso restaurado.' : 'Ese fichero no es una copia de Mirabi válida.',
    )
  }

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

      <SectionTitle>Recordatorio diario</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <label className="flex items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Avísame si no he estudiado</span>
            <span className="mt-0.5 block text-xs text-[var(--on-surface-variant)]">
              {reminderNote}
            </span>
          </span>
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(event) => void toggleReminder(event.target.checked)}
            className="h-6 w-6 shrink-0 accent-[var(--primary)]"
          />
        </label>

        {reminderEnabled && (
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-[var(--on-surface-variant)]">
              A partir de las
            </span>
            <select
              value={reminderHour}
              onChange={(event) => setReminder(true, Number(event.target.value))}
              className="mt-1 w-full rounded-[16px] border border-[var(--outline)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)]"
            >
              {REMINDER_HOUR_OPTIONS.map((hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
        )}

        {reminderEnabled && suggestedHour !== null && suggestedHour !== reminderHour && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-[var(--surface-variant)] px-4 py-3">
            <span className="text-xs text-[var(--on-surface-variant)]">
              Sueles practicar sobre las {String(suggestedHour).padStart(2, '0')}:00
            </span>
            <button
              type="button"
              onClick={() => setReminder(true, suggestedHour)}
              className="shrink-0 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--on-primary)]"
            >
              Usar esa hora
            </button>
          </div>
        )}
      </MirabiCard>

      <SectionTitle>Copia de seguridad</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <p className="text-sm font-semibold">Tu progreso vive solo en este navegador</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Sin cuenta no hay sincronización: si limpias los datos del navegador o cambias de
          dispositivo, se pierde. Guarda un fichero de vez en cuando.
        </p>
        <div className="mt-3 flex gap-2">
          <MirabiButton variant="secondary" onClick={downloadBackup}>
            Exportar
          </MirabiButton>
          <MirabiButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Importar
          </MirabiButton>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={restoreBackup}
        />
        {dataMessage && (
          <p role="status" className="mt-3 text-xs font-semibold text-[var(--primary)]">
            {dataMessage}
          </p>
        )}
      </MirabiCard>

      <SectionTitle>Datos</SectionTitle>
      <MirabiCard className="p-5">
        <p className="text-sm font-semibold">Reiniciar progreso</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Borra racha, XP, Sakura, dominio y repasos de este navegador. Tu nombre, el tema y el
          objetivo diario se mantienen. No se puede deshacer.
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

      {/*
        Reconocimiento de fuentes. No es una cortesia: la licencia de KANJIDIC2
        lo exige, y la app no puede servir sus 2.136 kanji sin decir de donde
        salen.
      */}
      <SectionTitle>Fuentes</SectionTitle>
      <MirabiCard className="mt-2 p-5">
        <p className="text-sm font-semibold">Datos de kanji</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Los kanji, sus lecturas y sus significados vienen de KANJIDIC2, del{' '}
          <a
            className="font-semibold text-[var(--primary)] underline"
            href="https://www.edrdg.org/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Electronic Dictionary Research and Development Group
          </a>
          , bajo licencia CC BY-SA 4.0. Los significados en español los compiló Francisco Gutiérrez.
        </p>
      </MirabiCard>
    </Screen>
  )
}
