export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
}

export function supabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  )
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabasePublicKey())
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}
