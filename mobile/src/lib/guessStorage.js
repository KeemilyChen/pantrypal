export const FOOD_CATEGORIES = [
  'produce',
  'meat',
  'seafood',
  'dairy',
  'grains',
  'pantry',
  'frozen',
  'beverages',
  'protein',
  'other',
]

export function guessCategory(name) {
  const value = String(name || '').toLowerCase()
  if (/chicken|beef|pork|turkey/.test(value)) return 'meat'
  if (/fish|salmon|shrimp/.test(value)) return 'seafood'
  if (/milk|cheese|yogurt|egg|butter/.test(value)) return 'dairy'
  if (/spinach|broccoli|carrot|apple|berry|onion|garlic|tomato/.test(value)) return 'produce'
  if (/rice|pasta|bread|oat/.test(value)) return 'grains'
  if (/soda|juice|water/.test(value)) return 'beverages'
  if (/dumpling|frozen/.test(value)) return 'frozen'
  if (/oil|sauce|salt|spice/.test(value)) return 'pantry'
  return 'other'
}

export function guessLocation(category) {
  if (category === 'frozen') return 'freezer'
  if (category === 'grains' || category === 'pantry') return 'pantry'
  return 'fridge'
}

export function normalizeCategory(value, name) {
  const lowered = String(value || '').toLowerCase()
  if (FOOD_CATEGORIES.includes(lowered)) return lowered
  return guessCategory(name)
}
