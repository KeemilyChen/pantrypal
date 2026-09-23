"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FridgeView, InventoryGrid } from "@/components/inventory/fridge-view"
import { InventoryDetailSheet } from "@/components/inventory/inventory-card"
import { InventoryItemDialog } from "@/components/inventory/inventory-item-dialog"
import { useKitchen } from "@/components/providers/kitchen-provider"
import type { InventoryItem, StorageLocation } from "@/lib/types"
import { toast } from "sonner"

function FridgeBody() {
  const searchParams = useSearchParams()
  const { inventory, addInventoryItem, updateInventoryItem, removeInventoryItem, ready } =
    useKitchen()
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [creating, setCreating] = useState(searchParams.get("add") === "1")

  const available = inventory.filter((item) => item.status === "available")

  if (!ready) return <p className="text-sm text-muted-foreground">Loading fridge…</p>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Fridge</h1>
          <p className="text-sm text-muted-foreground">A picture of what you actually have.</p>
        </div>
        <Button className="rounded-full" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Add food
        </Button>
      </header>
      <Tabs defaultValue="fridge">
        <TabsList>
          <TabsTrigger value="fridge">Fridge view</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="fridge" className="pt-4">
          <FridgeView items={available} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="list" className="pt-4">
          <InventoryGrid items={available} onSelect={setSelected} />
        </TabsContent>
      </Tabs>
      <InventoryDetailSheet
        item={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onEdit={() => {
          if (selected) setEditing(selected)
        }}
        onMove={(location: StorageLocation) => {
          if (!selected) return
          updateInventoryItem(selected.id, { storageLocation: location })
          setSelected({ ...selected, storageLocation: location })
          toast.success(`Moved to ${location}`)
        }}
        onUsed={() => {
          if (!selected) return
          updateInventoryItem(selected.id, { status: "used", quantity: 0 })
          setSelected(null)
          toast.success("Marked as used")
        }}
        onDiscard={() => {
          if (!selected) return
          updateInventoryItem(selected.id, { status: "discarded" })
          setSelected(null)
          toast.success("Discarded")
        }}
        onDelete={() => {
          if (!selected) return
          removeInventoryItem(selected.id)
          setSelected(null)
          toast.success("Deleted")
        }}
      />
      <InventoryItemDialog
        open={creating || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
        item={editing}
        onSave={(draft) => {
          if (editing) {
            updateInventoryItem(editing.id, draft)
            toast.success("Updated")
          } else {
            addInventoryItem(draft)
            toast.success("Added to your kitchen")
          }
        }}
      />
    </div>
  )
}

export default function FridgePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading fridge…</p>}>
      <FridgeBody />
    </Suspense>
  )
}
