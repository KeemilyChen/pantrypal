import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"
import { recordInteraction } from "@/lib/community/engage"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to view meal plans." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to view meal plans." }, { status: 401 })

  const { data: template, error } = await supabase
    .from("meal_plan_templates")
    .select("id, user_id, title, description, is_public, published_at")
    .eq("id", id)
    .single()
  if (error || !template) return Response.json({ error: "Meal plan not found." }, { status: 404 })

  const [{ data: items }, { data: tags }, { data: profile }, { data: likeRow }, { count: likeCount }, { data: saveRow }] =
    await Promise.all([
      supabase
        .from("meal_plan_template_items")
        .select("day_offset, meal_type, recipe_id, recipes (id, name, description, calories, protein_g, nutrition_source)")
        .eq("template_id", id)
        .order("day_offset"),
      supabase.from("meal_plan_template_tags").select("tags (id, slug, name, kind)").eq("template_id", id),
      supabase.from("profiles").select("name, avatar_url").eq("id", template.user_id).maybeSingle(),
      supabase
        .from("community_likes")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("target_type", "meal_plan")
        .eq("target_id", id)
        .maybeSingle(),
      supabase
        .from("community_likes")
        .select("*", { count: "exact", head: true })
        .eq("target_type", "meal_plan")
        .eq("target_id", id),
      supabase
        .from("community_saves")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("target_type", "meal_plan")
        .eq("target_id", id)
        .maybeSingle(),
    ])

  void recordInteraction(supabase, user.id, { targetType: "meal_plan", targetId: id, kind: "open" })

  const meals = (items ?? []).map((item) => {
    const recipe = Array.isArray(item.recipes) ? item.recipes[0] : item.recipes
    return {
      dayOffset: item.day_offset,
      mealType: item.meal_type,
      recipeId: item.recipe_id,
      name: recipe?.name,
      description: recipe?.description,
      calories: recipe?.calories,
      proteinG: recipe?.protein_g,
      nutritionSource: recipe?.nutrition_source,
    }
  })

  return Response.json({
    mealPlan: {
      id: template.id,
      userId: template.user_id,
      creatorName: profile?.name ?? "Friend",
      creatorAvatarUrl: profile?.avatar_url ?? null,
      isOwner: template.user_id === user.id,
      title: template.title,
      description: template.description,
      publishedAt: template.published_at,
      mealCount: meals.length,
      dayCount: meals.length ? Math.max(...meals.map((meal) => meal.dayOffset)) + 1 : 0,
      likeCount: likeCount ?? 0,
      liked: Boolean(likeRow),
      saved: Boolean(saveRow),
      tags: (tags ?? []).flatMap((row) => {
        const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags
        return tag ? [tag] : []
      }),
      meals,
      calories: meals.some((meal) => meal.calories != null)
        ? Math.round(meals.reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0))
        : null,
      proteinG: meals.some((meal) => meal.proteinG != null)
        ? Math.round(meals.reduce((sum, meal) => sum + Number(meal.proteinG ?? 0), 0))
        : null,
      nutritionSource: meals.some((meal) => meal.nutritionSource === "ai_estimate") ? "ai_estimate" : null,
    },
  })
}
