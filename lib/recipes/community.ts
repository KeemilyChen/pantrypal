import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { TAG_KINDS } from "@/lib/types"
import { dedupeTags, type TagDraft } from "@/lib/tags/slug"

export const publishRecipeSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  instructions: z.array(z.string().min(1)).min(1).max(30),
  prepTime: z.number().int().nonnegative().default(0),
  cookTime: z.number().int().nonnegative().default(0),
  servings: z.number().int().positive().max(24).default(2),
  calories: z.number().nonnegative().nullable().optional(),
  proteinG: z.number().nonnegative().nullable().optional(),
  carbsG: z.number().nonnegative().nullable().optional(),
  fatG: z.number().nonnegative().nullable().optional(),
  nutritionSource: z.enum(["ai_estimate", "user"]).optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        optional: z.boolean().optional().default(false),
      }),
    )
    .min(1)
    .max(40),
  tags: z
    .array(
      z.object({
        name: z.string().min(1).max(48),
        kind: z.enum(TAG_KINDS).optional(),
        source: z.enum(["ai", "user", "ingredient"]).optional(),
      }),
    )
    .default([]),
})

export type PublishRecipeInput = z.infer<typeof publishRecipeSchema>

async function attachTags(
  supabase: SupabaseClient,
  recipeId: string,
  drafts: TagDraft[],
) {
  for (const tag of drafts) {
    const { data, error } = await supabase.rpc("upsert_tag", {
      p_name: tag.name,
      p_kind: tag.kind,
    })
    if (error || !data) continue
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.id) continue
    await supabase.from("recipe_tags").upsert(
      {
        recipe_id: recipeId,
        tag_id: row.id,
        source: tag.source ?? "ai",
      },
      { onConflict: "recipe_id,tag_id" },
    )
  }
}

export async function publishCommunityRecipe(
  supabase: SupabaseClient,
  userId: string,
  input: PublishRecipeInput,
) {
  const ingredientDrafts = dedupeTags(
    input.ingredients.map((item) => ({ name: item.name, kind: "ingredient" as const, source: "ingredient" as const })),
    12,
  )
  const tags = dedupeTags(
    [
      ...input.tags.map((tag) => ({ ...tag, source: tag.source ?? "user" })),
      ...ingredientDrafts,
    ],
    12,
  )

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      description: input.description.trim(),
      instructions: input.instructions,
      prep_time: input.prepTime,
      cook_time: input.cookTime,
      servings: input.servings,
      source: "ai",
      is_public: true,
      published_at: new Date().toISOString(),
      calories: input.calories ?? null,
      protein_g: input.proteinG ?? null,
      carbs_g: input.carbsG ?? null,
      fat_g: input.fatG ?? null,
      nutrition_source:
        input.calories != null || input.proteinG != null
          ? (input.nutritionSource ?? "ai_estimate")
          : null,
    })
    .select("id")
    .single()

  if (error || !recipe) {
    throw new Error(error?.message || "Could not publish that recipe.")
  }

  const { error: ingredientError } = await supabase.from("recipe_ingredients").insert(
    input.ingredients.map((item) => ({
      recipe_id: recipe.id,
      ingredient_name: item.name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      optional: item.optional ?? false,
    })),
  )
  if (ingredientError) {
    await supabase.from("recipes").delete().eq("id", recipe.id)
    throw new Error("Could not save ingredients.")
  }

  await attachTags(supabase, recipe.id, tags)
  return recipe.id as string
}

export async function addRecipeTag(
  supabase: SupabaseClient,
  recipeId: string,
  userId: string,
  name: string,
  kind?: string,
) {
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("id, user_id")
    .eq("id", recipeId)
    .single()
  if (recipeError || !recipe || recipe.user_id !== userId) {
    throw new Error("You can only tag recipes you posted.")
  }

  const tags = dedupeTags([{ name, kind, source: "user" }], 1)
  if (!tags.length) throw new Error("That tag is empty.")
  await attachTags(supabase, recipeId, tags)
}
