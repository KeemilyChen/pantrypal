import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Recipe } from "@/lib/types"

export function MealCard({
  recipe,
  availableCount,
  requiredCount,
}: {
  recipe: Recipe
  availableCount: number
  requiredCount: number
}) {
  const minutes = recipe.prepTime + recipe.cookTime
  return (
    <div className="rounded-3xl border border-[#f0e6d6] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tonight</p>
      <h3 className="font-heading mt-1 text-xl font-semibold">🍜 {recipe.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {minutes} min • {availableCount}/{requiredCount} ingredients available
      </p>
      <Link className={cn(buttonVariants(), "mt-4 rounded-full")} href={`/recipes/${recipe.id}?cook=1`}>
        Cook now
      </Link>
    </div>
  )
}
