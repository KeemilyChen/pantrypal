"use client"

import { foodEmoji } from "@/lib/food"
import { expirationLabel } from "@/lib/inventory/expiration"
import { ExpirationDot } from "@/components/inventory/expiration-badge"
import { SHELF_COPY, itemsOnShelf } from "@/lib/inventory/shelves"
import type { FridgeShelf, InventoryItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const SHELF_ORDER: FridgeShelf[] = ["top", "middle", "drawer", "door", "freezer", "pantry"]

export function FridgeView({
  items,
  onSelect,
}: {
  items: InventoryItem[]
  onSelect: (item: InventoryItem) => void
}) {
  const available = items.filter((item) => item.status === "available")

  return (
    <div className="mx-auto max-w-xl rounded-[28px] border-8 border-[#d7dee2] bg-[#eef3f6] p-3 shadow-inner">
      <p className="mb-2 text-center text-xs font-semibold tracking-[0.2em] text-[#7a8b93]">
        MY FRIDGE
      </p>
      <div className="space-y-2">
        {SHELF_ORDER.map((shelf) => {
          const shelfItems = itemsOnShelf(available, shelf)
          return (
            <section
              key={shelf}
              className={cn(
                "rounded-2xl border border-white/70 p-3",
                shelf === "freezer" ? "bg-[#d9ecff]" : shelf === "pantry" ? "bg-[#fff4d6]" : "bg-white/90",
              )}
            >
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-[#7a8b93] uppercase">
                {SHELF_COPY[shelf]}
              </p>
              {shelfItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Empty</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {shelfItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item)}
                      className="flex items-center gap-2 rounded-xl bg-[#fffdf7] px-2.5 py-2 text-left shadow-sm ring-1 ring-[#f0e6d6]"
                    >
                      <span>{foodEmoji(item.name)}</span>
                      <span className="text-sm font-medium">{item.name}</span>
                      <ExpirationDot date={item.expirationDate} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function InventoryGrid({
  items,
  onSelect,
}: {
  items: InventoryItem[]
  onSelect: (item: InventoryItem) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Your kitchen is empty. Add something you bought today.</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="rounded-2xl border border-[#f0e6d6] bg-white p-4 text-left shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg">
                {foodEmoji(item.name)} {item.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.quantity} {item.unit} • {item.storageLocation}
              </p>
            </div>
            <ExpirationDot date={item.expirationDate} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{expirationLabel(item.expirationDate)}</p>
        </button>
      ))}
    </div>
  )
}
