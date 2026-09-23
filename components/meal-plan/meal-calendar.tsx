"use client"

import { addDays, format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { todayISO, useKitchen } from "@/components/providers/kitchen-provider"
import { MEAL_TYPES, type MealType } from "@/lib/types"
import { toast } from "sonner"

export function MealCalendar() {
  const { mealPlans, allRecipes, addMealPlan, removeMealPlan } = useKitchen()
  const start = parseISO(todayISO())
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const date = format(day, "yyyy-MM-dd")
        return (
          <section key={date} className="rounded-3xl border border-[#f0e6d6] bg-white p-4 shadow-sm">
            <h2 className="font-heading text-lg font-semibold">
              {format(day, "EEEE")} <span className="text-sm font-normal text-muted-foreground">{format(day, "MMM d")}</span>
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {MEAL_TYPES.map((mealType) => {
                const plan = mealPlans.find((entry) => entry.date === date && entry.mealType === mealType)
                const recipe = allRecipes.find((item) => item.id === plan?.recipeId)
                return (
                  <div key={mealType} className="rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#f0e6d6]">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {mealType}
                    </p>
                    {recipe ? (
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <p className="font-medium">{recipe.name}</p>
                        <Button size="sm" variant="ghost" onClick={() => plan && removeMealPlan(plan.id)}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <select
                        className="mt-2 h-8 w-full rounded-lg border border-input bg-white px-2 text-sm"
                        defaultValue=""
                        onChange={(event) => {
                          if (!event.target.value) return
                          addMealPlan(date, mealType as MealType, event.target.value)
                          toast.success("Meal planned")
                          event.target.value = ""
                        }}
                      >
                        <option value="">Add a recipe…</option>
                        {allRecipes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
