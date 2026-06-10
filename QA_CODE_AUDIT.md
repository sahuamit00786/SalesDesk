# Connexify — Code-Side QA Audit

> API tests + static scans. **No Playwright.** Run before releases.

## Commands

```bash
# 1) Static scan (isolation patterns, silent catches, boot risks)
npm run qa:audit -w server

# 2) Live API regression (all phases)
npm run dev:server   # terminal 1
npm run qa:test -w server   # terminal 2
```

---

## Isolation model (must hold)

```
Company (tenant)
 └── Workspace A  ← x-workspace-id header
 └── Workspace B
      └── Leads, Deals, Campaigns, etc. scoped by workspace_id + company_id
      └── Users: ONE row per email per company; many workspaces via user_workspaces
```

---

## Bugs found & fixed (this audit)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| ISO-1 | **Critical** | `GET /leads/:id` ignored workspace for company admin | `findCompanyLead` uses `x-workspace-id` |
| ISO-2 | **Critical** | `POST /leads/bulk` had no company/workspace filter — could mutate any lead by UUID | `buildLeadListAccessWhere` on bulk + resolveByIds |
| ISO-3 | Medium | `/meetings` routes lacked `requireCompany` | Added `requireCompany` on meetings router |
| TEAM-1 | High | Re-invite existing member returned 409 | Merge workspace via `addWorkspaceMembershipsForUser` |
| TEAM-2 | UX | Invite showed all workspaces | Invite uses current sidebar workspace only |

---

## Where code can still explode (by phase)

### Phase 1 — Main

| Module | Risk | What breaks |
|--------|------|-------------|
| **Dashboard** | `dashboardStats` returns hardcoded zeros | KPIs look empty even with data |
| **Dashboard** | Redis cache key is per-user only, not per-workspace | Stale/wrong stats after WS switch |
| **Leads** | Duplicate queue (`202`) without follow-up | User thinks lead was created |
| **Leads** | Gmail sync without OAuth | 500 `GOOGLE_OAUTH_NOT_CONFIGURED` |
| **Lead distribution** | Round-robin with no rules | Silent no-op |
| **Opportunities** | Admin without `x-workspace-id` sees **all** workspaces | Cross-WS list (by design for admin) |
| **Deals** | Missing deal statuses in new workspace | Create deal fails stage resolution |
| **Deal payments** | Deal in other WS | 404 on payment create |

### Phase 2 — HR

| Module | Risk | What breaks |
|--------|------|-------------|
| **Attendance** | Cron uses UTC midnight | Wrong “absent” for non-UTC companies |
| **Leave** | Balance not seeded | Apply leave returns 400 |
| **Leave** | Document upload without file | Validation error |

### Phase 3 — Engage

| Module | Risk | What breaks |
|--------|------|-------------|
| **Email** | No Gmail connect | Empty inbox, sync errors |
| **Email** | Redis < 5 for BullMQ | Bulk template send fails |
| **Meetings** | `ENABLE_MEETING_BOT=false` | Bot consent saved but bot never runs |
| **Meetings AI** | No `OPENAI_API_KEY` | Summary/transcription 500 |
| **Calendar** | Google OAuth missing | Calendar sync empty |
| **Tasks** | Global `PATCH /tasks/:taskId` | Works; lead-scoped path still required for comments |

### Phase 4 — Manage

| Module | Risk | What breaks |
|--------|------|-------------|
| **Documents** | `/uploads` static, no auth | URL guessing exposes files |
| **Documents** | E-sign endpoint | 501 Not Implemented |
| **Quotations/Invoices** | No billing profile | PDF/print missing company details |

### Phase 5 — Automate

| Module | Risk | What breaks |
|--------|------|-------------|
| **Workflows** | No Redis | Runs inline; may timeout on heavy flows |
| **Campaigns** | Distribute with empty team | 400 validation |
| **Web forms** | Public submit without rate limit | Spam submissions |

### Phase 6 — Insights & Settings

| Module | Risk | What breaks |
|--------|------|-------------|
| **Reports** | Missing `x-workspace-id` | Empty or wrong scope |
| **Team** | No roles on fresh company | Invite fails until role created |
| **Integrations** | Google env alias mismatch | Fixed via `googleEnv.js` |
| **Auth** | Password reset without SMTP | Dev: OTP in console; prod: 503 |

---

## Silent error swallowing (won’t crash — will hide bugs)

Heavy use of `.catch(() => {})` in:

- `leadsController.js` — workflow triggers, Gmail watch, email sync
- `reminderJob.js` — meeting bot enqueue
- `importExportService.js` — post-import hooks

**Symptom:** Feature appears to work; background job never ran.

---

## Boot-time crashes

| Condition | File | Result |
|-----------|------|--------|
| Missing `OPENAI_API_KEY` | `meetingSummaryService.js` (module-level `new OpenAI`) | **Server won't start** |
| MySQL down | `server/index.js` | Exit on `sequelize.authenticate` |
| Migration conflict | Auto-migrate on boot | Retry once; may still fail |

---

## Automated test coverage (`npm run qa:test`)

| Phase | Tests | Covers |
|-------|-------|--------|
| 1 | D-*, L-*, O-*, DE-*, LD-* | Dashboard, leads, opportunities, deals, bulk isolation |
| 2 | HR-* | Attendance today, leave balance, settings |
| 3 | EN-* | Activities, tasks, calendar, meetings, templates |
| 4 | MG-* | Documents, quotations, invoices |
| 5 | AU-* | Workflows, campaigns, web forms |
| 6 | ST-* | Workspaces, reports, team, auth |

---

## Manual code review checklist (no browser)

For each new endpoint:

1. `requireCompany` on route?
2. `x-workspace-id` checked in controller?
3. `companyId` in every Sequelize `where`?
4. Cross-tenant ID → 404 not 403 leak?
5. Errors use `err.status` + `publicMessage`?

---

*Re-run after major refactors. See `QA_TEST_PLAN.md` for full case tables.*
