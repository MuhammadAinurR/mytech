import { QueueEvents } from 'bullmq'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { closeDb, db } from '@/server/db'
import { transactions } from '@/server/db/schema'
import { createRule } from '@/server/queries/recurring'
import { JOBS, queueOptions } from '@/server/queue'
import { closeRedis } from '@/server/redis'
import { createTestUser } from '@/server/testing/factories'

import { startWorker } from './worker'

// A throwaway queue in the test Redis DB so nothing else consumes these jobs.
const queueName = `test-${crypto.randomUUID()}`
let running: Awaited<ReturnType<typeof startWorker>>
let events: QueueEvents

beforeAll(async () => {
  running = await startWorker({ queueName, schedule: false })
  const { connection, prefix } = queueOptions({ failFast: false })
  events = new QueueEvents(queueName, { connection, prefix })
  await events.waitUntilReady()
})

afterAll(async () => {
  await running.queue.obliterate({ force: true })
  await Promise.all([running.close(), events.close()])
  await Promise.all([closeDb(), closeRedis()])
})

describe('worker', () => {
  it('generates a rule’s due transactions from an enqueued job', async () => {
    const user = await createTestUser()
    const rule = await createRule(user.id, {
      label: 'Coworking',
      type: 'expense',
      amountMinor: 150_000,
      currency: 'IDR',
      category: 'Coworking',
      note: null,
      frequency: 'monthly',
      dayOfMonth: 1,
      monthOfYear: null,
      startsOn: '2026-01-01',
      endsOn: '2026-03-31',
      reminderDaysBefore: null,
    })

    const job = await running.queue.add(JOBS.generateRule, { ruleId: rule.id })
    await expect(job.waitUntilFinished(events, 10_000)).resolves.toEqual({ created: 3 })

    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.recurringRuleId, rule.id))
    expect(rows.map((r) => r.occurredOn).sort()).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])

    // A duplicate job is harmless.
    const again = await running.queue.add(JOBS.generateRule, { ruleId: rule.id })
    await expect(again.waitUntilFinished(events, 10_000)).resolves.toEqual({ created: 0 })
  })

  it('retries failing jobs with backoff and records the failure', async () => {
    const job = await running.queue.add(
      JOBS.generateRule,
      {},
      { attempts: 3, backoff: { type: 'exponential', delay: 20 } },
    )
    await expect(job.waitUntilFinished(events, 10_000)).rejects.toThrow(
      'generate-rule requires ruleId',
    )
    const failed = await running.queue.getJob(job.id!)
    expect(failed?.attemptsMade).toBe(3)
  })
})
