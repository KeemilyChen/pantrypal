import { z } from "zod"
import { toggleSave } from "@/lib/community/engage"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

const schema = z.object({
  targetType: z.enum(["recipe", "meal_plan"]).default("recipe"),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to save." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to save." }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  const targetType = parsed.success ? parsed.data.targetType : "recipe"
  try {
    const result = await toggleSave(supabase, user.id, targetType, id)
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save." }, { status: 400 })
  }
}
