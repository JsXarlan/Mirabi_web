import { supabase } from '../supabase/client'
import { useMirabiStore } from '../store/useMirabiStore'

/**
 * Sincroniza el progreso con Supabase reusando exportProgress/importProgress
 * tal cual (el mismo backup ya auditado que usa el boton de Ajustes), en vez
 * de duplicar el modelo de progreso en una tabla normalizada. Local sigue
 * siendo la fuente de verdad: esto solo empuja una copia a
 * `progress_snapshots`, con debounce para no disparar una llamada de red por
 * cada `answerExercise`.
 */

const DEBOUNCE_MS = 4_000
const PLATFORM = 'web'

let pushTimer: ReturnType<typeof setTimeout> | null = null
let started = false

export function initSync(): void {
  if (started) return
  started = true

  useMirabiStore.subscribe(() => schedulePush())
  window.addEventListener('online', () => void pushNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void pushNow()
  })
  window.addEventListener('beforeunload', () => void pushNow())
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void pushNow(), DEBOUNCE_MS)
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

async function pushNow(): Promise<void> {
  const userId = await currentUserId()
  if (!userId) return

  const exported = JSON.parse(useMirabiStore.getState().exportProgress()) as {
    version: number
    state: Record<string, unknown>
  }

  await supabase.from('progress_snapshots').upsert({
    user_id: userId,
    platform: PLATFORM,
    data: exported.state,
    schema_version: exported.version,
  })
}

/**
 * Se llama una sola vez, justo despues de que exista sesion (anonima o no).
 * Si el dispositivo es nuevo (nada de progreso local todavia) y ya hay un
 * snapshot remoto, lo trae. Si no, sube lo local -- cubre tanto "primer
 * arranque en este dispositivo, sin remoto" como "dispositivo con progreso
 * real, corrige/crea el remoto".
 */
export async function reconcileOnSignIn(userId: string): Promise<void> {
  const local = useMirabiStore.getState()
  const looksFresh = local.totalXp === 0 && local.totalLessonsCompleted === 0

  if (looksFresh) {
    const { data } = await supabase
      .from('progress_snapshots')
      .select('data, schema_version')
      .eq('user_id', userId)
      .eq('platform', PLATFORM)
      .maybeSingle()

    if (data) {
      const imported = local.importProgress(
        JSON.stringify({ version: data.schema_version, state: data.data }),
      )
      if (imported) return
    }
  }

  await pushNow()
}
