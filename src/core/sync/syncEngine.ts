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

/**
 * Se pone en true mientras una reconciliacion esta en curso (arranque o login
 * manual) para que ningun push a medio camino suba datos locales que todavia
 * no se decidio si hay que preferir por sobre el remoto. Un push agendado
 * antes de que empiece se pierde (no se reintenta), pero cualquier cambio de
 * store post-reconciliacion (incluida la propia importacion) vuelve a
 * agendar uno via el subscribe de abajo.
 */
let reconciling = false

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
  if (reconciling) return
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

async function fetchRemoteSnapshot(
  userId: string,
): Promise<{ data: Record<string, unknown>; schema_version: number } | null> {
  const { data } = await supabase
    .from('progress_snapshots')
    .select('data, schema_version')
    .eq('user_id', userId)
    .eq('platform', PLATFORM)
    .maybeSingle()
  return data ?? null
}

/**
 * Se llama una sola vez, justo despues de que exista sesion (anonima o no).
 * Si el dispositivo es nuevo (nada de progreso local todavia) y ya hay un
 * snapshot remoto, lo trae. Si no, sube lo local -- cubre tanto "primer
 * arranque en este dispositivo, sin remoto" como "dispositivo con progreso
 * real, corrige/crea el remoto".
 */
export async function reconcileOnSignIn(userId: string): Promise<void> {
  reconciling = true
  try {
    const local = useMirabiStore.getState()
    const looksFresh = local.totalXp === 0 && local.totalLessonsCompleted === 0

    if (looksFresh) {
      const remote = await fetchRemoteSnapshot(userId)
      if (remote) {
        const imported = local.importProgress(
          JSON.stringify({ version: remote.schema_version, state: remote.data }),
        )
        if (imported) return
      }
    }
  } finally {
    reconciling = false
  }

  await pushNow()
}

/**
 * Se llama al iniciar sesion manualmente en una cuenta existente desde
 * Ajustes (a diferencia de `reconcileOnSignIn`, que solo mira el arranque).
 * A diferencia de esa, aca SIEMPRE se prefiere el remoto si existe -- el
 * usuario esta entrando a una cuenta que puede tener historial real en otro
 * dispositivo, y el progreso local de la sesion anonima que tenia antes no
 * debe pisarlo. Si no hay snapshot remoto (cuenta realmente nueva), el local
 * se sube normalmente en el siguiente push.
 */
export async function reconcileOnManualSignIn(
  userId: string,
): Promise<'restored-remote' | 'kept-local'> {
  reconciling = true
  try {
    const remote = await fetchRemoteSnapshot(userId)
    if (remote) {
      const imported = useMirabiStore
        .getState()
        .importProgress(JSON.stringify({ version: remote.schema_version, state: remote.data }))
      if (imported) return 'restored-remote'
    }
    return 'kept-local'
  } finally {
    reconciling = false
  }
}
