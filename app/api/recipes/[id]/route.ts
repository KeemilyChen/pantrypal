import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"
import { fridgeMatch } from "@/lib/recipes/explore-rank"
import { recordInteraction } from "@/lib/community/engage"
import type { InventoryItem } from "@/lib/types"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ error: "Sign in to view community recipes." }, { status: 401 })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ error: "Sign in to view community recipes." }, { status: 401 })

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(
      "id, user_id, name, description, instructions, prep_time, cook_time, servings, source, image_url, is_public, published_at, created_at, calories, protein_g, carbs_g, fat_g, nutrition_source",
    )
    .eq("id", id)
    .single()
  if (error || !recipe) return Response.json({ error: "Recipe not found." }, { status: 404 })

  const [{ data: ingredients }, { data: recipeTags }, { data: profile }] = await Promise.all([
    supabase.from("recipe_ingredients").select("id, ingredient_name, quantity, unit, optional").eq("recipe_id", id),
    supabase.from("recipe_tags").select("source, tags (id, slug, name, kind)").eq("recipe_id", id),
    recipe.user_id
      ? supabase.from("profiles").select("id, name, avatar_url").eq("id", recipe.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const [{ data: likeRow }, { count: likeCount }, { data: saveRow }] = await Promise.all([
    supabase
      .from("community_likes")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("target_type", "recipe")
      .eq("target_id", id)
      .maybeSingle(),
    supabase
      .from("community_likes")
      .select("*", { count: "exact", head: true })
      .eq("target_type", "recipe")
      .eq("target_id", id),
    supabase
      .from("community_saves")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("target_type", "recipe")
      .eq("target_id", id)
      .maybeSingle(),
  ])

  const { data: inventoryRows } = await supabase
    .from("inventory_items")
    .select("id, user_id, name, category, quantity, unit, storage_location, purchase_date, expiration_date, status, source, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("status", "available")
  const inventory = (inventoryRows ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category as InventoryItem["category"],
    quantity: Number(row.quantity),
    unit: row.unit,
    storageLocation: row.storage_location as InventoryItem["storageLocation"],
    purchaseDate: row.purchase_date,
    expirationDate: row.expiration_date,
    status: row.status as InventoryItem["status"],
    source: row.source as InventoryItem["source"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  const tags = (recipeTags ?? []).flatMap((row) => {
    const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags
    if (!tag) return []
    return [{ ...tag, source: row.source }]
  })
  const mappedIngredients = (ingredients ?? []).map((item) => ({
    id: item.id,
    recipeId: id,
    ingredientName: item.ingredient_name,
    quantity: item.quantity,
    unit: item.unit,
    optional: item.optional,
  }))
  const match = fridgeMatch(
    inventory,
    mappedIngredients.filter((item) => !item.optional).map((item) => item.ingredientName),
  )

  void recordInteraction(supabase, user.id, { targetType: "recipe", targetId: id, kind: "open" })

  return Response.json({
    recipe: {
      id: recipe.id,
      userId: recipe.user_id,
      creatorId: recipe.user_id,
      creatorName: profile?.name ?? "Friend",
      creatorAvatarUrl: profile?.avatar_url ?? null,
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      servings: recipe.servings,
      source: recipe.source,
      imageUrl: recipe.image_url,
      isPublic: recipe.is_public,
      publishedAt: recipe.published_at,
      createdAt: recipe.created_at,
      isOwner: recipe.user_id === user.id,
      calories: recipe.calories,
      proteinG: recipe.protein_g,
      carbsG: recipe.carbs_g,
      fatG: recipe.fat_g,
      nutritionSource: recipe.nutrition_source,
      likeCount: likeCount ?? 0,
      liked: Boolean(likeRow),
      saved: Boolean(saveRow),
      tags,
      ingredients: mappedIngredients,
      haveCount: match.haveCount,
      needCount: match.needCount,
      missing: match.missing,
    },
  })
}
