"use client"

import { addDays, format, isValid, parseISO, subDays } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MealRecipePicker } from "@/components/meal-plan/meal-recipe-picker"
import { todayISO, useKitchen } from "@/components/providers/kitchen-provider"
import { MEAL_TYPES, type MealType } from "@/lib/types"
import { toast } from "sonner"

export function MealDayView({ date }: { date: string }) {
  const router = useRouter()
  const { mealPlans, allRecipes, addMealPlan, removeMealPlan } = useKitchen()
  const parsed = parseISO(date)
  const valid = isValid(parsed)
  const [picking, setPicking] = useState<MealType | null>(null)

  if (!valid) {
    return (
      <p className="text-sm text-muted-foreground">
        That date is not valid.{" "}
        <Link href="/plan" className="text-primary underline">
          Back to calendar
        </Link>
      </p>
    )
  }

  const monthParam = format(parsed, "yyyy-MM")
  const previous = format(subDays(parsed, 1), "yyyy-MM-dd")
  const next = format(addDays(parsed, 1), "yyyy-MM-dd")

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          onClick={() => router.push(`/plan?month=${monthParam}`)}
        >
          Calendar
        </Button>
        {date === todayISO() ? (
          <span className="text-xs font-semibold tracking-wide text-primary uppercase">Today</span>
        ) : null}
      </div>

      <header>
        <h2 className="font-heading text-2xl font-semibold">{format(parsed, "EEEE, MMMM d")}</h2>
      </header>

      <nav className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-0 flex-1 rounded-full"
          onClick={() => router.push(`/plan?date=${previous}`)}
        >
          ← {format(subDays(parsed, 1), "MMM d")}
        </Button>
        <p className="shrink-0 text-sm font-medium">{format(parsed, "MMM d")}</p>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-0 flex-1 rounded-full"
          onClick={() => router.push(`/plan?date=${next}`)}
        >
          {format(addDays(parsed, 1), "MMM d")} →
        </Button>
      </nav>

      <div className="space-y-3">
        {MEAL_TYPES.map((mealType) => {
          const plan = mealPlans.find((entry) => entry.date === date && entry.mealType === mealType)
          const recipe = allRecipes.find((item) => item.id === plan?.recipeId)
          return (
            <section key={mealType} className="rounded-3xl border border-[#f0e6d6] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
              </p>
              {recipe && plan ? (
                <div className="mt-2 space-y-3">
                  <Link href={`/recipes/${recipe.id}`} className="block font-heading text-lg font-semibold">
                    {recipe.name}
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-full"
                      onClick={() => setPicking(mealType)}
                    >
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-full"
                      onClick={() => {
                        removeMealPlan(plan.id)
                        toast.success("Meal removed")
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  className="mt-3 h-11 w-full rounded-full"
                  onClick={() => setPicking(mealType)}
                >
                  + Add meal
                </Button>
              )}
            </section>
          )
        })}
      </div>

      <MealRecipePicker
        open={Boolean(picking)}
        onOpenChange={(open) => {
          if (!open) setPicking(null)
        }}
        recipes={allRecipes}
        onChoose={(recipeId) => {
          if (!picking) return
          addMealPlan(date, picking, recipeId)
          toast.success("Meal planned")
          setPicking(null)
        }}
      />
    </div>
  )
}
