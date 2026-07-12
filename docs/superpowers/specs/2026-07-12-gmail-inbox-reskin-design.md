# Gmail-Style Email Page Reskin — Design

**Date:** 2026-07-12
**Status:** Approved
**Scope:** UI reskin only. No new server endpoints. Client wires existing-but-unused backend capability (`pageToken` pagination).

## Goal

Rebuild `/email` (`client/src/pages/EmailPage.jsx`) as a classic Gmail-style inbox: full-width row list that swaps to a full-page thread view, left sidebar with folders + CRM filters, pagination, and an inline reply box at the bottom of threads. All existing functionality preserved.

## Decisions (user-approved)

1. **Scope:** UI reskin only — existing backend endpoints, plus client-side wiring of `pageToken`/`nextPageToken` that `GET /email/mailbox-threads` already returns.
2. **Layout:** Classic Gmail swap — full-width row list; clicking a row replaces the list with a full-page thread view (back arrow returns). Not split-pane.
3. **Sidebar:** Compose button, Inbox (live unread badge), Sent, and a CRM filter section (All / Lead-linked / Has attachments / per-lead select). No fake Gmail folders (Starred/Drafts/Trash have no backend — omitted entirely).
4. **Reply UX:** Inline reply box at thread bottom (Gmail-style Reply / Reply All / Forward buttons that expand an editor in place). `EmailComposerDrawer` remains for "Compose" (new message).
5. **Approach:** Rebuild `EmailPage.jsx` in place at the same route. New presentational components; existing data hooks/logic reused.

## Constraints found in codebase

- `GmailThreadList.jsx` and `GmailThreadView.jsx` are **shared with `LeadDetailPage.jsx`** — they must not be modified or removed. New components are built for EmailPage only; `GmailMessageCard`, `GmailAvatar`, `GmailAttachmentChip`, and `gmailParserUtils` are reused as-is.
- Send API is lead-scoped: `POST /leads/:leadId/emails/send` (`useSendEmailForLeadMutation`). Every send needs a `leadId`.
- Composer editor is `contentEditable` + `document.execCommand` (see `EmailComposerDrawer.jsx`); the inline reply box reuses this pattern.
- Backend mailbox list supports: `box` (`inbox`|`sent`), `search`, `limit`, `pageToken`; returns `meta.nextPageToken`. Mark-read is per-thread. No star/archive/trash/draft endpoints — those affordances are intentionally absent from the UI.

## Layout

```
┌──────────┬──────────────────────────────────────────┐
│ Compose  │  [Search mail…                        ]  │
│          ├──────────────────────────────────────────┤
│ Inbox 42 │  ▢ ⟳          1–40 of many        ‹ ›   │  ← list toolbar
│ Sent     ├──────────────────────────────────────────┤
│ ──────   │ ▢ Slice    Payment received – Hi Amit…  5:35 PM │
│ FILTERS  │ ▢ Zomato   Birthday – Celebrating…     12:01 PM │
│ All      │ ▢ HDFC ③   Card payment – Dear… 📎     1:23 AM │
│ Lead-    │                                          │
│ linked   │  unread = bold text + white bg           │
│ Has 📎   │  read   = normal text + gray bg          │
│ Lead: ▾  │  lead chip on row when sender matches    │
└──────────┴──────────────────────────────────────────┘
```

When `threadId` present in URL, the list area (toolbar + rows) is replaced by the thread view:

```
┌──────────┬──────────────────────────────────────────┐
│ (same    │  ←  │ subject line          [View lead]  │  ← thread toolbar
│ sidebar) ├──────────────────────────────────────────┤
│          │  message card (collapsed older msgs)     │
│          │  message card (latest, expanded)         │
│          │  ┌ Reply ┐ ┌ Reply All ┐ ┌ Forward ┐     │
│          │  └ click → inline editor expands here ┘  │
└──────────┴──────────────────────────────────────────┘
```

Mobile (`< lg`): sidebar hidden behind a hamburger button in the list toolbar (slide-over drawer); list and thread swap by URL, same as desktop.

## Components

All new files under `client/src/features/email/inbox/`:

| Component | Responsibility |
|---|---|
| `EmailSidebar.jsx` | Compose button; Inbox item with unread badge (`useGetMailboxInboxBadgeQuery`); Sent item; CRM filter group: All / Lead-linked / Has-attachments toggles + lead `Select`. Active box/filter highlighted. |
| `EmailListToolbar.jsx` | Select-all checkbox (tri-state), refresh button, bulk "Mark read" action (appears when rows checked), pagination label `1–40` + prev/next buttons. |
| `EmailRowList.jsx` + `EmailRow` | Full-width rows: checkbox · sender name · message-count badge (when >1) · subject – snippet (single line, truncated) · attachment icon · lead chip (links to `/leads/:id`, stopPropagation) · date. Unread: bold + white bg. Read: gray bg. Hover: quick mark-read icon. Keyboard: Enter/Space opens. |
| `EmailThreadPane.jsx` | Toolbar (back arrow, subject, participants count, View-lead link) + message cards (`GmailMessageCard`) + `InlineReplyBox`. Attachment open/save-to-lead callbacks pass through unchanged. |
| `InlineReplyBox.jsx` | Collapsed state: Reply / Reply All / Forward buttons. Expanded: To/Cc fields (prefilled by same counterpart logic as today's `openReplyCompose`/`openReplyAllCompose`), contentEditable body with quoted text collapsed behind a "…" toggle, attachment upload (`useUploadEmailAttachmentsMutation`), Send via `useSendEmailForLeadMutation`. Lead requirement: auto-matched lead shown as chip; if no match, a compact lead `Select` renders inside the box and Send stays disabled until chosen. Forward: subject `Fwd:`, empty To, body = quoted message. |

`EmailPage.jsx` keeps: all queries, lead-matching maps (`leadByEmail`, `matchEmails` lookup), auto mark-read effect, attachment preview/save modal, connect-Google CTA, scope-missing banner, error banner, `EmailComposerDrawer` mount.

## Data flow

- **URL state:** `/email?box=inbox|sent&threadId=<id>`. `box` defaults to `inbox`. Both survive refresh/deep-link.
- **List fetching:** one `useGetMailboxThreadsQuery({ box, search, limit: 40, pageToken })` for the active box (replaces today's always-both inbox+sent merge). 20s polling only on inbox, page 1. Sent box: no polling, refetch on focus.
- **Pagination:** client keeps a `pageToken` stack in state. Next pushes `nextPageToken`; Prev pops. Label shows `start–end` from stack depth × limit (`of many` — Gmail API gives no total). Search/box/filter change resets the stack.
- **Lead-linked filter:** switches list source to `useGetEmailThreadsQuery` (CRM-stored lead threads; already supports `leadId`, `hasAttachments`, `search`). Pagination hidden in this mode (endpoint has its own `limit`).
- **Has-attachments filter:** client-side filter on mailbox rows (as today) / server param on lead threads (as today).
- **Thread fetch:** unchanged — `useGetMailboxThreadQuery` for mailbox threads, `useGetEmailThreadQuery` for CRM threads, `parseGmailThread`/`parseStoredThread`.
- **Bulk mark-read:** `Promise.allSettled` over `markMailboxThreadRead` for checked ids; RTK invalidation refreshes list + badge.
- **Auto-select removal:** today the first thread auto-selects; new behavior shows the list (Gmail-style) with nothing selected until user clicks.

## Edge cases

- Google not connected → existing full-page connect CTA (unchanged).
- Connected without Gmail read scope → existing amber banner; CRM lead threads still listed via Lead-linked filter.
- Mailbox API error → existing red banner with scope-reconnect hint.
- Selected `threadId` not in a loaded list → still fetch it (mailbox first, CRM fallback — same detection as today via known-id set; if unknown, try mailbox thread endpoint, fall back to CRM thread endpoint). Fetch 404 → toast + return to list.
- Empty page after pagination → empty state with "Back to first page".
- Search debounced 350ms; resets pagination and selection.
- Checked-row selection clears on box/filter/search/page change.

## Testing / verification

Repo has no client test infra. Verification is manual, end-to-end against the dev server:

1. Inbox loads rows; unread bold; badge matches sidebar count.
2. Row click → thread view; back arrow → list (scroll position preserved is nice-to-have, not required).
3. Inline Reply prefills counterpart + quoted body; send succeeds for lead-matched thread; non-matched thread demands lead pick.
4. Forward produces `Fwd:` + empty To.
5. Pagination next/prev across ≥3 pages; label updates; search reset works.
6. Sent box lists sent mail; no unread styling.
7. Bulk mark-read clears unread styling + decrements badge.
8. Deep-link `/email?box=sent&threadId=…` restores state.
9. Not-connected and scope-missing states render as before.
10. LeadDetailPage email tab unaffected (shared components untouched).
