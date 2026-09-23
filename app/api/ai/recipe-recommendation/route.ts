import { getOpenAI } from "@/lib/ai/openai"
import { recommendFromCatalog } from "@/lib/ai/recipe-recommender"
import {
  recommendationRequestSchema,
  recommendationResponseSchema,
} from "@/lib/ai/schemas"
import { SYSTEM_RECIPES } from "@/lib/data/system-recipes"
import type { InventoryItem, Recipe } from "@/lib/types"

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

  const catalog: Recipe[] = parsed.data.recipeCatalog.map((recipe) => {
    const system = SYSTEM_RECIPES.find((item) => item.id === recipe.id)
    if (system) return system
    return {
      id: recipe.id,
      userId: "request",
      name: recipe.name,
      description: "",
      instructions: [],
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: 2,
      source: "user",
      imageUrl: null,
      createdAt: new Date().toISOString(),
      ingredients: recipe.ingredients.map((name, index) => ({
        id: `${recipe.id}-${index}`,
        recipeId: recipe.id,
        ingredientName: name,
        quantity: null,
        unit: null,
        optional: false,
      })),
    }
  })

  const fallback = recommendFromCatalog(
    parsed.data.query,
    inventory,
    catalog.length ? catalog : SYSTEM_RECIPES,
    parsed.data.minutes,
  )

  const openai = getOpenAI()
  if (!openai) {
    return Response.json(recommendationResponseSchema.parse(fallback))
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are PantryPal, a kitchen companion. Recommend meals from the provided catalog and inventory. Return JSON matching {summary, recipes:[{name,reason,estimatedMinutes,using,missing,matchedRecipeId}]}. Do not invent inventory. Treat expiration dates as user-entered labels, not safety guarantees. Prefer using food that will expire soon when relevant.",
      },
      {
        role: "user",
        content: JSON.stringify({
          query: parsed.data.query,
          minutes: parsed.data.minutes,
          inventory: parsed.data.inventory,
          recipeCatalog: parsed.data.recipeCatalog,
          fallback,
        }),
      },
    ],
  })

  const content = completion.choices[0]?.message.content
  if (!content) {
    return Response.json(recommendationResponseSchema.parse(fallback))
  }

  let candidate: unknown
  try {
    candidate = JSON.parse(content)
  } catch {
    return Response.json(recommendationResponseSchema.parse(fallback))
  }

  const validated = recommendationResponseSchema.safeParse(candidate)
  if (!validated.success) {
    return Response.json(recommendationResponseSchema.parse(fallback))
  }

  return Response.json(validated.data)
}
