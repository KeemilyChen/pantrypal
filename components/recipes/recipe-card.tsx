import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import type { InventoryItem, Recipe } from "@/lib/types"
import { cn } from "@/lib/utils"

export function RecipeCard({
  recipe,
  inventory,
}: {
  recipe: Recipe
  inventory: InventoryItem[]
}) {
  const required = recipe.ingredients.filter((ingredient) => !ingredient.optional)
  const { available, missing } = matchRecipeIngredients(
    inventory,
    required.map((ingredient) => ingredient.ingredientName),
  )
  const minutes = recipe.prepTime + recipe.cookTime

  return (
    <article className="flex flex-col rounded-3xl border border-[#f0e6d6] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {recipe.source === "system" ? "PantryPal recipe" : "Yours"}
          </p>
          <h3 className="font-heading text-lg font-semibold">{recipe.name}</h3>
        </div>
        <span className="rounded-full bg-[#fff4d6] px-2 py-1 text-xs font-medium">{minutes} min</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
      <div className="mt-3 text-sm">
        <p className="font-medium text-[#06D6A0]">You have</p>
        <p>{available.length ? available.map((name) => `✓ ${name}`).join("  ") : "Nothing matched yet"}</p>
        {missing.length ? (
          <>
            <p className="mt-2 font-medium text-primary">You need</p>
            <p>{missing.map((name) => `○ ${name}`).join("  ")}</p>
          </>
        ) : null}
      </div>
      <Link className={cn(buttonVariants(), "mt-4 rounded-full")} href={`/recipes/${recipe.id}`}>
        Open recipe
      </Link>
    </article>
  )
}

export function IngredientList({
  available,
  missing,
}: {
  available: string[]
  missing: string[]
}) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium">You have</p>
        <ul className="mt-1 space-y-1">
          {available.map((name) => (
            <li key={name}>✓ {name}</li>
          ))}
        </ul>
      </div>
      {missing.length ? (
        <div>
          <p className="font-medium">You need</p>
          <ul className="mt-1 space-y-1">
            {missing.map((name) => (
              <li key={name}>○ {name}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
