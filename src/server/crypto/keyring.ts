/**
 * Encryption keyring from env: ENCRYPTION_KEYS="1:<base64>,2:<base64>" (each
 * key exactly 32 bytes) and ENCRYPTION_KEY_VERSION naming the key for new
 * writes. Older versions stay readable until rotated out.
 *
 * Errors never include key material.
 */
export type Keyring = { current: number; keys: Map<number, Buffer> }

export function parseKeyring(raw: string, current: number): Keyring {
  const keys = new Map<number, Buffer>()
  for (const entry of raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)) {
    const match = /^(\d+):([A-Za-z0-9+/]+={0,2})$/.exec(entry)
    if (!match) throw new Error('each entry must look like <version>:<base64 key>')
    const version = Number(match[1])
    if (version < 1) throw new Error('key versions start at 1')
    if (keys.has(version)) throw new Error(`key version ${version} is listed twice`)
    const key = Buffer.from(match[2]!, 'base64')
    if (key.length !== 32) throw new Error(`key version ${version} must decode to 32 bytes`)
    keys.set(version, key)
  }
  if (keys.size === 0) throw new Error('at least one key is required')
  if (!keys.has(current)) throw new Error(`no key with version ${current}`)
  return { current, keys }
}
