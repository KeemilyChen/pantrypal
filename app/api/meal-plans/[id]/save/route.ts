import { toggleSave } from "@/lib/community/engage"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in first." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 })
  try {
    return Response.json(await toggleSave(supabase, user.id, "meal_plan", id))
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save." }, { status: 400 })
  }
}
