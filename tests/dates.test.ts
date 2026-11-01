import { describe, expect, it } from 'vitest'
import { addDays, describeDueDate, formatShortDate, toIsoDate } from '@/lib/dates'

describe('dates', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toIsoDate(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01')
  })

  it('formats short labels', () => {
    expect(formatShortDate('2026-11-03')).toBe('3 Nov')
  })

  it('describes due dates relative to today', () => {
    const today = '2026-03-10'
    expect(describeDueDate('2026-03-09', today)).toEqual({ label: '9 Mar', status: 'overdue' })
    expect(describeDueDate('2026-03-10', today)).toEqual({ label: 'Today', status: 'soon' })
    expect(describeDueDate('2026-03-11', today)).toEqual({ label: 'Tomorrow', status: 'soon' })
    expect(describeDueDate('2026-03-13', today)).toEqual({ label: '13 Mar', status: 'soon' })
    expect(describeDueDate('2026-03-14', today)).toEqual({ label: '14 Mar', status: 'later' })
  })

  it('handles month boundaries and DST changes', () => {
    expect(describeDueDate('2026-04-01', '2026-03-31').label).toBe('Tomorrow')
    expect(describeDueDate('2026-03-30', '2026-03-28').status).toBe('soon')
  })
})
