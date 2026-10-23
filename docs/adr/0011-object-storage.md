# 0011. Private object storage for uploaded files

- Status: accepted
- Date: 2026-10-24

## Context

Invoices need third-party PDFs attached to them: a hosting or cloud provider's
own invoice, appended after ours in the downloaded PDF. These files run to a few
megabytes each, several per invoice. Company logos are stored in Postgres as
`bytea`, which is fine for 512 KB images, but storing multi-megabyte PDFs the
same way would bloat the database, every `pg_dump`, and every backup restore,
and make row reads slower.

The production server already runs MinIO, which speaks the S3 API, and backs up
chosen buckets nightly.

## Decision

- **Files go to object storage through the S3 API** (`src/server/storage.ts`),
  with `@aws-sdk/client-s3`. The `minio` JavaScript client was the other
  candidate. It pulled in moderate advisories (`query-string`/`decode-uri-component`,
  `stream-json`), and the AWS SDK audits clean. Any S3-compatible service works:
  path-style addressing, and checksums only where the API requires them.
- **The bucket is private.** Nothing is served by public URL. Route handlers
  check the session and the owner, then read the object with the app's own
  credentials, the same way the invoice PDF route works (ADR 0006).
- **Keys sit under the owner:** `<userId>/<invoiceId>/<attachmentId>.pdf`. The
  database row holds the key, and a CHECK on its format keeps a row from
  pointing outside its owner's folder.
- **Configuration is required:** `S3_ENDPOINT`, `S3_REGION` (default
  `us-east-1`), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`.
  Production uses its own bucket and an access key limited to it.
- **Dev and test use a real MinIO**, as they use a real Postgres and Redis:
  `brew services run minio` locally, and the same Homebrew build in CI (MinIO
  no longer publishes container images). Only buckets named `workbench-*` are
  touched there. Tests refuse to run against anything but `workbench-test`.
  The app creates a missing bucket on first use.

## Consequences

- One more service to run locally and one more set of credentials per deploy.
- Deleting a database row doesn't delete its object, so code that deletes rows
  with files also deletes the objects, best effort, after the transaction
  commits. A file left behind by a crash costs storage, not correctness.
- Backups must include the bucket. A database restore without it would list
  attachments whose bytes are gone.
