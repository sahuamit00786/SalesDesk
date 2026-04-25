# Team + Workspace Rollout Guide

This guide configures the full team access flow implemented for `/team`.

## 1) Environment

- Confirm root `.env` values:
  - `CLIENT_ORIGIN=http://localhost:5173`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - `SMTP_FROM` (recommended for branded sender name)
- Keep `.env.example` aligned whenever env keys change.

## 2) Database Migration

Run from repository root:

```bash
npm run db:migrate -w server
```

This adds:
- `user_workspaces` join table
- `invitations.invited_workspace_ids` JSON column

## 3) Backfill Existing Members

For existing non-admin users, backfill workspace memberships once so they keep access:

```sql
INSERT INTO user_workspaces (id, user_id, workspace_id, created_at, updated_at)
SELECT UUID(), u.id, w.id, NOW(), NOW()
FROM users u
JOIN workspaces w ON w.company_id = u.company_id
LEFT JOIN user_workspaces uw ON uw.user_id = u.id AND uw.workspace_id = w.id
WHERE u.role_master_id NOT IN (0, 1)
  AND uw.id IS NULL;
```

## 4) Deploy Sequence

1. Deploy backend first (new routes + schema-aware controllers).
2. Run migration.
3. Deploy frontend (`/team` page + invitation accept page).
4. Restart server so env + mail settings are applied.

## 5) Smoke Tests

- Invite a user from `/team` with a selected role and 2 workspace assignments.
- Open invite email and confirm:
  - role appears
  - workspace list appears
  - secure link opens `/accept-invite`
- Accept invite with name/password and verify login succeeds.
- Confirm invited member sees only assigned workspaces in switcher.
- Confirm leads API returns only allowed workspace records when switching workspace.
- Deactivate a user and verify further login is blocked.

## 6) Permissions Check

- The acting admin needs `team:edit` for invites and `team:admin` for role/workspace updates.
- Read-only users can view team lists only if they have `team:view`.
