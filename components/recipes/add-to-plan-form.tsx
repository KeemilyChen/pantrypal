"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { todayISO, useKitchen } from "@/components/providers/kitchen-provider"
import { MEAL_TYPES, type MealType } from "@/lib/types"
import { toast } from "sonner"

export function AddToPlanForm({
  recipeId,
  onAdded,
}: {
  recipeId: string
  onAdded?: () => Promise<void> | void
}) {
  const { addMealPlan, refreshCloudPlan } = useKitchen()
  const [date, setDate] = useState(() => todayISO())
  const [mealType, setMealType] = useState<MealType>("dinner")
  const [busy, setBusy] = useState(false)

  async function submit(onConflict: "skip" | "replace") {
    setBusy(true)
    try {
      const cloud = await fetch(`/api/recipes/${recipeId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, mealType, onConflict }),
      })
      if (cloud.status === 401) {
        const local = await addMealPlan(date, mealType, recipeId, onConflict)
        if (local.conflict) {
          toast.error("That slot is filled. Use Replace if you want to overwrite it.")
          return
        }
        toast.success("Added to your plan")
        await onAdded?.()
        return
      }
      const data = (await cloud.json()) as { error?: string; conflict?: boolean }
      if (cloud.status === 409 || data.conflict) {
        toast.error("That slot is filled. Use Replace if you want to overwrite it.")
        return
      }
      if (!cloud.ok) {
        toast.error(data.error ?? "Could not add to plan.")
        return
      }
      toast.success("Added to your plan")
      await refreshCloudPlan()
      await onAdded?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add to plan.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Add to Plan</p>
      <div className="flex flex-wrap gap-2">
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-auto" />
        {MEAL_TYPES.map((item) => (
          <Button
            key={item}
            type="button"
            variant={mealType === item ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setMealType(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="rounded-full" disabled={busy} onClick={() => void submit("skip")}>
          Add to Plan
        </Button>
        <Button type="button" variant="outline" className="rounded-full" disabled={busy} onClick={() => void submit("replace")}>
          Replace slot
        </Button>
      </div>
    </div>
  )
}
