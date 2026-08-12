import { createClient } from '@supabase/supabase-js'

/**
 * Cliente unico de Supabase.
 *
 * La anon/publishable key es segura de exponer en el cliente: RLS es lo que
 * protege los datos (ver supabase/migrations/0001_init.sql), no el secreto de
 * esta key.
 */
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
