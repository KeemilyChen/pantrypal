import { z } from "zod"
import { TAG_KINDS } from "@/lib/types"
import { normalizeTagKind } from "@/lib/tags/slug"

export const generatedIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  optional: z.boolean().optional().default(false),
})

export const generatedTagSchema = z.object({
  name: z.string().min(1).max(48),
  slug: z.string().optional(),
  kind: z
    .string()
    .optional()
    .transform((value) => normalizeTagKind(value)),
})

export const recommendationRecipeSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  reason: z.string().default(""),
  estimatedMinutes: z.number().int().nonnegative(),
  prepTime: z.number().int().nonnegative().optional().default(0),
  cookTime: z.number().int().nonnegative().optional().default(0),
  ingredients: z.array(generatedIngredientSchema).min(1),
  instructions: z.array(z.string().min(1)).min(1),
  tags: z
    .preprocess((value) => {
      if (!Array.isArray(value)) return []
      return value.map((item) => (typeof item === "string" ? { name: item } : item))
    }, z.array(generatedTagSchema).max(12))
    .default([]),
  calories: z.number().nonnegative().nullable().optional(),
  proteinG: z.number().nonnegative().nullable().optional(),
  carbsG: z.number().nonnegative().nullable().optional(),
  fatG: z.number().nonnegative().nullable().optional(),
  using: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  why: z.array(z.string()).max(6).default([]),
  matchedRecipeId: z.string().nullable().optional().default(null),
})

export const recommendationResponseSchema = z.object({
  summary: z.string(),
  source: z.enum(["ai", "fallback"]),
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
      quantity: z.coerce.number(),
      unit: z.string().default("count"),
      expirationDate: z.string().nullable().optional().default(null),
      storageLocation: z.string().default("fridge"),
    }),
  ),
  recipeCatalog: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        cookTime: z.number(),
        prepTime: z.number(),
        ingredients: z.array(z.string()),
      }),
    )
    .optional()
    .default([]),
})
