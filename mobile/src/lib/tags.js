export function slugifyTag(name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || null
}

export function dedupeTags(tags, cap = 12) {
  const seen = new Set()
  const out = []
  for (const tag of tags || []) {
    const name = String(tag?.name || tag || '').trim().replace(/\s+/g, ' ')
    const slug = slugifyTag(name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    out.push({
      name: name.slice(0, 48),
      slug,
      kind: tag?.kind || 'other',
      source: tag?.source,
    })
    if (out.length >= cap) break
  }
  return out
}

export function apiOrigin() {
  const recommend = process.env.EXPO_PUBLIC_RECIPE_RECOMMEND_URL || ''
  return recommend.replace(/\/api\/ai\/recipe-recommendation\/?$/, '')
}
