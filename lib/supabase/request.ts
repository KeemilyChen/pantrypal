import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { isSupabaseConfigured, supabasePublicKey, supabaseUrl } from "@/lib/env"
import { createServerSupabase } from "@/lib/supabase/server"

export async function createRequestSupabase(request: Request): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null

  const authorization = request.headers.get("authorization")
  if (authorization?.startsWith("Bearer ")) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        supabasePublicKey(),
      {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }

  return createServerSupabase()
}

export async function getRequestUser(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}
