"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FOOD_CATEGORIES,
  STORAGE_LOCATIONS,
  type FoodCategory,
  type InventoryItem,
  type StorageLocation,
} from "@/lib/types"
import { guessCategory, guessLocation } from "@/components/providers/kitchen-provider"

type Draft = {
  name: string
  category: FoodCategory
  quantity: string
  unit: string
  storageLocation: StorageLocation
  purchaseDate: string
  expirationDate: string
}

const emptyDraft: Draft = {
  name: "",
  category: "other",
  quantity: "1",
  unit: "count",
  storageLocation: "fridge",
  purchaseDate: "",
  expirationDate: "",
}

function fromItem(item: InventoryItem): Draft {
  return {
    name: item.name,
    category: item.category,
    quantity: String(item.quantity),
    unit: item.unit,
    storageLocation: item.storageLocation,
    purchaseDate: item.purchaseDate ?? "",
    expirationDate: item.expirationDate ?? "",
  }
}

export function InventoryItemDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
  onSave: (draft: {
    name: string
    category: FoodCategory
    quantity: number
    unit: string
    storageLocation: StorageLocation
    purchaseDate: string | null
    expirationDate: string | null
  }) => void
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  useEffect(() => {
    setDraft(item ? fromItem(item) : emptyDraft)
  }, [item, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add food"}</DialogTitle>
          <DialogDescription>Keep quantities and dates in your own units. Dates are what you entered, not a safety guarantee.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSave({
              name: draft.name.trim(),
              category: draft.category,
              quantity: Number(draft.quantity) || 1,
              unit: draft.unit.trim() || "count",
              storageLocation: draft.storageLocation,
              purchaseDate: draft.purchaseDate || null,
              expirationDate: draft.expirationDate || null,
            })
            onOpenChange(false)
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              required
              value={draft.name}
              onChange={(event) => {
                const name = event.target.value
                const category = guessCategory(name)
                setDraft((prev) => ({
                  ...prev,
                  name,
                  category,
                  storageLocation: prev.name ? prev.storageLocation : guessLocation(category),
                }))
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="item-qty">Quantity</Label>
              <Input
                id="item-qty"
                type="number"
                min="0"
                step="0.1"
                value={draft.quantity}
                onChange={(event) => setDraft((prev) => ({ ...prev, quantity: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-unit">Unit</Label>
              <Input
                id="item-unit"
                value={draft.unit}
                onChange={(event) => setDraft((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="item-category">Category</Label>
              <select
                id="item-category"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={draft.category}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, category: event.target.value as FoodCategory }))
                }
              >
                {FOOD_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-location">Storage</Label>
              <select
                id="item-location"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={draft.storageLocation}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    storageLocation: event.target.value as StorageLocation,
                  }))
                }
              >
                {STORAGE_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="item-bought">Purchased</Label>
              <Input
                id="item-bought"
                type="date"
                value={draft.purchaseDate}
                onChange={(event) => setDraft((prev) => ({ ...prev, purchaseDate: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-exp">Expiration</Label>
              <Input
                id="item-exp"
                type="date"
                value={draft.expirationDate}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, expirationDate: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
