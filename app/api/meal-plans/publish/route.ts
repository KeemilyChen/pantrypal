import { z } from "zod"
import { publishMealPlanTemplate } from "@/lib/community/plan"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

const schema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z.array(z.object({ name: z.string().min(1) })).optional().default([]),
})

export async function POST(request: Request) {
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to share a meal plan." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to share a meal plan." }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Choose a title and date range." }, { status: 400 })
  try {
    const result = await publishMealPlanTemplate(supabase, user.id, parsed.data)
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not publish." }, { status: 400 })
  }
}
