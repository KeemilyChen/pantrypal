"use client"

import { use, useState } from "react"
import { notFound, useRouter } from "next/navigation"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IngredientList } from "@/components/recipes/recipe-card"
import { AddToPlanForm } from "@/components/recipes/add-to-plan-form"
import { useKitchen } from "@/components/providers/kitchen-provider"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
    removeRecipe,
    ready,
  } = useKitchen()
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
        <Link href={`/cook/${recipe.id}`} className={cn(buttonVariants(), "rounded-full")}>
          Start Cooking
        </Link>
        {missing.length ? (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              const count = addMissingToShopping(recipe)
              toast.success(
                count ? `${count} ${count === 1 ? "item" : "items"} added to Shopping` : "Those items are already on Shopping",
              )
            }}
          >
            Add missing to Shopping List
          </Button>
        ) : null}
      </div>
      <AddToPlanForm recipeId={recipe.id} />
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
