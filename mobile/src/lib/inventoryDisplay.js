import { dateFromDays } from './expiration'
import { inventory as sampleInventory } from '../data/sample'

export const STORAGE_LOCATIONS = ['fridge', 'freezer', 'pantry']

export function demoItemsFromSample() {
  return sampleInventory.map((item) => {
    const match = String(item.quantity).match(/^(\d+(?:\.\d+)?)\s*(.*)$/)
    return {
      id: item.id,
      name: item.name,
      quantity: match ? Number(match[1]) : 1,
      unit: match?.[2]?.trim() || 'count',
      storage_location: item.location,
      expiration_date: dateFromDays(item.expiresInDays),
    }
  })
}

export function quantityLabel(item) {
  const quantity = item.quantity == null || item.quantity === '' ? '' : String(item.quantity)
  const unit = item.unit ? String(item.unit) : ''
  return [quantity, unit].filter(Boolean).join(' ') || '1 count'
}

export function isValidDate(value) {
  if (!value) return true
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
