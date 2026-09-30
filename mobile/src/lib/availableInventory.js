import { demoItemsFromSample } from './inventoryDisplay'
import { supabase } from './supabase'

export async function loadAvailableInventory({ demo, userId }) {
  if (demo) return demoItemsFromSample()
  if (!supabase || !userId) {
    throw new Error('You need to be signed in to use your fridge.')
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, quantity, unit, storage_location, expiration_date, status')
    .eq('user_id', userId)
    .eq('status', 'available')

  if (error) throw new Error(error.message || 'Could not load your fridge.')
  return data ?? []
}

export function toRecommendationInventory(items) {
  return items.map((item) => ({
    id: String(item.id),
    name: item.name,
    quantity: Number(item.quantity) || 0,
    unit: item.unit || 'count',
    expirationDate: item.expiration_date ?? null,
    storageLocation: item.storage_location || 'fridge',
  }))
}
