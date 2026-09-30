import { daysUntilExpiration } from "@/lib/inventory/expiration"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import type { InventoryItem } from "@/lib/types"

export type RankableRecipe = {
  score: number
  like_count?: number
  likeCount?: number
  savedCount?: number
  published_at?: string | null
  publishedAt?: string | null
  ingredients?: Array<{ ingredientName?: string; name?: string; optional?: boolean }>
  recipes?: Array<{
    ingredients?: Array<{ ingredientName?: string; optional?: boolean }>
  }>
}

export function fridgeMatch(inventory: InventoryItem[] | undefined, ingredientNames: string[]) {
  const required = ingredientNames.filter(Boolean)
  if (!inventory?.length || !required.length) {
    return { haveCount: 0, needCount: required.length, missing: required, available: [] as string[], ratio: 0 }
  }
  const { available, missing } = matchRecipeIngredients(inventory, required)
  return {
    haveCount: available.length,
    needCount: required.length,
    missing,
    available,
    ratio: required.length ? available.length / required.length : 0,
  }
}

export function rankExploreItem(
  item: RankableRecipe,
  inventory: InventoryItem[] | undefined,
): number {
  const tagScore = Number(item.score || 0)
  const likes = Number(item.like_count ?? item.likeCount ?? 0)
  const saves = Number(item.savedCount ?? 0)
  const published = item.published_at ?? item.publishedAt
  const ageDays = published ? Math.max(0, (Date.now() - new Date(published).getTime()) / 86400000) : 30

  let names: string[] = []
  if (item.ingredients?.length) {
    names = item.ingredients
      .filter((row) => !row.optional)
      .map((row) => row.ingredientName || row.name || "")
      .filter(Boolean)
  } else if (item.recipes?.length) {
    const ratios: number[] = []
    for (const recipe of item.recipes) {
      const required = (recipe.ingredients ?? [])
        .filter((row) => !row.optional)
        .map((row) => row.ingredientName || "")
        .filter(Boolean)
      ratios.push(fridgeMatch(inventory, required).ratio)
    }
    const fridgeScore = ratios.length ? (ratios.reduce((a, b) => a + b, 0) / ratios.length) * 40 : 0
    return (
      tagScore +
      fridgeScore +
      5 * Math.log(1 + likes) +
      8 * Math.log(1 + saves) +
      20 * Math.exp(-ageDays / 14)
    )
  }

  const match = fridgeMatch(inventory, names)
  let expiringBonus = 0
  if (inventory?.length && match.available.length) {
    const soon = match.available.some((name) => {
      const hit = inventory.find((row) => row.name.toLowerCase() === name.toLowerCase())
      const days = daysUntilExpiration(hit?.expirationDate ?? null)
      return days != null && days >= 0 && days <= 3
    })
    if (soon) expiringBonus = 15
  }

  return (
    tagScore +
    40 * match.ratio +
    expiringBonus +
    5 * Math.log(1 + likes) +
    8 * Math.log(1 + saves) +
    20 * Math.exp(-ageDays / 14)
  )
}

export function formatNutrition(input: {
  calories?: number | null
  proteinG?: number | null
  protein_g?: number | null
  nutritionSource?: string | null
  nutrition_source?: string | null
}) {
  const calories = input.calories
  const protein = input.proteinG ?? input.protein_g
  if (calories == null && protein == null) return null
  const parts = [
    calories != null ? `${Math.round(Number(calories))} kcal` : null,
    protein != null ? `${Math.round(Number(protein))}g protein` : null,
  ].filter(Boolean)
  const estimated = (input.nutritionSource ?? input.nutrition_source) === "ai_estimate"
  return { text: parts.join(" · "), estimated }
}
