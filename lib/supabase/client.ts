import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

let browserClient: SupabaseClient | undefined

function getConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function isSupabaseConfigured() {
  const { url, key } = getConfig()
  return Boolean(url && key)
}

export function createClient() {
  if (browserClient) return browserClient
  const { url, key } = getConfig()
  if (!url || !key) return null
  browserClient = createBrowserClient(url, key)
  return browserClient
}
