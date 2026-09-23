"use client"

import { useRef, useState } from "react"
import { Camera, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { guessCategory, guessLocation } from "@/components/providers/kitchen-provider"
import type { ParsedReceipt } from "@/lib/ai/receipt-parser"
import { compressReceiptImage } from "@/lib/receipts/compress-image"
import {
  FOOD_CATEGORIES,
  STORAGE_LOCATIONS,
  type FoodCategory,
  type StorageLocation,
} from "@/lib/types"
import { toast } from "sonner"

type ReviewItem = {
  id: string
  selected: boolean
  name: string
  quantity: string
  unit: string
  category: FoodCategory
  storageLocation: StorageLocation
}

function isFoodCategory(value: string): value is FoodCategory {
  return (FOOD_CATEGORIES as readonly string[]).includes(value)
}

function toReviewItems(receipt: ParsedReceipt): ReviewItem[] {
  return receipt.items
    .filter((item) => item.name.trim())
    .map((item) => {
      const category = isFoodCategory(item.category.toLowerCase())
        ? (item.category.toLowerCase() as FoodCategory)
        : guessCategory(item.name)
      return {
        id: crypto.randomUUID(),
        selected: true,
        name: item.name.trim(),
        quantity: String(item.quantity && item.quantity > 0 ? item.quantity : 1),
        unit: item.unit?.trim() || "count",
        category,
        storageLocation: guessLocation(category),
      }
    })
}

function emptyReviewItem(): ReviewItem {
  return {
    id: crypto.randomUUID(),
    selected: true,
    name: "",
    quantity: "1",
    unit: "count",
    category: "other",
    storageLocation: "fridge",
  }
}

export function ReceiptScanDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (
    items: {
      name: string
      category: FoodCategory
      quantity: number
      unit: string
      storageLocation: StorageLocation
      purchaseDate: string | null
      expirationDate: string | null
      source: "receipt"
    }[],
  ) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [items, setItems] = useState<ReviewItem[]>([])
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)

  function reset() {
    setPreview(null)
    setAnalyzing(false)
    setItems([])
    setPurchaseDate(null)
    setStoreName(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function close() {
    reset()
    onOpenChange(false)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await compressReceiptImage(file)
      setPreview(dataUrl)
      setItems([])
      setPurchaseDate(null)
      setStoreName(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open that photo.")
    }
  }

  async function analyze() {
    if (!preview) return
    setAnalyzing(true)
    try {
      const response = await fetch("/api/ai/receipt-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      })
      const data = (await response.json()) as ParsedReceipt & { error?: string }
      if (!response.ok) throw new Error(data.error ?? "Could not read that receipt.")
      const next = toReviewItems(data)
      setItems(next)
      setPurchaseDate(data.purchase_date)
      setStoreName(data.store_name || null)
      if (next.length === 0) {
        toast.error("No grocery items found. You can add a row, or try another photo.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that receipt.")
    } finally {
      setAnalyzing(false)
    }
  }

  function updateItem(id: string, patch: Partial<ReviewItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const selectedCount = items.filter((item) => item.selected && item.name.trim()).length
  const reviewing = items.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan receipt</DialogTitle>
          <DialogDescription>
            Take a photo or choose one from your library. Review items before they go in the fridge.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {!preview ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[#f0e6d6] bg-[#fffaf3] px-4 py-10 text-center"
            >
              <Camera className="size-8 text-primary" />
              <p className="text-sm font-medium">Take photo or choose image</p>
              <p className="text-xs text-muted-foreground">On iPhone, Safari will offer Camera or Photo Library.</p>
            </button>
          ) : (
            <div className="space-y-3">
              {/* Receipt preview is a local data URL; next/image is not used. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Selected receipt"
                className="mx-auto max-h-48 rounded-2xl border border-[#f0e6d6] object-contain"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                  Choose another
                </Button>
                {!reviewing ? (
                  <Button type="button" onClick={() => void analyze()} disabled={analyzing}>
                    {analyzing ? "Reading receipt…" : "Analyze receipt"}
                  </Button>
                ) : null}
              </div>
            </div>
          )}

          {reviewing ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Items found</p>
                <p className="text-xs text-muted-foreground">
                  {storeName ? `${storeName}. ` : ""}
                  Storage is a suggestion from the item name. Expiration is left blank so you can add it on the item later.
                </p>
              </div>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="space-y-2 rounded-2xl border border-[#f0e6d6] bg-white p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) =>
                          updateItem(item.id, { selected: Boolean(checked) })
                        }
                        aria-label={`Import ${item.name || "item"}`}
                      />
                      <div className="grid min-w-0 flex-1 gap-2">
                        <Input
                          value={item.name}
                          placeholder="Item name"
                          onChange={(event) => {
                            const name = event.target.value
                            const category = guessCategory(name)
                            updateItem(item.id, {
                              name,
                              category,
                              storageLocation: item.name
                                ? item.storageLocation
                                : guessLocation(category),
                            })
                          }}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(item.id, { quantity: event.target.value })
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Unit</Label>
                            <Input
                              value={item.unit}
                              onChange={(event) =>
                                updateItem(item.id, { unit: event.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Suggested storage</Label>
                          <select
                            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                            value={item.storageLocation}
                            onChange={(event) =>
                              updateItem(item.id, {
                                storageLocation: event.target.value as StorageLocation,
                              })
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
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Remove item"
                        onClick={() => setItems((prev) => prev.filter((row) => row.id !== item.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" onClick={() => setItems((prev) => [...prev, emptyReviewItem()])}>
                <Plus className="size-4" />
                Add missed item
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          {reviewing ? (
            <Button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => {
                const chosen = items.filter((item) => item.selected && item.name.trim())
                onImport(
                  chosen.map((item) => ({
                    name: item.name.trim(),
                    category: item.category,
                    quantity: Number(item.quantity) || 1,
                    unit: item.unit.trim() || "count",
                    storageLocation: item.storageLocation,
                    purchaseDate,
                    expirationDate: null,
                    source: "receipt" as const,
                  })),
                )
                toast.success(
                  `Added ${chosen.length} item${chosen.length === 1 ? "" : "s"} to your kitchen`,
                )
                close()
              }}
            >
              Add to Fridge
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
