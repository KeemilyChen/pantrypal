export const profile = { name: 'Alex' }

export const inventory = [
  { id: '1', name: 'Spinach', location: 'fridge', quantity: '1 bag', expiresInDays: 1 },
  { id: '2', name: 'Milk', location: 'fridge', quantity: '1 gallon', expiresInDays: 3 },
  { id: '3', name: 'Broccoli', location: 'fridge', quantity: '1 head', expiresInDays: 5 },
  { id: '4', name: 'Cheese', location: 'fridge', quantity: '8 oz', expiresInDays: 8 },
  { id: '5', name: 'Chicken Breast', location: 'freezer', quantity: '2 lbs', expiresInDays: 90 },
  { id: '6', name: 'Dumplings', location: 'freezer', quantity: '1 bag', expiresInDays: 60 },
  { id: '7', name: 'Rice', location: 'pantry', quantity: '2 lbs', expiresInDays: 180 },
  { id: '8', name: 'Soy sauce', location: 'pantry', quantity: '1 bottle', expiresInDays: 365 },
]

export const recipes = [
  { id: 'r1', name: 'Chicken Stir Fry', minutes: 25, uses: 'Chicken, broccoli, rice' },
  { id: 'r2', name: 'Spinach Omelette', minutes: 10, uses: 'Eggs, spinach, cheese' },
  { id: 'r3', name: 'Garlic Broccoli', minutes: 13, uses: 'Broccoli, garlic, oil' },
  { id: 'r4', name: 'Pan-Fried Dumplings', minutes: 14, uses: 'Dumplings, soy sauce' },
]

export const shoppingSeed = [
  { id: 's1', name: 'Green onion', checked: false },
  { id: 's2', name: 'Limes', checked: false },
  { id: 's3', name: 'Eggs', checked: true },
]

export const plannedByDate = {
  // Sample: 16th of current month
}

export function expirationLabel(days) {
  if (days < 0) return `Expired ${Math.abs(days)}d`
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

export function expirationTone(days) {
  if (days < 0) return 'expired'
  if (days <= 2) return 'urgent'
  if (days <= 6) return 'soon'
  return 'fresh'
}
