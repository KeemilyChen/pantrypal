export function parseStepMinutes(text) {
  const match = String(text).match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|min)\b/i)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  const unit = match[2].toLowerCase()
  if (unit.startsWith('h')) return Math.round(amount * 60)
  return Math.round(amount)
}

export function asInstructionSteps(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return asInstructionSteps(parsed)
    } catch {
      return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return []
}
