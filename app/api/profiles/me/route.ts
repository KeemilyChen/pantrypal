import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

async function mapPosts(
  supabase: NonNullable<Awaited<ReturnType<typeof createRequestSupabase>>>,
  userId: string,
) {
  const [{ data: recipes }, { data: plans }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, name, description, published_at, calories, protein_g, nutrition_source")
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("published_at", { ascending: false }),
    supabase
      .from("meal_plan_templates")
      .select("id, title, description, published_at")
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("published_at", { ascending: false }),
  ])
  return [
    ...(recipes ?? []).map((row) => ({
      contentType: "recipe" as const,
      id: row.id,
      name: row.name,
      description: row.description,
      publishedAt: row.published_at,
      calories: row.calories,
      proteinG: row.protein_g,
      nutritionSource: row.nutrition_source,
    })),
    ...(plans ?? []).map((row) => ({
      contentType: "meal_plan" as const,
      id: row.id,
      name: row.title,
      description: row.description,
      publishedAt: row.published_at,
    })),
  ]
}

async function savedOrLiked(
  supabase: NonNullable<Awaited<ReturnType<typeof createRequestSupabase>>>,
  userId: string,
  table: "community_saves" | "community_likes",
) {
  const { data } = await supabase.from(table).select("target_type, target_id").eq("user_id", userId)
  const recipeIds = (data ?? []).filter((row) => row.target_type === "recipe").map((row) => row.target_id)
  const planIds = (data ?? []).filter((row) => row.target_type === "meal_plan").map((row) => row.target_id)
  const items: Array<{ contentType: "recipe" | "meal_plan"; id: string; name: string; description: string }> = []
  if (recipeIds.length) {
    const { data: recipes } = await supabase.from("recipes").select("id, name, description").in("id", recipeIds)
    for (const row of recipes ?? []) items.push({ contentType: "recipe", id: row.id, name: row.name, description: row.description })
  }
  if (planIds.length) {
    const { data: plans } = await supabase.from("meal_plan_templates").select("id, title, description").in("id", planIds)
    for (const row of plans ?? []) items.push({ contentType: "meal_plan", id: row.id, name: row.title, description: row.description })
  }
  return items
}

export async function GET(request: Request) {
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to view your profile." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to view your profile." }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("id, name, avatar_url").eq("id", user.id).maybeSingle()
  const [posts, saved, liked] = await Promise.all([
    mapPosts(supabase, user.id),
    savedOrLiked(supabase, user.id, "community_saves"),
    savedOrLiked(supabase, user.id, "community_likes"),
  ])

  return Response.json({
    profile: {
      id: user.id,
      name: profile?.name ?? "Friend",
      avatarUrl: profile?.avatar_url ?? null,
      postCount: posts.length,
    },
    posts,
    saved,
    liked,
  })
}
