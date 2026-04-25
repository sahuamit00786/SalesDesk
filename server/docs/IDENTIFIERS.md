# Public identifiers (UUIDs)

User-facing and cross-tenant identifiers (`users.id`, `leads.owner_user_id`, `team_members.user_id`, `invitations.invited_by`, `leads.workspace_id`, etc.) use **random UUIDs (v4)** instead of sequential integers.

**Why this matters for security**

- **Enumeration resistance:** Integer IDs are easy to guess (`/api/users/1`, `/api/users/2`). UUIDs are not practically enumerable from the outside, which reduces **insecure direct object reference (IDOR)** risk when access control is misconfigured or missing on an endpoint.
- **Opaque correlation:** UUIDs do not reveal sign-up order, table size, or business volume the way auto-increment IDs can.
- **Defense in depth:** Access must still be enforced on every route (authorization, tenant/workspace scoping). UUIDs are not a substitute for proper authZ; they narrow the blast radius when something is exposed by mistake.

Operational IDs that are never exposed in APIs or URLs may still use small integers where convenient (e.g. internal lookup tables).
