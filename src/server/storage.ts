import 'server-only'

import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'

import { env } from '@/env'

/**
 * Private object storage: MinIO in production, any S3-compatible service
 * elsewhere (ADR 0011). Nothing in the bucket is public. The app reads objects
 * with its own credentials and serves them to their owner, so callers build
 * every key under the owner's id.
 */

export class ObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`No stored object at ${key}`)
    this.name = 'ObjectNotFoundError'
  }
}

const globalForStorage = globalThis as unknown as {
  workbenchS3?: S3Client
  workbenchBucketReady?: Promise<void>
}

const s3 =
  globalForStorage.workbenchS3 ??
  new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    // MinIO serves buckets as paths (host/bucket/key), not subdomains.
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    // AWS's advice for S3-compatible services: only send and check the newer
    // checksums where the API requires them.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })

if (env.NODE_ENV !== 'production') globalForStorage.workbenchS3 = s3

/**
 * Creates the bucket on first use if it's missing, which is what dev and test
 * need. Production's bucket is created at deploy (deploy/README.md), so there
 * this is a single HEAD request.
 */
function ensureBucket(): Promise<void> {
  globalForStorage.workbenchBucketReady ??= (async () => {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))
    } catch (error) {
      if (!(error instanceof S3ServiceException) || error.$metadata.httpStatusCode !== 404) {
        throw error
      }
      await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }))
    }
  })().catch((error: unknown) => {
    globalForStorage.workbenchBucketReady = undefined
    throw error
  })
  return globalForStorage.workbenchBucketReady
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  await ensureBucket()
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
    }),
  )
}

/** The object's bytes. Throws ObjectNotFoundError when nothing is stored at the key. */
export async function getObject(key: string): Promise<Uint8Array> {
  await ensureBucket()
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
    if (!response.Body) throw new ObjectNotFoundError(key)
    return await response.Body.transformToByteArray()
  } catch (error) {
    if (error instanceof NoSuchKey) throw new ObjectNotFoundError(key)
    throw error
  }
}

/** Deletes the objects at these keys. Keys with nothing stored are skipped. */
export async function deleteObjects(keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return
  await ensureBucket()
  for (let start = 0; start < keys.length; start += 1000) {
    const batch = keys.slice(start, start + 1000)
    const response = await s3.send(
      new DeleteObjectsCommand({
        Bucket: env.S3_BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    )
    const failed = response.Errors ?? []
    if (failed.length > 0) {
      throw new Error(`Could not delete ${failed.length} stored object(s): ${failed[0]?.Code}`)
    }
  }
}

export function closeStorage(): void {
  s3.destroy()
  globalForStorage.workbenchS3 = undefined
  globalForStorage.workbenchBucketReady = undefined
}
