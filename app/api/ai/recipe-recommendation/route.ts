import { getOpenAI } from "@/lib/ai/openai"
import {
  parseCookingIntent,
  recommendFromCatalog,
  whyForRecipe,
} from "@/lib/ai/recipe-recommender"
import {
  recommendationRequestSchema,
  recommendationResponseSchema,
} from "@/lib/ai/schemas"
import { daysUntilExpiration } from "@/lib/inventory/expiration"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import { SYSTEM_RECIPES } from "@/lib/data/system-recipes"
import type { InventoryItem, Recipe } from "@/lib/types"

const SYSTEM_PROMPT = `You are PantryPal, a friendly kitchen buddy.
The user's message is the PRIMARY instruction. Follow it first.
Inventory, expiration labels, and the recipe catalog are supporting context only.

Rules:
- Recommend 1 to 3 meals ONLY from recipeCatalog. Never invent a recipe that is not in the catalog.
- Set matchedRecipeId to that catalog recipe's id. Never invent ids.
- Honor constraints: time limits, exclusions (no rice, no pasta), effort (easy), preferences (light, high protein), "use my X", and using food that is expiring soon when the user asks or it clearly helps.
- Do not recommend a recipe that uses an excluded ingredient.
- Do not invent inventory items. using/missing must come from the catalog ingredients vs inventory.
- Treat expiration dates as user-entered reminders, not food-safety guarantees.
- summary should sound like a buddy answering the request in 1-2 sentences.
- reason should say why this meal fits the request.
- why should be 2-5 short bullets (time, exclusions, expiring item, already have ingredients, matches "easy"/"light"/etc).
- If nothing in the catalog fits well, still pick the closest catalog recipes and say what does not perfectly match.

Return JSON: {summary, source:"ai", recipes:[{name,reason,estimatedMinutes,using,missing,matchedRecipeId,why}]}`

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
      description: recipe.description ?? "",
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
  const recipes = catalog.length ? catalog : SYSTEM_RECIPES
  const intent = parseCookingIntent(parsed.data.query, parsed.data.minutes)

  const openai = getOpenAI()
  if (!openai) {
    return Response.json(
      recommendationResponseSchema.parse(recommendFromCatalog(parsed.data.query, inventory, recipes, parsed.data.minutes)),
    )
  }

  const inventoryContext = parsed.data.inventory.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    storageLocation: item.storageLocation,
    expirationDate: item.expirationDate,
    daysUntilExpiration: daysUntilExpiration(item.expirationDate),
  }))

  const catalogContext = recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    minutes: recipe.prepTime + recipe.cookTime,
    ingredients: recipe.ingredients.map((ingredient) => ingredient.ingredientName),
  }))

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            request: parsed.data.query,
            parsedIntent: intent,
            inventory: inventoryContext,
            recipeCatalog: catalogContext,
          }),
        },
      ],
    })

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
        { error: "PantryPal's answer did not match a catalog recipe. Try a slightly different request." },
        { status: 502 },
      )
    }

    const attached = attachCatalogRecipes(validated.data, recipes, inventory, intent)
    if (!attached.recipes.length) {
      return Response.json(
        { error: "PantryPal could not match that request to a saved recipe. Try a slightly different request." },
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

function attachCatalogRecipes(
  response: ReturnType<typeof recommendationResponseSchema.parse>,
  recipes: Recipe[],
  inventory: InventoryItem[],
  intent: ReturnType<typeof parseCookingIntent>,
) {
  const resolved = response.recipes.flatMap((entry) => {
    const recipe =
      recipes.find((item) => item.id === entry.matchedRecipeId) ??
      recipes.find((item) => item.name.toLowerCase() === entry.name.toLowerCase())
    if (!recipe) return []
    const names = recipe.ingredients.filter((item) => !item.optional).map((item) => item.ingredientName)
    const { available, missing } = matchRecipeIngredients(inventory, names)
    const minutes = recipe.prepTime + recipe.cookTime
    const why = entry.why.length
      ? entry.why
      : whyForRecipe(recipe, inventory, intent, available, missing)
    return [
      {
        ...entry,
        name: recipe.name,
        estimatedMinutes: minutes || entry.estimatedMinutes,
        using: available,
        missing,
        matchedRecipeId: recipe.id,
        why,
      },
    ]
  })

  return {
    ...response,
    source: "ai" as const,
    recipes: resolved.slice(0, 3),
  }
}
