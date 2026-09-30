import { z } from "zod"
import { recordInteraction } from "@/lib/community/engage"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

const schema = z.object({
  kind: z.enum(["cook", "open", "tag_click", "plan"]),
  targetType: z.enum(["recipe", "meal_plan"]).default("recipe"),
  tagId: z.string().uuid().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in first." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Invalid interaction." }, { status: 400 })
  await recordInteraction(supabase, user.id, {
    targetType: parsed.data.targetType,
    targetId: id,
    kind: parsed.data.kind,
    tagId: parsed.data.tagId,
  })
  return Response.json({ ok: true })
}
