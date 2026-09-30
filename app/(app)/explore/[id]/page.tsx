"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { Heart, Bookmark } from "lucide-react"
import { TagChips } from "@/components/recipes/tag-chips"
import { Button, buttonVariants } from "@/components/ui/button"
import { IngredientList } from "@/components/recipes/recipe-card"
import { AddToPlanForm } from "@/components/recipes/add-to-plan-form"
import { formatNutrition } from "@/lib/recipes/explore-rank"
import { useKitchen } from "@/components/providers/kitchen-provider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type CommunityRecipe = {
  id: string
  name: string
  description: string
  instructions: string[]
  prepTime: number
  cookTime: number
  servings: number
  isOwner: boolean
  creatorId?: string
  creatorName?: string
  calories?: number | null
  proteinG?: number | null
  nutritionSource?: string | null
  likeCount?: number
  liked?: boolean
  saved?: boolean
  haveCount?: number
  needCount?: number
  missing?: string[]
  tags: Array<{ slug: string; name: string; kind: string }>
  ingredients: Array<{
    id: string
    ingredientName: string
    quantity: number | null
    unit: string | null
    optional: boolean
  }>
}

export default function ExploreRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { addMissingToShopping } = useKitchen()
  const [recipe, setRecipe] = useState<CommunityRecipe | null>(null)
  const [error, setError] = useState("")

  async function load() {
    const response = await fetch(`/api/recipes/${id}`)
    const data = (await response.json()) as { recipe?: CommunityRecipe; error?: string }
    if (!response.ok || !data.recipe) {
      setError(data.error ?? "Recipe not found.")
      setRecipe(null)
      return
    }
    setRecipe(data.recipe)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function toggle(path: "like" | "save") {
    const response = await fetch(`/api/recipes/${id}/${path}`, { method: "POST" })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      toast.error(data.error ?? "Could not update.")
      return
    }
    await load()
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/explore" className="text-sm text-muted-foreground">
          ← Explore
        </Link>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!recipe) return <p className="text-sm text-muted-foreground">Loading recipe…</p>
  const nutrition = formatNutrition(recipe)
  const missing = recipe.missing ?? []
  const available = recipe.ingredients
    .filter((item) => !item.optional)
    .map((item) => item.ingredientName)
    .filter((name) => !missing.includes(name))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/explore" className="text-sm text-muted-foreground">
        ← Explore
      </Link>
      <header>
        <h1 className="font-heading text-3xl font-semibold">{recipe.name}</h1>
        {recipe.creatorId ? (
          <Link href={`/profile/${recipe.creatorId}`} className="mt-1 block text-sm text-primary">
            {recipe.creatorName}
          </Link>
        ) : null}
        <p className="mt-2 text-muted-foreground">{recipe.description}</p>
        <p className="mt-1 text-sm">
          {recipe.prepTime + recipe.cookTime} minutes · {recipe.servings} servings
        </p>
        {nutrition ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {nutrition.estimated ? "Estimated nutrition — " : ""}
            {nutrition.text}
          </p>
        ) : null}
      </header>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={recipe.liked ? "default" : "outline"}
          className="rounded-full"
          onClick={() => void toggle("like")}
        >
          <Heart className={cn("size-4", recipe.liked ? "fill-current" : "")} />
          {recipe.liked ? "Liked" : "Like"} {recipe.likeCount ? `(${recipe.likeCount})` : ""}
        </Button>
        <Button
          variant={recipe.saved ? "default" : "outline"}
          className="rounded-full"
          onClick={() => void toggle("save")}
        >
          <Bookmark className={cn("size-4", recipe.saved ? "fill-current" : "")} />
          {recipe.saved ? "Saved" : "Save"}
        </Button>
        <Link href={`/cook/${id}`} className={cn(buttonVariants(), "rounded-full")}>
          Start Cooking
        </Link>
      </div>
      <AddToPlanForm recipeId={id} />
      {missing.length ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            const count = addMissingToShopping({
              id: recipe.id,
              userId: recipe.creatorId ?? null,
              name: recipe.name,
              description: recipe.description,
              instructions: recipe.instructions,
              prepTime: recipe.prepTime,
              cookTime: recipe.cookTime,
              servings: recipe.servings,
              source: "user",
              imageUrl: null,
              createdAt: "",
              ingredients: recipe.ingredients.map((item) => ({
                ...item,
                recipeId: recipe.id,
              })),
            })
            toast.success(
              count ? `${count} ${count === 1 ? "item" : "items"} added to Shopping` : "Those items are already on Shopping",
            )
          }}
        >
          Add missing to Shopping List
        </Button>
      ) : null}
      <TagChips
        tags={recipe.tags}
        onAddRemote={
          recipe.isOwner
            ? async (name) => {
                const response = await fetch(`/api/recipes/${id}/tags`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, kind: "other" }),
                })
                const data = (await response.json()) as { error?: string }
                if (!response.ok) {
                  toast.error(data.error ?? "Could not add that tag")
                  return
                }
                await load()
              }
            : undefined
        }
      />
      <IngredientList available={available} missing={missing} />
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Instructions</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {(Array.isArray(recipe.instructions) ? recipe.instructions : []).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
