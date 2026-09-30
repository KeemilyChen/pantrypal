import { loadAvailableInventory, toRecommendationInventory } from './availableInventory'

export async function askPantryPal({ query, demo, userId }) {
  const url = process.env.EXPO_PUBLIC_RECIPE_RECOMMEND_URL
  if (!url) throw new Error('Ask PantryPal is not configured on this phone yet.')

  const trimmed = String(query || '').trim()
  if (!trimmed) throw new Error('Tell PantryPal what you want to cook.')
  if (trimmed.length > 500) throw new Error('Keep your request under 500 characters.')

  const inventory = await loadAvailableInventory({ demo, userId })
  const payload = {
    query: trimmed,
    inventory: toRecommendationInventory(inventory),
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Could not reach PantryPal. Check your connection and try again.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('PantryPal returned an unreadable answer. Try asking again.')
  }

  if (!response.ok) {
    throw new Error(data?.error || 'PantryPal could not answer just now. Try asking again.')
  }
  if (!data?.recipes?.length) {
    throw new Error('PantryPal could not build a recipe from that request. Try again.')
  }

  return { result: data, inventory }
}
