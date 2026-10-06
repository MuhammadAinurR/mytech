import 'server-only'

import { and, asc, eq, gte, lte, max, ne, sql } from 'drizzle-orm'

import { type ProjectInput, type ProjectMove, type ProjectStatus } from '@/features/projects/schema'
import { err, ok, type Result } from '@/lib/result'

import { db, type Tx } from '../db'
import { isCheckViolation } from '../db/errors'
import { projects } from '../db/schema'

/** Data access for projects, scoped by owner. */

const columns = {
  id: projects.id,
  name: projects.name,
  description: projects.description,
  status: projects.status,
  startDate: projects.startDate,
  endDate: projects.endDate,
  position: projects.position,
}

export type ProjectItem = {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  position: number
}

/** Every project, grouped for the board: by status, then position. */
export async function listProjects(userId: string): Promise<ProjectItem[]> {
  return db
    .select(columns)
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.status), asc(projects.position), asc(projects.createdAt))
}

/** Ongoing projects whose window overlaps [from, to]. */
export async function listOngoingInRange(
  userId: string,
  from: string,
  to: string,
): Promise<ProjectItem[]> {
  return db
    .select(columns)
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.status, 'ongoing'),
        lte(projects.startDate, to),
        gte(projects.endDate, from),
      ),
    )
    .orderBy(asc(projects.startDate), asc(projects.name))
}

export async function getProject(userId: string, id: string): Promise<ProjectItem | null> {
  const [row] = await db
    .select(columns)
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, id)))
    .limit(1)
  return row ?? null
}

/**
 * Serializes board writes per user for the rest of the transaction. Row locks
 * can't cover cards that are about to join a column, so concurrent moves into
 * the same column would renumber blind to each other without this.
 */
async function lockBoard(tx: Tx, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`projects:${userId}`}, 0))`)
}

async function nextPosition(tx: Tx, userId: string, status: ProjectStatus): Promise<number> {
  const [row] = await tx
    .select({ top: max(projects.position) })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.status, status)))
  return row?.top === null || row?.top === undefined ? 0 : row.top + 1
}

export async function createProject(userId: string, input: ProjectInput): Promise<ProjectItem> {
  return db.transaction(async (tx) => {
    await lockBoard(tx, userId)
    const position = await nextPosition(tx, userId, input.status)
    const [row] = await tx
      .insert(projects)
      .values({ ...input, userId, position })
      .returning(columns)
    return row!
  })
}

/** Updates details; a status change moves the card to the end of its new column. */
export async function updateProject(
  userId: string,
  id: string,
  input: ProjectInput,
): Promise<ProjectItem | null> {
  return db.transaction(async (tx) => {
    await lockBoard(tx, userId)
    const [current] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.id, id)))
      .for('update')
    if (!current) return null
    const position =
      current.status === input.status ? undefined : await nextPosition(tx, userId, input.status)
    const [row] = await tx
      .update(projects)
      .set({ ...input, ...(position === undefined ? {} : { position }) })
      .where(eq(projects.id, id))
      .returning(columns)
    return row ?? null
  })
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, id)))
    .returning({ id: projects.id })
  return deleted.length > 0
}

/**
 * Moves a card to `index` within `status` and renumbers that column, under
 * the per-user board lock so concurrent moves can't interleave. Entering "ongoing" requires dates (either
 * already on the project or provided with the move).
 */
export async function moveProject(
  userId: string,
  move: ProjectMove,
): Promise<Result<ProjectItem, 'not_found' | 'dates_required' | 'invalid_dates'>> {
  try {
    return await moveProjectInTx(userId, move)
  } catch (error) {
    // The database's own date guard (e.g. a new start after the stored end).
    if (isCheckViolation(error, 'projects_end_after_start')) return err('invalid_dates')
    throw error
  }
}

function moveProjectInTx(
  userId: string,
  move: ProjectMove,
): Promise<Result<ProjectItem, 'not_found' | 'dates_required'>> {
  return db.transaction(async (tx) => {
    await lockBoard(tx, userId)
    const [current] = await tx
      .select(columns)
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.id, move.id)))
      .for('update')
    if (!current) return err('not_found')

    const startDate = move.startDate !== undefined ? move.startDate || null : current.startDate
    const endDate = move.endDate !== undefined ? move.endDate || null : current.endDate
    if (move.status === 'ongoing' && (!startDate || !endDate)) return err('dates_required')

    const siblings = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          eq(projects.status, move.status),
          ne(projects.id, move.id),
        ),
      )
      .orderBy(asc(projects.position), asc(projects.createdAt))

    const order = siblings.map((row) => row.id)
    order.splice(Math.min(move.index, order.length), 0, move.id)
    for (const [position, id] of order.entries()) {
      if (id === move.id) continue
      await tx.update(projects).set({ position }).where(eq(projects.id, id))
    }
    const [moved] = await tx
      .update(projects)
      .set({ status: move.status, position: order.indexOf(move.id), startDate, endDate })
      .where(eq(projects.id, move.id))
      .returning(columns)
    return ok(moved!)
  })
}
