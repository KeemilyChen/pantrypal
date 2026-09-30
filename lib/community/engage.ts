import type { SupabaseClient } from "@supabase/supabase-js"

export type CommunityTarget = "recipe" | "meal_plan"

export async function toggleLike(
  supabase: SupabaseClient,
  userId: string,
  targetType: CommunityTarget,
  targetId: string,
) {
  const { data: existing } = await supabase
    .from("community_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from("community_likes")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
    return { liked: false }
  }

  const { error } = await supabase.from("community_likes").insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
  })
  if (error) throw new Error("Could not like that.")
  return { liked: true }
}

export async function toggleSave(
  supabase: SupabaseClient,
  userId: string,
  targetType: CommunityTarget,
  targetId: string,
) {
  const { data: existing } = await supabase
    .from("community_saves")
    .select("user_id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from("community_saves")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
    return { saved: false }
  }

  const { error } = await supabase.from("community_saves").insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
  })
  if (error) throw new Error("Could not save that.")
  return { saved: true }
}

export async function recordInteraction(
  supabase: SupabaseClient,
  userId: string,
  input: {
    targetType: CommunityTarget
    targetId: string
    kind: "cook" | "open" | "tag_click" | "plan"
    tagId?: string | null
  },
) {
  await supabase.from("community_interactions").insert({
    user_id: userId,
    target_type: input.targetType,
    target_id: input.targetId,
    kind: input.kind,
    tag_id: input.tagId ?? null,
  })
}
