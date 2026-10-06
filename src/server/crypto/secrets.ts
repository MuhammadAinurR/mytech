import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { env } from '@/env'

import { parseKeyring, type Keyring } from './keyring'

/**
 * AES-256-GCM sealing for credential secrets.
 *
 * - A fresh random 96-bit IV for every write (never reused with a key).
 * - The 128-bit auth tag detects any tampering with ciphertext, IV, or AAD.
 * - Additional authenticated data binds a ciphertext to its owner and row,
 *   so a sealed value copied onto another user's or record's row won't open.
 * - Each sealed value records its key version, so keys can be rotated.
 */

export type Sealed = { ciphertext: string; iv: string; tag: string; keyVersion: number }

export class SecretDecryptionError extends Error {
  constructor() {
    super('The secret could not be decrypted.')
    this.name = 'SecretDecryptionError'
  }
}

let cached: Keyring | undefined
export function getKeyring(): Keyring {
  cached ??= parseKeyring(env.ENCRYPTION_KEYS, env.ENCRYPTION_KEY_VERSION)
  return cached
}

/** AAD for a credential secret: ties the ciphertext to who owns it and where it lives. */
export function credentialAad(userId: string, credentialId: string): string {
  return `workbench:credential:${userId}:${credentialId}`
}

export function sealSecret(
  plaintext: string,
  aad: string,
  keyring: Keyring = getKeyring(),
): Sealed {
  const key = keyring.keys.get(keyring.current)!
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 })
  cipher.setAAD(Buffer.from(aad, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    keyVersion: keyring.current,
  }
}

export function openSecret(sealed: Sealed, aad: string, keyring: Keyring = getKeyring()): string {
  const key = keyring.keys.get(sealed.keyVersion)
  if (!key) throw new SecretDecryptionError()
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.iv, 'base64'), {
      authTagLength: 16,
    })
    decipher.setAAD(Buffer.from(aad, 'utf8'))
    decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(sealed.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    // Never surface crypto internals (or anything derived from the key).
    throw new SecretDecryptionError()
  }
}
