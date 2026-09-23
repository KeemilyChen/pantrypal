"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { guessCategory, useKitchen } from "@/components/providers/kitchen-provider"
import { FOOD_CATEGORIES } from "@/lib/types"

export function ShoppingList() {
  const { shoppingList, addShoppingItem, toggleShoppingItem, removeShoppingItem } = useKitchen()
  const [name, setName] = useState("")

  const grouped = useMemo(() => {
    const map = new Map<string, typeof shoppingList>()
    for (const item of shoppingList) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return FOOD_CATEGORIES.filter((category) => map.has(category)).map((category) => ({
      category,
      items: map.get(category) ?? [],
    }))
  }, [shoppingList])

  return (
    <div className="space-y-6">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          addShoppingItem({ name: name.trim(), category: guessCategory(name), source: "manual" })
          setName("")
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Add milk, limes…" />
        <Button type="submit">Add</Button>
      </form>
      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">Your list is empty. Missing recipe ingredients can land here automatically.</p>
      ) : (
        grouped.map((group) => (
          <section key={group.category}>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {group.category}
            </h2>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#f0e6d6] bg-white px-3 py-2"
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => toggleShoppingItem(item.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={item.checked ? "text-muted-foreground line-through" : "font-medium"}>
                      {item.name}
                      {item.quantity ? ` · ${item.quantity} ${item.unit ?? ""}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.source.replace("_", " ")}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeShoppingItem(item.id)}>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
