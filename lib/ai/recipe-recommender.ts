import type { InventoryItem, Recipe } from "@/lib/types"
import { daysUntilExpiration } from "@/lib/inventory/expiration"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import type { RecommendationResponse } from "@/lib/ai/schemas"

const STOP_EXCLUSIONS = new Set([
  "i",
  "me",
  "my",
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "for",
  "dinner",
  "lunch",
  "breakfast",
  "food",
  "meal",
  "something",
  "anything",
  "please",
])

export type CookingIntent = {
  exclusions: string[]
  requested: string[]
  maxMinutes?: number
  wantsExpiring: boolean
  light: boolean
  protein: boolean
  easy: boolean
}

export function parseCookingIntent(query: string, minutes?: number): CookingIntent {
  const q = query.toLowerCase()
  const exclusions: string[] = []
  const requested: string[] = []

  const exclusionPatterns = [
    /(?:don't|dont|do not)\s+want\s+([a-z][a-z\s]{0,24})/g,
    /\bno\s+([a-z][a-z\s]{0,20})/g,
    /\bwithout\s+([a-z][a-z\s]{0,20})/g,
  ]
  for (const pattern of exclusionPatterns) {
    for (const match of q.matchAll(pattern)) {
      const cleaned = cleanPhrase(match[1])
      if (cleaned) exclusions.push(cleaned)
    }
  }

  for (const match of q.matchAll(/\buse\s+(?:up\s+)?(?:my\s+|the\s+)?([a-z][a-z\s]{1,24})/g)) {
    const words = cleanPhrase(match[1])
      .split(" ")
      .filter((word) => word.length > 2 && !STOP_EXCLUSIONS.has(word))
    if (words[0]) requested.push(words[0])
  }

  const timeMatch =
    q.match(/(?:under|less than|within|in)\s*(\d+)\s*(?:minutes|min)/) ||
    q.match(/\b(\d+)\s*(?:minutes|min)\b/)
  let maxMinutes = minutes ?? (timeMatch ? Number(timeMatch[1]) : undefined)
  if (maxMinutes === undefined && /\b(quick|fast)\b/.test(q)) maxMinutes = 20
  if (maxMinutes === undefined && /\b(easy|simple|don't feel like cooking|dont feel like cooking|low effort)\b/.test(q)) {
    maxMinutes = 15
  }

  return {
    exclusions: unique(exclusions),
    requested: unique(requested),
    maxMinutes,
    wantsExpiring: /\b(expir|use up|wilting|going bad|soon)\b/.test(q),
    light: /\b(light|healthy|fresh)\b/.test(q),
    protein: /\b(protein|high protein)\b/.test(q),
    easy: /\b(easy|simple|don't feel like|dont feel like|low effort)\b/.test(q),
  }
}

function cleanPhrase(value: string) {
  return value
    .replace(/\b(please|tonight|today|for dinner|for lunch)\b/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function recipeMentions(recipe: Recipe, phrase: string) {
  const haystack = `${recipe.name} ${recipe.description} ${recipe.ingredients
    .map((ingredient) => ingredient.ingredientName)
    .join(" ")}`.toLowerCase()
  return haystack.includes(phrase.toLowerCase())
}

function expiringUsed(recipe: Recipe, inventory: InventoryItem[]) {
  const names = recipe.ingredients.filter((item) => !item.optional).map((item) => item.ingredientName)
  const { available } = matchRecipeIngredients(inventory, names)
  return available.flatMap((name) => {
    const item = inventory.find((candidate) =>
      candidate.name.toLowerCase().includes(name.split(" ")[0].toLowerCase()),
    )
    const days = daysUntilExpiration(item?.expirationDate ?? null)
    if (days === null || days > 6) return []
    return [{ name: item?.name ?? name, days }]
  })
}

export function whyForRecipe(
  recipe: Recipe,
  inventory: InventoryItem[],
  intent: CookingIntent,
  available: string[],
  missing: string[],
) {
  const why: string[] = []
  const minutes = recipe.prepTime + recipe.cookTime
  why.push(`About ${minutes} minute${minutes === 1 ? "" : "s"}`)
  if (missing.length === 0) why.push("You already have all the ingredients")
  else if (available.length) why.push(`Uses ${available.slice(0, 3).join(", ")} from your kitchen`)
  const expiring = expiringUsed(recipe, inventory)
  if (expiring.length) {
    why.push(`Uses ${expiring[0].name} that is expiring soon`)
  }
  for (const request of intent.requested) {
    if (recipeMentions(recipe, request)) why.push(`Uses your ${request}`)
  }
  for (const exclusion of intent.exclusions) {
    if (!recipeMentions(recipe, exclusion)) why.push(`Skips ${exclusion}`)
  }
  if (intent.easy && minutes <= 15) why.push("Low effort")
  if (intent.light && /salad|omelette|broccoli|spinach/.test(recipe.name.toLowerCase())) {
    why.push("Fits a lighter meal")
  }
  if (intent.protein && /chicken|egg|dumpling/.test(`${recipe.name} ${recipe.ingredients.map((i) => i.ingredientName).join(" ")}`.toLowerCase())) {
    why.push("Higher protein from what you have")
  }
  return unique(why).slice(0, 5)
}

function scoreRecipe(recipe: Recipe, inventory: InventoryItem[], intent: CookingIntent, query: string) {
  const names = recipe.ingredients.filter((item) => !item.optional).map((item) => item.ingredientName)
  const { available, missing } = matchRecipeIngredients(inventory, names)
  const coverage = names.length === 0 ? 0 : available.length / names.length
  const minutes = recipe.prepTime + recipe.cookTime
  const blob = `${recipe.name} ${recipe.description} ${names.join(" ")}`.toLowerCase()

  let score = coverage * 0.6 - missing.length * 0.1

  for (const exclusion of intent.exclusions) {
    if (recipeMentions(recipe, exclusion)) score -= 3
  }
  for (const request of intent.requested) {
    score += recipeMentions(recipe, request) ? 1.4 : -0.8
  }
  if (intent.maxMinutes !== undefined) {
    score += minutes <= intent.maxMinutes ? 0.8 : -1.2
  }
  if (intent.easy) score += minutes <= 15 ? 0.6 : -0.5
  if (intent.light) {
    score += /salad|omelette|broccoli|spinach|garlic broccoli/.test(blob) ? 0.5 : 0
    score += /fried|dumpling/.test(blob) ? -0.4 : 0
  }
  if (intent.protein) {
    score += /chicken|egg|eggs|dumpling/.test(blob) ? 0.6 : -0.2
  }
  const expiring = expiringUsed(recipe, inventory)
  if (intent.wantsExpiring) score += expiring.length ? 1 : -0.3
  else score += expiring.length ? 0.15 : 0

  const q = query.toLowerCase()
  if (q.includes("sick") && recipe.name.toLowerCase().includes("omelette")) score += 0.4

  return { recipe, available, missing, minutes, score }
}

export function recommendFromCatalog(
  query: string,
  inventory: InventoryItem[],
  recipes: Recipe[],
  minutes?: number,
): RecommendationResponse {
  const intent = parseCookingIntent(query, minutes)
  const ranked = recipes
    .map((recipe) => scoreRecipe(recipe, inventory, intent, query))
    .sort((a, b) => b.score - a.score)

  const allowed = ranked.filter((entry) => {
    const excluded = intent.exclusions.some((exclusion) => recipeMentions(entry.recipe, exclusion))
    const tooLong = intent.maxMinutes !== undefined && entry.minutes > intent.maxMinutes + 5
    return !excluded && !tooLong
  })
  const picks = (allowed.length ? allowed : ranked).slice(0, 3)

  return {
    source: "catalog",
    summary:
      "I picked from your saved recipes using your request and what’s in the kitchen. This is catalog matching, not a live AI answer. Dates are reminders, not food-safety guarantees.",
    recipes: picks.map((entry) => ({
      name: entry.recipe.name,
      reason: buildReason(entry.recipe, intent, entry.available, entry.missing),
      estimatedMinutes: entry.minutes || 1,
      using: entry.available,
      missing: entry.missing,
      matchedRecipeId: entry.recipe.id,
      why: whyForRecipe(entry.recipe, inventory, intent, entry.available, entry.missing),
    })),
  }
}

function buildReason(
  recipe: Recipe,
  intent: CookingIntent,
  available: string[],
  missing: string[],
) {
  const bits = [`I'd make ${recipe.name}`]
  if (intent.exclusions.length) bits.push(`it skips ${intent.exclusions.join(" and ")}`)
  if (available.length) bits.push(`and uses ${available.slice(0, 2).join(" and ")} you already have`)
  if (missing.length) bits.push(`(you'd still need ${missing.slice(0, 2).join(" and ")})`)
  return `${bits.join(" ")}.`
}
