import type { InventoryItem, Recipe } from "@/lib/types"
import { daysUntilExpiration } from "@/lib/inventory/expiration"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import type { RecommendationResponse } from "@/lib/ai/schemas"

function scoreRecipe(recipe: Recipe, inventory: InventoryItem[], query: string, minutes?: number) {
  const names = recipe.ingredients.filter((i) => !i.optional).map((i) => i.ingredientName)
  const { available, missing } = matchRecipeIngredients(inventory, names)
  const coverage = names.length === 0 ? 0 : available.length / names.length
  const expiringBoost = available.reduce((sum, name) => {
    const item = inventory.find((candidate) =>
      candidate.name.toLowerCase().includes(name.split(" ")[0].toLowerCase()),
    )
    const days = daysUntilExpiration(item?.expirationDate ?? null)
    if (days === null) return sum
    if (days <= 2) return sum + 0.25
    if (days <= 6) return sum + 0.1
    return sum
  }, 0)

  const q = query.toLowerCase()
  const queryBoost =
    (q.includes("sick") && recipe.name.toLowerCase().includes("omelette") ? 0.2 : 0) +
    (q.includes("spicy") ? 0 : 0) +
    (q.includes("fast") || q.includes("20") || q.includes("quick") ? (recipe.cookTime + recipe.prepTime <= 20 ? 0.2 : -0.1) : 0) +
    (q.includes("expire") ? expiringBoost : 0)

  const timePenalty =
    minutes && recipe.cookTime + recipe.prepTime > minutes ? -0.4 : 0

  return {
    recipe,
    available,
    missing,
    score: coverage * 2 + expiringBoost + queryBoost + timePenalty - missing.length * 0.15,
  }
}

export function recommendFromCatalog(
  query: string,
  inventory: InventoryItem[],
  recipes: Recipe[],
  minutes?: number,
): RecommendationResponse {
  const ranked = recipes
    .map((recipe) => scoreRecipe(recipe, inventory, query, minutes))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const top = ranked.filter((entry) => entry.score > 0)
  const picks = (top.length ? top : ranked).slice(0, 3)

  return {
    summary:
      "Here are recipes that fit what you already have. Expiration dates are from your inventory, not food-safety guarantees.",
    recipes: picks.map((entry) => ({
      name: entry.recipe.name,
      reason:
        entry.missing.length === 0
          ? `You already have what you need for ${entry.recipe.name}.`
          : `You have ${entry.available.join(", ") || "a few ingredients"}. You only need ${entry.missing.join(", ")}.`,
      estimatedMinutes: entry.recipe.prepTime + entry.recipe.cookTime,
      using: entry.available,
      missing: entry.missing,
      matchedRecipeId: entry.recipe.id,
    })),
  }
}
