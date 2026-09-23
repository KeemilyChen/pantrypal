"use client"

import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { foodEmoji } from "@/lib/food"
import { expirationLabel } from "@/lib/inventory/expiration"
import type { InventoryItem, StorageLocation } from "@/lib/types"

export function InventoryDetailSheet({
  item,
  onOpenChange,
  onEdit,
  onMove,
  onUsed,
  onDiscard,
  onDelete,
}: {
  item: InventoryItem | null
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onMove: (location: StorageLocation) => void
  onUsed: () => void
  onDiscard: () => void
  onDelete: () => void
}) {
  return (
    <Sheet open={Boolean(item)} onOpenChange={onOpenChange}>
      <SheetContent>
        {item ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle className="text-2xl">
                {foodEmoji(item.name)} {item.name}
              </SheetTitle>
              <SheetDescription>
                {item.quantity} {item.unit} · {item.storageLocation}
              </SheetDescription>
            </SheetHeader>
            <dl className="mt-6 space-y-3 px-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Purchased</dt>
                <dd>{item.purchaseDate ? format(parseISO(item.purchaseDate), "MMM d") : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expiration</dt>
                <dd>
                  {item.expirationDate ? format(parseISO(item.expirationDate), "MMM d") : "—"}{" "}
                  <span className="text-muted-foreground">({expirationLabel(item.expirationDate)})</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="capitalize">{item.source.replace("_", " ")}</dd>
              </div>
            </dl>
            <div className="mt-auto space-y-2 p-4">
              <div className="grid grid-cols-3 gap-2">
                {(["fridge", "freezer", "pantry"] as const).map((location) => (
                  <Button
                    key={location}
                    variant={item.storageLocation === location ? "default" : "outline"}
                    size="sm"
                    onClick={() => onMove(location)}
                  >
                    {location}
                  </Button>
                ))}
              </div>
              <Button className="w-full" onClick={onUsed}>
                Mark as used
              </Button>
              <Button className="w-full" variant="outline" onClick={onEdit}>
                Edit
              </Button>
              <Button className="w-full" variant="ghost" onClick={onDiscard}>
                Discard
              </Button>
              <Button className="w-full" variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
