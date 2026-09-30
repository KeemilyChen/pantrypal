import { apiOrigin, dedupeTags } from './tags'

function authHeaders(accessToken) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
}

function origin() {
  const value = apiOrigin()
  if (!value) throw new Error('Explore is not configured on this phone yet.')
  return value
}

export async function fetchExplore({ accessToken, search = '', tag = '', mode = 'foryou', type = 'all' }) {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  if (tag.trim()) params.set('tag', tag.trim())
  params.set('mode', mode)
  params.set('type', type)
  const response = await fetch(`${origin()}/api/recipes/explore?${params.toString()}`, {
    headers: authHeaders(accessToken),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not load Explore.')
  return data
}

export async function fetchCommunityRecipe({ accessToken, id }) {
  const response = await fetch(`${origin()}/api/recipes/${id}`, { headers: authHeaders(accessToken) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Recipe not found.')
  return data.recipe
}

export async function fetchMealPlan({ accessToken, id }) {
  const response = await fetch(`${origin()}/api/meal-plans/${id}`, { headers: authHeaders(accessToken) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Meal plan not found.')
  return data.mealPlan
}

export async function publishRecipe({ accessToken, recipe, extraTags = [] }) {
  const tags = dedupeTags([
    ...(recipe.tags || []).map((tag) => ({ ...tag, source: tag.source || 'ai' })),
    ...extraTags.map((tag) => ({ ...tag, source: 'user' })),
  ])
  const response = await fetch(`${origin()}/api/recipes/publish`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      name: recipe.name,
      description: recipe.description || recipe.reason || '',
      instructions: recipe.instructions || [],
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      servings: recipe.servings || 2,
      calories: recipe.calories ?? null,
      proteinG: recipe.proteinG ?? null,
      carbsG: recipe.carbsG ?? null,
      fatG: recipe.fatG ?? null,
      nutritionSource: 'ai_estimate',
      ingredients: (recipe.ingredients || []).map((item) => ({
        name: item.name || item.ingredientName,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        optional: Boolean(item.optional),
      })),
      tags,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not post to Explore.')
  return data.id
}

export async function addCommunityTag({ accessToken, recipeId, name }) {
  const response = await fetch(`${origin()}/api/recipes/${recipeId}/tags`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name, kind: 'other' }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not add that tag.')
}

export async function toggleLike({ accessToken, id, targetType = 'recipe' }) {
  const path = targetType === 'meal_plan' ? `/api/meal-plans/${id}/like` : `/api/recipes/${id}/like`
  const response = await fetch(`${origin()}${path}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ targetType }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not like.')
  return data
}

export async function toggleSave({ accessToken, id, targetType = 'recipe' }) {
  const path = targetType === 'meal_plan' ? `/api/meal-plans/${id}/save` : `/api/recipes/${id}/save`
  const response = await fetch(`${origin()}${path}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ targetType }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not save.')
  return data
}

export async function addRecipeToPlan({ accessToken, id, date, mealType, onConflict = 'skip' }) {
  const response = await fetch(`${origin()}/api/recipes/${id}/plan`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ date, mealType, onConflict }),
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 409) return { conflict: true, ...data }
  if (!response.ok) throw new Error(data.error || 'Could not add to meal plan.')
  return data
}

export async function importMealPlan({ accessToken, id, startDate, onConflict = 'skip' }) {
  const response = await fetch(`${origin()}/api/meal-plans/${id}/import`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ startDate, onConflict }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not import meal plan.')
  return data
}

export async function publishMealPlan({ accessToken, title, description, startDate, endDate }) {
  const response = await fetch(`${origin()}/api/meal-plans/publish`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ title, description, startDate, endDate }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not share meal plan.')
  return data
}

export async function fetchPlan({ accessToken, from, to }) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const response = await fetch(`${origin()}/api/plan?${params.toString()}`, { headers: authHeaders(accessToken) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not load your plan.')
  return data
}

export async function upsertPlanSlot({ accessToken, date, mealType, recipeId, onConflict = 'replace' }) {
  const response = await fetch(`${origin()}/api/plan`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ date, mealType, recipeId, onConflict }),
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 409) return { conflict: true }
  if (!response.ok) throw new Error(data.error || 'Could not save meal.')
  return data
}

export async function deletePlanSlot({ accessToken, id }) {
  const response = await fetch(`${origin()}/api/plan?id=${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not remove meal.')
}

export async function recordOpen({ accessToken, id, kind = 'cook', targetType = 'recipe' }) {
  await fetch(`${origin()}/api/recipes/${id}/interactions`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ kind, targetType }),
  }).catch(() => null)
}

export async function fetchMyProfile({ accessToken }) {
  const response = await fetch(`${origin()}/api/profiles/me`, { headers: authHeaders(accessToken) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not load profile.')
  return data
}

export async function fetchPublicProfile({ accessToken, id }) {
  const response = await fetch(`${origin()}/api/profiles/${id}`, { headers: authHeaders(accessToken) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not load profile.')
  return data
}
