"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { format, isValid, parseISO } from "date-fns"
import { useSearchParams } from "next/navigation"
import { MealCalendar } from "@/components/meal-plan/meal-calendar"
import { MealDayView } from "@/components/meal-plan/meal-day-view"
import { PlanWeek } from "@/components/meal-plan/plan-week"
import { KitchenSubnav } from "@/components/layout/kitchen-subnav"
import { todayISO, useKitchen } from "@/components/providers/kitchen-provider"
import { cn } from "@/lib/utils"

function PlanBody() {
  const { ready, refreshCloudPlan } = useKitchen()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  const monthParam = searchParams.get("month")
  const view = searchParams.get("view")

  useEffect(() => {
    if (!ready) return
    void refreshCloudPlan()
  }, [ready, refreshCloudPlan, dateParam, monthParam, view])

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <KitchenSubnav />
        <p className="text-sm text-muted-foreground">Loading plan…</p>
      </div>
    )
  }

  const today = todayISO()
  const date = dateParam && isValid(parseISO(dateParam)) ? dateParam : today
  const month =
    monthParam && isValid(parseISO(`${monthParam}-01`))
      ? monthParam
      : format(parseISO(today), "yyyy-MM")
  const showCalendar = view === "calendar"
  const showWeek = view === "week"
  const isTodayView = !showCalendar && !showWeek

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <KitchenSubnav />
      <nav className="flex flex-wrap items-end justify-between gap-3">
        <Link
          href="/plan"
          className={cn(
            "font-heading leading-none",
            isTodayView ? "text-3xl font-semibold" : "text-sm font-medium text-muted-foreground",
          )}
        >
          Today
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/plan?view=week" className={cn(showWeek ? "font-medium text-foreground" : "text-muted-foreground")}>
            Week
          </Link>
          <Link href="/plan?view=calendar" className={cn(showCalendar ? "font-medium text-foreground" : "text-muted-foreground")}>
            Calendar
          </Link>
        </div>
      </nav>
      {isTodayView ? (
        <p className="text-sm text-muted-foreground">What are you eating today?</p>
      ) : (
        <h1 className="font-heading text-2xl font-semibold">{showWeek ? "This week" : "Calendar"}</h1>
      )}
      {showCalendar ? (
        <MealCalendar month={month} />
      ) : showWeek ? (
        <PlanWeek startDate={today} />
      ) : (
        <MealDayView date={date} />
      )}
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
