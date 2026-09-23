"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Recipe } from "@/lib/types"

export function MealRecipePicker({
  open,
  onOpenChange,
  recipes,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipes: Recipe[]
  onChoose: (recipeId: string) => void
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return recipes
    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(value))
  }, [query, recipes])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a recipe</DialogTitle>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search recipes"
        />
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recipes match that search.</p>
          ) : (
            filtered.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className="flex min-h-11 w-full items-center rounded-2xl border border-[#f0e6d6] bg-white px-3 py-2 text-left text-sm font-medium"
                onClick={() => {
                  onChoose(recipe.id)
                  setQuery("")
                  onOpenChange(false)
                }}
              >
                {recipe.name}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
