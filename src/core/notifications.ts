/**
 * Recordatorio diario.
 *
 * Conviene ser honesto con lo que la web puede hacer: sin servidor no hay push,
 * y las notificaciones programadas del navegador no existen como tal. Lo que si
 * hay es Periodic Background Sync, y solo en Chromium con la app instalada.
 *
 * Asi que esto hace dos cosas y no promete una tercera:
 *   1. registra el sync periodico cuando el navegador lo permite, y
 *   2. avisa al abrir la app si hoy todavia no se ha estudiado.
 *
 * La pantalla de Ajustes dice exactamente cual de las dos esta activa, porque
 * un recordatorio que la persona cree tener y no llega es peor que ninguno.
 */

export type ReminderSupport = 'BACKGROUND' | 'ON_OPEN' | 'UNSUPPORTED'

interface PeriodicSyncManager {
  register: (tag: string, options?: { minInterval: number }) => Promise<void>
  unregister: (tag: string) => Promise<void>
  getTags: () => Promise<string[]>
}

function periodicSync(
  registration: ServiceWorkerRegistration,
): PeriodicSyncManager | null {
  return (registration as ServiceWorkerRegistration & {
    periodicSync?: PeriodicSyncManager
  }).periodicSync ?? null
}

export const REMINDER_TAG = 'mirabi-daily-reminder'

export function notificationsAvailable(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | null {
  return notificationsAvailable() ? Notification.permission : null
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsAvailable()) return 'denied'
  return Notification.requestPermission()
}

/*
 * `serviceWorker.ready` no vale para preguntar: si no hay worker registrado
 * —en desarrollo, o si el registro fallo— la promesa no resuelve nunca y la
 * pantalla se queda diciendo que no se puede avisar. `getRegistration` responde
 * siempre, con undefined si no hay ninguno.
 */
async function currentRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null
  } catch {
    return null
  }
}

/** Que nivel de recordatorio puede ofrecer de verdad este navegador. */
export async function reminderSupport(): Promise<ReminderSupport> {
  if (!notificationsAvailable()) return 'UNSUPPORTED'
  const registration = await currentRegistration()
  return registration && periodicSync(registration) ? 'BACKGROUND' : 'ON_OPEN'
}

/** Pide el sync periodico. Devuelve false si el navegador no lo concede. */
export async function enableBackgroundReminder(): Promise<boolean> {
  try {
    const registration = await currentRegistration()
    if (!registration) return false
    const sync = periodicSync(registration)
    if (!sync) return false
    // Una vez al dia es el minimo util; el navegador decide cuando de verdad.
    await sync.register(REMINDER_TAG, { minInterval: 24 * 60 * 60 * 1000 })
    return true
  } catch {
    return false
  }
}

export async function disableBackgroundReminder(): Promise<void> {
  try {
    const registration = await currentRegistration()
    await periodicSync(registration ?? ({} as ServiceWorkerRegistration))?.unregister(REMINDER_TAG)
  } catch {
    // Si no estaba registrado, no hay nada que deshacer.
  }
}

/**
 * Aviso al abrir: se muestra si hoy no se ha estudiado y ya pasó la hora
 * elegida. Es lo unico que funciona en todos los navegadores.
 */
export function shouldRemindOnOpen(input: {
  enabled: boolean
  reminderHour: number
  lastActivityEpochDay: number | null
  today: number
  now: Date
}): boolean {
  if (!input.enabled) return false
  if (input.lastActivityEpochDay === input.today) return false
  return input.now.getHours() >= input.reminderHour
}

export function showReminderNotification(streakDays: number): void {
  if (!notificationsAvailable() || Notification.permission !== 'granted') return
  const body =
    streakDays > 0
      ? `Llevas ${streakDays} ${streakDays === 1 ? 'día' : 'días'} seguidos. Una lección corta lo mantiene.`
      : 'Una lección corta y hoy también cuenta.'
  new Notification('Mirabi', { body, icon: './icon.svg', tag: REMINDER_TAG })
}
