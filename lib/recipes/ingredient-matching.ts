import type { InventoryItem } from "@/lib/types"

const STOP = new Set(["the", "a", "an", "of", "and", "with", "or", "to"])

const DISTINGUISHERS = new Set([
  "vinegar",
  "sauce",
  "seasoning",
  "powder",
  "oil",
  "milk",
  "broth",
  "stock",
  "juice",
  "extract",
  "dressing",
  "paste",
  "soup",
  "noodle",
  "noodles",
  "flour",
  "starch",
  "marinade",
  "rub",
])

const ALLOWED_QUALIFIERS = new Set([
  "cheddar",
  "mozzarella",
  "parmesan",
  "swiss",
  "feta",
  "goat",
  "shredded",
  "grated",
  "sliced",
  "diced",
  "minced",
  "chopped",
  "ground",
  "boneless",
  "skinless",
  "whole",
  "baby",
  "yellow",
  "white",
  "brown",
  "jasmine",
  "breast",
  "thigh",
  "thighs",
  "ripe",
  "extra",
  "virgin",
  "unsalted",
  "large",
  "small",
])

export function normalizeIngredient(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(fresh|frozen|organic|chopped|diced|minced|cooked|raw)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function singularize(token: string) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`
  if (token.endsWith("oes") && token.length > 4) return token.slice(0, -2)
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2)
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) return token.slice(0, -1)
  return token
}

function tokens(name: string) {
  return normalizeIngredient(name)
    .split(" ")
    .filter(Boolean)
    .map(singularize)
    .filter((token) => token.length > 1 && !STOP.has(token))
}

export function ingredientsMatch(inventoryName: string, recipeName: string) {
  const left = tokens(inventoryName)
  const right = tokens(recipeName)
  if (!left.length || !right.length) return false
  if (left.join(" ") === right.join(" ")) return true
  if (!right.every((token) => left.includes(token))) return false

  const leftover = left.filter((token) => !right.includes(token))
  if (leftover.some((token) => DISTINGUISHERS.has(token))) return false
  return leftover.every((token) => ALLOWED_QUALIFIERS.has(token))
}

export function findInventoryMatch(inventory: InventoryItem[], ingredientName: string) {
  return inventory.find(
    (item) =>
      (item.status ?? "available") === "available" &&
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
