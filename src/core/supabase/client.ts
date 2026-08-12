import { createClient } from '@supabase/supabase-js'

/**
 * Cliente unico de Supabase.
 *
 * La anon/publishable key es segura de exponer en el cliente: RLS es lo que
 * protege los datos (ver supabase/migrations/0001_init.sql), no el secreto de
 * esta key.
 */
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    // La app usa HashRouter (rutas tipo #/ajustes): el flujo implicito
    // (default) devuelve la sesion como #access_token=... en la URL, lo que
    // pisaria el propio hash de ruteo. PKCE vuelve como ?code=... (query,
    // antes del #), asi que conviven sin problema.
    flowType: 'pkce',
  },
})
