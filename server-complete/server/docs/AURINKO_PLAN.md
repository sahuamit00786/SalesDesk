# Aurinko Integration — Gmail + Google Calendar ("Continue with Google")

Aurinko (app.aurinko.io) now powers **Continue with Google** across the CRM:
Gmail read + send in the Email page and lead composer, and Google Calendar
read/write. The design is **event-first / fetch-on-demand** to keep Aurinko's
GB-metered billing minimal.

---

## 1. How it works

### Email (event-first, metadata-first, lazy bodies)

```
Connect (OAuth via Aurinko)
   └─ aurinko_accounts row: accountId + access token, per user
   └─ POST /v1/subscriptions { resource: "/email/messages" }   ← new-mail events only
      (NO historical backfill — sync starts at connected_from)

New email arrives → Aurinko webhook → POST /api/v1/webhooks/aurinko
   └─ verify HMAC signature (X-Aurinko-Signature)
   └─ fetch ONE page of GET /v1/email/messages  ← LIST endpoint, NO bodies
   └─ CRM FILTER: store ONLY if the counterparty is a CRM lead
      · inbox  → the SENDER's email must match a lead in the company
      · sent   → at least one RECIPIENT must match a lead
      · everything else is dropped — no row, no body fetch, ever
   └─ matched messages upsert METADATA into aurinko_email_messages with
      lead_id + workspace_id copied from the matched lead
   └─ any notified id missed by the page → single-message reconcile fetch

User opens a message in the Email page
   └─ GET /v1/email/messages/{id}  ← full body, ONCE
   └─ stored in aurinko_email_bodies (+ attachment metadata, no binaries)
   └─ reopening later reads purely from our DB — Aurinko is never re-called

User clicks an attachment
   └─ GET /email/messages/{id}/attachments/{attId} proxied on demand
      (binaries are never stored)

User sends from the lead composer
   └─ POST /v1/email/messages (Aurinko send, threads via threadId)
   └─ LeadEmail row + tracking pixel/click rewrite (same as before)
   └─ 'sent' metadata row written immediately → shows in the Sent tab
```

### Calendar (direct pulls + optional subscription)

- `GET /api/v1/aurinko/calendars` and `/aurinko/calendars/:id/events` pull
  **live from Aurinko** (events are tiny — no metadata-first restriction).
- Every live read upserts `aurinko_calendar_events`; if Aurinko is briefly
  unreachable the cache serves as fallback.
- **Enable change sync** (Integrations page) creates a
  `/calendars/{id}/events` subscription so edits made in Google Calendar are
  pushed into the cache automatically.

### Who sees which emails (visibility)

Every stored message is linked to its CRM lead, and the mailbox shows each
user **only the emails of leads they can access** — the exact same rules the
Leads module uses:

- **Workspace access**: the lead's workspace must be in the user's allowed
  workspaces (`allowedWorkspaceIdsForUser`); company admins span all
  workspaces.
- **Role scoping** (`leadAccessWhere`): workspace admins and managers see all
  leads in their workspaces; sales/custom roles see only leads they **own or
  are assigned to** — so a rep only sees the email threads of their own leads.

This applies uniformly to the unread badge, the inbox/sent lists, thread
detail, mark-as-read, and attachment downloads (each checks the message's
lead before serving). Thread summaries now include the matched
`lead: { id, name, email }`, which the Email page uses for lead chips and
save-to-lead defaults. If a lead is deleted, its messages' `lead_id` is set
NULL and they drop out of everyone's mailbox (rows are kept for audit).

### Compatibility layer (why the UI didn't change)

When an active Aurinko account exists, the **existing** endpoints transparently
switch source:

| Endpoint | Behaviour with Aurinko connected |
|---|---|
| `GET /email/mailbox-badge` | unread count from `aurinko_email_messages` |
| `GET /email/mailbox-threads` | thread list from metadata (same response shape) |
| `GET /email/mailbox-threads/:id` | messages with lazily-fetched bodies, `meta.source='aurinko'` |
| `POST /email/mailbox-threads/:id/read` | Aurinko `PUT {unread:false}` + local flip |
| `GET /email/mailbox-attachments/...` | Aurinko attachment proxy |
| `GET /leads/email/google/status` | reports connected via Aurinko (`provider:'aurinko'`) |
| `GET /leads/email/google/connect-url` | returns the **Aurinko** OAuth URL when configured — every existing "Continue with Google" button picks up the new flow with zero client changes |
| `POST /leads/:id/emails` (send) | sends through Aurinko |

The Email page keeps its whole UI; the only client changes are a thread parser
for the pre-normalized Aurinko payload and the upgraded Integrations page.

---

## 2. Aurinko dashboard setup (one-time)

1. In app.aurinko.io (team 3432), open your application → **Settings**.
2. **White-label the consent screen**: upload your own Google OAuth
   Client ID/Secret (from Google Cloud Console). In the Google console, add
   `https://api.aurinko.io/v1/auth/callback` as an authorized redirect URI and
   enable the Gmail + Calendar APIs. Users then see *your* app name on the
   Google consent screen.
3. Copy the app **Client ID** and **Client Secret**.
4. Copy the **Signing Secret** (webhook signature verification).
5. Add your callback origin to the allowed return URLs if the dashboard asks:
   `https://api-leadfin.upgrowventures.com/api/v1/aurinko/callback`.

## 3. Server environment

```bash
# .env additions (see .env.aurinko.example)
AURINKO_CLIENT_ID=...
AURINKO_CLIENT_SECRET=...
AURINKO_SIGNING_SECRET=...
PUBLIC_SERVER_URL=https://api-leadfin.upgrowventures.com   # must be publicly reachable
# optional: AURINKO_API_BASE=https://api.aurinko.io
# optional: AURINKO_SUBSCRIPTION_HEAL_INTERVAL_MS=86400000
```

Notes:
- The integration is **dormant** until `AURINKO_CLIENT_ID/SECRET` are set —
  everything falls back to the legacy direct-Google flow.
- `PUBLIC_SERVER_URL` is used for both the OAuth callback and the webhook URL
  (`/api/v1/webhooks/aurinko`). Aurinko validates the webhook synchronously
  when a subscription is created, so it must be reachable from the internet.

## 4. Database

`new_dump.sql` (the patched file in this delivery) **already contains** the
four tables and the `20260718000001-aurinko-integration.cjs` row in
`SequelizeMeta` — restoring it requires no migration run. Fresh/empty
environments get the identical schema from the migration on boot (verified
column-for-column identical against MySQL 8).

| Table | Purpose |
|---|---|
| `aurinko_accounts` | one row per (company, user): Aurinko accountId + token, subscription ids, status |
| `aurinko_email_messages` | metadata per post-connection email from/to CRM leads only, linked via lead_id + workspace_id |
| `aurinko_email_bodies` | full body + attachment metadata, lazily fetched on first open |
| `aurinko_calendar_events` | calendar cache, refreshed by live reads + webhook |

## 5. New API endpoints

| Method + path | Auth | Purpose |
|---|---|---|
| `GET /aurinko/connect-url` | ✔ | Aurinko OAuth URL (scopes: Mail.ReadWrite, Mail.Send, Calendar.ReadWrite) |
| `GET /aurinko/callback` | public | OAuth redirect target; exchanges code, stores account, subscribes |
| `GET /aurinko/status` | ✔ | connection + subscription status |
| `POST /aurinko/disconnect` | ✔ | delete subscriptions, mark disconnected (synced data kept) |
| `GET /aurinko/calendars` | ✔ | live calendar list |
| `GET /aurinko/calendars/:id/events?from&to` | ✔ | live events (+cache upsert, cache fallback) |
| `POST /aurinko/calendar/subscribe` | ✔ | enable change sync for a calendar |
| `POST /webhooks/aurinko` | HMAC | validation handshake + email/calendar/lifecycle events |

## 6. Billing rationale

Aurinko meters synced data volume. This design keeps it minimal:
- No historical import — only mail after connection.
- CRM filter — mail that does not involve a CRM lead is never stored and its
  body is never fetched.
- Webhook path stores **metadata only** (one list-page call per notification).
- Bodies fetched **once**, only for messages a human actually opens.
- Attachment binaries never stored — proxied on explicit click.
- Calendar events are small; live pulls + optional subscription.

## 7. Operational notes

- **Signature verification**: raw-body HMAC (`v0:{timestamp}:{body}`), route
  mounted before `express.json`. Without `AURINKO_SIGNING_SECRET` the webhook
  accepts but logs a loud warning.
- **Never 422** from the webhook (Aurinko deletes the subscription on 422);
  we always ack 200 and process asynchronously.
- **Self-heal**: Aurinko auto-renews subscriptions; a daily pass re-creates
  any that were dropped (e.g. server unreachable during deploy), 20s after
  boot and every `AURINKO_SUBSCRIPTION_HEAL_INTERVAL_MS`.
- **Auth expiry**: any 401/403 from Aurinko flips the account to
  `reauth_required`; the UI shows a Reconnect banner. Reconnecting preserves
  `connected_from` (history never re-opens).
- **Account scoping**: per-user accounts with company fallback — a user
  without their own connection sees the company's most recent active one
  (mirrors the existing shared-mailbox behaviour).

## 8. Known limitations / follow-ups

- Meet-link creation for meetings still uses the legacy
  `googleCalendarService` (company token) — moving it to Aurinko event
  creation is a straightforward follow-up.
- `syncLeadEmailReplies` (per-lead Gmail reply scan) still uses the legacy
  path when a company token exists; with Aurinko connected, replies arrive
  via the webhook instead.
- Thread search covers subject/snippet/sender (metadata) — full-body search
  would require indexing bodies as they're fetched.
