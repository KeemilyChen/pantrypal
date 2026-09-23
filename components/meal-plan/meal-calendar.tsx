"use client"

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useKitchen } from "@/components/providers/kitchen-provider"
import { MEAL_TYPES } from "@/lib/types"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MealCalendar({ month }: { month: string }) {
  const router = useRouter()
  const { mealPlans, allRecipes } = useKitchen()
  const monthDate = parseISO(`${month}-01`)
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const previousMonth = format(subMonths(monthDate, 1), "yyyy-MM")
  const nextMonth = format(addMonths(monthDate, 1), "yyyy-MM")

  function mealCount(date: string) {
    return MEAL_TYPES.filter((mealType) => {
      const plan = mealPlans.find((entry) => entry.date === date && entry.mealType === mealType)
      return Boolean(plan && allRecipes.some((recipe) => recipe.id === plan.recipeId))
    }).length
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-3"
          aria-label="Previous month"
          onClick={() => router.push(`/plan?month=${previousMonth}`)}
        >
          ←
        </Button>
        <h2 className="font-heading text-center text-xl font-semibold">{format(monthDate, "MMMM yyyy")}</h2>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-3"
          aria-label="Next month"
          onClick={() => router.push(`/plan?month=${nextMonth}`)}
        >
          →
        </Button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#f0e6d6] bg-white p-3 shadow-sm">
        <div className="grid grid-cols-7 gap-y-1">
          {WEEKDAYS.map((day) => (
            <p
              key={day}
              className="pb-1 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {day}
            </p>
          ))}
          {days.map((day) => {
            const date = format(day, "yyyy-MM-dd")
            const inMonth = isSameMonth(day, monthDate)
            const count = mealCount(date)
            return (
              <button
                key={date}
                type="button"
                disabled={!inMonth}
                onClick={() => router.push(`/plan?date=${date}`)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-start rounded-2xl px-0.5 py-1 text-sm",
                  inMonth ? "text-foreground" : "text-transparent",
                  isToday(day) && inMonth ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary" : "",
                )}
              >
                <span>{inMonth ? format(day, "d") : ""}</span>
                <span className="mt-0.5 flex h-2 items-center justify-center gap-0.5">
                  {inMonth
                    ? Array.from({ length: count }).map((_, index) => (
                        <span key={index} className="size-1 rounded-full bg-primary" />
                      ))
                    : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Dots show how many meals are planned that day. Tap a date to edit it.</p>
    </div>
  )
}
