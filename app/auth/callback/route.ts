import { createServerSupabase } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createServerSupabase()
  if (!supabase) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL("/home", origin))
}
