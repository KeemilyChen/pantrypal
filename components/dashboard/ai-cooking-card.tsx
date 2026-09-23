"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { RecommendationResponse } from "@/lib/ai/schemas"
import { useKitchen } from "@/components/providers/kitchen-provider"
import { toast } from "sonner"

export function AiCookingCard() {
  const { inventory, allRecipes } = useKitchen()
  const [query, setQuery] = useState("I have chicken, broccoli and rice...")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecommendationResponse | null>(null)

  async function ask() {
    setLoading(true)
    try {
      const response = await fetch("/api/ai/recipe-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          inventory: inventory
            .filter((item) => item.status === "available")
            .map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              expirationDate: item.expirationDate,
              storageLocation: item.storageLocation,
            })),
          recipeCatalog: allRecipes.map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            cookTime: recipe.cookTime,
            prepTime: recipe.prepTime,
            ingredients: recipe.ingredients.map((ingredient) => ingredient.ingredientName),
          })),
        }),
      })
      const data = (await response.json()) as RecommendationResponse & { error?: string }
      if (!response.ok) throw new Error(data.error ?? "Could not get recommendations")
      setResult(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-[#FF6B4A] to-[#ff8a6a] p-5 text-white shadow-sm">
      <p className="text-sm font-medium text-white/80">What can I cook?</p>
      <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight">
        Ask PantryPal about tonight
      </h2>
      <div className="mt-4 space-y-3">
        <Label htmlFor="cook-query" className="sr-only">
          Cooking request
        </Label>
        <Textarea
          id="cook-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-20 border-white/30 bg-white/15 text-white placeholder:text-white/70"
        />
        <Button
          type="button"
          onClick={ask}
          disabled={loading || !query.trim()}
          className="h-10 rounded-full bg-white px-4 text-[#FF6B4A] hover:bg-white/90"
        >
          {loading ? "Thinking…" : "Ask PantryPal"}
        </Button>
      </div>
      {result ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-white/90">{result.summary}</p>
          {result.recipes.map((recipe) => (
            <div key={recipe.name} className="rounded-2xl bg-white/15 p-3">
              <p className="font-medium">{recipe.name}</p>
              <p className="text-sm text-white/85">{recipe.reason}</p>
              <p className="mt-1 text-xs text-white/70">{recipe.estimatedMinutes} min</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function QuickAskField(props: { onAsk: (query: string) => void }) {
  const [query, setQuery] = useState("")
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (query.trim()) props.onAsk(query.trim())
      }}
    >
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="20 minutes, something cozy…" />
      <Button type="submit">Ask</Button>
    </form>
  )
}
