# LeadFlow CRM (Connexify workspace)

Monorepo scaffold matching the LeadFlow stack: React 18 + Vite, Tailwind v3, Redux Toolkit + RTK Query, Express + Sequelize + MySQL 8, optional Redis.

## Prerequisites

- Node.js 20+
- MySQL 8 (create database and user matching `.env`)
- Optional: Redis for rate limiting and dashboard stat cache

## Setup

1. Copy environment files:

   ```bash
   cp .env.example .env
   cp .env.example server/.env
   ```

   Adjust secrets and database credentials.

2. Install dependencies (from repo root):

   ```bash
   npm install
   ```

3. Start the API (runs **Sequelize migrations** on boot: `companies`, `users.company_id` FK, etc.):

   ```bash
   npm run dev:server
   ```

   To run migrations only (from repo root):

   ```bash
   npm run db:migrate -w server
   ```

   The `users` table must already exist (from an earlier setup or your own schema) before the `add-company-id-to-users` migration can apply.

4. Register a user (creates a **company** row and links `users.company_id`):

   ```bash
   curl -X POST http://localhost:4000/api/v1/auth/register ^
     -H "Content-Type: application/json" ^
     -d "{\"name\":\"Admin\",\"companyName\":\"Acme Corp\",\"email\":\"admin@example.com\",\"password\":\"Str0ng!Pass1\",\"confirmPassword\":\"Str0ng!Pass1\",\"role\":\"admin\"}"
   ```

   Use the strong-password rules from `server/src/validations/auth.js`, then complete email verification (OTP) before signing in.

5. Start the client:

   ```bash
   npm run dev:client
   ```

   Open http://localhost:5173 — sign in with the account you created. The dashboard calls `/api/v1/analytics/dashboard` through the Vite proxy.

## Layout

- `client/` — React app (`src/features/*`, `src/components/ui`, RTK Query APIs).
- `server/` — Express API under `/api/v1` (`src/routes`, `src/controllers`, `src/models`).

## Next steps

Wire remaining Sequelize models (Lead, Contact, Pipeline, Task, Activity, Tag), further migrations, and RTK Query endpoints to match the module checklist in your project bible.

## Team access rollout

Use `TEAM_WORKSPACE_ROLLOUT.md` for environment setup, migration order, membership backfill, and smoke-test steps for the `/team` workspace-scoped access flow.
