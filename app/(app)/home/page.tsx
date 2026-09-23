"use client"

import { Bell, Settings } from "lucide-react"
import { AiCookingCard } from "@/components/dashboard/ai-cooking-card"
import { ExpiringItems } from "@/components/dashboard/expiring-items"
import { MealCard } from "@/components/dashboard/meal-card"
import { PickForMeCard } from "@/components/dashboard/pick-for-me-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { todayISO, useKitchen } from "@/components/providers/kitchen-provider"
import { greetingForHour } from "@/lib/food"
import { sortByExpiration } from "@/lib/inventory/expiration"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"

export default function HomePage() {
  const { profile, inventory, mealPlans, allRecipes, ready } = useKitchen()
  if (!ready) return <p className="text-sm text-muted-foreground">Loading your kitchen…</p>

  const greeting = greetingForHour()
  const expiring = sortByExpiration(
    inventory.filter((item) => item.status === "available"),
  ).slice(0, 6)
  const tonight = mealPlans.find((plan) => plan.date === todayISO() && plan.mealType === "dinner")
  const recipe = allRecipes.find((item) => item.id === tonight?.recipeId)
  const required = recipe?.ingredients.filter((ingredient) => !ingredient.optional) ?? []
  const match = recipe
    ? matchRecipeIngredients(
        inventory,
        required.map((ingredient) => ingredient.ingredientName),
      )
    : null

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting} 👋</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {profile.name}, what are we cooking today?
          </h1>
        </div>
        <div className="flex gap-2 text-muted-foreground">
          <Bell className="size-5" />
          <Settings className="size-5" />
        </div>
      </header>
      <div id="cook">
        <AiCookingCard />
      </div>
      <PickForMeCard />
      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Expiring soon
        </h2>
        <ExpiringItems items={expiring} />
        <p className="mt-2 text-xs text-muted-foreground">
          Dates come from what you entered. They are reminders, not food-safety guarantees.
        </p>
      </section>
      {recipe && match ? (
        <MealCard
          recipe={recipe}
          availableCount={match.available.length}
          requiredCount={required.length}
        />
      ) : (
        <p className="rounded-3xl border border-dashed border-[#f0e6d6] p-5 text-sm text-muted-foreground">
          No dinner planned yet. Open Plan and pick a recipe for tonight.
        </p>
      )}
      <QuickActions />
    </div>
  )
}
