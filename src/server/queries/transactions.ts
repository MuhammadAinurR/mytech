import 'server-only'

import { and, asc, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from 'drizzle-orm'

import { type TransactionInput, type TransactionType } from '@/features/transactions/schema'
import { monthRange } from '@/lib/months'

import { db, type DbOrTx } from '../db'
import { transactions } from '../db/schema'

/**
 * Data access for transactions. Every function takes the owner's id and scopes
 * by it; there is no way to reach another user's rows through this module.
 */

export const TRANSACTIONS_PAGE_SIZE = 25

const listColumns = {
  id: transactions.id,
  type: transactions.type,
  amountMinor: transactions.amountMinor,
  currency: transactions.currency,
  category: transactions.category,
  occurredOn: transactions.occurredOn,
  note: transactions.note,
  recurringRuleId: transactions.recurringRuleId,
}

export type TransactionItem = {
  id: string
  type: TransactionType
  amountMinor: number
  currency: string
  category: string
  occurredOn: string
  note: string | null
  /** Set when the worker created this entry from a recurring rule. */
  recurringRuleId: string | null
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function listFilters(
  userId: string,
  { month, type, q }: { month?: string; type?: TransactionType; q?: string },
): SQL {
  const conditions: (SQL | undefined)[] = [eq(transactions.userId, userId)]
  if (month) {
    const { start, end } = monthRange(month)
    conditions.push(gte(transactions.occurredOn, start), lt(transactions.occurredOn, end))
  }
  if (type) conditions.push(eq(transactions.type, type))
  if (q) {
    const pattern = `%${escapeLike(q)}%`
    conditions.push(or(ilike(transactions.category, pattern), ilike(transactions.note, pattern)))
  }
  return and(...conditions)!
}

export async function listTransactions(
  userId: string,
  options: { month?: string; type?: TransactionType; q?: string; page?: number; pageSize?: number },
): Promise<{ items: TransactionItem[]; total: number; page: number; pageSize: number }> {
  const pageSize = options.pageSize ?? TRANSACTIONS_PAGE_SIZE
  const page = Math.max(1, options.page ?? 1)
  const where = listFilters(userId, options)

  const [items, [totals]] = await Promise.all([
    db
      .select(listColumns)
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(transactions).where(where),
  ])
  return { items, total: totals?.total ?? 0, page, pageSize }
}

export async function getTransaction(userId: string, id: string): Promise<TransactionItem | null> {
  const [row] = await db
    .select(listColumns)
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .limit(1)
  return row ?? null
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
  tx: DbOrTx = db,
): Promise<TransactionItem> {
  const [row] = await tx
    .insert(transactions)
    .values({ ...input, userId })
    .returning(listColumns)
  return row!
}

/** Returns null when the transaction doesn't exist or belongs to someone else. */
export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionInput,
): Promise<TransactionItem | null> {
  const [row] = await db
    .update(transactions)
    .set(input)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning(listColumns)
  return row ?? null
}

export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning({ id: transactions.id })
  return deleted.length > 0
}

export type CurrencySummary = {
  currency: string
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  count: number
}

/** Income, expense, and net for one month, one row per currency (no FX conversion). */
export async function getMonthlySummary(userId: string, month: string): Promise<CurrencySummary[]> {
  const { start, end } = monthRange(month)
  const rows = await db
    .select({
      currency: transactions.currency,
      incomeMinor:
        sql<number>`coalesce(sum(${transactions.amountMinor}) filter (where ${transactions.type} = 'income'), 0)::bigint`.mapWith(
          Number,
        ),
      expenseMinor:
        sql<number>`coalesce(sum(${transactions.amountMinor}) filter (where ${transactions.type} = 'expense'), 0)::bigint`.mapWith(
          Number,
        ),
      count: count(),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, start),
        lt(transactions.occurredOn, end),
      ),
    )
    .groupBy(transactions.currency)
    .orderBy(asc(transactions.currency))

  return rows.map((row) => ({ ...row, netMinor: row.incomeMinor - row.expenseMinor }))
}

/** Categories this user has used, most frequent first, for form suggestions. */
export async function listCategories(userId: string, limit = 50): Promise<string[]> {
  const rows = await db
    .select({ category: transactions.category, uses: count() })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.category)
    .orderBy(desc(count()), asc(transactions.category))
    .limit(limit)
  return rows.map((row) => row.category)
}
