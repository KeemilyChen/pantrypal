"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { RecommendationResponse } from "@/lib/ai/schemas"
import { useKitchen } from "@/components/providers/kitchen-provider"
import { TagChips, type ChipTag } from "@/components/recipes/tag-chips"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { toast } from "sonner"

const PLACEHOLDER = "Something healthy under 20 minutes, no pasta…"

export function AiCookingCard() {
  const { inventory } = useKitchen()
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecommendationResponse | null>(null)
  const [extraTags, setExtraTags] = useState<Record<number, ChipTag[]>>({})
  const [posted, setPosted] = useState<Record<number, string>>({})
  const [posting, setPosting] = useState<number | null>(null)

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
        }),
      })
      const data = (await response.json()) as RecommendationResponse & { error?: string }
      if (!response.ok) throw new Error(data.error ?? "Could not get recommendations")
      setResult(data)
      setExtraTags({})
      setPosted({})
    } catch (error) {
      setResult(null)
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function publish(index: number) {
    const recipe = result?.recipes[index]
    if (!recipe) return
    setPosting(index)
    try {
      const browser = createBrowserSupabase()
      const session = browser ? (await browser.auth.getSession()).data.session : null
      const tags = [...(recipe.tags ?? []), ...(extraTags[index] ?? [])]
      const response = await fetch("/api/recipes/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          name: recipe.name,
          description: recipe.description || recipe.reason,
          instructions: recipe.instructions,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          calories: recipe.calories ?? null,
          proteinG: recipe.proteinG ?? null,
          carbsG: recipe.carbsG ?? null,
          fatG: recipe.fatG ?? null,
          nutritionSource: "ai_estimate",
          ingredients: recipe.ingredients.map((item) => ({
            name: item.name,
            quantity: item.quantity ?? null,
            unit: item.unit ?? null,
            optional: item.optional,
          })),
          tags: tags.map((tag) => ({
            name: tag.name,
            kind: tag.kind,
            source: extraTags[index]?.some((item) => item.name === tag.name) ? "user" : "ai",
          })),
        }),
      })
      const data = (await response.json()) as { id?: string; error?: string }
      if (!response.ok) throw new Error(data.error ?? "Could not post to Explore")
      if (data.id) setPosted((current) => ({ ...current, [index]: data.id as string }))
      toast.success("Posted to Explore")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post to Explore")
    } finally {
      setPosting(null)
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
          placeholder={PLACEHOLDER}
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
          {result.source === "fallback" ? (
            <p className="text-xs text-white/70">
              Live AI is off, so this is a simple fridge-based idea — not a catalog pick.
            </p>
          ) : null}
          {result.recipes.map((recipe, index) => (
            <div key={recipe.name} className="rounded-2xl bg-white/15 p-3">
              <p className="font-medium">{recipe.name}</p>
              <p className="text-sm text-white/85">{recipe.description || recipe.reason}</p>
              <p className="mt-1 text-xs text-white/70">{recipe.estimatedMinutes} min</p>
              {recipe.calories != null || recipe.proteinG != null ? (
                <p className="mt-1 text-xs text-white/80">
                  Estimated nutrition — {[
                    recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : null,
                    recipe.proteinG != null ? `${Math.round(recipe.proteinG)}g protein` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-white/90">Have: {recipe.using.join(", ") || "—"}</p>
              <p className="text-xs text-white/90">Missing: {recipe.missing.join(", ") || "—"}</p>
              <div className="mt-3">
                <TagChips
                  light
                  tags={[...(recipe.tags ?? []), ...(extraTags[index] ?? [])]}
                  onChange={(tags) =>
                    setExtraTags((current) => ({
                      ...current,
                      [index]: tags.filter(
                        (tag) => !(recipe.tags ?? []).some((item) => item.name.toLowerCase() === tag.name.toLowerCase()),
                      ),
                    }))
                  }
                />
              </div>
              {posted[index] ? (
                <p className="mt-2 text-xs text-white/80">Posted to Explore.</p>
              ) : (
                <Button
                  type="button"
                  onClick={() => void publish(index)}
                  disabled={posting === index}
                  className="mt-3 h-9 rounded-full bg-white/20 text-white hover:bg-white/30"
                >
                  {posting === index ? "Posting…" : "Post to Explore"}
                </Button>
              )}
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
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Something easy, no rice…"
      />
      <Button type="submit">Ask</Button>
    </form>
  )
}
