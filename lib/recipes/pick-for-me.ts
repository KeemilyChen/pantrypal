import type { InventoryItem, Recipe } from "@/lib/types"
import { daysUntilExpiration } from "@/lib/inventory/expiration"
import { findInventoryMatch, matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"

export type PickCandidate = {
  recipe: Recipe
  minutes: number
  available: string[]
  missing: string[]
  requiredCount: number
  weight: number
  reason: string
}

function requiredNames(recipe: Recipe) {
  return recipe.ingredients.filter((item) => !item.optional).map((item) => item.ingredientName)
}

function expiringMatches(recipe: Recipe, inventory: InventoryItem[]) {
  const names = requiredNames(recipe)
  const { available } = matchRecipeIngredients(inventory, names)
  return available
    .map((name) => {
      const item = findInventoryMatch(inventory, name)
      const days = daysUntilExpiration(item?.expirationDate ?? null)
      if (!item || days === null || days > 6) return null
      return { name: item.name, days }
    })
    .filter((item): item is { name: string; days: number } => Boolean(item))
    .sort((a, b) => a.days - b.days)
}

function reasonFor(candidate: {
  available: string[]
  missing: string[]
  requiredCount: number
  expiring: { name: string; days: number }[]
}) {
  const parts: string[] = []
  if (candidate.missing.length === 0) {
    parts.push("You already have everything.")
  } else {
    parts.push(
      `You have ${candidate.available.length} of ${candidate.requiredCount} ingredients.`,
    )
  }
  if (candidate.expiring[0]) {
    parts.push(`Uses your ${candidate.expiring[0].name} that's expiring soon.`)
  }
  return parts.join(" ")
}

function scoreRecipe(recipe: Recipe, inventory: InventoryItem[]): PickCandidate | null {
  const names = requiredNames(recipe)
  if (!names.length) return null
  const { available, missing } = matchRecipeIngredients(inventory, names)
  if (missing.length > 2) return null

  const expiring = expiringMatches(recipe, inventory)
  let weight = missing.length === 0 ? 10 : missing.length === 1 ? 2.5 : 1
  if (expiring.some((item) => item.days <= 2)) weight += 5
  else if (expiring.length) weight += 3

  return {
    recipe,
    minutes: recipe.prepTime + recipe.cookTime,
    available,
    missing,
    requiredCount: names.length,
    weight,
    reason: reasonFor({ available, missing, requiredCount: names.length, expiring }),
  }
}

export function pickCandidates(recipes: Recipe[], inventory: InventoryItem[]) {
  const scored = recipes
    .map((recipe) => scoreRecipe(recipe, inventory))
    .filter((item): item is PickCandidate => Boolean(item))
  const complete = scored.filter((item) => item.missing.length === 0)
  if (complete.length >= 2) return complete
  return scored
}

export function pickForMe(
  recipes: Recipe[],
  inventory: InventoryItem[],
  excludeId?: string | null,
): PickCandidate | null {
  const pool = pickCandidates(recipes, inventory)
  if (!pool.length) return null

  let choices = pool
  if (excludeId && pool.length >= 2) {
    const withoutLast = pool.filter((item) => item.recipe.id !== excludeId)
    if (withoutLast.length) choices = withoutLast
  }

  const total = choices.reduce((sum, item) => sum + item.weight, 0)
  let ticket = Math.random() * total
  for (const choice of choices) {
    ticket -= choice.weight
    if (ticket <= 0) return choice
  }
  return choices[choices.length - 1] ?? null
}
