export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localMonthKey(date = new Date()) {
  return localDateKey(date).slice(0, 7)
}

export function formatPakistanDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function addRecurringDate(
  value: string,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly',
) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(year, month - 1, day, 12)
  if (Number.isNaN(date.getTime())) return ''
  if (frequency === 'weekly') date.setDate(date.getDate() + 7)
  else {
    const monthDelta = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : frequency === 'semi_annual' ? 6 : 12
    const target = new Date(year, month - 1 + monthDelta, 1, 12)
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate()
    target.setDate(Math.min(day, lastDay))
    return localDateKey(target)
  }
  return localDateKey(date)
}
