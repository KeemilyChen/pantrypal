import { createRequestSupabase, getRequestUser } from "@/lib/supabase/request"
import { publishCommunityRecipe, publishRecipeSchema } from "@/lib/recipes/community"

export async function POST(request: Request) {
  const supabase = await createRequestSupabase(request)
  if (!supabase) {
    return Response.json({ error: "Sign in to post recipes to Explore." }, { status: 401 })
  }

  const user = await getRequestUser(supabase)
  if (!user) {
    return Response.json({ error: "Sign in to post recipes to Explore." }, { status: 401 })
  }

  const json: unknown = await request.json().catch(() => null)
  const parsed = publishRecipeSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "That recipe is missing details needed to post." }, { status: 400 })
  }

  try {
    const id = await publishCommunityRecipe(supabase, user.id, parsed.data)
    return Response.json({ id })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not publish that recipe." },
      { status: 400 },
    )
  }
}
