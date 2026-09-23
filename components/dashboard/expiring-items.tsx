import Link from "next/link"
import { foodEmoji } from "@/lib/food"
import { expirationLabel } from "@/lib/inventory/expiration"
import { ExpirationDot } from "@/components/inventory/expiration-badge"
import type { InventoryItem } from "@/lib/types"

export function ExpiringItems({ items }: { items: InventoryItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is close to its listed date. Add expiration dates as you put food away.
      </p>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href="/fridge"
          className="min-w-[120px] rounded-2xl border border-[#f0e6d6] bg-white p-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{foodEmoji(item.name)}</span>
            <ExpirationDot date={item.expirationDate} />
          </div>
          <p className="mt-2 text-sm font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">{expirationLabel(item.expirationDate)}</p>
        </Link>
      ))}
    </div>
  )
}
