import 'server-only'

import { eq } from 'drizzle-orm'

import { err, ok, type Result } from '@/lib/result'

import { db } from '../db'
import { isUniqueViolation } from '../db/errors'
import { users } from '../db/schema'

/** The user shape that is safe to hand to pages and client components. */
export type CurrentUser = {
  id: string
  email: string
  name: string
  timezone: string
  defaultCurrency: string
}

const publicColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  timezone: users.timezone,
  defaultCurrency: users.defaultCurrency,
}

export async function getUserById(id: string): Promise<CurrentUser | null> {
  const [user] = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1)
  return user ?? null
}

/** Auth only: returns the password hash alongside the id. */
export async function findUserForLogin(
  email: string,
): Promise<{ user: CurrentUser; passwordHash: string } | null> {
  const [row] = await db
    .select({ ...publicColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (!row) return null
  const { passwordHash, ...user } = row
  return { user, passwordHash }
}

export async function insertUser(input: {
  email: string
  name: string
  passwordHash: string
  timezone: string
}): Promise<Result<CurrentUser, 'email_taken'>> {
  try {
    const [user] = await db.insert(users).values(input).returning(publicColumns)
    return ok(user!)
  } catch (error) {
    if (isUniqueViolation(error, 'users_email_key')) return err('email_taken')
    throw error
  }
}

export async function updateUserProfile(
  userId: string,
  input: Partial<Pick<CurrentUser, 'name' | 'timezone' | 'defaultCurrency'>>,
): Promise<CurrentUser | null> {
  const [user] = await db
    .update(users)
    .set(input)
    .where(eq(users.id, userId))
    .returning(publicColumns)
  return user ?? null
}

/** Auth only: the stored hash for re-verifying the current password. */
export async function getPasswordHash(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row?.passwordHash ?? null
}

export async function setPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
}
