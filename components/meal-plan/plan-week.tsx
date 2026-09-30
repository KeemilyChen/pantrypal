"use client"

import { addDays, format, parseISO } from "date-fns"
import { MealDayView } from "@/components/meal-plan/meal-day-view"

export function PlanWeek({ startDate }: { startDate: string }) {
  const start = parseISO(startDate)
  const days = Array.from({ length: 7 }, (_, index) => format(addDays(start, index), "yyyy-MM-dd"))

  return (
    <div className="space-y-8">
      {days.map((date) => (
        <MealDayView key={date} date={date} compact />
      ))}
    </div>
  )
}
