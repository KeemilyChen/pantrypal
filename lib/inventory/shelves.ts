import type { FridgeShelf, InventoryItem, StorageLocation } from "@/lib/types"

export function shelfForItem(item: InventoryItem): FridgeShelf {
  if (item.storageLocation === "freezer") return "freezer"
  if (item.storageLocation === "pantry") return "pantry"

  switch (item.category) {
    case "produce":
      return "drawer"
    case "beverages":
    case "dairy":
      return "door"
    case "meat":
    case "seafood":
    case "protein":
      return "middle"
    default:
      return "top"
  }
}

export function itemsOnShelf(items: InventoryItem[], shelf: FridgeShelf) {
  return items.filter(
    (item) => item.status === "available" && shelfForItem(item) === shelf,
  )
}

export const SHELF_COPY: Record<FridgeShelf, string> = {
  top: "Top shelf",
  middle: "Middle shelf",
  drawer: "Drawer",
  door: "Door",
  freezer: "Freezer",
  pantry: "Pantry",
}

export function locationFromShelf(shelf: FridgeShelf): StorageLocation {
  if (shelf === "freezer") return "freezer"
  if (shelf === "pantry") return "pantry"
  return "fridge"
}
