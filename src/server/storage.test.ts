import { afterAll, describe, expect, it } from 'vitest'

import { closeStorage, deleteObjects, getObject, ObjectNotFoundError, putObject } from './storage'

afterAll(closeStorage)

const key = (name: string) => `test/${crypto.randomUUID()}/${name}`

describe('object storage', () => {
  it('stores and returns the exact bytes', async () => {
    const at = key('sample.pdf')
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 255, 128])
    await putObject(at, bytes, 'application/pdf')
    expect(Array.from(await getObject(at))).toEqual(Array.from(bytes))
    await deleteObjects([at])
  })

  it('reports a missing object as ObjectNotFoundError', async () => {
    await expect(getObject(key('missing.pdf'))).rejects.toBeInstanceOf(ObjectNotFoundError)
  })

  it('deletes objects and skips keys with nothing stored', async () => {
    const first = key('a.pdf')
    const second = key('b.pdf')
    await putObject(first, new Uint8Array([1]), 'application/pdf')
    await putObject(second, new Uint8Array([2]), 'application/pdf')

    await deleteObjects([first, second, key('never-stored.pdf')])
    await expect(getObject(first)).rejects.toBeInstanceOf(ObjectNotFoundError)
    await expect(getObject(second)).rejects.toBeInstanceOf(ObjectNotFoundError)
    await expect(deleteObjects([])).resolves.toBeUndefined()
  })
})
