import { z } from "zod"
import type { StorageLocation } from "@/lib/types"

export const storageAdviceSchema = z.object({
  location: z.enum(["fridge", "freezer", "pantry"]),
  reason: z.string(),
  estimatedDays: z.number().int().positive().nullable(),
  disclaimer: z.string(),
})

export type StorageAdvice = z.infer<typeof storageAdviceSchema>

export function defaultStorageDisclaimer() {
  return "This is storage guidance, not a food-safety guarantee. Follow package labels and your own judgment."
}

export function fallbackStorageAdvice(name: string): StorageAdvice {
  const value = name.toLowerCase()
  let location: StorageLocation = "fridge"
  if (/ice cream|frozen|dumpling/.test(value)) location = "freezer"
  else if (/rice|pasta|oil|sauce|canned|flour/.test(value)) location = "pantry"
  return {
    location,
    reason: `Most ${name || "food like this"} is commonly stored in the ${location}.`,
    estimatedDays: null,
    disclaimer: defaultStorageDisclaimer(),
  }
}
