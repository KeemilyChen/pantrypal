import { z } from "zod"
import { MEAL_TYPES } from "@/lib/types"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"
import { addRecipeToMealPlan } from "@/lib/community/plan"

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(MEAL_TYPES),
  recipeId: z.string().uuid(),
  onConflict: z.enum(["skip", "replace"]).optional().default("replace"),
})

export async function GET(request: Request) {
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ slots: [], needsAuth: true })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ slots: [], needsAuth: true })
  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  let query = supabase
    .from("meal_plans")
    .select("id, date, meal_type, recipe_id, status, recipes (id, name, description, prep_time, cook_time)")
    .eq("user_id", user.id)
    .order("date")
  if (from) query = query.gte("date", from)
  if (to) query = query.lte("date", to)
  const { data, error } = await query
  if (error) return Response.json({ error: "Could not load your plan." }, { status: 500 })
  return Response.json({
    slots: (data ?? []).map((row) => {
      const recipe = Array.isArray(row.recipes) ? row.recipes[0] : row.recipes
      return {
        id: row.id,
        date: String(row.date).slice(0, 10),
        mealType: row.meal_type,
        recipeId: row.recipe_id,
        status: row.status,
        recipeName: recipe?.name,
        recipeDescription: recipe?.description,
      }
    }),
    needsAuth: false,
  })
}

export async function POST(request: Request) {
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to plan meals." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to plan meals." }, { status: 401 })
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Pick a date, meal, and recipe." }, { status: 400 })
  try {
    const result = await addRecipeToMealPlan(
      supabase,
      user.id,
      parsed.data.recipeId,
      parsed.data.date,
      parsed.data.mealType,
      parsed.data.onConflict,
    )
    if (result.conflict) return Response.json({ error: "That slot is filled.", conflict: true }, { status: 409 })
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save meal." }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in first." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 })
  const id = new URL(request.url).searchParams.get("id")
  if (!id) return Response.json({ error: "Missing meal id." }, { status: 400 })
  const { error } = await supabase.from("meal_plans").delete().eq("id", id).eq("user_id", user.id)
  if (error) return Response.json({ error: "Could not remove that meal." }, { status: 400 })
  return Response.json({ ok: true })
}
