import type { InventoryItem } from "@/lib/types"

const ALIASES: Record<string, string[]> = {
  chicken: ["chicken breast", "chicken thighs", "rotisserie chicken"],
  rice: ["white rice", "jasmine rice", "brown rice"],
  onion: ["yellow onion", "white onion", "green onion", "scallion"],
  "green onion": ["scallion", "spring onion"],
  garlic: ["garlic cloves", "garlic clove"],
  broccoli: ["broccoli florets"],
  egg: ["eggs"],
  milk: ["whole milk", "2% milk"],
  soy: ["soy sauce"],
  oil: ["olive oil", "vegetable oil", "cooking oil"],
}

export function normalizeIngredient(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(fresh|frozen|organic|chopped|diced|minced|cooked|raw)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function tokens(name: string) {
  return normalizeIngredient(name).split(" ").filter(Boolean)
}

export function ingredientsMatch(inventoryName: string, recipeName: string) {
  const left = normalizeIngredient(inventoryName)
  const right = normalizeIngredient(recipeName)
  if (!left || !right) return false
  if (left === right) return true
  if (left.includes(right) || right.includes(left)) return true

  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    const family = [canonical, ...aliases].map(normalizeIngredient)
    if (family.some((alias) => left.includes(alias) || alias.includes(left)) &&
      family.some((alias) => right.includes(alias) || alias.includes(right))) {
      return true
    }
  }

  const leftTokens = tokens(inventoryName)
  const rightTokens = tokens(recipeName)
  const overlap = leftTokens.filter((token) => rightTokens.includes(token))
  return overlap.length > 0 && overlap.some((token) => token.length > 3)
}

export function findInventoryMatch(inventory: InventoryItem[], ingredientName: string) {
  return inventory.find(
    (item) =>
      item.status === "available" &&
      item.quantity > 0 &&
      ingredientsMatch(item.name, ingredientName),
  )
}

export function matchRecipeIngredients(
  inventory: InventoryItem[],
  ingredientNames: string[],
) {
  const available: string[] = []
  const missing: string[] = []

  for (const name of ingredientNames) {
    if (findInventoryMatch(inventory, name)) available.push(name)
    else missing.push(name)
  }

  return { available, missing }
}
