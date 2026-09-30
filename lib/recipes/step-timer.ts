export function parseStepMinutes(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|min)\b/i)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  const unit = match[2].toLowerCase()
  if (unit.startsWith("h")) return Math.round(amount * 60)
  return Math.round(amount)
}
