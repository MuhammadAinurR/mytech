# 0010. Web Push for invoice due-date reminders

- Status: accepted
- Date: 2026-10-08

## Context

Unpaid invoices are easy to forget. The dashboard shows what's due, but only
when you open it. Workbench is installable (a PWA), so it can notify like an
app: on iPhone and iPad from iOS 16.4 once added to the home screen, and in
desktop and Android browsers directly.

## Decision

- **Standard Web Push with VAPID.** `web-push` signs and encrypts messages; no
  third-party notification service. The key pair lives in `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`, validated in `src/env.ts` as all or
  none. Without them push is simply off. The subject is a neutral address
  because push services see it.
- **One subscription per device.** `push_subscriptions` is keyed by the push
  endpoint, which identifies one browser profile, so a device belongs to one
  user at a time: turning notifications on under another account moves it.
  Signing out removes the device first. Devices a push service reports gone
  (404/410) are deleted on the next send.
- **When.** For sent, unpaid invoices: three days before the due date, on the
  day, and the day after, from 09:00 in the user's timezone. The worker runs
  every 15 minutes, so every UTC offset (including :30 and :45) gets its 09:00,
  and a late run still sends the same day. Drafts and paid invoices never
  remind.
- **Exactly once.** Each reminder is claimed in `invoice_reminder_pushes`
  (unique per invoice, kind, and due date) before it is sent. Retries and
  concurrent workers can't send it twice. If no device accepted it, the claim
  is released and the next run tries again. Keying by due date gives a re-sent
  invoice with a new due date its own reminders.
- **Calm.** Several invoices of one kind arrive as one summary ("3 invoices
  are due today") and open the unpaid list; a single one names the invoice,
  client, and amount and opens it. Messages expire after a day.
- **The service worker stays small.** It shows notifications, opens our own
  pages only, and otherwise caches just hashed build assets and an offline
  page. Private pages and data always come from the network.

## Consequences

- iOS needs the app on the home screen before it can ask for permission;
  Settings explains that. Production needs HTTPS.
- Changing the VAPID key pair invalidates every subscription; devices have to
  turn notifications on again.
- Browsers that rotate a subscription without telling us (rare) show
  notifications as off on the next visit, and the user turns them back on.
