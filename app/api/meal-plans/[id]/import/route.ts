import { z } from "zod"
import { importMealPlanTemplate } from "@/lib/community/plan"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  onConflict: z.enum(["skip", "replace"]).optional().default("skip"),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to import a meal plan." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to import a meal plan." }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Pick a start date." }, { status: 400 })
  try {
    const result = await importMealPlanTemplate(
      supabase,
      user.id,
      id,
      parsed.data.startDate,
      parsed.data.onConflict,
    )
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not import." }, { status: 400 })
  }
}
