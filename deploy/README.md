# Deployment: startup.rofiq.id

Workbench runs on the `ktech` VPS (`ssh ktech`), from a git checkout at
`~/apps/rofiq/mytech`.

| Piece    | Where                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| Web app  | PM2 `mytech-web`, `next start` on `127.0.0.1:3110`                                                               |
| Worker   | PM2 `mytech-worker` (recurring entries, reminders, push)                                                         |
| Node     | The version in `.nvmrc`, installed with nvm. Since 2026-10-23 every app and PM2 7 run on 24.22.1, the default    |
| TLS      | nginx site `mytech` ([nginx/mytech.conf](nginx/mytech.conf)) with a Let's Encrypt certificate; certbot renews it |
| Postgres | Shared `postgres` container, database `workbench_prod`, owned by role `workbench`; no other role may connect     |
| Redis    | Shared `redis` container, DB 1 (only this app uses it), keys prefixed `wb:`                                      |
| Config   | `~/apps/rofiq/mytech/.env.local` (mode 600, not in git). Variables are documented in `.env.example`              |
| Backups  | `workbench_prod` is in the server's nightly Postgres backup (`~/backup`). `.env.local` is not backed up          |

## Deploying

Merge to `main` and push (see CLAUDE.md), then from your machine:

```sh
./deploy/deploy.sh
```

It pulls `main` on the server, runs `npm ci`, applies migrations, builds,
reloads both PM2 processes, and checks `/api/health` locally and over HTTPS.
The build replaces `.next` in place, so if a build fails the site can error
until the next successful deploy. `main` only takes changes that passed
`npm run verify`, so this should be rare.

## Operating

```sh
ssh ktech                           # interactive shells load nvm, so node and pm2 are there
pm2 logs mytech-web --lines 100     # or mytech-worker
pm2 restart mytech-web mytech-worker
```

To roll back, check out the previous good commit on the server, then
`npm ci && npm run build && pm2 reload deploy/ecosystem.config.cjs`. Migrations
are not reversed automatically.

## Keep a copy of the encryption key

`ENCRYPTION_KEYS` in `.env.local` encrypts saved credentials. Without it they
can't be decrypted, even from a database backup. Store a copy somewhere safe
outside the server, such as a password manager.

## Rebuilding the server from scratch

1. Clone the repo to `~/apps/rofiq/mytech`.
2. Create the role and database (as the container's superuser), then
   `REVOKE ALL ON DATABASE workbench_prod FROM PUBLIC` and grant `CONNECT,
TEMPORARY` back to `workbench`.
3. Write `.env.local` from `.env.example`: the `DATABASE_URL` for that role,
   `REDIS_URL=redis://127.0.0.1:6379/1`, `APP_URL=https://startup.rofiq.id`,
   a new `ENCRYPTION_KEYS` (or the saved one, to read existing credentials), and
   VAPID keys (`npx web-push generate-vapid-keys`) with
   `VAPID_SUBJECT=https://startup.rofiq.id`.
4. Install the nginx site, run `certbot --nginx -d startup.rofiq.id --redirect`,
   then `pm2 start deploy/ecosystem.config.cjs && pm2 save`, and finally run
   `./deploy/deploy.sh`.
