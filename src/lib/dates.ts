const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 24 * 60 * 60 * 1000

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

export function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export type DueStatus = 'overdue' | 'soon' | 'later'

export interface DueInfo {
  label: string
  status: DueStatus
}

/** Human label + urgency for a due date relative to `today` (both YYYY-MM-DD). */
export function describeDueDate(dueDate: string, today: string): DueInfo {
  const diff = toDayNumber(dueDate) - toDayNumber(today)
  if (diff < 0) return { label: formatShortDate(dueDate), status: 'overdue' }
  if (diff === 0) return { label: 'Today', status: 'soon' }
  if (diff === 1) return { label: 'Tomorrow', status: 'soon' }
  return { label: formatShortDate(dueDate), status: diff <= 3 ? 'soon' : 'later' }
}
