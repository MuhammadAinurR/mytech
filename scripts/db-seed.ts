import { loadEnvConfig } from '@next/env'

import { databaseName } from './db-utils'

/**
 * Creates (or recreates) a demo account with a few months of realistic data,
 * dated relative to today so the dashboard always looks current. Only the demo
 * user's rows are touched, and only in a workbench_* database.
 *
 *   npm run db:seed
 */

const DEMO = {
  email: 'demo@workbench.local',
  password: 'workbench-demo-2026',
  name: 'Demo Owner',
  timezone: 'Asia/Jakarta',
}

// A 64×64 PNG mark (bench top over a shelf) used as the demo company logo.
const LOGO_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeklEQVR42u3YsQ2AIBAFUDCOwQiWTuBA1ozgVEzhQJaWEhNICO/XV9xLrvkX036GkbOEwQMAAAAAAAAAAAAA8Dtr/ehdrp6bbUd2QgAAAAAAX4k+cwAAAAAAkzSyRk2tsnk5IQAAAAAAjQwAAAAAAAAAAAAAAAAA4M0Dy5IIvBPgViUAAAAASUVORK5CYII='

async function main() {
  loadEnvConfig(process.cwd())
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  databaseName(url) // refuses anything that isn't workbench_*

  const { eq } = await import('drizzle-orm')
  const { db, closeDb } = await import('@/server/db')
  const { invoices, users } = await import('@/server/db/schema')
  const { closeRedis } = await import('@/server/redis')
  const { hashPassword } = await import('@/server/auth/password')
  const { insertUser } = await import('@/server/queries/users')
  const { createTransaction } = await import('@/server/queries/transactions')
  const { createRule } = await import('@/server/queries/recurring')
  const { createCredential } = await import('@/server/queries/credentials')
  const { createCompany, setCompanyLogo } = await import('@/server/queries/companies')
  const { createInvoice, setInvoiceStatus } = await import('@/server/queries/invoices')
  const { createProject } = await import('@/server/queries/projects')
  const { generateForRule, createDueReminders } = await import('@/server/jobs/recurring')
  const { addDays, todayInTimeZone } = await import('@/lib/dates')
  const { shiftMonth } = await import('@/lib/months')

  // Start clean: invoices first (companies protect them), then the user cascades.
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO.email))
  if (existing) {
    await db.delete(invoices).where(eq(invoices.userId, existing.id))
    await db.delete(users).where(eq(users.id, existing.id))
  }

  const created = await insertUser({
    email: DEMO.email,
    name: DEMO.name,
    timezone: DEMO.timezone,
    passwordHash: await hashPassword(DEMO.password),
  })
  if (!created.ok) throw new Error('Could not create the demo user')
  const userId = created.data.id

  const today = todayInTimeZone(DEMO.timezone)
  const month = today.slice(0, 7)
  const day = (monthOffset: number, dayOfMonth: number) => {
    const target = shiftMonth(month, monthOffset)
    const date = `${target}-${String(dayOfMonth).padStart(2, '0')}`
    return date > today ? today : date
  }

  // Transactions: six months of client work, tools, and hosting.
  const tx = (
    occurredOn: string,
    type: 'income' | 'expense',
    amountMinor: number,
    category: string,
    note: string | null,
    currency: 'USD' | 'IDR' = 'USD',
  ) => createTransaction(userId, { occurredOn, type, amountMinor, currency, category, note })
  for (let offset = -5; offset <= 0; offset++) {
    await tx(day(offset, 2), 'income', 420_000, 'Client retainer', 'Design system work')
    if (offset % 2 === 0)
      await tx(
        day(offset, 12),
        'income',
        85_000 + offset * 5_000,
        'Consulting',
        'Architecture review',
      )
    await tx(day(offset, 3), 'expense', 2_000, 'Software', 'Design tool seat')
    await tx(day(offset, 9), 'expense', 999, 'Software', 'Password manager')
    await tx(day(offset, 5), 'expense', 1_500_000, 'Coworking', 'Day passes', 'IDR')
    if (offset === -2)
      await tx(day(offset, 20), 'expense', 21_900, 'Software', 'Code signing certificate')
  }

  // Recurring rules: the worker turns these into entries; reminders surface renewals.
  const rule = (overrides: Partial<Parameters<typeof createRule>[1]> & { label: string }) =>
    createRule(userId, {
      type: 'expense',
      amountMinor: 1_249,
      currency: 'USD',
      category: 'Hosting',
      note: null,
      frequency: 'monthly',
      dayOfMonth: 15,
      monthOfYear: null,
      startsOn: day(-2, 1),
      endsOn: null,
      reminderDaysBefore: null,
      ...overrides,
    })
  const nextWeek = addDays(today, 10)
  const rules = await Promise.all([
    rule({ label: 'VPS · 2 vCPU', reminderDaysBefore: 3 }),
    rule({
      label: 'Office rent',
      amountMinor: 3_500_000,
      currency: 'IDR',
      category: 'Rent',
      dayOfMonth: 31,
    }),
    rule({
      label: 'workbench.dev domain',
      amountMinor: 1_800,
      category: 'Domains',
      frequency: 'yearly',
      monthOfYear: Number(nextWeek.slice(5, 7)),
      dayOfMonth: Number(nextWeek.slice(8, 10)),
      startsOn: day(-11, 1),
      reminderDaysBefore: 14,
    }),
    rule({
      label: 'Design retainer',
      type: 'income',
      amountMinor: 420_000,
      category: 'Client retainer',
      dayOfMonth: 1,
      startsOn: addDays(today, 1),
    }),
  ])
  for (const r of rules) await generateForRule(r.id)
  await createDueReminders()

  // Credentials: secrets are sealed with the configured encryption key.
  for (const credential of [
    {
      label: 'Production Postgres',
      type: 'server' as const,
      host: 'db-1.internal.example:5432',
      username: 'workbench_app',
      secret: 'cY7#qR2!vLm9$wTz',
      notes: 'Read replica is db-2.',
    },
    {
      label: 'VPS root',
      type: 'server' as const,
      host: '203.0.113.24',
      username: 'root',
      secret: 'correct-horse-battery-staple',
      notes: null,
    },
    {
      label: 'Domain registrar',
      type: 'domain' as const,
      host: 'https://registrar.example',
      username: DEMO.email,
      secret: 'mT4!pQ9z@Lk2',
      notes: '2FA on phone',
    },
    {
      label: 'Office Wi-Fi',
      type: 'other' as const,
      host: null,
      username: 'Studio-5G',
      secret: 'quiet-river-lamp-42',
      notes: null,
    },
  ]) {
    await createCredential(userId, credential)
  }

  // Companies and invoices in each status.
  const studio = await createCompany(userId, {
    name: 'Studio Example',
    address: 'Jl. Kemang Raya 12\nJakarta Selatan 12730\nIndonesia',
    taxId: '01.234.567.8-901.000',
    email: 'billing@studio.example',
    defaultCurrency: 'USD',
    paymentDetails: 'Bank Example · 123 456 7890\nSWIFT EXAMIDJA',
    invoicePrefix: 'SE-',
    nextInvoiceNumber: 42,
  })
  await setCompanyLogo(userId, studio.id, {
    data: Buffer.from(LOGO_PNG, 'base64'),
    mime: 'image/png',
  })
  const consulting = await createCompany(userId, {
    name: 'Kopi Kode Consulting',
    address: 'Bandung, Indonesia',
    taxId: null,
    email: 'halo@kopikode.example',
    defaultCurrency: 'IDR',
    paymentDetails: null,
    invoicePrefix: 'KK/',
    nextInvoiceNumber: 1,
  })
  const invoice = async (
    companyId: string,
    clientName: string,
    issueDate: string,
    dueDate: string,
    items: { description: string; quantityMilli: number; unitPriceMinor: number }[],
    status: 'draft' | 'sent' | 'paid',
    extra: { currency?: 'USD' | 'IDR'; taxRateBps?: number; discountMinor?: number } = {},
  ) => {
    const result = await createInvoice(userId, {
      companyId,
      issueDate,
      dueDate,
      clientName,
      items,
      currency: extra.currency ?? 'USD',
      clientAddress: null,
      clientEmail: null,
      clientTaxId: null,
      notes: 'Thank you for the work together.',
      taxRateBps: extra.taxRateBps ?? 0,
      discountMinor: extra.discountMinor ?? 0,
    })
    if (!result.ok) throw new Error('Could not create an invoice')
    if (status !== 'draft') await setInvoiceStatus(userId, result.data.id, 'sent')
    if (status === 'paid') await setInvoiceStatus(userId, result.data.id, 'paid')
  }
  await invoice(
    studio.id,
    'Lumen Health',
    addDays(today, -40),
    addDays(today, -26),
    [
      {
        description: 'Design system foundations: tokens, type, components',
        quantityMilli: 1_000,
        unitPriceMinor: 420_000,
      },
      { description: 'Accessibility review', quantityMilli: 6_000, unitPriceMinor: 9_500 },
    ],
    'paid',
    { taxRateBps: 1_100, discountMinor: 20_000 },
  )
  await invoice(
    studio.id,
    'Juniper Bank',
    addDays(today, -21),
    addDays(today, -7),
    [{ description: 'Dashboard prototype', quantityMilli: 1_000, unitPriceMinor: 180_000 }],
    'sent',
  )
  await invoice(
    studio.id,
    'Atlas Freight',
    addDays(today, -2),
    addDays(today, 12),
    [{ description: 'Support retainer', quantityMilli: 12_500, unitPriceMinor: 8_000 }],
    'sent',
  )
  await invoice(
    consulting.id,
    'PT Sinar Kreatif',
    today,
    addDays(today, 14),
    [
      {
        description: 'Workshop: design systems in practice',
        quantityMilli: 1_000,
        unitPriceMinor: 15_000_000,
      },
    ],
    'draft',
    { currency: 'IDR', taxRateBps: 1_100 },
  )

  // Projects across the board, with ongoing ones around today for the calendar.
  const project = (
    name: string,
    status: 'todo' | 'ongoing' | 'done',
    start: number | null,
    end: number | null,
    description: string | null = null,
  ) =>
    createProject(userId, {
      name,
      status,
      description,
      startDate: start === null ? null : addDays(today, start),
      endDate: end === null ? null : addDays(today, end),
    })
  await project(
    'Lumen design system',
    'ongoing',
    -22,
    38,
    'Tokens, components, and documentation for the product team.',
  )
  await project('Juniper dashboard prototype', 'ongoing', -6, 17)
  await project('Workbench invoicing', 'ongoing', -2, 5, 'Numbering, totals, print, and PDF.')
  await project('Atlas onboarding audit', 'ongoing', 13, 27)
  await project(
    'Migrate VPS to a new region',
    'todo',
    null,
    null,
    'Snapshot, provision, switch DNS, monitor for a week.',
  )
  await project('Write case study: Lumen', 'todo', null, null)
  await project('Portfolio refresh', 'done', -67, -39)
  await project(
    'Accessibility review · Juniper',
    'done',
    -36,
    -25,
    'WCAG AA pass on the customer portal.',
  )

  console.log(`Seeded ${databaseName(url)} with a demo account:`)
  console.log(`  email:    ${DEMO.email}`)
  console.log(`  password: ${DEMO.password}`)
  await Promise.all([closeDb(), closeRedis()])
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
