"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatNutrition } from "@/lib/recipes/explore-rank"
import { MEAL_TYPES } from "@/lib/types"
import { todayISO, useKitchen } from "@/components/providers/kitchen-provider"
import { toast } from "sonner"

type MealPlanDetail = {
  id: string
  userId: string
  title: string
  description: string
  creatorName: string
  likeCount: number
  liked: boolean
  saved: boolean
  mealCount: number
  dayCount: number
  calories?: number | null
  proteinG?: number | null
  nutritionSource?: string | null
  tags: Array<{ slug: string; name: string }>
  meals: Array<{
    dayOffset: number
    mealType: string
    recipeId: string
    name?: string
    calories?: number | null
    proteinG?: number | null
    nutritionSource?: string | null
  }>
}

export default function ExplorePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { refreshCloudPlan } = useKitchen()
  const [plan, setPlan] = useState<MealPlanDetail | null>(null)
  const [error, setError] = useState("")
  const [startDate, setStartDate] = useState(() => todayISO())
  const [importOpen, setImportOpen] = useState(false)

  async function load() {
    const response = await fetch(`/api/meal-plans/${id}`)
    const data = (await response.json()) as { mealPlan?: MealPlanDetail; error?: string }
    if (!response.ok || !data.mealPlan) {
      setError(data.error ?? "Meal plan not found.")
      return
    }
    setPlan(data.mealPlan)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function toggle(path: "like" | "save") {
    const response = await fetch(`/api/meal-plans/${id}/${path}`, { method: "POST" })
    if (!response.ok) toast.error("Could not update.")
    else await load()
  }

  async function importPlan(onConflict: "skip" | "replace") {
    const response = await fetch(`/api/meal-plans/${id}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, onConflict }),
    })
    const data = (await response.json()) as { error?: string; imported?: number; skipped?: number }
    if (!response.ok) {
      toast.error(data.error ?? "Could not import.")
      return
    }
    await refreshCloudPlan()
    setImportOpen(false)
    toast.success(`Imported ${data.imported ?? 0} meals${data.skipped ? `, skipped ${data.skipped} filled slots` : ""}`)
  }

  const days = useMemo(() => {
    if (!plan) return []
    const map = new Map<number, typeof plan.meals>()
    for (const meal of plan.meals) {
      const list = map.get(meal.dayOffset) ?? []
      list.push(meal)
      map.set(meal.dayOffset, list)
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([offset, meals]) => ({
        offset,
        meals: [...meals].sort(
          (a, b) => (MEAL_TYPES as readonly string[]).indexOf(a.mealType) - (MEAL_TYPES as readonly string[]).indexOf(b.mealType),
        ),
      }))
  }, [plan])

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
  if (!plan) return <p className="text-sm text-muted-foreground">Loading meal plan…</p>

  const nutrition = formatNutrition(plan)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/explore" className="text-sm text-muted-foreground">
        ← Explore
      </Link>
      <header>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Reusable meal plan</p>
        <h1 className="font-heading text-3xl font-semibold">{plan.title}</h1>
        <Link href={`/profile/${plan.userId}`} className="mt-1 block text-sm text-primary">
          {plan.creatorName}
        </Link>
        <p className="mt-2 text-muted-foreground">{plan.description}</p>
        <p className="mt-1 text-sm">
          {plan.mealCount} meals · {plan.dayCount} days
        </p>
        {nutrition ? (
          <p className="text-sm text-muted-foreground">
            {nutrition.estimated || plan.nutritionSource === "ai_estimate" ? "Estimated nutrition — " : ""}
            {nutrition.text} total
          </p>
        ) : null}
      </header>
      <div className="flex flex-wrap gap-2">
        <Button variant={plan.liked ? "default" : "outline"} className="rounded-full" onClick={() => void toggle("like")}>
          {plan.liked ? "Liked" : "Like"} ({plan.likeCount})
        </Button>
        <Button variant={plan.saved ? "default" : "outline"} className="rounded-full" onClick={() => void toggle("save")}>
          {plan.saved ? "Saved" : "Save"}
        </Button>
        <Button className="rounded-full" onClick={() => setImportOpen(true)}>
          Import Meal Plan
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {plan.tags.map((tag) => (
          <span key={tag.slug} className="rounded-full bg-[#fff6ea] px-2 py-0.5 text-[11px] font-medium">
            {tag.name}
          </span>
        ))}
      </div>
      <section className="space-y-6">
        {days.map((day) => (
          <div key={day.offset} className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Day {day.offset + 1}</h2>
            {day.meals.map((meal) => (
              <Link
                key={`${meal.dayOffset}-${meal.mealType}-${meal.recipeId}`}
                href={`/explore/${meal.recipeId}`}
                className="block rounded-3xl border border-[#f0e6d6] bg-white p-4"
              >
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{meal.mealType}</p>
                <p className="font-heading text-lg font-semibold">{meal.name}</p>
              </Link>
            ))}
          </div>
        ))}
      </section>
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import this plan</DialogTitle>
            <DialogDescription>
              Day 1 starts on the date you pick. Occupied slots stay as they are unless you replace them.
            </DialogDescription>
          </DialogHeader>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="rounded-full" onClick={() => void importPlan("skip")}>
              Import (keep filled slots)
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => void importPlan("replace")}>
              Import and replace filled slots
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
