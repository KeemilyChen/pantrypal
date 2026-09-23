"use client"

import { Suspense } from "react"
import { format, isValid, parseISO } from "date-fns"
import { useSearchParams } from "next/navigation"
import { MealCalendar } from "@/components/meal-plan/meal-calendar"
import { MealDayView } from "@/components/meal-plan/meal-day-view"
import { todayISO, useKitchen } from "@/components/providers/kitchen-provider"

function PlanBody() {
  const { ready } = useKitchen()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  const monthParam = searchParams.get("month")

  if (!ready) return <p className="text-sm text-muted-foreground">Loading plan…</p>

  const date = dateParam && isValid(parseISO(dateParam)) ? dateParam : null
  const month =
    monthParam && isValid(parseISO(`${monthParam}-01`))
      ? monthParam
      : format(parseISO(todayISO()), "yyyy-MM")

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold">Meal plan</h1>
        <p className="text-sm text-muted-foreground">
          See the month at a glance, then tap a day to add breakfast, lunch, dinner, or a snack.
        </p>
      </header>
      {date ? <MealDayView date={date} /> : <MealCalendar month={month} />}
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading plan…</p>}>
      <PlanBody />
    </Suspense>
  )
}
