# Connexify — LeadFlow CRM

Enterprise CRM with sales automation, team collaboration, and meeting AI.

## Architecture

**Monorepo** — npm workspaces. Two packages: `client/` and `server/`.

```
Connexify/
├── client/          React 18 + Vite + Redux Toolkit
├── server/          Node.js + Express 5 + Sequelize (MySQL)
├── package.json     Root workspace scripts
└── .env.example     All env vars with defaults
```

## Tech Stack

**Frontend**
- React 18, Vite 8, React Router DOM 7
- Redux Toolkit + RTK Query (state + API)
- Tailwind CSS 3, Radix UI, Framer Motion
- Recharts, React Big Calendar, XYFlow (workflow DAG), dnd-kit
- TanStack Table, Zod, Axios
- Dev server: port 5173, proxies API to `http://127.0.0.1:4000`

**Backend**
- Express 5, Node.js 20+, port 4000
- Sequelize 6 ORM on MySQL 8 (UUID PKs, paranoid soft deletes)
- BullMQ + Redis for async job queues
- JWT auth (access: 15m, refresh: 7d)
- Nodemailer for email, Multer for file upload
- Google APIs (Calendar, Meet, Gmail OAuth + Pub/Sub)
- OpenAI SDK (content generation), Groq (transcription + summaries)
- node-cron for scheduled jobs

## Dev Commands

```bash
# Root
npm run dev:client        # Vite dev server
npm run dev:server        # Node --watch
npm run build             # Production client build
npm run db:migrate        # Run Sequelize migrations

# Server-only
npm run db:migrate:undo   # Rollback last migration
npm run db:clean-except-menus
npm run db:purge-draft-sales
```

Server auto-runs migrations on startup (`server/index.js`).

## Environment Variables

**Required (copy from `.env.example`):**
```env
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=leadflow
DB_USER=leadflow
DB_PASSWORD=leadflow

JWT_ACCESS_SECRET=<min-16-chars>
JWT_REFRESH_SECRET=<min-16-chars>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
```

**Optional (feature flags):**
```env
REDIS_URL=                         # Rate limiting + dashboard cache
OPENAI_API_KEY=                    # AI content generation
GROQ_API_KEY=                      # Meeting transcription + summaries
GROQ_MODEL=                        # LLM model for summaries
GROQ_TRANSCRIBE_MODEL=             # Whisper-compatible model
GOOGLE_CLIENT_ID=                  # Google Calendar/Meet OAuth
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=
GMAIL_PUBSUB_TOPIC=                # Gmail real-time inbox sync
GMAIL_PUBSUB_PUSH_AUDIENCE=
GMAIL_WATCH_RENEW_INTERVAL_MS=
MEETING_CRON_ENABLED=true          # Enable/disable all cron jobs
```

## Project Structure

### Server (`server/src/`)

```
models/           Sequelize models (~60+)
controllers/      Route handlers (30+)
routes/v1/        All API routes in index.js (~1030 lines)
services/         Business logic
  gmail/          Gmail Pub/Sub + message parsing
  google/         Calendar/Meet helpers
  openAiService.js
  workflowRunner.js
queues/           BullMQ job definitions
jobs/             Cron jobs (reminderJob, campaignExpiryJob, dailyDigestJob, periodicDigestJob, taskDigestNotificationJob)
middleware/       auth.js, requirePermission.js, errorHandler.js
config/           db.js (Sequelize), env.js (Joi validation)
migrations/       Sequelize migration files
```

### Client (`client/src/`)

```
features/         Feature modules (one per domain)
  auth/           Login, signup, JWT
  leads/          Lead CRUD, import/export, custom fields, assignment rules
  deals/          Deal pipeline management
  opportunities/  Opportunity tracking
  meetings/       Google Meet, recordings, transcripts, AI summaries
  workflows/      Visual workflow builder (XYFlow DAG)
  email/          Email templates, mailbox, tracking
  gmail/          Gmail integration
  campaigns/      Campaign management
  documents/      Doc management, quotations, invoices
  webforms/       Form builder + submissions + embed
  team/           Users, roles, permissions, workspaces
  calendar/       Google Calendar sync
  analytics/      Dashboard stats
  settings/       Company/workspace settings
app/              Redux store configuration
components/
  layout/         Page shell components
  shared/         Reusable components
  ui/             UI primitives
hooks/            Custom React hooks
pages/            Route-level page components
utils/            Helpers
```

## Features

Exhaustive inventory of implemented functionality, by module. Kept up to date as features land — update this section when adding/removing a capability.

### Leads
- Full CRUD with dedicated detail page and list page in **table** and **Kanban** views.
- **Custom fields engine** — admin-defined fields (text/number/email/url/date/checkbox/dropdown/multiselect/radio), validation, reorderable.
- **Lead scoring** — fixed-weight scorer plus a full rule-based scoring engine (field/event conditions, points, active/inactive, reorderable, bulk recalculate).
- **Assignment rules** — condition-based (source/tag/territory) auto-assignment with Redis round-robin rotation, plus manual bulk round-robin distribution.
- **Duplicate detection** — email/phone match on create/import queues into a review queue (not hard-rejected); merge tool, "create anyway," delete.
- **CSV import/export** — chunked bulk import wizard with per-row custom-field validation, assignment-rule application, duplicate queuing; filtered CSV export.
- **Saved views / filter presets** per user, plus an advanced query filter builder shared across modules.
- **Bulk actions** — assign, edit, email (via templates), export, archive/restore, delete/permanent-delete; Archived Leads tab.
- **Lead setup admin** — sources, tags, deal statuses, pipeline statuses (reorderable).
- **Activity timeline** — notes (rich text), system log, field-change history, document/sales-doc activity, unified per lead.
- **Tasks & subtasks** on leads — type/priority/status/due-date/assignee, subtasks, comments, audit timeline, reminders.
- **Follow-ups** — quick delay presets, remarks, due/overdue tracking, cross-lead list page.
- **Lead files** — per-lead file browser, workspace-scoped storage.
- **Lead-level email** — compose/send, thread view, reply sync.
- **WhatsApp tab** — conversation tied to lead by phone match.
- **Payments tab** — deal/campaign payments tied to the lead.
- **Engagement popover** — email opens/clicks/replies feeding lead score.
- **Row-level visibility (RBAC)** — admins/managers see all in scope; other roles see only owned/assigned records — enforced via `leadAccessWhere`.
- **Lead ↔ Opportunity conversion** (`isOpportunity` flag) and revert.

### Opportunities & Deals
- Opportunities: Kanban board, create modal, stage patching, revert-to-lead, admin-configurable pipeline stages.
- Deals: separate post-won entity with own Kanban, detail panel, multi-currency, activities, tasks (subtasks/comments/timeline), **deal payments** (installments + workspace-wide report).
- Deals link to sales docs (quotations/invoices) with mini-preview cards.
- Distinct "Pipeline" page/API for the opportunity-stage funnel view.

### Meetings
- Scheduling with **Google Meet link generation** (Calendar API), sync on edit, company- or per-user OAuth token.
- Cron lifecycle: `scheduled → live → completed`; reminders fire 10 min before start (in-app + email).
- **AI meeting insights** (on-demand, GPT-4o-mini): summary, structured action items (`{owner, task, dueDate}`), sentiment score/label.
- **Transcription**: Whisper-based audio-upload endpoint; `startLiveStream` stub for future live transcription.
- A more elaborate live-caption → transcript → AI-summary → PDF pipeline (`meetingProcessingService.js`) exists but is **not wired into any route** — `MeetingRoom.jsx` is a static placeholder, so auto recording/transcription isn't live yet.
- Live transcript panel, bot-status badge, notification bell, filterable meetings list.

### Calls & Activities
- Calls: log/list/update/delete, bulk sync endpoint (for mobile native call-log sync), convert-to-lead, rich filter modal.
- Activities: generic log (calls/meetings/notes/emails) with company-configurable custom activity types.
- **Booking links** (Calendly-style) — per-user public tokenized URL, unauthenticated slot view + confirm, creates a meeting activity.
- Per-activity reminders feeding the reminder cron and team notifications.

### Tasks
- Company-wide Tasks page — list and Kanban views, priority/status, sort/filter.
- Attachable to leads or deals; subtasks, file/comment attachments, audit timeline, due-date reminders.
- Daily "due today" and overdue-task notification jobs.

### Workflows (visual automation builder)
- DAG canvas (XYFlow) with node palette:
  - Triggers: lead created, lead updated (optional `watchFields`), campaign stage changed, campaign payment received.
  - Control: condition (12 operators, true/false branches), delay (up to 7 days, 30s server poll resume).
  - Actions: assign owner (single or fair round-robin), create task (with subtasks), create follow-up, send email (template, queued or inline).
- Template gallery for starting from presets.
- Execution engine (`workflowRunner.js`): branching, cyclic-graph safe (visited-node guard), 200-step ceiling, durable "waiting" state survives restarts.
- Test-run (dry execution), run-history viewer (per-node status/timing/output), publish/versioning.
- Queued via BullMQ when Redis configured, else inline sync — including batched bulk-import trigger evaluation.
- Completed runs post a system activity entry back onto the lead.

### Email / Gmail
- Gmail-style inbox at `/email` — sidebar, row list, threaded pane, inline reply.
- Google OAuth email connect (per user or company) — send + read scopes, warns when only "send" or no Calendar scope granted.
- **Gmail Pub/Sub push sync** — registers `users.watch`, ingests `history.list` deltas, OIDC push verification, auto-renews watches (36h horizon before 7-day expiry), falls back to polling when Pub/Sub not configured.
- Inbound Gmail messages matched to leads by normalized email, inserted as `LeadEmail` rows, triggers "lead email reply" notification.
- **Mailbox view** — unified inbox independent of the lead-scoped email tab, attachment download/save-to-documents.
- **Email templates** — rich editor, merge tags (`{{first_name}}`, `@company`, mention-autocomplete), attachment picker, live preview.
- **AI-generated email content** — GPT-4o-mini drafts subject/body from objective + tone + custom prompt.
- **Bulk template send** — preview-send, queued or inline, per-template + per-lead send history.
- **Email tracking** — open pixel, click tracking (link rewrite), unsubscribe links, tracking/status report pages.
- **Email sequences / drip campaigns** — multi-step nurture with per-step delay, template or ad-hoc content, enroll/unenroll, BullMQ worker self-reschedules next step.
- **Suppression list** for unsubscribes/bounces.

### WhatsApp
- Full **WhatsApp Cloud API (Meta) integration** — per-company settings (phone number ID, WABA ID, encrypted access token, verify token), webhook verify + receive (`/webhooks/whatsapp/:companyId`).
- Conversation inbox — sidebar, thread pane, message grouping, reply-to, reactions, starred messages, pin/unpin + reorder, read/unread, search, delete/reopen.
- Message types: text, image/video/audio/document/sticker (async media download via BullMQ queue), location, template messages.
- **Template management** — create/list/sync/delete against Meta's Business API, status tracking (draft/pending/approved/rejected) with rejection reason.
- Auto-links inbound numbers to CRM leads by phone-digit match; dedicated WhatsApp tab on lead detail.
- Integrations page tab for connecting WhatsApp and managing templates.

### Campaigns
- CRUD with custom per-campaign pipeline stages (editable, default set provided), stage-change history log.
- Add leads to campaign, add team members, sales-only visibility (reps see only their assigned leads).
- Bulk/round-robin distribution of campaign leads.
- **Campaign payments** — per-lead ledger, CSV export, campaign-wide payments list.
- **Campaign report** — funnel chart by stage (counts + received/pending amounts), per-team-member breakdown.
- **Campaign expiry cron** — nightly flips campaigns past `endDate` to inactive.
- Export campaign leads to CSV.

### Documents & Sales Docs
- Folder tree, multi-folder linking, move between folders, per-lead document summaries, preview dialog.
- **Version history** — list + restore prior versions.
- **Share links** — generate shareable document links.
- **E-signature request is a stub** — returns `NOT_IMPLEMENTED` (intended for Digio/Leegality/SignDesk).
- Email attachments savable directly into Documents.
- **Quotations & Invoices** — line items (qty/price/discount %-or-amount/tax), computed totals, multi-currency.
- **Convert Quotation → Invoice** in one action.
- **PDF generation** via Puppeteer (server-rendered HTML → PDF), downloadable.
- **Configurable numbering** — prefix + format (`PREFIX/DDMMYYYY/SEQ`, `PREFIX-SEQ`, `PREFIX/YYYY/SEQ`), auto-suggested next number.
- Invoice payments — record/delete, history panel, deal-balance card.
- **Sales doc templates** — visual template gallery, theme/preset system, template editor, A4 print preview.
- Billing profile (letterhead/tax info) used across docs; read-only tab for all users, editable tab gated by permission.
- Deal/customer "snapshot" resolution so a doc keeps billing details even if the lead/deal changes later.

### Web Forms (form builder + landing pages)
- Drag-and-drop builder — text/textarea/email/number/file/dropdown/multiselect/radio/checkbox/heading/paragraph/divider, per-field validation, half/full width, reorderable.
- Display modes: inline, popup (exit-intent/time-delay/scroll-depth/button-click triggers), slide-in.
- Theming — colors/font/border-radius/width, live preview.
- **Embed script generator** — self-contained vanilla-JS snippet postable to any external site.
- **Spam protection** — honeypot, IP rate limiting (Redis, >3/hr), reCAPTCHA v3.
- Submissions auto-create/queue leads (default status/source/assignee, optional auto-assign), trigger lead-created workflow automations.
- **AI-generated confirmation email** (GPT-4o-mini) plus reusable email-template library scoped to forms.
- Submissions table + detail modal, view/submission analytics.
- Public hosted form page + tracking-view endpoint, separate from the embed widget.

### Team / Roles / Permissions
- **Fixed role-kind catalog** per company (Workspace Admin, Manager, Sales, Telecaller, Campaign Manager, Marketing, Finance, HR, Auditor, Support, legacy Custom) — customizable per company, not free-form-created.
- **Two independent permission axes**: per-module/per-CRUD-verb menu permissions, and a separate analytics tier gate (`requireAnalyticsView`/`requireTeamAnalytics`/`requireAnalyticsAdmin`) — deliberately independent.
- Row-level visibility rule applied uniformly across leads/tasks/deals/calls/meetings/search via `leadAccessWhere`/`recordVisibility.isElevated`.
- **Invitations** — email invite with preview-before-accept, cancel, check-already-invited.
- User management — role/profile editing, deactivate/reactivate, **bulk reassign departing user's leads**, per-user workspace membership management.
- **Teams** — sub-groupings within a workspace (distinct from company roles), used for team-based filters/reporting.
- Team member profile page with effective-permissions drawer.
- **Audit log** — admin-only endpoint over `AuditLog`.

### Calendar
- Unified view aggregating meetings, opportunities, tasks, follow-ups, and reminders with per-type hover cards and color coding.
- Month grid, day-events overflow modal, mini month picker, "Today" list panel, day-notes panel.
- **Reminders** — freeform, targeting task/lead/opportunity/meeting/followup/general, independently toggleable push and/or email.
- "Today" digest endpoint for day-at-a-glance widget; event-type filter panel.

### Analytics / Reports / Dashboard
- **15 report types** across 5 categories: Executive Overview; Sales & Pipeline (Leads, Opportunities, Deals, Quotations & Invoices, Payments); Productivity (Tasks, Follow-ups, Activities & Calls, Meetings); People & HR (Employee Monthly Digest, Team Leaderboard); Communications & Data (Email Performance, Campaigns, Data Health).
- Date-range + filter controls per report; **PDF and Excel/XLSX export** per report.
- Dashboard — KPI cards, chart cards, expiring-tasks widget, nav badge counts.
- **Data Health report** — unassigned/"untouched"/duplicate lead counts (admin-only).
- **Team report** — leaderboard ranking, gated to elevated roles.

### AI Copilot (in-app chat assistant)
- Conversational assistant at `/copilot` — session list, **streaming responses over Socket.IO**, persisted history (`ChatSession`/`ChatMessage`).
- **Tool-calling agent** (GPT-4o-mini, up to 4 tool round-trips/turn): `getLeads`, `getLeadDetail`, `getDeals`, `getCampaignPerformance`, `getUserPerformance`, `getUserDetail`, `getFollowups`, `getDashboardStats`, `resolveAmbiguousEntity`, and **`runReadOnlySql`** — a hand-rolled SQL sandbox (`node-sql-parser`) restricted to an allowlisted table/column set, forcibly rewrites the AST to inject tenant scoping, forbids subqueries/non-INNER joins/`SELECT *`/DML/comments, caps `LIMIT` 500, 5s client timeout.
- **Entity disambiguation** — ambiguous name matches render clickable option chips; selection remembered per-session.
- **Structured response blocks** — profile cards, KPI blocks, chart blocks, data tables, entity link chips.
- Per-session message cap (60) and per-minute rate limit (20) to bound OpenAI cost.

### Auth & Onboarding
- Email/password auth — email verification (OTP), forgot/reset password (OTP), refresh tokens, logout, change-password.
- **2FA UI exists client-side** (`TwoFactorPrompt`/`TwoFactorSetup`, TOTP) but calls `/auth/2fa/complete`, which **is not implemented server-side**.
- **Multi-step onboarding wizard** — company info, goals/tools, scale, activate; country/currency pickers; provisioning overlay.
- **Workspace provisioning service** — auto-seeds default pipeline stages, deal statuses, roles for a new company/workspace.
- Team invitation accept flow (token-based, previewable); Google SSO endpoint exists but is a **placeholder**, not a real integration.
- Multi-workspace support with a workspace switcher.

### Notifications
- In-app notification center — unread count, modal, mark-read/mark-all-read/mark-seen, summary endpoint.
- **Real-time delivery over Socket.IO** — per-user private room (`user:{userId}`), DB row remains source of truth (socket is an accelerator).
- **~25 notification event types** — auth, leads, opportunities/deals, tasks, followups, meetings, calls, approvals (generic scaffold), finance, documents, security, digests.
- Company-configurable notification preferences per event, per-role preferences, delivery-history log for idempotency.
- **Combined daily digest** — one email/user/day (tasks + followups + meetings due), company-configured send hour.
- **Weekly/monthly manager digests** — aggregate team stats, elevated roles only.
- **Overdue task alerts** — idempotent, one-time (`overdueNotifiedAt`).
- **Missed follow-up escalation** — overdue >24h rolled up to rep's manager daily at 18:00.

### Search
- **Global search** (`/search?q=`) across leads, tasks, deals, meetings in one call, grouped, respecting row-level visibility rules.

### Settings
- Company profile / billing-profile editing.
- Notification email settings — per-event toggle + delivery-history viewer (read-only tab for all, editable gated by permission).
- Integrations hub — Google Email, WhatsApp, WhatsApp Templates (tabbed).
- Lead Configuration and Lead Distribution as dedicated sub-pages.
- Document Settings — numbering formats, letterhead/billing profile.

### Knowledge Base / In-App Help
- Self-contained help center (`/knowledge`) — Markdown content modules (Leads & Deals, Engage, Documents & Billing, Automation, Account & Team, Analytics), accordion nav, search index, slugified deep-linking.

### Marketing / Landing Site
- Full marketing site inside the app (`leadflow-landing`) — hero, feature sections, testimonials, trusted-by strip, FAQ, final CTA, footer, legal pages (Privacy, Terms, About), animated primitives.

### Background Jobs & Infrastructure
- **Cron jobs**: reminder job (every minute — meeting live/completed transitions, meeting/follow-up/call/general reminders, missed-followup escalation), campaign-expiry (nightly), daily/weekly/monthly digests, overdue-task-alert, task-due-today digest.
- **BullMQ queues** (Redis; degrades to sync inline without it): notification email, template bulk-send, email-sequence step, workflow-trigger, WhatsApp media-download.
- Dev-only Bull Board dashboard at `/admin/queues` (non-production, Redis required).
- `PROCESS_ROLE` env var — same codebase runs as `api`-only, `worker`-only, or `all`.
- Auto-runs pending Sequelize migrations on boot (`AUTO_MIGRATE`).

### Mobile App — ConnexifyNative
- Bare React Native 0.73 app (Android + iOS native projects) mirroring most desktop modules: Dashboard, Leads, Deals, Opportunities, Pipeline, Campaigns, Meetings, Tasks, Calendar, Documents, Sales Docs, Reports, Team, Activities feed, Calls, **native call-log sync screen**, Global search, Copilot chat, Notifications, Settings (profile/appearance/notifications/security/biometric app-lock).
- Stack: React Navigation (bottom-tabs + native-stack), TanStack Query + AsyncStorage (offline-first), Zustand, Socket.IO client, `react-native-keychain`, biometric lock, `react-native-geolocation-service`, native SIM-card detection module, Sentry, `react-native-gifted-charts`, document picker, haptics.
- Call-sync feature reads the device's native call log to push call activity into the CRM — backed by the server's `bulk-sync` calls endpoint.

### Known gaps / scaffolding (not fully wired)
- E-signature on documents — stub only.
- 2FA — frontend complete, backend endpoint missing.
- Google SSO — placeholder endpoint, not a real integration.
- Live-caption → transcript → AI-summary → PDF meeting pipeline (`meetingProcessingService.js`) — coded but unused; in-app meeting room is a static placeholder.

## API Base URL

`http://localhost:4000/api/v1`

**Key route prefixes:**
- `/auth` — register, login, refresh, verify-email, /me
- `/leads` — CRUD, import/export, custom fields, tasks, activities, emails
- `/deals` — pipeline stages
- `/opportunities` — opportunity stages
- `/meetings` — Google Meet, recording, transcription, AI summary
- `/workflows` — visual workflows, publish, runs
- `/templates` — email templates, AI generation, send
- `/team` — roles, users, invitations, workspaces
- `/quotations`, `/invoices` — sales docs with PDF
- `/forms` — web form builder + submissions
- `/documents` — doc + folder management
- `/email` — mailbox threads
- `/calendar` — Google Calendar events
- `/campaigns` — lead staging
- `/analytics/dashboard` — dashboard stats
- `/webhooks/gmail-pubsub` — Gmail push (public)
- `/track/open`, `/track/click` — email tracking (public)

## Key Patterns

**Auth flow:** JWT access token (15m) + refresh token (7d). Middleware: `server/src/middleware/auth.js`. Frontend stores tokens in Redux; RTK Query attaches `Authorization: Bearer` header.

**Multi-tenancy:** Workspace scoping. Frontend sends `x-workspace-id` header on all requests. Server middleware validates membership.

**Permissions:** Role-based matrix per company. `requirePermission.js` middleware guards routes. Roles defined in `company_roles` table.

**Database:** All models use UUID PKs, `paranoid: true` (soft deletes), timestamps. Associations defined in `server/src/models/index.js`.

**API layer (frontend):** RTK Query base at `client/src/features/api/baseApi.js`. Each feature has its own `*Api.js` file that injects endpoints into base.

**Async jobs:** BullMQ queues in `server/src/queues/`. Workers process email sending, workflow triggers. Redis required for queues.

**Cron jobs (server/index.js startup):**
- `reminderJob` — meeting reminders, transcription trigger

**Workflow engine:** DAG-based visual builder (XYFlow). Triggers on lead events, email events. Runs async via BullMQ. Run history stored in `workflow_runs` + `workflow_run_steps`.

## Database Models (Key)

| Model | Table | Purpose |
|-------|-------|---------|
| User | users | Auth, profile, company+role FK |
| Company | companies | Tenant root |
| Workspace | workspaces | Team scoping within company |
| Lead | leads | CRM lead records + custom fields |
| Deal | deals | Sales pipeline |
| Opportunity | opportunities | Opportunity tracking |
| Meeting | meetings | Google Meet + recording/transcript |
| Workflow | workflows | DAG workflow definitions |
| WorkflowRun | workflow_runs | Execution history |
| EmailTemplate | email_templates | Reusable email templates |
| WebForm | web_forms | Form builder output |
| Document | documents | File/folder management |
| Invoice | invoices | Billing docs |
| Quotation | quotations | Pre-invoice docs |
| Campaign | campaigns | Campaign + lead staging |

## Important Files

| File | Purpose |
|------|---------|
| `server/index.js` | Bootstrap: migrations, cron jobs, queues, Gmail watch |
| `server/src/app.js` | Express app + middleware setup |
| `server/src/routes/v1/index.js` | All API routes (~1030 lines) |
| `server/src/models/index.js` | All Sequelize associations |
| `server/src/config/env.js` | Joi env validation (fails fast on missing vars) |
| `client/src/App.jsx` | All 50+ frontend routes |
| `client/src/app/store.js` | Redux store setup |
| `client/src/features/api/baseApi.js` | RTK Query base config |
| `client/vite.config.js` | Vite + API proxy config |
| `UI_CONVENTIONS.md` | Frontend component standards |
| `TEAM_WORKSPACE_ROLLOUT.md` | Workspace access setup guide |
