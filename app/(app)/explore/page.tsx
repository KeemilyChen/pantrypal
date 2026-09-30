"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExploreCard, type ExploreCardItem } from "@/components/explore/explore-card"
import { toast } from "sonner"

const TYPES = [
  { id: "all", label: "All" },
  { id: "recipe", label: "Recipes" },
  { id: "meal_plan", label: "Meal Plans" },
] as const

export default function ExplorePage() {
  const [search, setSearch] = useState("")
  const [tag, setTag] = useState("")
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("all")
  const [items, setItems] = useState<ExploreCardItem[]>([])
  const [needsAuth, setNeedsAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load(nextSearch = search, nextTag = tag, nextType = type) {
    setLoading(true)
    setError("")
    const params = new URLSearchParams({ mode: "foryou", type: nextType })
    if (nextSearch.trim()) params.set("search", nextSearch.trim())
    if (nextTag.trim()) params.set("tag", nextTag.trim())
    const response = await fetch(`/api/recipes/explore?${params.toString()}`)
    const data = (await response.json()) as {
      items?: ExploreCardItem[]
      recipes?: ExploreCardItem[]
      needsAuth?: boolean
      error?: string
    }
    if (!response.ok) {
      setItems([])
      setError(data.error ?? "Could not load Explore.")
      setLoading(false)
      return
    }
    setNeedsAuth(Boolean(data.needsAuth))
    setItems(data.items ?? data.recipes ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load("", "", "all")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function engage(item: ExploreCardItem, path: "like" | "save") {
    const response = await fetch(`/api/recipes/${item.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: item.contentType }),
    })
    if (!response.ok) {
      toast.error("Could not update.")
      return
    }
    const data = (await response.json()) as { liked?: boolean; saved?: boolean }
    setItems((current) =>
      current.map((row) => {
        if (row.id !== item.id || row.contentType !== item.contentType) return row
        if (path === "like") {
          const liked = Boolean(data.liked)
          return { ...row, liked, likeCount: Math.max(0, (row.likeCount ?? 0) + (liked ? 1 : -1)) }
        }
        return { ...row, saved: Boolean(data.saved) }
      }),
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Personalized picks from other kitchens — recipes and meal plans you can cook or import.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={type === item.id ? "default" : "outline"}
            className="h-9 rounded-full"
            onClick={() => {
              setType(item.id)
              void load(search, tag, item.id)
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          void load()
        }}
      >
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recipes or meal plans" />
        <Input
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="Filter by tag"
          className="sm:w-48"
        />
        <Button type="submit" className="rounded-full">
          Search
        </Button>
      </form>
      {needsAuth ? (
        <p className="rounded-3xl border border-dashed border-[#f0e6d6] p-5 text-sm text-muted-foreground">
          Sign in to browse Explore. Demo kitchens cannot post or import community content.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading Explore…</p> : null}
      {!loading && !needsAuth && !items.length ? (
        <p className="text-sm text-muted-foreground">Nothing public matches that search yet.</p>
      ) : null}
      <div className="grid gap-4">
        {items.map((item) => (
          <ExploreCard
            key={`${item.contentType}-${item.id}`}
            item={item}
            onTag={(slug) => {
              setTag(slug)
              void load(search, slug, type)
              void fetch(`/api/recipes/${item.id}/interactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: "tag_click", targetType: item.contentType }),
              })
            }}
            onLike={() => void engage(item, "like")}
            onSave={() => void engage(item, "save")}
          />
        ))}
      </div>
    </div>
  )
}
