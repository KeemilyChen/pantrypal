import { getOpenAI, jsonChatCompletion } from "@/lib/ai/openai"
import { generateSimpleFromInventory, ownershipWhy } from "@/lib/ai/recipe-recommender"
import {
  recommendationRequestSchema,
  recommendationResponseSchema,
} from "@/lib/ai/schemas"
import { daysUntilExpiration } from "@/lib/inventory/expiration"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import { dedupeTags } from "@/lib/tags/slug"
import type { InventoryItem } from "@/lib/types"

export const maxDuration = 60

const SYSTEM_PROMPT = `You are PantryPal. Suggest 1 to 3 practical home-cooked recipes.

The user's request and their AVAILABLE INVENTORY are the source of truth.
Invent recipes around those foods. Do NOT choose from a fixed recipe catalog.

Rules:
- Prefer using several inventory items in each recipe.
- You MAY add a small number of extra ingredients when useful (for example salt, oil, a spice, or one produce item).
- List EVERY required ingredient in ingredients[], including extras. Do not hide extras in the instructions only.
- Never claim the user already owns an ingredient. Do not include using, missing, or "you have X" language.
- Honor time limits and preferences in the request (quick, spicy, no oven, etc.).
- estimatedMinutes, prepTime, and cookTime must be realistic integers.
- instructions: 4 to 8 short steps.
- If inventory is empty, still return simple recipes and list all ingredients as extras.
- Invent 3 to 8 open-ended tags covering cuisine, main ingredients, meal type, health/style, cooking method, and time/convenience. Do not choose from a fixed tag list.
- Also estimate nutrition for the full recipe (not per bite): calories, proteinG, carbsG, fatG as numbers from the listed ingredient amounts. These are rough kitchen estimates, not lab values.

Return JSON only:
{summary, recipes:[{name, description, estimatedMinutes, prepTime, cookTime, ingredients:[{name, quantity, unit, optional}], instructions, tags:[{name, kind}], calories, proteinG, carbsG, fatG}]}
quantity may be a number or null. unit may be a string or null. optional is boolean.
kind is one of cuisine, diet, ingredient, meal, method, other.`

export async function POST(request: Request) {
  const json: unknown = await request.json()
  const parsed = recommendationRequestSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "Invalid recommendation request" }, { status: 400 })
  }

  const inventory: InventoryItem[] = parsed.data.inventory.map((item) => ({
    id: item.id,
    userId: "request",
    name: item.name,
    category: "other",
    quantity: item.quantity,
    unit: item.unit,
    storageLocation: item.storageLocation as InventoryItem["storageLocation"],
    purchaseDate: null,
    expirationDate: item.expirationDate,
    status: "available",
    source: "manual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  const openai = getOpenAI()
  if (!openai) {
    return Response.json(recommendationResponseSchema.parse(generateSimpleFromInventory(parsed.data.query, inventory)))
  }

  const inventoryContext = parsed.data.inventory.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    storageLocation: item.storageLocation,
    expirationDate: item.expirationDate,
    daysUntilExpiration: daysUntilExpiration(item.expirationDate),
  }))

  try {
    const completion = await jsonChatCompletion(openai, [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          request: parsed.data.query,
          minutes: parsed.data.minutes ?? null,
          availableInventory: inventoryContext,
        }),
      },
    ])

    const content = completion.choices[0]?.message.content
    if (!content) {
      return Response.json(
        { error: "PantryPal could not answer just now. Try asking again." },
        { status: 502 },
      )
    }

    let candidate: unknown
    try {
      candidate = JSON.parse(content)
    } catch {
      return Response.json(
        { error: "PantryPal returned an unreadable answer. Try asking again." },
        { status: 502 },
      )
    }

    const validated = recommendationResponseSchema.safeParse({
      ...(typeof candidate === "object" && candidate ? candidate : {}),
      source: "ai",
    })
    if (!validated.success) {
      return Response.json(
        { error: "PantryPal's answer was incomplete. Try asking again." },
        { status: 502 },
      )
    }

    const attached = attachOwnership(validated.data, inventory)
    if (!attached.recipes.length) {
      return Response.json(
        { error: "PantryPal could not build a recipe from that request. Try again." },
        { status: 422 },
      )
    }

    return Response.json(recommendationResponseSchema.parse(attached))
  } catch {
    return Response.json(
      { error: "PantryPal could not reach the kitchen assistant. Try again in a moment." },
      { status: 502 },
    )
  }
}

function attachOwnership(
  response: ReturnType<typeof recommendationResponseSchema.parse>,
  inventory: InventoryItem[],
) {
  const recipes = response.recipes.map((entry) => {
    const required = entry.ingredients
      .filter((item) => !item.optional)
      .map((item) => item.name)
    const { available, missing } = matchRecipeIngredients(inventory, required)
    const minutes = entry.estimatedMinutes || entry.prepTime + entry.cookTime
    return {
      ...entry,
      description: entry.description || entry.reason || "",
      reason: entry.description || "A recipe idea based on your fridge and request.",
      estimatedMinutes: minutes || 1,
      tags: dedupeTags(entry.tags ?? []),
      using: available,
      missing,
      why: ownershipWhy(available, missing, minutes || 1),
      matchedRecipeId: null,
    }
  })

  return {
    summary: `Here ${recipes.length === 1 ? "is an idea" : `are ${recipes.length} ideas`} based on your fridge and your request.`,
    source: "ai" as const,
    recipes: recipes.slice(0, 3),
  }
}
