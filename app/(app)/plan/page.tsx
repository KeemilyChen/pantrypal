"use client"

import { MealCalendar } from "@/components/meal-plan/meal-calendar"
import { useKitchen } from "@/components/providers/kitchen-provider"

export default function PlanPage() {
  const { ready } = useKitchen()
  if (!ready) return <p className="text-sm text-muted-foreground">Loading plan…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold">Meal plan</h1>
        <p className="text-sm text-muted-foreground">
          Pick recipes for the week. Missing ingredients can go to shopping in one tap from the recipe page.
        </p>
      </header>
      <MealCalendar />
    </div>
  )
}
