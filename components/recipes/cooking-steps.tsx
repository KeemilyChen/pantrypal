"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { parseStepMinutes } from "@/lib/recipes/step-timer"

export function CookingSteps({
  steps,
  onFinish,
}: {
  steps: string[]
  onFinish: () => void
}) {
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const step = steps[index] ?? ""
  const minutes = parseStepMinutes(step)
  const last = index >= steps.length - 1

  useEffect(() => {
    setRemaining(null)
    setRunning(false)
  }, [index])

  useEffect(() => {
    if (!running || remaining == null) return
    if (remaining <= 0) {
      setRunning(false)
      return
    }
    const id = window.setTimeout(() => setRemaining((value) => (value == null ? value : value - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [running, remaining])

  const clock =
    remaining == null
      ? null
      : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Step {index + 1} of {steps.length}
      </p>
      <div className="h-1 overflow-hidden rounded-full bg-[#f0e6d6]">
        <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      <p className="text-lg leading-relaxed">{step}</p>
      {minutes ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setRemaining(minutes * 60)
              setRunning(true)
            }}
          >
            {clock ?? `Start ${minutes}-min timer`}
          </Button>
          {running ? (
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setRunning(false)}>
              Pause
            </Button>
          ) : remaining != null && remaining > 0 ? (
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setRunning(true)}>
              Resume
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" className="rounded-full text-muted-foreground" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>
          Previous
        </Button>
        {last ? (
          <Button type="button" className="min-w-40 flex-1 rounded-full sm:flex-none" onClick={onFinish}>
            Finish Cooking
          </Button>
        ) : (
          <Button type="button" className="min-w-40 flex-1 rounded-full sm:flex-none" onClick={() => setIndex((value) => value + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
