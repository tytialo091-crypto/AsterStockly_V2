import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey)
}

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase is not configured for this environment.')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
