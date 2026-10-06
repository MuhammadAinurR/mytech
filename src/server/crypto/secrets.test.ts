import { describe, expect, it } from 'vitest'

import { parseKeyring } from './keyring'
import { credentialAad, openSecret, sealSecret, SecretDecryptionError } from './secrets'

const key = (fill: number) => Buffer.alloc(32, fill).toString('base64')
const keyringV1 = parseKeyring(`1:${key(1)}`, 1)
const keyringV2 = parseKeyring(`1:${key(1)},2:${key(2)}`, 2)
const aad = credentialAad('user-a', 'cred-1')

describe('sealSecret / openSecret', () => {
  it('round-trips unicode secrets', () => {
    for (const secret of ['hunter2', 'pässwörd 🔐 with spaces', 'x'.repeat(4096), '']) {
      expect(openSecret(sealSecret(secret, aad, keyringV1), aad, keyringV1)).toBe(secret)
    }
  })

  it('uses a fresh IV for every seal, so equal secrets never share ciphertext', () => {
    const a = sealSecret('same', aad, keyringV1)
    const b = sealSecret('same', aad, keyringV1)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(Buffer.from(a.iv, 'base64')).toHaveLength(12)
    expect(Buffer.from(a.tag, 'base64')).toHaveLength(16)
  })

  it('never stores the plaintext', () => {
    const sealed = sealSecret('correct horse battery staple', aad, keyringV1)
    expect(JSON.stringify(sealed)).not.toContain('correct horse')
    expect(Buffer.from(sealed.ciphertext, 'base64').toString('utf8')).not.toContain('correct horse')
  })

  it('detects tampering with the ciphertext, tag, or IV', () => {
    const sealed = sealSecret('hunter2', aad, keyringV1)
    const flip = (b64: string) => {
      const bytes = Buffer.from(b64, 'base64')
      bytes[0] = bytes[0]! ^ 0xff
      return bytes.toString('base64')
    }
    for (const field of ['ciphertext', 'tag', 'iv'] as const) {
      expect(() => openSecret({ ...sealed, [field]: flip(sealed[field]) }, aad, keyringV1)).toThrow(
        SecretDecryptionError,
      )
    }
  })

  it('refuses to open a ciphertext moved to another user or record', () => {
    const sealed = sealSecret('hunter2', aad, keyringV1)
    expect(() => openSecret(sealed, credentialAad('user-b', 'cred-1'), keyringV1)).toThrow(
      SecretDecryptionError,
    )
    expect(() => openSecret(sealed, credentialAad('user-a', 'cred-2'), keyringV1)).toThrow(
      SecretDecryptionError,
    )
  })

  it('reads older key versions and seals with the current one', () => {
    const old = sealSecret('hunter2', aad, keyringV1)
    expect(old.keyVersion).toBe(1)
    expect(openSecret(old, aad, keyringV2)).toBe('hunter2')
    expect(sealSecret('hunter2', aad, keyringV2).keyVersion).toBe(2)
  })

  it('fails cleanly for an unknown key version without leaking details', () => {
    const sealed = sealSecret('hunter2', aad, keyringV2)
    expect(() => openSecret(sealed, aad, keyringV1)).toThrow('The secret could not be decrypted.')
  })
})

describe('parseKeyring', () => {
  it('rejects malformed rings', () => {
    expect(() => parseKeyring('', 1)).toThrow('at least one key is required')
    expect(() => parseKeyring(`1:${key(1)},1:${key(2)}`, 1)).toThrow('listed twice')
    expect(() => parseKeyring(`1:${Buffer.alloc(31).toString('base64')}`, 1)).toThrow('32 bytes')
    expect(() => parseKeyring(`1:${key(1)}`, 3)).toThrow('no key with version 3')
    expect(() => parseKeyring('one:abc', 1)).toThrow('each entry')
  })
})
