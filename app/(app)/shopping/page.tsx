"use client"

import { ShoppingList } from "@/components/shopping/shopping-list"
import { useKitchen } from "@/components/providers/kitchen-provider"

export default function ShoppingPage() {
  const { ready } = useKitchen()
  if (!ready) return <p className="text-sm text-muted-foreground">Loading list…</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold">Shopping</h1>
        <p className="text-sm text-muted-foreground">
          Manual items, meal-plan gaps, and low inventory — each row remembers why it is here.
        </p>
      </header>
      <ShoppingList />
    </div>
  )
}
