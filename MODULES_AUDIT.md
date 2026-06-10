# Connexify (LeadFlow CRM) — Module Audit

> **Generated:** June 2026  
> **Purpose:** One-by-one inventory of every product module — what ships today vs what is missing, stubbed, or risky.  
> **Stack:** React 18 + RTK Query (`client/`) · Express 5 + Sequelize (`server/`) · MySQL · optional Redis (BullMQ)

### Fixes applied (June 2026 — no UI redesign)

| Area | Change |
|------|--------|
| **Calls API** | Fixed `callService` import; company-scoped CRUD; routes `GET/POST/PATCH/DELETE /calls` |
| **Auth** | `POST /auth/logout` (refresh token revocation); `POST /auth/forgot-password` + `POST /auth/reset-password` |
| **Deletes** | `DELETE /deals/:id`, `DELETE /opportunities/:id`, `DELETE /campaigns/:id` |
| **Tasks** | `PATCH /tasks/:taskId` (global task update without lead in URL) |
| **Meetings AI** | Tenant scoping on `/ai-meetings/*` and `/transcription/*` via `meetingAccessService` |
| **Cron** | `startTaskDigestNotificationJob()` wired in `server/index.js` |
| **Google OAuth** | Gmail + Calendar use shared `getGoogleOAuthClient()` with alternate env key names |
| **Dashboard** | `requireCompany` on `GET /analytics/dashboard` |
| **Client** | Logout calls server API (same button/UI); auth API hooks for forgot/reset password |

**Still open (need new UI or large integrations):** Contacts, Companies, WhatsApp modules; API keys tab; e-sign; Google SSO; Groq wiring; `/uploads` auth; `leadsController` split.

---

## How to read this document

| Status | Meaning |
|--------|---------|
| ✅ **Shipped** | Usable end-to-end in production with real API + UI |
| 🟡 **Partial** | Core flow works; notable gaps or polish debt |
| 🔴 **Missing** | Route exists but empty, 501 stub, or no backend |
| ⚠️ **Risk** | Security, tenancy, or reliability concern |

Each module lists **Client**, **Server**, then **Gaps & recommendations**.

---

## Platform-wide (cross-cutting)

### What exists
- JWT auth (access 15m + refresh 7d), workspace header `x-workspace-id`, RBAC via `company_roles` + `requirePermission`
- ~80 Sequelize models, migrations on server boot
- BullMQ queues when `REDIS_URL` is set (email templates, workflows, meeting bot)
- Cron: meeting reminders, attendance absent-marking, Gmail watch renewal, email auto-sync interval

### What's missing / risky
| Gap | Impact |
|-----|--------|
| **No server logout / refresh-token revocation** | Stolen refresh tokens work until expiry |
| **No forgot / reset password** | Users locked out if they forget password |
| **Google SSO route returns 501** | `POST /auth/sso/google` is a placeholder |
| **Redis 3.x incompatible with BullMQ** | Workers error; queues fall back to inline or fail |
| **`GROQ_*` env vars documented but unused** | All AI uses OpenAI; docs are misleading |
| **Dual Google OAuth env naming** | Calendar uses `GOOGLE_*`; Gmail connect uses strict `GOOGLE_OAUTH_*` only |
| **`leadsController.js` ~147KB monolith** | Email sync, lead CRUD, Gmail — hard to maintain |
| **`server/src/routes/v1/index.js` ~1160 lines** | Same — route table is a single file |
| **Many domains reuse `leads` permission** | Deals, workflows, templates, sales docs guarded as `leads` |
| **`/uploads` static — no auth** | Document files may be reachable if URL is known |
| **Silent `catch {}` in several client pages** | Analytics, leave, calendar — errors swallowed |

---

## 1. Auth & Onboarding

| | |
|---|---|
| **Routes** | `/login`, `/register`, `/accept-invite`, `/onboarding` |
| **Client** | `features/auth/`, `LoginPage`, `RegisterPage`, `OnboardingPage`, `SessionSync` |
| **Server** | `authController`, `tokenService`, `otpService`, `mailService` |

### Shipped ✅
- Register with email OTP verification
- Login, refresh token, `GET /auth/me`
- Invitation accept flow
- Company onboarding wizard

### Missing 🔴
- Logout endpoint + refresh token denylist
- Password reset / forgot password
- Google SSO (501 stub on server)
- MFA / 2FA
- Session device management

---

## 2. Dashboard

| | |
|---|---|
| **Route** | `/dashboard` |
| **Client** | `DashboardPage`, `features/dashboard/`, `DashboardExpiringTasks` |
| **Server** | `GET /analytics/dashboard`, `nav-badges`, `dashboard-charts` |

### Shipped ✅
- KPI cards, charts, tasks due today, expiring tasks widget
- Redis-backed cache mentioned in docs (optional)

### Missing / partial 🟡
- `dummyDashboardData.js` may still exist as fallback — verify all widgets hit live API
- Dashboard route on server lacks `requireCompany` on one path — verify tenant scoping internally
- No customizable dashboard layouts per user

---

## 3. Leads

| | |
|---|---|
| **Routes** | `/leads`, `/leads/:id`, `/lead-configuration`, `/lead-distribution` |
| **Client** | `features/leads/` (largest module), `LeadsListPage`, `LeadDetailPage`, import/export, bulk actions, duplicates, merge, saved views, filters |
| **Server** | `leadsController` (monolith), `duplicateLeadsController`, assignment/import/export/scoring services |

### Shipped ✅
- Full CRUD, custom fields, tags, sources, statuses
- Lead detail tabs: activity, calls, **emails** (lazy-load on tab), tasks, follow-ups, notes, meetings, documents, deal
- Import/export wizard, bulk assign/edit/email/export
- Duplicate detection + merge
- Round-robin lead distribution
- Assignment rules, saved views, advanced filter builder
- Per-lead email compose (rich editor, templates, document picker, attachments)
- Google email send + thread sync per lead
- Kanban + table views

### Missing / partial 🟡
| Gap | Notes |
|-----|-------|
| **Contacts module** | People are only fields on leads — no `/contacts` entity |
| **Companies module** | `/companies` is a blank placeholder page |
| **Standalone call log API** | `callController` exists but **no routes**; import path broken |
| Lead task update only via lead scope | No global task PATCH outside lead |
| `leadsController` size | Email/Gmail logic should be extracted |
| Activity timeline on list | Basic note input — not full rich editor everywhere |

---

## 4. Opportunities

| | |
|---|---|
| **Routes** | `/opportunities`, `/opportunities/:id` (reuses `LeadDetailPage`) |
| **Client** | `OpportunitiesPage`, `OpportunitiesKanban`, convert-to-opportunity from lead |
| **Server** | Opportunity stages on leads (`isOpportunity`), `opportunitiesController` (legacy table dropped) |

### Shipped ✅
- Pipeline view, stage changes, child deals on opportunity
- Same detail experience as leads with opportunity-specific tabs

### Missing 🔴
- `DELETE` opportunity endpoint
- Dedicated opportunity fields separate from lead (by design — lead-backed)
- Opportunity-only reporting filters in some reports

---

## 5. Pipeline & Deals

| | |
|---|---|
| **Routes** | `/pipeline`, `/deals`, `/deals/:id` |
| **Client** | `PipelinePage`, `DealsPage`, `DealDetailPanel`, `DealsPipelineKanban`, payments tab |
| **Server** | `dealsController`, `dealPaymentsController`, `Deal`, `DealPayment`, `DealActivity` |

### Shipped ✅
- Kanban by deal status / pipeline stage
- Deal detail drawer: activities, payments, sales docs tabs
- Deal payments list page (`/deal-payments`)
- Create deal from opportunity/lead

### Missing 🔴
| Gap | Notes |
|-----|-------|
| **`DELETE /deals/:id`** | No archive/delete API |
| **General `PATCH /deals/:id`** | Only stage patch exists |
| **`DELETE /opportunities/:id`** | Same |
| Deal forecasting | Not a first-class module |

---

## 6. Deal Payments

| | |
|---|---|
| **Route** | `/deal-payments` |
| **Client** | `DealPaymentsPage`, `DealPaymentsTab`, `dealPaymentsApi` |
| **Server** | `dealPaymentsController`, payments on deals |

### Shipped ✅
- Record payments against deals, list/filter all payments
- Analytics payments report tab

### Missing 🟡
- Payment reminders / overdue automation
- Export payments CSV
- Refund / reversal flow

---

## 7. Activities

| | |
|---|---|
| **Route** | `/activities` |
| **Client** | `ActivitiesPage`, `features/activities/`, timeline on lead detail |
| **Server** | `activitiesController`, booking links, reminders |

### Shipped ✅
- Global activity feed with filters
- Log calls, notes, emails, meetings on leads
- Activity types CRUD
- Public booking link (`/activities/book/:token`)
- Reminders (upcoming, per-activity)

### Missing 🟡
- Update/delete individual activities
- `/calls` module is **placeholder UI only** — no dedicated Calls page
- Call logs not persisted via API (controller unrouted)

---

## 8. Tasks

| | |
|---|---|
| **Route** | `/tasks` |
| **Client** | `TasksPage`, `LeadTaskDrawer`, subtasks, comments, recurrence |
| **Server** | Lead tasks under `/leads/:id/tasks`, global `GET /tasks` |

### Shipped ✅
- My tasks list, priorities, statuses, due dates
- Rich task drawer on lead detail
- Task digest notification **templates exist** on server

### Missing 🔴
| Gap | Notes |
|-----|-------|
| **Task digest cron never started** | `taskDigestNotificationJob` not imported in `server/index.js` |
| Global task edit API | Updates go through lead-scoped routes only |

---

## 9. Calls (placeholder)

| | |
|---|---|
| **Route** | `/calls` → `ModulePlaceholderPage` (empty white box) |
| **Nav** | Described under “Calls & meetings” but **no sidebar link to `/calls`** |
| **Server** | `callController` + `callService` — **broken import, no routes** |

### Shipped ✅
- Call logging via lead detail **activity** tab (manual note)
- Meetings module covers some “call intelligence” marketing copy

### Missing 🔴
- Entire Calls module (UI + API)
- Call recording integration
- Click-to-call / telephony (Twilio, etc.)
- `CallLog` model only read for engagement scores — nothing writes to it

---

## 10. Calendar & Reminders

| | |
|---|---|
| **Route** | `/calendar` |
| **Client** | `CalendarPage`, `features/calendar/` (month grid, today list, filters, day notes) |
| **Server** | `calendarController` (`listEvents`, `getDayDigest`), Google Calendar sync |

### Shipped ✅
- Unified calendar: meetings, tasks, follow-ups, reminders, leave, holidays
- Google Calendar event overlay (when OAuth configured)
- Mini month picker, event hover cards

### Missing 🟡
- Two-way Google Calendar write-back for all event types
- Drag-and-drop reschedule on calendar grid
- Shared team calendar permissions UI
- Error toasts sometimes swallowed on sync failure

---

## 11. Meetings & AI

| | |
|---|---|
| **Route** | `/meetings` |
| **Client** | `MeetingsPage`, `MeetingRoom`, bot consent, live transcript panel, recording UI |
| **Server** | `meetingController`, `meetingBot.js` (Playwright), `transcriptionController`, `aiMeetingController`, `reminderJob` |

### Shipped ✅
- Create Google Meet meetings, link to leads
- Bot join (opt-in), recording, Whisper transcription (OpenAI)
- AI summary, action items, sentiment endpoints
- Meeting notifications bell, status badges
- Cron: live/completed flags, bot join, reminders

### Missing / risky 🟡 ⚠️
| Gap | Notes |
|-----|-------|
| **Join/cancel/reschedule routes commented out** | Handlers don't exist |
| **Live transcription stub** | `whisperService.startLiveStream` fakes success |
| **No speaker diarization** | All speakers = "Unknown" |
| **Tenant scoping hole** | `/ai-meetings/:id/*` auth-only — no company check |
| **Groq documented, OpenAI used** | Env/docs mismatch |
| Meeting bot needs Redis 5+ | Same BullMQ issue |
| `ENABLE_MEETING_BOT` must be true | Playwright + Chrome deps on server |

---

## 12. Email & Gmail

| | |
|---|---|
| **Routes** | `/email`, `/templates` (separate module), lead email tab |
| **Client** | `EmailPage`, `GmailThreadList/View`, `EmailComposerDrawer`, `LeadEmailComposeModal` |
| **Server** | `mailboxController`, lead email in `leadsController`, Gmail Pub/Sub, tracking |

### Shipped ✅
- Gmail inbox/outbox read (with read scope)
- **Lead only mode:** pick lead in Filters → fetch CRM threads only (lazy)
- Lead detail emails tab: lazy load on tab open
- Send via Google, tracking pixels, click tracking
- Mailbox attachment save to lead documents
- Email auto-sync interval (5 min default)
- Unsubscribe + suppression list

### Missing / partial 🟡
| Gap | Notes |
|-----|-------|
| **Bulk sync still scans 250 leads** | "Sync CRM mail" without lead filter |
| Gmail Pub/Sub | Needs `GMAIL_PUBSUB_TOPIC` + Google Cloud setup |
| **CC/BCC in lead compose modal** | Only in `EmailComposerDrawer`, not lead modal |
| **WhatsApp / SMS** | `/whatsapp` placeholder — not implemented |
| Template bulk send queue | Requires Redis 5+ |
| Email threading for non-Google SMTP | Only Google send path |

---

## 13. Email Templates

| | |
|---|---|
| **Route** | `/templates` |
| **Client** | `TemplatesPage`, merge tags, preview, attachment picker, bulk send modal |
| **Server** | `templatesController`, `emailTemplateQueue` (BullMQ) |

### Shipped ✅
- CRUD templates with categories, merge fields, attachments
- AI generate content (OpenAI)
- Preview send, send history, throttling
- Bulk email from leads list

### Missing 🟡
- A/B test variants
- Template versioning UI
- Scheduled send UI (server has `scheduleAt` field)
- Queue worker errors on Redis 3.x

---

## 14. Documents

| | |
|---|---|
| **Route** | `/documents` |
| **Client** | `DocumentsPage`, folder tree, drag-drop, `LeadDocumentsWorkspace`, `DocumentPickerModal` |
| **Server** | `documentsController`, `documentsService`, folders, versions, shares |

### Shipped ✅
- Upload, folders, lead/company links
- Folder tree: Leads, Companies, Unlinked, manual folders
- Version history + restore
- Share links, email attachment save
- Document picker in email compose (unlinked + folders + multi-select)

### Missing 🔴
| Gap | Notes |
|-----|-------|
| **E-sign** | `requestDocumentESign` returns **501** |
| Authenticated download API | Files served via public `/uploads` path |
| Virus scan / MIME validation beyond extension
| OCR / full-text search |

---

## 15. Sales Docs (Quotations & Invoices)

| | |
|---|---|
| **Routes** | `/quotations`, `/invoices`, templates, `/new`, print pages |
| **Client** | `QuotationsPage`, `InvoicesPage`, drawers, template gallery, PDF print views |
| **Server** | `quotationsController`, `invoicesController`, template controllers, billing profile |

### Shipped ✅
- Create/edit quotations & invoices with line items
- Template gallery, workspace billing profile
- Convert quotation → invoice
- Print-friendly pages (client-side render)
- Assign to deal, customer snapshot from lead

### Missing 🟡
| Gap | Notes |
|-----|-------|
| **Server-side PDF generation endpoint** | Print is client-side; `pdfService` used for meetings not quotes |
| E-invoice / GST filing integration
| Recurring invoices
| Payment gateway link on invoice email

---

## 16. Campaigns

| | |
|---|---|
| **Routes** | `/campaigns`, `/campaigns/new`, `/campaigns/:id` |
| **Client** | `CampaignsListPage`, `CampaignDetailPage`, add leads/members drawers |
| **Server** | `campaignsController`, `Campaign`, `CampaignLead` |

### Shipped ✅
- Campaign CRUD (except delete), lead staging, team members
- Distribute leads, target amounts, date utils
- Team filter panel

### Missing 🔴
- **`DELETE /campaigns/:id`** — no archive
- Multi-channel steps (email + SMS + WhatsApp) — UI copy promises more than built
- Campaign analytics dashboard
- Automated drip sequences inside campaign

---

## 17. Workflows (Automation)

| | |
|---|---|
| **Routes** | `/automation`, `/automation/new`, `/automation/:id` |
| **Client** | `WorkflowsListPage`, `WorkflowEditorPage` (XYFlow DAG), run history |
| **Server** | `workflowsController`, `workflowRunner`, `workflowTriggerQueue` |

### Shipped ✅
- Visual DAG builder: triggers, conditions, delays, actions
- Publish versions, test run, run history
- Actions: send email template, create task, update lead, etc.
- BullMQ trigger worker + 30s wakeup poller

### Missing 🟡
| Gap | Notes |
|-----|-------|
| Permission domain = `leads` | Not a dedicated `workflows` permission |
| Wakeup poller per server instance | Multi-instance may double-fire waits |
| No workflow templates marketplace
| Limited action types vs enterprise iPaaS

---

## 18. Web Forms

| | |
|---|---|
| **Routes** | `/forms`, `/forms/:id/builder` |
| **Public** | `/api/public/forms/:token`, `/f/:token`, `/embed/form.js` |
| **Client** | `WebFormsListPage`, `FormBuilderPage`, field settings, spam honeypot |
| **Server** | `webFormsController`, `publicFormController`, `leadCaptureService` |

### Shipped ✅
- Drag-drop form builder, field → lead mapping
- Embed script + hosted page
- Submission → lead create, optional confirmation email templates
- AI generate confirmation email template

### Missing 🟡
| Gap | Notes |
|-----|-------|
| **Submissions inbox UI** | Model exists; no admin list/export in routes |
| Public submit rate limiting | Honeypot only |
| reCAPTCHA / Turnstile
| Multi-page forms, conditional logic (partial)

---

## 19. Analytics & Reports

| | |
|---|---|
| **Routes** | `/reports`, `/reports/:type` |
| **Client** | `AnalyticsPage`, 15+ report tabs, export XLSX, filters |
| **Server** | `analyticsController`, `analyticsReportsExtended` |

### Shipped ✅
- Dashboard charts, nav badges
- Reports: leads, pipeline, activities, meetings, tasks, team, deals, opportunities, follow-ups, sales docs, payments, leave, campaigns, data health
- Role-gated admin reports

### Missing 🟡
- Scheduled email reports
- Custom report builder
- `/email-tracking` redirects to reports — old standalone page removed
- `/hr/reports` redirects to leave report — `HRReportsPage` orphaned if it exists
- Some tabs swallow API errors silently

---

## 20. Attendance (HR)

| | |
|---|---|
| **Route** | `/attendance` |
| **Client** | `AttendancePage`, calendar workspace, team day stats, check-in/out |
| **Server** | `attendanceController`, `attendanceJob` (cron 23:59 UTC) |

### Shipped ✅
- Check-in/out, today status, team calendar
- Admin edit logs, CSV export
- Monthly summary table
- Auto absent marking (cron)

### Missing 🟡
| Gap | Notes |
|-----|-------|
| **Timezone** | Cron uses UTC — wrong for non-UTC companies |
| Geolocation / IP check-in
| Biometric integration
| HR uses custom role checks, not RBAC matrix

---

## 21. Leave (HR)

| | |
|---|---|
| **Routes** | `/leave`, `/leave/requests`, `/leave/approval`, `/leave/config` |
| **Client** | `LeavePage`, balance card, apply form, approval queue, public holidays, weekly off |
| **Server** | `leaveController` (large), balance calculator, holidays |

### Shipped ✅
- Apply leave with document upload
- Manager approve/reject, bulk approve
- Leave calendar, balance by type
- Public holidays + weekly off config
- HR notification bell

### Missing 🟡
- Leave accrual policies engine (partial — manual adjust exists)
- Carry-forward rules UI
- Integration with payroll export

---

## 22. HR Overview

| | |
|---|---|
| **Route** | `/hr` |
| **Client** | `HRDashboardPage`, `HrCard`, `HrDataTable`, `HrToolbar` |
| **Server** | Aggregates from attendance + leave endpoints |

### Shipped ✅
- HR dashboard summary widgets
- Role helpers (`useHrRole`, `hrRoleService`)

### Missing 🟡
- Dedicated HR reports page (redirects to analytics)
- Employee directory beyond team page
- Org chart

---

## 23. Team & Workspace

| | |
|---|---|
| **Routes** | `/team`, `/team/:userId`, `/workspace` |
| **Client** | `TeamPage`, `TeamMemberProfilePage`, `WorkspacePage`, invitations |
| **Server** | `teamController`, `workspaceController`, permissions matrix |

### Shipped ✅
- Users, roles, menu permissions
- Invitations, deactivate/reactivate, reassign leads
- Workspaces CRUD, user ↔ workspace mapping
- Team sub-teams (teams + members)
- Profile photos, address fields

### Missing 🟡
| Gap | Notes |
|-----|-------|
| Invitation resend endpoint
| Workspace routes use `requireAuth` only at router level
| Audit log for permission changes
| SCIM / SSO provisioning

---

## 24. Integrations

| | |
|---|---|
| **Route** | `/integrations` |
| **Client** | `IntegrationsPage` — Google OAuth connect, reconnect |
| **Server** | `googleController`, `CompanyGoogleToken`, Gmail watch |

### Shipped ✅
- Google connect for Gmail + Calendar + Meet
- Reconnect flow, scope warnings in email UI
- Notification email preferences (`/settings/notification-emails`)

### Missing 🔴
| Gap | Notes |
|-----|-------|
| **API Keys tab — "Coming soon"** | No public API key management |
| Zapier / webhook outbound integrations
| Slack / Teams notifications
| Microsoft 365 email/calendar

---

## 25. Contacts, Companies, WhatsApp (nav placeholders)

| Route | Status |
|-------|--------|
| `/contacts` | 🔴 `ModulePlaceholderPage` — empty |
| `/companies` | 🔴 `ModulePlaceholderPage` — empty |
| `/whatsapp` | 🔴 `ModulePlaceholderPage` — empty |

These appear in `APP_PATHS` and `ROUTE_META` but are **not in the sidebar**. Marketing copy references them; no backend entities beyond lead `company` field and document folder auto-groups.

### To ship properly
- **Contacts:** `Contact` model, link to leads/companies, `/contacts` CRUD
- **Companies:** `Company` account entity (distinct from tenant `companies` table), hierarchy, ARR
- **WhatsApp:** Business API provider, template messages, thread sync like email

---

## 26. Landing & Marketing

| | |
|---|---|
| **Route** | `/` (public) |
| **Client** | `LeadFlowLandingPage`, `features/leadflow-landing/` |

### Shipped ✅
- Marketing landing with sections (pricing, features, etc.)

### Missing 🟡
- Not wired to live pricing/billing
- Demo request form → CRM lead (may be static)

---

## 27. Filters (shared infrastructure)

| | |
|---|---|
| **Client** | `features/filters/` — `QueryFilterBuilder`, `ListSearchToolbar`, lead filter schema |
| **Server** | `listFilterService`, `leadFilterSchema` |

### Shipped ✅
- Reusable filter popover, query params builder
- Used on leads, tasks, several list pages

### Missing 🟡
- Filter schemas for every module (deals, campaigns partially manual)
- Saved filters outside leads saved views

---

## Priority roadmap (suggested)

### P0 — Correctness & security
1. Fix **Calls** module (routes + import) or remove dead code
2. Add **company/workspace checks** on meeting AI + transcription routes
3. Align **Google OAuth env** variable names across Gmail + Calendar
4. Upgrade **Redis to 5+** or document BullMQ as required for prod
5. Start **task digest cron** or remove UI copy promising it

### P1 — Core CRM gaps
6. Ship **Contacts** or remove `/contacts` route meta
7. **Submissions inbox** for web forms
8. **Delete/archive** for deals, opportunities, campaigns
9. **Password reset** flow
10. **Server-side PDF** for quotations/invoices (optional if print pages suffice)

### P2 — Growth features
11. **WhatsApp** integration (or remove placeholder route)
12. **E-sign** for documents (Digio/Leegality stub exists)
13. **API keys** on integrations page
14. **Calls** telephony + `/calls` UI
15. Split **leadsController** into domain services

---

## Module completeness scorecard

| Module | Client | Server | Overall |
|--------|--------|--------|---------|
| Leads | ✅ 90% | ✅ 90% | **🟢 Strong** |
| Opportunities | ✅ 85% | 🟡 75% | **🟢 Strong** |
| Deals & Payments | ✅ 80% | 🟡 70% | **🟡 Good** |
| Email & Templates | ✅ 85% | 🟡 80% | **🟡 Good** |
| Meetings & AI | ✅ 75% | 🟡 65% | **🟡 Good** |
| Documents | ✅ 80% | 🟡 70% | **🟡 Good** |
| Sales Docs | ✅ 85% | 🟡 75% | **🟡 Good** |
| Workflows | ✅ 80% | 🟡 75% | **🟡 Good** |
| Campaigns | ✅ 75% | 🟡 70% | **🟡 Good** |
| Web Forms | ✅ 75% | 🟡 65% | **🟡 Good** |
| Analytics | ✅ 85% | ✅ 85% | **🟢 Strong** |
| Leave & Attendance | ✅ 80% | 🟡 75% | **🟡 Good** |
| Team & Workspace | ✅ 85% | 🟡 80% | **🟢 Strong** |
| Calendar | ✅ 80% | 🟡 70% | **🟡 Good** |
| Tasks & Activities | ✅ 80% | 🟡 75% | **🟡 Good** |
| Auth | ✅ 70% | 🟡 60% | **🟡 Good** |
| Integrations | 🟡 50% | 🟡 55% | **🟡 Partial** |
| Calls | 🔴 5% | 🔴 5% | **🔴 Missing** |
| Contacts | 🔴 0% | 🔴 0% | **🔴 Missing** |
| Companies (accounts) | 🔴 0% | 🔴 0% | **🔴 Missing** |
| WhatsApp / SMS | 🔴 0% | 🔴 0% | **🔴 Missing** |

---

## Related docs

- `CLAUDE.md` — architecture & dev commands
- `UI_CONVENTIONS.md` — frontend layout standards
- `TEAM_WORKSPACE_ROLLOUT.md` — workspace access
- `.env.example` — environment variables (note Groq vs OpenAI drift)

---

*This audit is based on static code review of the repository in June 2026. Re-run after major refactors.*
