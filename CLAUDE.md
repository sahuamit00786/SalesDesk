# Connexify — LeadFlow CRM

Enterprise CRM with sales automation, team collaboration, meeting AI, and HR features.

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
jobs/             Cron jobs (reminderJob, attendanceJob)
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
  attendance/     HR attendance tracking
  leave/          HR leave requests and balances
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
- `/attendance` — check-in/out
- `/leave` — requests, balance, types, holidays
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
- `attendanceJob` — daily attendance reset

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
| AttendanceLog | attendance_logs | HR check-in/out |
| LeaveRequest | leave_requests | HR leave workflow |
| LeaveBalance | leave_balance | Balance per user/type |
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

## Current Git Status (as of May 2026)

Modified files in active development:
- `client/src/features/leave/` — Leave balance card, public holiday manager, weekly off days manager
- `client/src/features/leave/leaveApi.js` — Leave API queries
- `client/src/pages/LeaveConfigPage.jsx` — Leave config UI
- `server/src/controllers/leaveController.js` — Leave backend logic
