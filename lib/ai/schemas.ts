import { z } from "zod"

export const recommendationRecipeSchema = z.object({
  name: z.string().min(1),
  reason: z.string().min(1),
  estimatedMinutes: z.number().int().nonnegative(),
  using: z.array(z.string()),
  missing: z.array(z.string()),
  matchedRecipeId: z.string().nullable(),
  why: z.array(z.string()).max(6).default([]),
})

export const recommendationResponseSchema = z.object({
  summary: z.string(),
  source: z.enum(["ai", "catalog"]),
  recipes: z.array(recommendationRecipeSchema).min(1).max(5),
})

export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>

export const recommendationRequestSchema = z.object({
  query: z.string().min(1).max(500),
  minutes: z.number().int().positive().max(240).optional(),
  inventory: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      expirationDate: z.string().nullable(),
      storageLocation: z.string(),
    }),
  ),
  recipeCatalog: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      cookTime: z.number(),
      prepTime: z.number(),
      ingredients: z.array(z.string()),
    }),
  ),
})
