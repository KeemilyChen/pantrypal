"use client"

import { use, useState } from "react"
import { notFound, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IngredientList } from "@/components/recipes/recipe-card"
import { todayISO, useKitchen } from "@/components/providers/kitchen-provider"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import { toast } from "sonner"

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const {
    inventory,
    allRecipes,
    addMissingToShopping,
    addMealPlan,
    consumeRecipe,
    removeRecipe,
    ready,
  } = useKitchen()
  const [step, setStep] = useState(0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const recipe = allRecipes.find((item) => item.id === id)

  if (!ready) return <p className="text-sm text-muted-foreground">Loading recipe…</p>
  if (!recipe) notFound()

  const required = recipe.ingredients.filter((ingredient) => !ingredient.optional)
  const { available, missing } = matchRecipeIngredients(
    inventory,
    required.map((ingredient) => ingredient.ingredientName),
  )
  const minutes = recipe.prepTime + recipe.cookTime

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/recipes" className="text-sm text-muted-foreground">
        ← Recipes
      </Link>
      <header>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {recipe.source === "system" ? "PantryPal recipe" : "Your recipe"}
        </p>
        <h1 className="font-heading text-3xl font-semibold">{recipe.name}</h1>
        <p className="mt-2 text-muted-foreground">{recipe.description}</p>
        <p className="mt-1 text-sm">{minutes} minutes · {recipe.servings} servings</p>
      </header>
      <IngredientList available={available} missing={missing} />
      <div className="flex flex-wrap gap-2">
        <Button
          className="rounded-full"
          onClick={() => {
            const count = addMissingToShopping(recipe)
            toast.success(count ? `Added ${count} missing items` : "You already have everything")
          }}
        >
          Add missing ingredients to shopping list
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => {
            addMealPlan(todayISO(), "dinner", recipe.id)
            toast.success("Planned for tonight")
          }}
        >
          Plan for tonight
        </Button>
      </div>
      <section className="rounded-3xl border border-[#f0e6d6] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Step {step + 1} of {recipe.instructions.length}
        </p>
        <p className="mt-3 text-lg">{recipe.instructions[step]}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
            Back
          </Button>
          <Button
            disabled={step >= recipe.instructions.length - 1}
            onClick={() => setStep((value) => value + 1)}
          >
            Next step
          </Button>
        </div>
        {step === recipe.instructions.length - 1 ? (
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              consumeRecipe(recipe)
              toast.success("Ingredients marked as used")
            }}
          >
            I cooked this — update inventory
          </Button>
        ) : null}
      </section>
      {recipe.source === "user" ? (
        <>
          <Button
            variant="destructive"
            className="h-11 w-full rounded-full sm:w-auto"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete recipe
          </Button>
          <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {recipe.name}?</DialogTitle>
                <DialogDescription>
                  This recipe will be permanently deleted. This can&apos;t be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const removed = removeRecipe(recipe.id)
                    if (!removed) {
                      toast.error("This recipe can’t be deleted.")
                      setConfirmingDelete(false)
                      return
                    }
                    toast.success("Recipe deleted")
                    router.push("/recipes")
                  }}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  )
}
