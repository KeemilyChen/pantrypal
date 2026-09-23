import type { InventoryItem, Recipe } from "@/lib/types"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"

export function planWeekFromInventory(recipes: Recipe[], inventory: InventoryItem[], days: string[]) {
  const scored = recipes
    .map((recipe) => {
      const required = recipe.ingredients
        .filter((ingredient) => !ingredient.optional)
        .map((ingredient) => ingredient.ingredientName)
      const { missing } = matchRecipeIngredients(inventory, required)
      return { recipe, missingCount: missing.length }
    })
    .sort((a, b) => a.missingCount - b.missingCount)

  return days.map((date, index) => ({
    date,
    mealType: "dinner" as const,
    recipeId: scored[index % Math.max(scored.length, 1)]?.recipe.id ?? null,
  }))
}
