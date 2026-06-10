# Connexify — QA Test Plan (Sidebar Order)

> **Goal:** Regression-proof every sidebar module via API + frontend flows, with **strict workspace isolation** inside a company and **single user row** across multiple workspaces.

---

## Core isolation rules (must never break)

| Rule | How enforced |
|------|----------------|
| **Company boundary** | Every row has `company_id`; `requireCompany` + `leadAccessWhere({ companyId })` |
| **Workspace boundary** | Client sends `x-workspace-id`; list/create/import scope by active workspace |
| **Cross-workspace read** | Lead in WS-A must **not** appear in `GET /leads` when header is WS-B |
| **Cross-workspace write** | `POST /leads` with WS-A header cannot create in WS-B body |
| **Cross-company** | User from Company X gets 404/403 on Company Y resource IDs |
| **One user, many workspaces** | Same `users.id`; `user_workspaces` join rows; **never** duplicate email in same company |
| **Invite existing member** | `POST /team/invitations` adds workspace membership (merge), not new user |
| **Invite UI** | Team invite uses **current sidebar workspace only**; more workspaces via member access drawer |

---

## How to run automated checks

```bash
# Static code scan (boot risks, silent catches, scope patterns)
npm run qa:audit -w server

# Terminal 1 — API server
npm run dev:server

# Terminal 2 — run QA suite (creates ephemeral test company, 48 tests all phases)
npm run qa:test -w server

# Or use your logged-in admin (set in .env):
# QA_API_BASE=http://127.0.0.1:4000/api/v1
# QA_EMAIL=you@company.com
# QA_PASSWORD=YourPassword1!
npm run qa:test -w server -- --use-env
```

Results print as `PASS` / `FAIL` per case. Exit code `1` if any fail.

---

## Phase 0 — Preconditions

- [ ] MySQL running, migrations applied
- [ ] Server on port 4000, client on 5173 (for manual UI pass)
- [ ] SMTP optional (OTP printed in dev console)
- [ ] Redis optional (queues inline without it)

---

## Phase 1 — Main (sidebar top → bottom)

### 1. Dashboard (`/dashboard`)

**Frontend APIs used:**
| Endpoint | RTK hook | Purpose |
|----------|----------|---------|
| `GET /analytics/dashboard` | (legacy stats) | KPI cache |
| `GET /analytics/dashboard-charts` | `useGetDashboardChartsQuery` | Charts |
| `GET /leads` | `useGetLeadsQuery` | New leads count |
| `GET /tasks` | `useGetTasksQuery` | Tasks due |
| `GET /activities` | `useGetActivitiesFeedQuery` | Activity feed |

**Test cases:**

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| D-01 | Dashboard loads WS-A | Login, select WS-A, open `/dashboard` | 200 on charts; no console errors |
| D-02 | Workspace switch | Switch to WS-B | Charts/leads counts change or empty if no data |
| D-03 | Missing workspace header | API call without `x-workspace-id` | Charts still scoped by company; leads need workspace |
| D-04 | Sales user scope | Login as sales rep | Only own leads in widgets |
| D-05 | Cross-company | Token from Co-A, WS header from Co-B | 403 |

**Isolation:** Dashboard charts use `getContext()` → `companyId` + `workspaceId` from header.

---

### 2. Leads (`/leads`)

**Key APIs:**
| Method | Path | UI |
|--------|------|-----|
| GET | `/leads` | Table/kanban |
| POST | `/leads` | Add lead modal |
| GET | `/leads/:id` | Detail page |
| PATCH | `/leads/:id` | Inline edit |
| DELETE | `/leads/:id` | Delete |
| POST | `/leads/import` | Import wizard (CSV) |
| POST | `/leads/export` | Export |
| POST | `/leads/bulk` | Bulk actions bar |
| POST | `/leads/resolve-by-ids` | Bulk selection |

**Test cases:**

| ID | Case | Expected |
|----|------|----------|
| L-01 | Single create | Lead in active WS only; `workspace_id` matches header |
| L-02 | List isolation | Create in WS-A; list with WS-B → 0 rows |
| L-03 | Get by ID cross-WS | `GET /leads/:id` from WS-B for WS-A lead → 404 |
| L-04 | CSV import 3 rows | All rows `workspace_id` = header WS |
| L-05 | Import empty rows | 400 validation |
| L-06 | Duplicate email | 202 duplicate queue OR merge per rules |
| L-07 | Bulk assign | Only selected IDs in same company |
| L-08 | Bulk delete | Soft delete; gone from list |
| L-09 | Export WS-A | Export excludes WS-B leads |
| L-10 | Filter + search | `filters` query respects workspace |
| L-11 | Sales visibility | Sales user sees only assigned/owned in WS |
| L-12 | Admin all WS | Company admin with no WS filter sees all allowed WS |

**CSV import sample (POST `/leads/import`):**
```json
{
  "rows": [
    { "contactName": "QA One", "email": "qa1@test.local", "company": "Acme", "phone": "+15551234001" },
    { "contactName": "QA Two", "email": "qa2@test.local", "company": "Beta", "phone": "+15551234002" }
  ]
}
```

---

### 3. Lead distribution (`/lead-distribution`)

| ID | Case | Expected |
|----|------|----------|
| LD-01 | Round-robin rules | Assigns within workspace |
| LD-02 | WS isolation | Rules per `workspace_id` |

---

### 4. Opportunities (`/opportunities`)

| ID | Case | Expected |
|----|------|----------|
| O-01 | List | Only `is_opportunity=true` in active WS |
| O-02 | Stage patch | Activity logged on lead |
| O-03 | Cross-WS | No bleed |

---

### 5. Pipeline (`/pipeline`)

| ID | Case | Expected |
|----|------|----------|
| P-01 | Kanban columns | Stages from WS setup |
| P-02 | Drag stage | PATCH opportunity stage |

---

### 6. Deals (`/deals`)

| ID | Case | Expected |
|----|------|----------|
| DE-01 | List scoped | Deals parent opportunity in WS |
| DE-02 | Create deal | Under opportunity in same WS |
| DE-03 | DELETE deal | Soft delete `is_deleted` |

---

### 7. Deal Payments (`/deal-payments`)

| ID | Case | Expected |
|----|------|----------|
| DP-01 | List all payments | Company + WS filter |
| DP-02 | Record payment | On deal in WS |

---

## Phase 2 — HR

### 8–12. HR Overview, Attendance, Leave, Leave requests, Approval, Config

| Module | Isolation note |
|--------|----------------|
| Attendance | Per user; company scoped |
| Leave | `workspace_id` on requests where applicable |
| Leave config | Company-level types/holidays |

*(Full case tables in automated run — extend `runModuleTests.js`)*

---

## Phase 3 — Engage

### 13–18. Activities, Tasks, Calendar, Meetings, Email, Templates

**Tasks isolation:** `GET /tasks` filters `companyId` + allowed `workspaceId`s.

**Email:** Lead-only mode fetches CRM threads for selected lead only.

---

## Phase 4 — Manage

### 19–22. Documents, Quotations, Invoices (+ templates)

Documents folder tree: Leads / Companies / Unlinked scoped by workspace lead links.

---

## Phase 5 — Automate

### 23–25. Workflows, Campaigns, Web forms

Campaign leads must match campaign `workspace_id`.

---

## Phase 6 — Insights & Settings

### 26. Reports (`/reports`)

All report endpoints: `requireCompany` + `x-workspace-id` in `getContext()`.

### 27–30. Workspace, Lead config, Team, Integrations

**Team / user rules (critical):**

| ID | Case | Expected |
|----|------|----------|
| T-01 | Invite new email | One `users` row + `user_workspaces` for current WS |
| T-02 | Invite existing member | **No new user**; `addWorkspaceMembershipsForUser` merges |
| T-03 | Invite UI | Only current workspace shown (not all WS chips) |
| T-04 | Member access drawer | Admin can add WS-2 without new user |
| T-05 | Accept invite 2nd WS | Merges membership; keeps WS-1 |
| T-06 | Email unique | Same email cannot exist in two companies |
| T-07 | `replaceUserWorkspaces` | Replaces full set (admin edit only) |

---

## Manual UI checklist (per module)

For each sidebar item:

1. Open page → no white screen / 403
2. Switch workspace in topbar → data refreshes
3. Create one record → appears only in that WS
4. Hard refresh → state persists
5. Open browser devtools → no failed API calls

---

## Regression cadence

| When | Run |
|------|-----|
| Before release | Full `npm run qa:test` + manual smoke |
| After leads/team change | L-* + T-* cases |
| After workspace middleware change | All isolation cases |

---

## Files

| File | Purpose |
|------|---------|
| `server/scripts/qa/runModuleTests.js` | Automated API regression |
| `QA_TEST_PLAN.md` | This document |
| `MODULES_AUDIT.md` | Feature gap inventory |
