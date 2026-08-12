import { supabase } from '../supabase/client'
import { useMirabiStore } from '../store/useMirabiStore'
import { reconcileOnManualSignIn, reconcileOnSignIn } from '../sync/syncEngine'

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

export type SignInResult =
  | { ok: true; progressRestored: boolean }
  | { ok: false; message?: string }

/**
 * Para el caso "ese email ya tiene cuenta": inicia sesion en la cuenta
 * existente. El progreso de la sesion anonima actual NO se pisa el remoto a
 * ciegas: `reconcileOnManualSignIn` trae el snapshot de la cuenta real si
 * existe (lo prefiere sobre el local); si el usuario queria rescatar el
 * progreso local de todas formas, puede exportarlo a mano desde Ajustes
 * antes de iniciar sesion.
 */
export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, message: error.message }

  const userId = data.user?.id
  const outcome = userId ? await reconcileOnManualSignIn(userId) : 'kept-local'
  return { ok: true, progressRestored: outcome === 'restored-remote' }
}

/** Requiere el provider Google configurado en el dashboard (Authentication → Providers). */
export async function linkGoogleIdentity(): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    // Sin ruta de callback dedicada: vuelve al origen y la sesion se
    // detecta sola (detectSessionInUrl), onAuthStateChange hace el resto.
    options: { redirectTo: window.location.origin + window.location.pathname },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  useMirabiStore.getState().clearAuthSession()
}
