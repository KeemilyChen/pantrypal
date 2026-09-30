import { z } from "zod"
import { MEAL_TYPES } from "@/lib/types"
import { addRecipeToMealPlan } from "@/lib/community/plan"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(MEAL_TYPES),
  onConflict: z.enum(["skip", "replace"]).optional().default("skip"),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to plan meals." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to plan meals." }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Pick a date and meal." }, { status: 400 })
  try {
    const result = await addRecipeToMealPlan(
      supabase,
      user.id,
      id,
      parsed.data.date,
      parsed.data.mealType,
      parsed.data.onConflict,
    )
    if (result.conflict) {
      return Response.json({ error: "That meal slot is already filled.", conflict: true }, { status: 409 })
    }
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not add to plan." }, { status: 400 })
  }
}
