import { z } from "zod"

export const cookingAssistantRequestSchema = z.object({
  recipeName: z.string(),
  currentStep: z.string(),
  stepIndex: z.number().int().nonnegative(),
  question: z.string().min(1),
  ingredients: z.array(z.string()),
})

export const cookingAssistantResponseSchema = z.object({
  answer: z.string(),
  suggestedTimerSeconds: z.number().int().nonnegative().nullable(),
})

/** Phase 7: conversational help around a recipe step. Must not mutate inventory. */
export type CookingAssistantResponse = z.infer<typeof cookingAssistantResponseSchema>
