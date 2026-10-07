import { describe, expect, it } from 'vitest'

import { deviceLabel } from './device-label'
import {
  candidateDueDates,
  localHour,
  reminderKind,
  reminderMessage,
  type ReminderInvoice,
} from './reminders'

const invoice = (overrides: Partial<ReminderInvoice> = {}): ReminderInvoice => ({
  id: 'a1',
  numberLabel: 'INV-0042',
  clientName: 'Northwind Labs',
  totalMinor: 125_000,
  currency: 'USD',
  dueDate: '2026-10-15',
  ...overrides,
})

describe('reminderKind', () => {
  it('reminds three days before, on the day, and the day after', () => {
    expect(reminderKind('2026-10-12', '2026-10-15')).toBe('upcoming')
    expect(reminderKind('2026-10-15', '2026-10-15')).toBe('due')
    expect(reminderKind('2026-10-16', '2026-10-15')).toBe('overdue')
  })

  it('stays quiet on every other day, across month ends', () => {
    for (const today of ['2026-10-11', '2026-10-13', '2026-10-14', '2026-10-17']) {
      expect(reminderKind(today, '2026-10-15')).toBeNull()
    }
    expect(reminderKind('2026-10-29', '2026-11-01')).toBe('upcoming')
    expect(reminderKind('2027-01-01', '2026-12-31')).toBe('overdue')
  })
})

describe('localHour', () => {
  it('reads the hour in the user’s timezone', () => {
    const now = new Date('2026-10-15T02:30:00Z')
    expect(localHour(now, 'Asia/Jakarta')).toBe(9)
    expect(localHour(now, 'UTC')).toBe(2)
    expect(localHour(now, 'America/New_York')).toBe(22)
    expect(localHour(new Date('2026-10-14T23:59:00Z'), 'Asia/Kolkata')).toBe(5)
  })
})

describe('candidateDueDates', () => {
  it('covers every timezone’s window around today', () => {
    expect(candidateDueDates('2026-10-15')).toEqual({ from: '2026-10-13', to: '2026-10-19' })
  })
})

describe('reminderMessage', () => {
  it('names a single invoice, its client, and amount', () => {
    expect(reminderMessage('due', [invoice()])).toEqual({
      title: 'INV-0042 is due today',
      body: 'Northwind Labs · $1,250.00',
      url: '/invoices/a1',
      tag: 'invoice-a1-due',
    })
    expect(reminderMessage('upcoming', [invoice()]).body).toBe(
      'Northwind Labs · $1,250.00 · due Oct 15',
    )
    expect(reminderMessage('overdue', [invoice()])).toMatchObject({
      title: 'INV-0042 is overdue',
      body: 'Northwind Labs · $1,250.00 · was due yesterday',
    })
  })

  it('summarizes several invoices without mixing currencies into a total', () => {
    const many = [
      invoice({ id: 'a1', clientName: 'Northwind Labs' }),
      invoice({ id: 'a2', clientName: 'Kopi Sore', currency: 'IDR', totalMinor: 5_000_000 }),
      invoice({ id: 'a3', clientName: 'Northwind Labs' }),
      invoice({ id: 'a4', clientName: 'Bluebird' }),
      invoice({ id: 'a5', clientName: 'Lintas Data' }),
    ]
    expect(reminderMessage('due', many)).toEqual({
      title: '5 invoices are due today',
      body: 'Northwind Labs, Kopi Sore, and 2 more',
      url: '/invoices?status=sent',
      tag: 'invoices-due-2026-10-15',
    })
    expect(reminderMessage('upcoming', many.slice(0, 2)).body).toBe('Northwind Labs, Kopi Sore')
  })
})

describe('deviceLabel', () => {
  it.each([
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'iPhone · Safari',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
      'iPhone · Chrome',
    ],
    [
      'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
      'Android · Chrome',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
      'Mac · Edge',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
      'Windows · Firefox',
    ],
    [undefined, 'This browser'],
    ['curl/8.0', 'This browser'],
  ])('names %s', (userAgent, label) => {
    expect(deviceLabel(userAgent)).toBe(label)
  })
})
