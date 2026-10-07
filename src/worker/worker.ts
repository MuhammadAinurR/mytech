import 'server-only'

import { Worker } from 'bullmq'

import { closeDb } from '@/server/db'
import { logger } from '@/server/logger'
import { getQueue, JOBS, QUEUE_NAME, queueOptions, type JobData } from '@/server/queue'
import { closeRedis } from '@/server/redis'

import { processJob } from './processor'

/** Cron schedules (UTC). Generation runs often so each timezone's midnight is caught quickly. */
export const SCHEDULES = [
  { id: 'generate-recurring', name: JOBS.generateAll, pattern: '*/15 * * * *' },
  { id: 'create-reminders', name: JOBS.reminders, pattern: '5 * * * *' },
  // Every 15 minutes, so 09:00 is caught in every timezone (including :30 and :45 offsets).
  { id: 'send-invoice-reminders', name: JOBS.invoiceReminders, pattern: '*/15 * * * *' },
] as const

export async function startWorker({ queueName = QUEUE_NAME, schedule = true } = {}) {
  const queue = getQueue(queueName)
  const { connection, prefix } = queueOptions({ failFast: false })
  const worker = new Worker<JobData>(queueName, processJob, { connection, prefix, concurrency: 2 })

  worker.on('completed', (job, result) =>
    logger.debug({ job: job.name, id: job.id, result }, 'job completed'),
  )
  worker.on('failed', (job, error) =>
    logger.error(
      { job: job?.name, id: job?.id, attempt: job?.attemptsMade, err: error },
      'job failed',
    ),
  )
  worker.on('error', (error) => logger.error({ err: error }, 'worker error'))

  if (schedule) {
    for (const entry of SCHEDULES) {
      await queue.upsertJobScheduler(entry.id, { pattern: entry.pattern }, { name: entry.name })
    }
    // Catch up immediately on boot instead of waiting for the first tick.
    await queue.add(JOBS.generateAll, {})
    await queue.add(JOBS.reminders, {})
    await queue.add(JOBS.invoiceReminders, {})
  }

  await worker.waitUntilReady()
  logger.info({ queue: queueName, schedules: schedule ? SCHEDULES.length : 0 }, 'worker started')

  return {
    worker,
    queue,
    async close() {
      await worker.close()
      await queue.close()
    },
  }
}

/** Entry point for `npm run worker`. */
export async function runWorkerProcess() {
  const running = await startWorker()
  let stopping = false
  const shutdown = async (signal: string) => {
    if (stopping) return
    stopping = true
    logger.info({ signal }, 'worker shutting down')
    await running.close()
    await Promise.all([closeDb(), closeRedis()])
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}
