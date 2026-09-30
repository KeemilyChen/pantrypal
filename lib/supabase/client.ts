import { createBrowserClient } from "@supabase/ssr"
import { isSupabaseConfigured, supabasePublicKey, supabaseUrl } from "@/lib/env"

export function createBrowserSupabase() {
  if (!isSupabaseConfigured()) return null
  return createBrowserClient(supabaseUrl(), supabasePublicKey())
}
