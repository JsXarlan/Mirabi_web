import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'

import {
  deleteAccount,
  linkEmailToAnonymousUser,
  linkGoogleIdentity,
  setAccountPassword,
  signInWithPassword,
  signOut,
} from '../../core/auth/authManager'
import {
  disableBackgroundReminder,
  enableBackgroundReminder,
  reminderSupport,
  requestNotificationPermission,
  type ReminderSupport,
} from '../../core/notifications'

import type {
  ThemePreference,
  WritingFontStyle,
} from '../../core/store/useMirabiStore'
import {
  XP_PER_GOAL_MINUTE,
  useMirabiStore,
} from '../../core/store/useMirabiStore'
import { isSpeechAvailable } from '../../core/audio/speech'
import {
  REMINDER_HOUR_OPTIONS,
  usualPracticeHour,
} from '../../core/domain/practiceHours'
import { MirabiButton, MirabiCard, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { AppIcon } from '../../ui/Icons'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
]

const WRITING_FONT_STYLES: { value: WritingFontStyle; label: string }[] = [
  { value: 'digital', label: 'Digital' },
  { value: 'traditional', label: 'Tradicional' },
]

const GOALS = [5, 10, 15, 20]

export function SettingsScreen() {
  const theme = useMirabiStore((state) => state.theme)
  const setTheme = useMirabiStore((state) => state.setTheme)
  const writingFontStyle = useMirabiStore((state) => state.writingFontStyle)
  const setWritingFontStyle = useMirabiStore(
    (state) => state.setWritingFontStyle,
  )
  const audioEnabled = useMirabiStore((state) => state.audioEnabled)
  const setAudioEnabled = useMirabiStore((state) => state.setAudioEnabled)
  const displayName = useMirabiStore((state) => state.displayName)
  const setDisplayName = useMirabiStore((state) => state.setDisplayName)
  const dailyGoalMinutes = useMirabiStore((state) => state.dailyGoalMinutes)
  const setDailyGoalMinutes = useMirabiStore(
    (state) => state.setDailyGoalMinutes,
  )
  const subscriptionType = useMirabiStore((state) => state.subscriptionType)
  const authStatus = useMirabiStore((state) => state.authStatus)
  const isAnonymous = useMirabiStore((state) => state.isAnonymous)
  const accountEmail = useMirabiStore((state) => state.email)
  const pendingEmailConfirmation = useMirabiStore(
    (state) => state.pendingEmailConfirmation,
  )
  const resetProgress = useMirabiStore((state) => state.resetProgress)
  const exportProgress = useMirabiStore((state) => state.exportProgress)
  const importProgress = useMirabiStore((state) => state.importProgress)

  const reminderEnabled = useMirabiStore((state) => state.reminderEnabled)
  const reminderHour = useMirabiStore((state) => state.reminderHour)
  const setReminder = useMirabiStore((state) => state.setReminder)
  const recentActivityHours = useMirabiStore(
    (state) => state.recentActivityHours,
  )
  const suggestedHour = usualPracticeHour(recentActivityHours)

  const [name, setName] = useState(displayName ?? '')
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [dataMessage, setDataMessage] = useState<string | null>(null)
  const [support, setSupport] = useState<ReminderSupport>('UNSUPPORTED')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [accountView, setAccountView] = useState<'idle' | 'signup' | 'login'>(
    'idle',
  )
  const [accountEmailInput, setAccountEmailInput] = useState('')
  const [accountPasswordInput, setAccountPasswordInput] = useState('')
  const [accountMessage, setAccountMessage] = useState<string | null>(null)
  const [accountBusy, setAccountBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)

  const submitSignup = async (event: FormEvent) => {
    event.preventDefault()
    setAccountBusy(true)
    setAccountMessage(null)
    const result = await linkEmailToAnonymousUser(accountEmailInput.trim())
    setAccountBusy(false)
    if (!result.ok) {
      setAccountMessage(result.message)
      return
    }
    setAccountMessage(
      'Te enviamos un correo para confirmar tu email. Cuando lo confirmes, volvé acá para elegir tu contraseña.',
    )
    setAccountView('idle')
  }

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault()
    setAccountBusy(true)
    setAccountMessage(null)
    const result = await setAccountPassword(accountPasswordInput)
    setAccountBusy(false)
    setAccountPasswordInput('')
    setAccountMessage(
      result.ok
        ? 'Contraseña guardada. Ya podés iniciar sesión con este email en otro dispositivo.'
        : (result.message ?? 'No se pudo guardar la contraseña.'),
    )
  }

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    setAccountBusy(true)
    setAccountMessage(null)
    const result = await signInWithPassword(
      accountEmailInput.trim(),
      accountPasswordInput,
    )
    setAccountBusy(false)
    setAccountPasswordInput('')
    if (!result.ok) {
      setAccountMessage(result.message ?? 'No se pudo iniciar sesión.')
      return
    }
    setAccountView('idle')
    setAccountMessage(
      result.progressRestored
        ? 'Se restauró tu progreso guardado en esta cuenta.'
        : null,
    )
  }

  const connectGoogle = async () => {
    setAccountBusy(true)
    setAccountMessage(null)
    const result = await linkGoogleIdentity()
    setAccountBusy(false)
    if (!result.ok)
      setAccountMessage(result.message ?? 'No se pudo conectar con Google.')
  }

  const submitSignOut = async () => {
    setAccountBusy(true)
    setAccountMessage(null)
    await signOut()
    setAccountBusy(false)
  }

  const submitDeleteAccount = async () => {
    setAccountBusy(true)
    setDeleteMessage(null)
    const result = await deleteAccount()
    setAccountBusy(false)
    if (!result.ok) {
      setDeleteMessage(result.message ?? 'No se pudo borrar la cuenta.')
      return
    }
    setConfirmingDelete(false)
    // La cuenta y su snapshot remoto ya no existen; el progreso local no debe
    // resucitar en una sesion anonima nueva. Preferencias de la app se quedan.
    resetProgress()
  }

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
      ok
        ? 'Progreso restaurado.'
        : 'Ese fichero no es una copia de Mirabi válida.',
    )
  }

  return (
    <Screen title="Ajustes" wide>
      <div className="settings-layout">
        <nav className="settings-menu" aria-label="Secciones de ajustes">
          {[
            { id: 'account', label: 'Tu cuenta', icon: 'profile' },
            { id: 'appearance', label: 'Apariencia', icon: 'sun' },
            { id: 'study', label: 'Tu aprendizaje', icon: 'target' },
            { id: 'reminders', label: 'Recordatorios', icon: 'calendar' },
            { id: 'backup', label: 'Tus datos', icon: 'cloud' },
            { id: 'sources', label: 'Fuentes', icon: 'words' },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() =>
                document
                  .getElementById(item.id)
                  ?.scrollIntoView({
                    behavior: window.matchMedia(
                      '(prefers-reduced-motion: reduce)',
                    ).matches
                      ? 'instant'
                      : 'smooth',
                    block: 'start',
                  })
              }
            >
              <AppIcon name={item.icon} size={19} />
              {item.label}
            </button>
          ))}
        </nav>
        <div>
          <SectionTitle id="account">Cuenta</SectionTitle>
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
            <div className="mt-4 border-t border-[var(--outline)] pt-4">
              {authStatus === 'error' && (
                <p className="text-xs text-[var(--on-surface-variant)]">
                  Sin sincronización por ahora (sin conexión, o el servicio no
                  está disponible). Tu progreso sigue a salvo en este navegador.
                </p>
              )}

              {authStatus !== 'error' && !isAnonymous && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-semibold">Cuenta conectada</span>
                    {accountEmail && (
                      <span className="text-[var(--on-surface-variant)]">
                        {' '}
                        · {accountEmail}
                      </span>
                    )}
                  </p>
                  <MirabiButton
                    variant="secondary"
                    disabled={accountBusy}
                    onClick={() => void submitSignOut()}
                  >
                    Cerrar sesión
                  </MirabiButton>
                </div>
              )}

              {authStatus !== 'error' && !isAnonymous && (
                <div className="mt-4 rounded-[16px] border border-[var(--outline)] p-4">
                  <p className="text-sm font-semibold">Zona de peligro</p>
                  <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                    Borra tu cuenta y todo su progreso en el servidor, además
                    del progreso de este navegador. Es permanente y no se puede
                    deshacer.
                  </p>
                  {confirmingDelete ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <MirabiButton
                        variant="danger"
                        disabled={accountBusy}
                        onClick={() => void submitDeleteAccount()}
                      >
                        {accountBusy
                          ? 'Borrando…'
                          : 'Sí, borrar mi cuenta y mi progreso'}
                      </MirabiButton>
                      <MirabiButton
                        variant="secondary"
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Cancelar
                      </MirabiButton>
                    </div>
                  ) : (
                    <MirabiButton
                      className="mt-3"
                      variant="danger"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      Borrar mi cuenta
                    </MirabiButton>
                  )}
                  {deleteMessage && (
                    <p
                      role="alert"
                      className="mt-3 text-xs font-semibold text-[var(--secondary)]"
                    >
                      {deleteMessage}
                    </p>
                  )}
                </div>
              )}

              {authStatus !== 'error' &&
                isAnonymous &&
                pendingEmailConfirmation && (
                  <>
                    <p className="text-sm font-semibold">Confirmá tu correo</p>
                    <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                      Te enviamos un enlace a {pendingEmailConfirmation}. Una
                      vez confirmado, elegí tu contraseña acá:
                    </p>
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={(event) => void submitPassword(event)}
                    >
                      <input
                        type="password"
                        aria-label="Contraseña"
                        autoComplete={
                          accountView === 'login'
                            ? 'current-password'
                            : 'new-password'
                        }
                        required
                        minLength={6}
                        placeholder="Contraseña"
                        value={accountPasswordInput}
                        onChange={(event) =>
                          setAccountPasswordInput(event.target.value)
                        }
                        className="min-w-0 flex-1 rounded-[16px] border border-[var(--outline)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                      />
                      <MirabiButton disabled={accountBusy} type="submit">
                        Guardar
                      </MirabiButton>
                    </form>
                  </>
                )}

              {authStatus !== 'error' &&
                isAnonymous &&
                !pendingEmailConfirmation && (
                  <>
                    <p className="text-sm">
                      Tu progreso ya se sincroniza en segundo plano. Creá una
                      cuenta para no perderlo si cambiás de dispositivo o
                      navegador.
                    </p>

                    {accountView === 'idle' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <MirabiButton onClick={() => setAccountView('signup')}>
                          Crear cuenta
                        </MirabiButton>
                        <MirabiButton
                          variant="secondary"
                          onClick={() => setAccountView('login')}
                        >
                          Ya tengo cuenta
                        </MirabiButton>
                        <MirabiButton
                          variant="secondary"
                          disabled={accountBusy}
                          onClick={() => void connectGoogle()}
                        >
                          Continuar con Google
                        </MirabiButton>
                      </div>
                    )}

                    {accountView === 'signup' && (
                      <form
                        className="mt-3 flex flex-col gap-2"
                        onSubmit={(event) => void submitSignup(event)}
                      >
                        <input
                          type="email"
                          aria-label="Correo electrónico"
                          autoComplete="email"
                          required
                          placeholder="tu@email.com"
                          value={accountEmailInput}
                          onChange={(event) =>
                            setAccountEmailInput(event.target.value)
                          }
                          className="w-full rounded-[16px] border border-[var(--outline)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                        />
                        <div className="flex gap-2">
                          <MirabiButton disabled={accountBusy} type="submit">
                            Enviar confirmación
                          </MirabiButton>
                          <MirabiButton
                            variant="secondary"
                            onClick={() => setAccountView('idle')}
                          >
                            Cancelar
                          </MirabiButton>
                        </div>
                      </form>
                    )}

                    {accountView === 'login' && (
                      <form
                        className="mt-3 flex flex-col gap-2"
                        onSubmit={(event) => void submitLogin(event)}
                      >
                        <input
                          type="email"
                          required
                          placeholder="tu@email.com"
                          value={accountEmailInput}
                          onChange={(event) =>
                            setAccountEmailInput(event.target.value)
                          }
                          className="w-full rounded-[16px] border border-[var(--outline)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                        />
                        <input
                          type="password"
                          required
                          placeholder="Contraseña"
                          value={accountPasswordInput}
                          onChange={(event) =>
                            setAccountPasswordInput(event.target.value)
                          }
                          className="w-full rounded-[16px] border border-[var(--outline)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                        />
                        <div className="flex gap-2">
                          <MirabiButton disabled={accountBusy} type="submit">
                            Iniciar sesión
                          </MirabiButton>
                          <MirabiButton
                            variant="secondary"
                            onClick={() => setAccountView('idle')}
                          >
                            Cancelar
                          </MirabiButton>
                        </div>
                      </form>
                    )}
                  </>
                )}

              {accountMessage && (
                <p
                  role="status"
                  className="mt-3 text-xs font-semibold text-[var(--primary)]"
                >
                  {accountMessage}
                </p>
              )}
            </div>
          </MirabiCard>

          <SectionTitle id="appearance">Tema</SectionTitle>
          <MirabiCard className="mb-5 p-2">
            <div className="flex gap-1">
              {THEMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={theme === option.value}
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

          <SectionTitle>Escritura</SectionTitle>
          <MirabiCard className="mb-5 p-2">
            <div className="flex gap-1">
              {WRITING_FONT_STYLES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={writingFontStyle === option.value}
                  onClick={() => setWritingFontStyle(option.value)}
                  className={[
                    'flex-1 rounded-[14px] py-2.5 text-sm font-semibold transition',
                    writingFontStyle === option.value
                      ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                      : 'text-[var(--on-surface-variant)]',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-3 px-2 text-xs text-[var(--on-surface-variant)]">
              Tipo de letra y trazo de la práctica de escritura: digital
              (geométrico) o tradicional (estilo pincel).
            </p>
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
                Este navegador no tiene una voz japonesa instalada, así que los
                botones de audio no aparecen.
              </p>
            )}
          </MirabiCard>

          <SectionTitle id="study">Objetivo diario</SectionTitle>
          <MirabiCard className="mb-5 p-2">
            <div className="flex gap-1">
              {GOALS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={dailyGoalMinutes === minutes}
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
            <Link
              to="/tienda"
              className="text-sm font-semibold text-[var(--primary)]"
            >
              Abrir tienda →
            </Link>
          </MirabiCard>

          <SectionTitle id="reminders">Recordatorio diario</SectionTitle>
          <MirabiCard className="mb-5 p-5">
            <label className="flex items-center justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  Avísame si no he estudiado
                </span>
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
                  onChange={(event) =>
                    setReminder(true, Number(event.target.value))
                  }
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

            {reminderEnabled &&
              suggestedHour !== null &&
              suggestedHour !== reminderHour && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-[var(--surface-variant)] px-4 py-3">
                  <span className="text-xs text-[var(--on-surface-variant)]">
                    Sueles practicar sobre las{' '}
                    {String(suggestedHour).padStart(2, '0')}:00
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

          <SectionTitle id="backup">Copia de seguridad</SectionTitle>
          <MirabiCard className="mb-5 p-5">
            <p className="text-sm font-semibold">
              Copia de seguridad manual
            </p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              {isAnonymous
                ? 'Tu progreso se guarda en este navegador. Sin una cuenta, podrías perderlo si borras sus datos o cambias de dispositivo. Crea una cuenta para sincronizarlo; también puedes exportar un archivo como respaldo.'
                : 'Tu progreso se sincroniza con tu cuenta. Exporta un archivo como respaldo adicional.'}
            </p>
            <div className="mt-3 flex gap-2">
              <MirabiButton variant="secondary" onClick={downloadBackup}>
                Exportar
              </MirabiButton>
              <MirabiButton
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
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
              <p
                role="status"
                className="mt-3 text-xs font-semibold text-[var(--primary)]"
              >
                {dataMessage}
              </p>
            )}
          </MirabiCard>

          <SectionTitle>Datos</SectionTitle>
          <MirabiCard className="p-5">
            <p className="text-sm font-semibold">Reiniciar progreso</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              Borra racha, XP, Sakura, dominio y repasos de este navegador. Tu
              nombre, el tema y el objetivo diario se mantienen. No se puede
              deshacer.
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
                <MirabiButton
                  variant="secondary"
                  onClick={() => setConfirmingReset(false)}
                >
                  Cancelar
                </MirabiButton>
              </div>
            ) : (
              <MirabiButton
                className="mt-3"
                variant="secondary"
                onClick={() => setConfirmingReset(true)}
              >
                Reiniciar progreso
              </MirabiButton>
            )}
          </MirabiCard>

          {/*
        Reconocimiento de fuentes. No es una cortesia: la licencia de KANJIDIC2
        lo exige, y la app no puede servir sus 2.136 kanji sin decir de donde
        salen.
      */}
          <SectionTitle id="sources">Fuentes</SectionTitle>
          <MirabiCard className="mt-2 p-5">
            <p className="text-sm font-semibold">Datos de kanji</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              Los kanji, sus lecturas y sus significados vienen de KANJIDIC2,
              del{' '}
              <a
                className="font-semibold text-[var(--primary)] underline"
                href="https://www.edrdg.org/"
                target="_blank"
                rel="noreferrer noopener"
              >
                Electronic Dictionary Research and Development Group
              </a>
              , bajo licencia CC BY-SA 4.0. Los significados en español los
              compiló Francisco Gutiérrez.
            </p>
            <p className="mt-3 text-sm font-semibold">Trazos de escritura</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              El orden y la forma de los trazos de hiragana y katakana vienen de{' '}
              <a
                className="font-semibold text-[var(--primary)] underline"
                href="https://kanjivg.tagaini.net/"
                target="_blank"
                rel="noreferrer noopener"
              >
                KanjiVG
              </a>
              , de Ulrich Apel, bajo licencia CC BY-SA 3.0.
            </p>
          </MirabiCard>
        </div>
      </div>
    </Screen>
  )
}
