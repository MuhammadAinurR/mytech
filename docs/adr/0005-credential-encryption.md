# 0005. Credential secrets: AES-256-GCM with versioned keys and audited reveals

- Status: accepted
- Date: 2026-10-07

## Context

The credential store holds server passwords, registrar logins, and API
tokens. A database dump, a backup, or a log line must never expose them. Keys
must be rotatable without downtime, and every time a secret is shown must be
recorded.

## Decision

- **Cipher.** AES-256-GCM via Node `crypto`. Every write uses a fresh random
  96-bit IV, and the 128-bit auth tag is verified on every read.
- **AAD binding.** The additional authenticated data is
  `workbench:credential:<userId>:<credentialId>`. A ciphertext copied into
  another user's row, or another record, fails authentication. The record id
  is generated before the insert so it can be part of the AAD.
- **Keys.** `ENCRYPTION_KEYS="1:<base64>,2:<base64>"` with
  `ENCRYPTION_KEY_VERSION` naming the key for new writes. Each row stores its
  `key_version`. The env schema validates the keyring at startup (32-byte
  keys, current version present), and error messages never include key
  material.
- **Rotation.** Add a key, point `ENCRYPTION_KEY_VERSION` at it, and run
  `npm run keys:rotate`. It re-seals rows in batches, guarding each update on
  the old version, then reports the count. Remove the old key once it
  re-seals nothing.
- **Exposure surface.** List and detail queries never select secret columns.
  The single decrypt path, `revealSecret`, decrypts one secret for its owner
  and writes an `audit_events` row in the same transaction. The server action
  around it is rate limited (30 per 5 minutes per user). Reveal and copy are
  audited separately.
- **Logs.** The logger redacts `secret`, `ciphertext`, and similar keys. The
  reveal path logs only ids and purpose. Decryption failures surface as a
  generic message.
- **Notes stay plaintext,** so they can be searched and edited freely. The UI
  says so and points secrets to the secret field.

## Consequences

- Losing a key makes every secret sealed with it unrecoverable. Keys belong
  in a secret manager with backups.
- A compromised application server can still decrypt. Encryption at rest
  protects dumps, backups, and replicas, not a live process.
