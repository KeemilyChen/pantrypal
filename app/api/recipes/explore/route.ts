import type { InventoryItem } from "@/lib/types"
import { fridgeMatch, rankExploreItem, type RankableRecipe } from "@/lib/recipes/explore-rank"
import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"

async function loadInventory(supabase: Awaited<ReturnType<typeof createRequestSupabase>>, userId: string) {
  if (!supabase) return [] as InventoryItem[]
  const { data } = await supabase
    .from("inventory_items")
    .select("id, user_id, name, category, quantity, unit, storage_location, purchase_date, expiration_date, status, source, created_at, updated_at")
    .eq("user_id", userId)
    .eq("status", "available")
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: (row.category ?? "other") as InventoryItem["category"],
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
}

function mapRecipe(row: Record<string, unknown>, inventory: InventoryItem[]) {
  const ingredients = (Array.isArray(row.ingredients) ? row.ingredients : []) as Array<{
    ingredientName?: string
    optional?: boolean
  }>
  const required = ingredients.filter((item) => !item.optional).map((item) => item.ingredientName || "")
  const match = fridgeMatch(inventory, required)
  return {
    contentType: "recipe" as const,
    id: row.id,
    userId: row.user_id,
    creatorName: row.creator_name,
    creatorAvatarUrl: row.creator_avatar_url,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    servings: row.servings,
    imageUrl: row.image_url,
    publishedAt: row.published_at,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    nutritionSource: row.nutrition_source,
    score: row.score,
    likeCount: row.like_count,
    liked: row.liked,
    saved: row.saved,
    tags: row.tags,
    ingredients: row.ingredients,
    haveCount: match.haveCount,
    needCount: match.needCount,
    missing: match.missing,
    rank: 0,
  }
}

function mapPlan(row: Record<string, unknown>, inventory: InventoryItem[]) {
  const recipes = (Array.isArray(row.recipes) ? row.recipes : []) as Array<{
    ingredients?: Array<{ ingredientName?: string; optional?: boolean }>
    calories?: number | null
    proteinG?: number | null
  }>
  const allRequired = recipes.flatMap((recipe) =>
    (recipe.ingredients ?? []).filter((item) => !item.optional).map((item) => item.ingredientName || ""),
  )
  const match = fridgeMatch(inventory, allRequired)
  const nutr = recipes.filter((recipe) => recipe.calories != null)
  const avgCal = nutr.length
    ? Math.round(nutr.reduce((sum, recipe) => sum + Number(recipe.calories), 0) / nutr.length)
    : null
  const avgProtein = nutr.length
    ? Math.round(nutr.reduce((sum, recipe) => sum + Number(recipe.proteinG ?? 0), 0) / nutr.length)
    : null
  return {
    contentType: "meal_plan" as const,
    id: row.id,
    userId: row.user_id,
    creatorName: row.creator_name,
    creatorAvatarUrl: row.creator_avatar_url,
    name: row.title,
    description: row.description,
    publishedAt: row.published_at,
    mealCount: row.meal_count,
    dayCount: row.day_count,
    score: row.score,
    likeCount: row.like_count,
    liked: row.liked,
    saved: row.saved,
    tags: row.tags,
    recipes: row.recipes,
    haveCount: match.haveCount,
    needCount: match.needCount,
    missing: match.missing.slice(0, 8),
    avgCalories: avgCal,
    avgProtein,
    rank: 0,
  }
}

export async function GET(request: Request) {
  const supabase = await createRequestSupabase(request)
  if (!supabase) return Response.json({ items: [], needsAuth: true })
  const user = await getRequestUser(supabase)
  if (!user) return Response.json({ items: [], needsAuth: true })

  const url = new URL(request.url)
  const search = url.searchParams.get("search") ?? ""
  const mode = url.searchParams.get("mode") === "latest" ? "latest" : "foryou"
  const type = url.searchParams.get("type") ?? "all"
  const tagSlugs = url.searchParams.getAll("tag").flatMap((value) => value.split(",")).filter(Boolean)
  const inventory = await loadInventory(supabase, user.id)

  const items: Array<ReturnType<typeof mapRecipe> | ReturnType<typeof mapPlan>> = []
  if (type !== "meal_plan") {
    const { data, error } = await supabase.rpc("explore_recipes", {
      search,
      tag_slugs: tagSlugs,
      p_mode: mode,
    })
    if (error) return Response.json({ error: "Could not load Explore recipes." }, { status: 500 })
    items.push(...(data ?? []).map((row: Record<string, unknown>) => mapRecipe(row, inventory)))
  }
  if (type !== "recipe") {
    const { data, error } = await supabase.rpc("explore_meal_plans", {
      search,
      tag_slugs: tagSlugs,
      p_mode: mode,
    })
    if (error) return Response.json({ error: "Could not load Explore meal plans." }, { status: 500 })
    items.push(...(data ?? []).map((row: Record<string, unknown>) => mapPlan(row, inventory)))
  }

  const { data: saveRows } = await supabase.from("community_saves").select("target_id, target_type")
  const saveCounts = new Map<string, number>()
  for (const row of saveRows ?? []) {
    const key = `${row.target_type}:${row.target_id}`
    saveCounts.set(key, (saveCounts.get(key) ?? 0) + 1)
  }

  const ranked = items.map((item) => {
    const savedCount = saveCounts.get(`${item.contentType}:${item.id}`) ?? 0
    return {
      ...item,
      savedCount,
      rank: rankExploreItem(
        {
          score: item.score,
          likeCount: item.likeCount,
          savedCount,
          publishedAt: item.publishedAt,
          ingredients: "ingredients" in item ? (item.ingredients as RankableRecipe["ingredients"]) : undefined,
          recipes: "recipes" in item ? (item.recipes as RankableRecipe["recipes"]) : undefined,
        },
        inventory,
      ),
    }
  })

  ranked.sort((a, b) => {
    if (mode === "latest") {
      return String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? ""))
    }
    return (b.rank ?? 0) - (a.rank ?? 0)
  })

  return Response.json({ items: ranked.slice(0, 50), needsAuth: false })
}
