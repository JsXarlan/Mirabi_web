import { supabase } from '../supabase/client'
import { useMirabiStore } from '../store/useMirabiStore'
import { reconcileOnSignIn } from '../sync/syncEngine'

/**
 * Orquesta la sesion de Supabase: anonima desde el arranque, sin bloquear la
 * app si falla o tarda (sigue funcionando 100% desde localStorage), y
 * mantiene el authSlice del store como espejo de lo que reporta
 * onAuthStateChange.
 */
export function initAuth(): void {
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null
    if (user) {
      useMirabiStore.getState().setAuthSession({
        userId: user.id,
        isAnonymous: user.is_anonymous ?? false,
        email: user.email ?? null,
      })
    } else {
      useMirabiStore.getState().setAuthStatus('ready')
    }
  })

  void bootstrap()
}

async function bootstrap(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const existingUserId = data.session?.user.id

    if (!existingUserId) {
      const { data: anon, error } = await supabase.auth.signInAnonymously()
      if (error || !anon.session) {
        useMirabiStore.getState().setAuthStatus('error')
        return
      }
      await reconcileOnSignIn(anon.session.user.id)
      return
    }

    await reconcileOnSignIn(existingUserId)
  } catch {
    // Sin red, Supabase caido, etc.: la app sigue 100% usable desde localStorage.
    useMirabiStore.getState().setAuthStatus('error')
  }
}

export type LinkEmailResult =
  | { ok: true }
  | { ok: false; reason: 'already_registered'; message: string }
  | { ok: false; reason: 'error'; message: string }

/**
 * Primer paso de "crear cuenta": vincula un email a la sesion anonima
 * actual. Dispara el correo de confirmacion de Supabase (Confirm email esta
 * activado en el proyecto); la contrasena se fija despues, en
 * `setAccountPassword`, una vez confirmado.
 */
export async function linkEmailToAnonymousUser(email: string): Promise<LinkEmailResult> {
  const { error } = await supabase.auth.updateUser({ email })
  if (error) {
    if (/already.*registered|already.*exists/i.test(error.message)) {
      return {
        ok: false,
        reason: 'already_registered',
        message: 'Ese email ya tiene una cuenta. Iniciá sesión en vez de crear una nueva.',
      }
    }
    if (/rate limit/i.test(error.message)) {
      return {
        ok: false,
        reason: 'error',
        message: 'Se enviaron demasiados correos en poco tiempo. Probá de nuevo en unos minutos.',
      }
    }
    return { ok: false, reason: 'error', message: error.message }
  }
  useMirabiStore.getState().setPendingEmailConfirmation(email)
  return { ok: true }
}

export async function setAccountPassword(password: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, message: error.message }
  useMirabiStore.getState().setPendingEmailConfirmation(null)
  return { ok: true }
}

/**
 * Para el caso "ese email ya tiene cuenta": inicia sesion en la cuenta
 * existente. El progreso de la sesion anonima actual NO se mezcla
 * automaticamente (evita pisar datos por error) -- queda disponible para
 * exportar a mano desde Ajustes si hace falta rescatarlo.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

/** Requiere el provider Google configurado en el dashboard (Authentication → Providers). */
export async function linkGoogleIdentity(): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.auth.linkIdentity({ provider: 'google' })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}
