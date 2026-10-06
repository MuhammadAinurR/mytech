import 'server-only'

import { hash, verify, type Algorithm } from '@node-rs/argon2'

// OWASP-recommended argon2id parameters: 19 MiB memory, 2 iterations, 1 lane.
const OPTIONS = {
  algorithm: 2 as Algorithm, // Argon2id (the binding's const enum can't be imported here)
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

/**
 * A real argon2id hash of a random value. Verifying against it when an email
 * is unknown makes failed logins take the same time either way, so response
 * timing does not reveal which emails have accounts.
 */
let dummyHash: Promise<string> | undefined
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(crypto.randomUUID())
  return dummyHash
}
