"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CookingSteps } from "@/components/recipes/cooking-steps"
import { useKitchen } from "@/components/providers/kitchen-provider"
import { toast } from "sonner"

type Loaded = {
  id: string
  name: string
  instructions: string[]
  fromExplore: boolean
}

function asSteps(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return asSteps(parsed)
    } catch {
      return value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return []
}

export default function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { allRecipes, consumeRecipe, ready } = useKitchen()
  const [recipe, setRecipe] = useState<Loaded | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const local = allRecipes.find((item) => item.id === id)
    const localSteps = asSteps(local?.instructions)
    if (local && localSteps.length) {
      setRecipe({ id: local.id, name: local.name, instructions: localSteps, fromExplore: false })
      return
    }
    void fetch(`/api/recipes/${id}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          recipe?: { id: string; name: string; instructions: string[] }
          error?: string
        }
        if (!response.ok || !data.recipe) throw new Error(data.error ?? "Recipe not found.")
        const steps = asSteps(data.recipe.instructions)
        setRecipe({ id: data.recipe.id, name: data.recipe.name, instructions: steps, fromExplore: true })
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Recipe not found.")
      })
  }, [allRecipes, id])

  if (!ready && !recipe) return <p className="text-sm text-muted-foreground">Loading cooking mode…</p>
  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link href="/explore" className="text-sm text-muted-foreground">
          ← Back
        </Link>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }
  if (!recipe) return <p className="text-sm text-muted-foreground">Loading cooking mode…</p>

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={recipe.fromExplore ? `/explore/${id}` : `/recipes/${id}`} className="text-sm text-muted-foreground">
        ← {recipe.name}
      </Link>
      <h1 className="font-heading text-3xl font-semibold">Cooking</h1>
      {!recipe.instructions.length ? (
        <p className="text-sm text-muted-foreground">This recipe does not have cooking steps yet.</p>
      ) : (
        <CookingSteps
          steps={recipe.instructions}
          onFinish={() => {
            void fetch(`/api/recipes/${id}/interactions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind: "cook" }),
            })
            const local = allRecipes.find((item) => item.id === id)
            if (local) consumeRecipe(local)
            toast.success("Finished cooking")
            router.push(recipe.fromExplore ? `/explore/${id}` : `/recipes/${id}`)
          }}
        />
      )}
    </div>
  )
}
