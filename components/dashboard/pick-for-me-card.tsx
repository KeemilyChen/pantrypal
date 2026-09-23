"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Dices } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { useKitchen } from "@/components/providers/kitchen-provider"
import { pickForMe, type PickCandidate } from "@/lib/recipes/pick-for-me"
import { cn } from "@/lib/utils"

const CHOOSING = [
  "Checking your fridge...",
  "Picking something you'll actually cook...",
  "Looking at what's already in the kitchen...",
]

export function PickForMeCard() {
  const { inventory, allRecipes, ready } = useKitchen()
  const [choosing, setChoosing] = useState(false)
  const [message, setMessage] = useState(CHOOSING[0])
  const [pick, setPick] = useState<PickCandidate | null>(null)
  const [empty, setEmpty] = useState(false)
  const lastId = useRef<string | null>(null)
  const timer = useRef<number | null>(null)

  const available = inventory.filter((item) => item.status === "available")

  function draw(excludeId?: string | null) {
    const next = pickForMe(allRecipes, available, excludeId)
    if (!next) {
      setPick(null)
      setEmpty(true)
      lastId.current = null
      return
    }
    setEmpty(false)
    setPick(next)
    lastId.current = next.recipe.id
  }

  function startPick(again: boolean) {
    if (timer.current) window.clearTimeout(timer.current)
    setEmpty(false)
    setChoosing(true)
    setMessage(CHOOSING[Math.floor(Math.random() * CHOOSING.length)])
    timer.current = window.setTimeout(() => {
      draw(again ? lastId.current : null)
      setChoosing(false)
    }, 1000)
  }

  if (!ready) return null

  return (
    <section
      id="pick"
      className="scroll-mt-24 rounded-3xl border border-[#f0e6d6] bg-white p-5 shadow-sm"
    >
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Pick for Me
      </p>
      <h2 className="font-heading mt-1 text-xl font-semibold">Can&apos;t decide what to cook?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        PantryPal will choose one recipe from what you already have.
      </p>

      {choosing ? (
        <p className="mt-4 text-sm font-medium text-primary">{message}</p>
      ) : null}

      {!choosing && empty ? (
        <p className="mt-4 text-sm text-muted-foreground">
          PantryPal couldn&apos;t find a good match from your current recipes and fridge. Add a
          couple of ingredients, or save a recipe you can actually cook.
        </p>
      ) : null}

      {!choosing && pick ? (
        <div className="mt-4 rounded-2xl bg-[#fffdf7] p-4 ring-1 ring-[#f0e6d6]">
          <h3 className="font-heading text-lg font-semibold">{pick.recipe.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{pick.minutes} min</p>
          <p className="mt-2 text-sm">{pick.reason}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Dates on food are reminders you entered, not food-safety guarantees.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              className={cn(buttonVariants(), "h-11 rounded-full")}
              href={`/recipes/${pick.recipe.id}`}
            >
              Cook this
            </Link>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => startPick(true)}
            >
              Pick again
            </Button>
          </div>
        </div>
      ) : null}

      {!choosing && !pick ? (
        <Button type="button" className="mt-4 h-11 w-full rounded-full sm:w-auto" onClick={() => startPick(false)}>
          <Dices className="size-4" />
          Pick for Me
        </Button>
      ) : null}
    </section>
  )
}
