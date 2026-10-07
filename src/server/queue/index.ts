import 'server-only'

import { Queue, type DefaultJobOptions } from 'bullmq'

import { env } from '@/env'

import { logger } from '../logger'

export const QUEUE_NAME = 'workbench'
/** Keeps BullMQ keys under the app's namespace in a shared Redis. */
export const QUEUE_PREFIX = 'wb:bull'

export const JOBS = {
  generateAll: 'generate-recurring',
  generateRule: 'generate-rule',
  reminders: 'create-reminders',
  invoiceReminders: 'send-invoice-reminders',
} as const

export type JobName = (typeof JOBS)[keyof typeof JOBS]
export type JobData = { ruleId?: string }

/** Retries with exponential backoff (5s, 10s, 20s, 40s, 80s); history is trimmed. */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 1_000 },
}

const globalForQueue = globalThis as unknown as { workbenchQueue?: Queue<JobData> }

/** Producer side, used by the web app. Fails fast when Redis is unreachable. */
export function getQueue(name = QUEUE_NAME): Queue<JobData> {
  if (name !== QUEUE_NAME) {
    return new Queue<JobData>(name, queueOptions({ failFast: true }))
  }
  globalForQueue.workbenchQueue ??= new Queue<JobData>(name, queueOptions({ failFast: true }))
  return globalForQueue.workbenchQueue
}

export function queueOptions({ failFast }: { failFast: boolean }) {
  return {
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    connection: {
      url: env.REDIS_URL,
      // Workers need blocking commands to retry forever; producers should not hang.
      maxRetriesPerRequest: failFast ? 1 : null,
      enableOfflineQueue: !failFast,
    },
  }
}

/**
 * Asks the worker to generate a rule's due entries now instead of at the next
 * scheduled run. Best effort: if Redis is down, the scheduler catches up later.
 */
export async function enqueueRuleGeneration(ruleId: string): Promise<void> {
  try {
    await getQueue().add(JOBS.generateRule, { ruleId })
  } catch (error) {
    logger.warn(
      { err: error, ruleId },
      'could not enqueue rule generation; scheduler will catch up',
    )
  }
}

export async function closeQueue(): Promise<void> {
  await globalForQueue.workbenchQueue?.close()
  globalForQueue.workbenchQueue = undefined
}
