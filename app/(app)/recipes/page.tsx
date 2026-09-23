"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RecipeCard } from "@/components/recipes/recipe-card"
import { useKitchen } from "@/components/providers/kitchen-provider"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import { toast } from "sonner"

function RecipesBody() {
  const searchParams = useSearchParams()
  const { inventory, allRecipes, addRecipe, ready } = useKitchen()
  const [query, setQuery] = useState("")
  const [maxMinutes, setMaxMinutes] = useState("")
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [creating, setCreating] = useState(searchParams.get("new") === "1")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [minutes, setMinutes] = useState("25")
  const [ingredients, setIngredients] = useState("Chicken Breast\nRice")
  const [steps, setSteps] = useState("Prep ingredients.\nCook.\nServe.")

  const filtered = useMemo(() => {
    return allRecipes.filter((recipe) => {
      const total = recipe.prepTime + recipe.cookTime
      if (query && !recipe.name.toLowerCase().includes(query.toLowerCase())) return false
      if (maxMinutes && total > Number(maxMinutes)) return false
      if (onlyAvailable) {
        const required = recipe.ingredients
          .filter((ingredient) => !ingredient.optional)
          .map((ingredient) => ingredient.ingredientName)
        const { missing } = matchRecipeIngredients(inventory, required)
        if (missing.length) return false
      }
      return true
    })
  }, [allRecipes, inventory, maxMinutes, onlyAvailable, query])

  if (!ready) return <p className="text-sm text-muted-foreground">Loading recipes…</p>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Recipes</h1>
          <p className="text-sm text-muted-foreground">Cook from what is already in the fridge.</p>
        </div>
        <Button className="rounded-full" onClick={() => setCreating(true)}>
          New recipe
        </Button>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search recipes" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Input
          placeholder="Max minutes"
          inputMode="numeric"
          value={maxMinutes}
          onChange={(event) => setMaxMinutes(event.target.value)}
          className="sm:w-36"
        />
        <Button
          variant={onlyAvailable ? "default" : "outline"}
          onClick={() => setOnlyAvailable((value) => !value)}
        >
          I have the ingredients
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} inventory={inventory} />
        ))}
      </div>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a recipe</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              addRecipe({
                name,
                description,
                instructions: steps.split("\n").map((line) => line.trim()).filter(Boolean),
                prepTime: 5,
                cookTime: Number(minutes) || 20,
                servings: 2,
                imageUrl: null,
                ingredients: ingredients
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((ingredientName) => ({
                    ingredientName,
                    quantity: null,
                    unit: null,
                    optional: false,
                  })),
              })
              toast.success("Recipe saved")
              setCreating(false)
              setName("")
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="recipe-name">Name</Label>
              <Input id="recipe-name" required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipe-desc">Description</Label>
              <Input id="recipe-desc" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipe-time">Cook time (minutes)</Label>
              <Input id="recipe-time" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipe-ings">Ingredients (one per line)</Label>
              <Textarea id="recipe-ings" value={ingredients} onChange={(event) => setIngredients(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipe-steps">Steps (one per line)</Label>
              <Textarea id="recipe-steps" value={steps} onChange={(event) => setSteps(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit">Save recipe</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading recipes…</p>}>
      <RecipesBody />
    </Suspense>
  )
}
