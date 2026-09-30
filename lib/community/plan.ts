import type { SupabaseClient } from "@supabase/supabase-js"
import { addDays, format, parseISO } from "date-fns"
import { MEAL_TYPES, type MealType } from "@/lib/types"
import { dedupeTags } from "@/lib/tags/slug"
import { recordInteraction } from "@/lib/community/engage"

export async function addRecipeToMealPlan(
  supabase: SupabaseClient,
  userId: string,
  recipeId: string,
  date: string,
  mealType: MealType,
  onConflict: "skip" | "replace" = "skip",
) {
  if (!(MEAL_TYPES as readonly string[]).includes(mealType)) {
    throw new Error("Pick breakfast, lunch, dinner, or a snack.")
  }

  const { data: existing } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("meal_type", mealType)
    .maybeSingle()

  if (existing && onConflict === "skip") {
    return { ok: false as const, conflict: true, imported: 0, skipped: 1 }
  }

  if (existing && onConflict === "replace") {
    const { error } = await supabase
      .from("meal_plans")
      .update({ recipe_id: recipeId, status: "planned" })
      .eq("id", existing.id)
    if (error) throw new Error("Could not update that meal slot.")
  } else if (!existing) {
    const { error } = await supabase.from("meal_plans").insert({
      user_id: userId,
      date,
      meal_type: mealType,
      recipe_id: recipeId,
      status: "planned",
    })
    if (error) throw new Error("Could not add that to your meal plan.")
  }

  await recordInteraction(supabase, userId, {
    targetType: "recipe",
    targetId: recipeId,
    kind: "plan",
  })
  return { ok: true as const, conflict: false, imported: 1, skipped: 0 }
}

export async function publishMealPlanTemplate(
  supabase: SupabaseClient,
  userId: string,
  input: { title: string; description?: string; startDate: string; endDate: string; tags?: { name: string }[] },
) {
  const { data: slots, error } = await supabase
    .from("meal_plans")
    .select("date, meal_type, recipe_id")
    .eq("user_id", userId)
    .gte("date", input.startDate)
    .lte("date", input.endDate)
    .order("date")

  if (error) throw new Error("Could not read your meal plan.")
  if (!slots?.length) throw new Error("That date range has no meals to share.")

  const recipeIds = [...new Set(slots.map((slot) => slot.recipe_id))]
  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, is_public, name")
    .in("id", recipeIds)

  const publicIds = new Set((recipes ?? []).filter((row) => row.is_public).map((row) => row.id))
  const usable = slots.filter((slot) => publicIds.has(slot.recipe_id))
  if (!usable.length) {
    throw new Error("Share recipes to Explore first, then share the meal plan.")
  }

  const start = parseISO(usable[0].date)
  const { data: template, error: templateError } = await supabase
    .from("meal_plan_templates")
    .insert({
      user_id: userId,
      title: input.title.trim() || "Shared meal plan",
      description: input.description?.trim() ?? "",
      is_public: true,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (templateError || !template) throw new Error("Could not publish that meal plan.")

  const { error: itemsError } = await supabase.from("meal_plan_template_items").insert(
    usable.map((slot) => ({
      template_id: template.id,
      day_offset: Math.max(0, Math.round((parseISO(slot.date).getTime() - start.getTime()) / 86400000)),
      meal_type: slot.meal_type,
      recipe_id: slot.recipe_id,
    })),
  )
  if (itemsError) {
    await supabase.from("meal_plan_templates").delete().eq("id", template.id)
    throw new Error("Could not save meal plan meals.")
  }

  const tagDrafts = dedupeTags(input.tags ?? [], 8)
  for (const tag of tagDrafts) {
    const { data } = await supabase.rpc("upsert_tag", { p_name: tag.name, p_kind: tag.kind })
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.id) continue
    await supabase.from("meal_plan_template_tags").upsert({
      template_id: template.id,
      tag_id: row.id,
      source: "user",
    })
  }

  const skippedPrivate = slots.length - usable.length
  return { id: template.id as string, skippedPrivate }
}

export async function importMealPlanTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string,
  startDate: string,
  onConflict: "skip" | "replace" = "skip",
) {
  const { data: items, error } = await supabase
    .from("meal_plan_template_items")
    .select("day_offset, meal_type, recipe_id")
    .eq("template_id", templateId)
  if (error || !items?.length) throw new Error("That meal plan has no meals.")

  let imported = 0
  let skipped = 0
  const start = parseISO(startDate)

  for (const item of items) {
    const date = format(addDays(start, item.day_offset), "yyyy-MM-dd")
    const result = await addRecipeToMealPlan(
      supabase,
      userId,
      item.recipe_id,
      date,
      item.meal_type as MealType,
      onConflict,
    )
    if (result.ok) imported += 1
    else skipped += 1
  }

  await recordInteraction(supabase, userId, {
    targetType: "meal_plan",
    targetId: templateId,
    kind: "plan",
  })

  return { imported, skipped }
}
