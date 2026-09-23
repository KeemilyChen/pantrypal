import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerSupabase } from "@/lib/supabase/server"

export default async function RootPage() {
  const demo = (await cookies()).get("pantrypal_demo")?.value === "1"
  const supabase = await createServerSupabase()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  redirect(demo || user ? "/home" : "/login")
}
