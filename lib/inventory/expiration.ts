import { differenceInCalendarDays, parseISO } from "date-fns"
import type { InventoryItem } from "@/lib/types"

export type ExpirationTone = "fresh" | "soon" | "urgent" | "expired" | "unknown"

export function daysUntilExpiration(expirationDate: string | null, today = new Date()) {
  if (!expirationDate) return null
  return differenceInCalendarDays(parseISO(expirationDate), today)
}

export function expirationTone(
  expirationDate: string | null,
  today = new Date(),
): ExpirationTone {
  const days = daysUntilExpiration(expirationDate, today)
  if (days === null) return "unknown"
  if (days < 0) return "expired"
  if (days <= 2) return "urgent"
  if (days <= 6) return "soon"
  return "fresh"
}

export function expirationLabel(expirationDate: string | null, today = new Date()) {
  const days = daysUntilExpiration(expirationDate, today)
  if (days === null) return "No date"
  if (days < 0) return `Expired ${Math.abs(days)}d`
  if (days === 0) return "Today"
  if (days === 1) return "1 day"
  return `${days} days`
}

export function sortByExpiration(items: InventoryItem[], today = new Date()) {
  return [...items].sort((a, b) => {
    const aDays = daysUntilExpiration(a.expirationDate, today)
    const bDays = daysUntilExpiration(b.expirationDate, today)
    if (aDays === null && bDays === null) return a.name.localeCompare(b.name)
    if (aDays === null) return 1
    if (bDays === null) return -1
    return aDays - bDays
  })
}
