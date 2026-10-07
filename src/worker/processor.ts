import 'server-only'

import { type Job } from 'bullmq'

import { sendInvoiceReminders } from '@/server/jobs/invoice-reminders'
import { createDueReminders, generateAllDue, generateForRule } from '@/server/jobs/recurring'
import { logger } from '@/server/logger'
import { JOBS, type JobData } from '@/server/queue'

/**
 * Routes a job to its handler. Every handler is idempotent, so BullMQ retries
 * (and accidental duplicates) are always safe.
 */
export async function processJob(job: Job<JobData>): Promise<unknown> {
  switch (job.name) {
    case JOBS.generateAll:
      return generateAllDue()
    case JOBS.generateRule:
      if (!job.data.ruleId) throw new Error('generate-rule requires ruleId')
      return generateForRule(job.data.ruleId)
    case JOBS.reminders:
      return createDueReminders()
    case JOBS.invoiceReminders:
      return sendInvoiceReminders()
    default:
      logger.warn({ job: job.name }, 'unknown job ignored')
      return null
  }
}
