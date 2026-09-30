import type { InventoryItem } from "@/lib/types"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import type { RecommendationResponse } from "@/lib/ai/schemas"

export function ownershipWhy(using: string[], missing: string[], minutes: number) {
  const why: string[] = []
  if (minutes > 0) why.push(`About ${minutes} minute${minutes === 1 ? "" : "s"}`)
  if (using.length) why.push(`Uses from your fridge: ${using.slice(0, 6).join(", ")}`)
  else why.push("Uses several extra ingredients you would need to add")
  if (missing.length) why.push(`You'll need: ${missing.slice(0, 6).join(", ")}`)
  else why.push("No extra ingredients required")
  return why.slice(0, 5)
}

export function generateSimpleFromInventory(
  query: string,
  inventory: InventoryItem[],
): RecommendationResponse {
  const owned = inventory.filter((item) => item.quantity > 0).map((item) => item.name)
  const titleBase = owned[0] || "Pantry"
  const minutes = /\b(\d+)\s*(?:minutes|min)\b/i.exec(query)
  const estimatedMinutes = minutes ? Math.min(Number(minutes[1]), 60) : 15

  const ingredients = [
    ...owned.map((name) => ({ name, quantity: null as number | null, unit: null as string | null, optional: false })),
    { name: "Salt", quantity: null, unit: null, optional: true },
  ]
  if (!owned.length) {
    ingredients.unshift({ name: "Eggs", quantity: 2, unit: "count", optional: false })
  }

  const required = ingredients.filter((item) => !item.optional).map((item) => item.name)
  const { available, missing } = matchRecipeIngredients(inventory, required)

  return {
    source: "fallback",
    summary: "Live AI is off, so this is a simple idea from your current fridge — not a catalog pick.",
    recipes: [
      {
        name: `${titleBase} skillet`,
        description: "A fast pan meal using the food you listed in your fridge.",
        reason: "A fast pan meal using the food you listed in your fridge.",
        estimatedMinutes,
        prepTime: 5,
        cookTime: Math.max(0, estimatedMinutes - 5),
        ingredients,
        instructions: [
          "Prep the fridge items you want to use.",
          "Heat a pan over medium heat.",
          "Cook until hot and seasoned to taste.",
          "Taste and adjust salt.",
        ],
        tags: [
          { name: "Weeknight", kind: "meal" as const },
          { name: "Skillet", kind: "method" as const },
          ...(owned[0] ? [{ name: owned[0], kind: "ingredient" as const }] : []),
        ],
        using: available,
        missing,
        why: ownershipWhy(available, missing, estimatedMinutes),
        matchedRecipeId: null,
        calories: 420,
        proteinG: 28,
        carbsG: 18,
        fatG: 22,
      },
    ],
  }
}
