import 'server-only'

import { and, asc, count, eq, gt, gte, sql } from 'drizzle-orm'

import {
  attachmentObjectKey,
  MAX_ATTACHMENTS,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '@/features/invoices/lib/attachments'
import { err, ok, type Result } from '@/lib/result'

import { db, type Tx } from '../db'
import { invoiceAttachments, invoices } from '../db/schema'
import { logger } from '../logger'
import { deleteObjects, getObject, putObject } from '../storage'

/**
 * PDFs attached to an invoice (third-party invoices passed on to the client),
 * scoped by owner. Rows hold the metadata; the bytes are in object storage
 * (ADR 0011). Positions stay packed 0..n-1 so the next upload goes at `count`.
 */

const columns = {
  id: invoiceAttachments.id,
  position: invoiceAttachments.position,
  fileName: invoiceAttachments.fileName,
  sizeBytes: invoiceAttachments.sizeBytes,
  pageCount: invoiceAttachments.pageCount,
  createdAt: invoiceAttachments.createdAt,
}

export type InvoiceAttachment = {
  id: string
  position: number
  fileName: string
  sizeBytes: number
  pageCount: number
  createdAt: Date
}

export async function listInvoiceAttachments(
  userId: string,
  invoiceId: string,
): Promise<InvoiceAttachment[]> {
  return db
    .select(columns)
    .from(invoiceAttachments)
    .where(and(eq(invoiceAttachments.userId, userId), eq(invoiceAttachments.invoiceId, invoiceId)))
    .orderBy(asc(invoiceAttachments.position))
}

/** Locks the owner's invoice row so concurrent changes to its attachments queue up. */
async function lockInvoice(tx: Tx, userId: string, invoiceId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.id, invoiceId)))
    .for('update')
  return Boolean(row)
}

export async function addInvoiceAttachment(
  userId: string,
  invoiceId: string,
  file: { fileName: string; bytes: Uint8Array; pageCount: number },
): Promise<Result<InvoiceAttachment, 'not_found' | 'too_many' | 'too_large'>> {
  return db.transaction(async (tx) => {
    if (!(await lockInvoice(tx, userId, invoiceId))) return err('not_found')

    const [existing] = await tx
      .select({
        count: count(),
        bytes: sql<number>`coalesce(sum(${invoiceAttachments.sizeBytes}), 0)`.mapWith(Number),
      })
      .from(invoiceAttachments)
      .where(eq(invoiceAttachments.invoiceId, invoiceId))
    const taken = existing?.count ?? 0
    if (taken >= MAX_ATTACHMENTS) return err('too_many')
    if ((existing?.bytes ?? 0) + file.bytes.byteLength > MAX_TOTAL_ATTACHMENT_BYTES) {
      return err('too_large')
    }

    const id = crypto.randomUUID()
    const objectKey = attachmentObjectKey(userId, invoiceId, id)
    const [row] = await tx
      .insert(invoiceAttachments)
      .values({
        id,
        userId,
        invoiceId,
        position: taken,
        fileName: file.fileName,
        objectKey,
        sizeBytes: file.bytes.byteLength,
        pageCount: file.pageCount,
      })
      .returning(columns)
    // Upload inside the transaction: a failed upload rolls the row back. If the
    // commit fails after it, the object is orphaned, which costs storage only.
    await putObject(objectKey, file.bytes, 'application/pdf')
    return ok(row!)
  })
}

/** Deletes stored files after the rows are gone. A failure leaves an orphan, never a dangling row. */
export async function removeStoredFiles(objectKeys: readonly string[]): Promise<void> {
  try {
    await deleteObjects(objectKeys)
  } catch (error) {
    logger.warn({ err: error, count: objectKeys.length }, 'stored files left behind')
  }
}

export async function deleteInvoiceAttachment(
  userId: string,
  invoiceId: string,
  attachmentId: string,
): Promise<Result<undefined, 'not_found'>> {
  const removed = await db.transaction(async (tx) => {
    if (!(await lockInvoice(tx, userId, invoiceId))) return null
    const [row] = await tx
      .delete(invoiceAttachments)
      .where(
        and(
          eq(invoiceAttachments.userId, userId),
          eq(invoiceAttachments.invoiceId, invoiceId),
          eq(invoiceAttachments.id, attachmentId),
        ),
      )
      .returning({ position: invoiceAttachments.position, objectKey: invoiceAttachments.objectKey })
    if (!row) return null
    // Close the gap. Shifting past the range first means the unique
    // (invoice, position) index never sees two rows on one position mid-update.
    const after = and(
      eq(invoiceAttachments.invoiceId, invoiceId),
      gt(invoiceAttachments.position, row.position),
    )
    await tx
      .update(invoiceAttachments)
      .set({ position: sql`${invoiceAttachments.position} + 100` })
      .where(after)
    await tx
      .update(invoiceAttachments)
      .set({ position: sql`${invoiceAttachments.position} - 101` })
      .where(
        and(eq(invoiceAttachments.invoiceId, invoiceId), gte(invoiceAttachments.position, 100)),
      )
    return row
  })
  if (!removed) return err('not_found')
  await removeStoredFiles([removed.objectKey])
  return ok()
}

/** Swaps an attachment with its neighbour. Moving the first up or the last down is a no-op. */
export async function moveInvoiceAttachment(
  userId: string,
  invoiceId: string,
  attachmentId: string,
  direction: 'up' | 'down',
): Promise<Result<undefined, 'not_found'>> {
  return db.transaction(async (tx) => {
    if (!(await lockInvoice(tx, userId, invoiceId))) return err('not_found')
    const rows = await tx
      .select({ id: invoiceAttachments.id, position: invoiceAttachments.position })
      .from(invoiceAttachments)
      .where(eq(invoiceAttachments.invoiceId, invoiceId))
      .orderBy(asc(invoiceAttachments.position))
    const index = rows.findIndex((row) => row.id === attachmentId)
    if (index === -1) return err('not_found')
    const moving = rows[index]!
    const other = rows[direction === 'up' ? index - 1 : index + 1]
    if (!other) return ok()

    // Park one row on a free position so the unique index holds at every step.
    const setPosition = (id: string, position: number) =>
      tx.update(invoiceAttachments).set({ position }).where(eq(invoiceAttachments.id, id))
    await setPosition(moving.id, 150)
    await setPosition(other.id, moving.position)
    await setPosition(moving.id, other.position)
    return ok()
  })
}

/** The invoice's attachment files, in order, for the merged PDF. */
export async function readInvoiceAttachmentFiles(
  userId: string,
  invoiceId: string,
): Promise<Uint8Array[]> {
  const rows = await db
    .select({ objectKey: invoiceAttachments.objectKey })
    .from(invoiceAttachments)
    .where(and(eq(invoiceAttachments.userId, userId), eq(invoiceAttachments.invoiceId, invoiceId)))
    .orderBy(asc(invoiceAttachments.position))
  const files: Uint8Array[] = []
  for (const row of rows) files.push(await getObject(row.objectKey))
  return files
}

/** One attachment's name and bytes, for its owner only. */
export async function readInvoiceAttachmentFile(
  userId: string,
  invoiceId: string,
  attachmentId: string,
): Promise<{ fileName: string; bytes: Uint8Array } | null> {
  const [row] = await db
    .select({ fileName: invoiceAttachments.fileName, objectKey: invoiceAttachments.objectKey })
    .from(invoiceAttachments)
    .where(
      and(
        eq(invoiceAttachments.userId, userId),
        eq(invoiceAttachments.invoiceId, invoiceId),
        eq(invoiceAttachments.id, attachmentId),
      ),
    )
  if (!row) return null
  return { fileName: row.fileName, bytes: await getObject(row.objectKey) }
}
