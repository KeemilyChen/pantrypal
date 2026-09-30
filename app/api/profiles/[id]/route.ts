import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to view profiles." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to view profiles." }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("id, name, avatar_url").eq("id", id).maybeSingle()
  if (!profile) return Response.json({ error: "Profile not found." }, { status: 404 })

  const [{ data: recipes }, { data: plans }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, name, description, published_at")
      .eq("user_id", id)
      .eq("is_public", true)
      .order("published_at", { ascending: false }),
    supabase
      .from("meal_plan_templates")
      .select("id, title, description, published_at")
      .eq("user_id", id)
      .eq("is_public", true)
      .order("published_at", { ascending: false }),
  ])

  const recipeIds = (recipes ?? []).map((row) => row.id)
  let topTags: Array<{ name: string; slug: string; count: number }> = []
  if (recipeIds.length) {
    const { data: tagRows } = await supabase
      .from("recipe_tags")
      .select("tag_id, tags (name, slug)")
      .in("recipe_id", recipeIds)
    const counts = new Map<string, { name: string; slug: string; count: number }>()
    for (const row of tagRows ?? []) {
      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags
      if (!tag) continue
      const current = counts.get(tag.slug) ?? { name: tag.name, slug: tag.slug, count: 0 }
      current.count += 1
      counts.set(tag.slug, current)
    }
    topTags = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8)
  }

  const posts = [
    ...(recipes ?? []).map((row) => ({
      contentType: "recipe" as const,
      id: row.id,
      name: row.name,
      description: row.description,
      publishedAt: row.published_at,
    })),
    ...(plans ?? []).map((row) => ({
      contentType: "meal_plan" as const,
      id: row.id,
      name: row.title,
      description: row.description,
      publishedAt: row.published_at,
    })),
  ]

  return Response.json({
    profile: {
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      postCount: posts.length,
      isSelf: user.id === id,
    },
    posts,
    topTags,
  })
}
