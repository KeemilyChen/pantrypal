export function daysUntilExpiration(expirationDate, today = new Date()) {
  if (!expirationDate) return null
  const [year, month, day] = String(expirationDate).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  const expires = new Date(year, month - 1, day)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((expires.getTime() - start.getTime()) / 86400000)
}

export function expirationLabel(expirationDate) {
  const days = daysUntilExpiration(expirationDate)
  if (days === null) return 'No date'
  if (days < 0) return `Expired ${Math.abs(days)}d`
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

export function expirationTone(expirationDate) {
  const days = daysUntilExpiration(expirationDate)
  if (days === null) return 'fresh'
  if (days < 0) return 'expired'
  if (days <= 2) return 'urgent'
  if (days <= 6) return 'soon'
  return 'fresh'
}

export function sortByExpiration(items) {
  return [...items].sort((a, b) => {
    const aDays = daysUntilExpiration(a.expiration_date)
    const bDays = daysUntilExpiration(b.expiration_date)
    if (aDays === null && bDays === null) return a.name.localeCompare(b.name)
    if (aDays === null) return 1
    if (bDays === null) return -1
    return aDays - bDays
  })
}

export function dateFromDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
