import type { InventoryItem, RecipeIngredient } from "@/lib/types"
import { findInventoryMatch } from "@/lib/recipes/ingredient-matching"

export function consumeIngredients(
  inventory: InventoryItem[],
  ingredients: RecipeIngredient[],
  now = new Date().toISOString(),
): InventoryItem[] {
  return inventory.map((item) => {
    if (item.status !== "available") return item
    const used = ingredients.find((ingredient) =>
      Boolean(findInventoryMatch([item], ingredient.ingredientName)),
    )
    if (!used) return item
    if (used.quantity == null || item.quantity <= (used.quantity ?? 0)) {
      return { ...item, quantity: 0, status: "used", updatedAt: now }
    }
    return {
      ...item,
      quantity: Number((item.quantity - used.quantity).toFixed(2)),
      updatedAt: now,
    }
  })
}
