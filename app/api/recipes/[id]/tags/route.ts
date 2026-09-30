import { addRecipeTag } from "@/lib/recipes/community"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"
import { slugifyTag } from "@/lib/tags/slug"
import { z } from "zod"

const addTagSchema = z.object({
  name: z.string().min(1).max(48),
  kind: z.string().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to add tags." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to add tags." }, { status: 401 })
  const parsed = addTagSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Enter a tag name." }, { status: 400 })
  try {
    await addRecipeTag(supabase, id, user.id, parsed.data.name, parsed.data.kind)
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not add that tag." }, { status: 400 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to remove tags." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to remove tags." }, { status: 401 })
  const parsed = addTagSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Enter a tag name." }, { status: 400 })
  const slug = slugifyTag(parsed.data.name)
  if (!slug) return Response.json({ error: "That tag is empty." }, { status: 400 })

  const { data: recipe } = await supabase.from("recipes").select("user_id").eq("id", id).single()
  if (!recipe || recipe.user_id !== user.id) {
    return Response.json({ error: "You can only edit tags on recipes you posted." }, { status: 403 })
  }
  const { data: tag } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle()
  if (!tag) return Response.json({ ok: true })
  await supabase.from("recipe_tags").delete().eq("recipe_id", id).eq("tag_id", tag.id)
  return Response.json({ ok: true })
}
