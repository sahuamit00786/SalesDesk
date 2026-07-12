# Gmail-Style Email Page Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/email` as a classic Gmail-style inbox: sidebar (Compose/Inbox/Sent/CRM filters), full-width row list with checkboxes + pagination, full-page thread view with inline reply box.

**Architecture:** `EmailPage.jsx` is rewritten in place. It keeps all existing RTK Query data logic (mailbox threads, CRM lead threads, lead matching, mark-read, attachments) and renders new presentational components from `client/src/features/email/inbox/`. URL carries `?box=inbox|sent&threadId=…`; when `threadId` is set the list area swaps to the thread pane. Pagination wires the backend's already-returned `nextPageToken`.

**Tech Stack:** React 18, Vite, RTK Query, Tailwind CSS (project tokens: `ink`, `ink-muted`, `surface-border`, `surface-muted`, `brand-*`), lucide-react, react-router-dom v7, DOMPurify (already a dep).

**Spec:** `docs/superpowers/specs/2026-07-12-gmail-inbox-reskin-design.md`

## Global Constraints

- No new npm dependencies.
- No new server endpoints; no server file changes.
- Do NOT modify `client/src/features/gmail/GmailThreadList.jsx` or `GmailThreadView.jsx` (shared with `LeadDetailPage.jsx`). Reuse `GmailMessageCard`, `GmailAvatar`, `GmailAttachmentChip`, `gmailParserUtils` as-is.
- Route stays `/email`. `EmailComposerDrawer` stays for "Compose" (new message).
- No fake affordances: no star/archive/trash/drafts UI (no backend).
- Send API is lead-scoped: `useSendEmailForLeadMutation` needs `leadId`.
- Repo has no client test infra — each task's gate is `npm run build` (exit 0) + the final manual verification checklist. Do not add a test framework.
- All new files live in `client/src/features/email/inbox/`.

---

### Task 1: List-mode building blocks — EmailSidebar, EmailListToolbar, EmailRowList

**Files:**
- Create: `client/src/features/email/inbox/EmailSidebar.jsx`
- Create: `client/src/features/email/inbox/EmailListToolbar.jsx`
- Create: `client/src/features/email/inbox/EmailRowList.jsx`

**Interfaces:**
- Consumes: `GmailAvatar` (default export, props `{ name, email, size }`), `formatEmailDate`/`formatEmailDateTime` from `gmailParserUtils`, `cn`, `Select` (named export), thread summary objects shaped like today's list rows: `{ threadId, subject, snippet, messageCount, hasAttachments, isUnread, lastMessageAt, lastDateFormatted, lastMessage: { from: { name, email }, to?: [{ name, email }] }, lead?: { id, title, contactName, email } }`.
- Produces (used by Task 3):
  - `EmailSidebar({ box, onBoxChange, unreadCount, unreadApproximate, filterMode, onFilterModeChange, hasAttachments, onHasAttachmentsChange, leadId, onLeadIdChange, leads, onCompose, composeDisabled, mobileOpen, onMobileClose })` — default export.
  - `EmailListToolbar({ allChecked, someChecked, onToggleAll, checkedCount, onBulkMarkRead, markingRead, onRefresh, refreshing, rangeLabel, onPrev, onNext, prevDisabled, nextDisabled, onOpenSidebar, showBulkMarkRead })` — default export.
  - `EmailRowList({ rows, box, checkedIds, onToggleChecked, onOpen, onMarkRead, loading, emptyHint, emptyAction })` — default export.

- [ ] **Step 1: Create `EmailSidebar.jsx`**

```jsx
import { Inbox, Paperclip, Pencil, Send, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Select } from '@/components/ui/Select'

function NavItem({ icon: Icon, label, active, onClick, badge = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-r-full py-2 pl-5 pr-3 text-sm transition-colors',
        active ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink hover:bg-surface-muted',
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
      {badge ? (
        <span className={cn('shrink-0 text-xs tabular-nums', active ? 'font-bold text-brand-800' : 'font-semibold text-ink')}>
          {badge}
        </span>
      ) : null}
    </button>
  )
}

function SidebarBody({
  box, onBoxChange,
  unreadCount, unreadApproximate,
  filterMode, onFilterModeChange,
  hasAttachments, onHasAttachmentsChange,
  leadId, onLeadIdChange, leads,
  onCompose, composeDisabled,
}) {
  const unreadBadge = unreadCount > 0 ? `${unreadCount}${unreadApproximate ? '+' : ''}` : null
  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto py-3 pr-2">
      <div className="mb-2 px-3">
        <button
          type="button"
          onClick={onCompose}
          disabled={composeDisabled}
          className="inline-flex h-11 items-center gap-2.5 rounded-2xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-800 disabled:opacity-50"
        >
          <Pencil size={15} />
          Compose
        </button>
      </div>
      <NavItem icon={Inbox} label="Inbox" active={box === 'inbox' && filterMode === 'all'} badge={unreadBadge}
        onClick={() => { onBoxChange('inbox'); onFilterModeChange('all') }} />
      <NavItem icon={Send} label="Sent" active={box === 'sent' && filterMode === 'all'}
        onClick={() => { onBoxChange('sent'); onFilterModeChange('all') }} />

      <p className="mb-1 mt-4 px-5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">CRM filters</p>
      <NavItem
        icon={(props) => <span {...props} className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current" />}
        label="Lead-linked mail"
        active={filterMode === 'lead-linked'}
        onClick={() => onFilterModeChange(filterMode === 'lead-linked' ? 'all' : 'lead-linked')}
      />
      <label className="flex cursor-pointer items-center gap-3 py-2 pl-5 pr-3 text-sm text-ink hover:bg-surface-muted">
        <Paperclip size={15} className="shrink-0 text-ink-muted" />
        <span className="flex-1">Has attachments</span>
        <input
          type="checkbox"
          checked={hasAttachments}
          onChange={(e) => onHasAttachmentsChange(e.target.checked)}
          className="rounded border-slate-300 text-brand-700"
        />
      </label>
      <div className="px-3 pt-1">
        <Select
          className="h-9 w-full rounded-lg text-xs"
          value={leadId}
          onChange={(e) => onLeadIdChange(e.target.value)}
          aria-label="Filter by lead"
        >
          <option value="">All leads</option>
          {leads.filter((l) => l.email).map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.title || lead.contactName || lead.email}
              {lead.isOpportunity ? ' (Opportunity)' : ''}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

export default function EmailSidebar({ mobileOpen, onMobileClose, ...body }) {
  return (
    <>
      <aside className="hidden w-[220px] shrink-0 border-r border-surface-border bg-surface-muted/20 lg:block">
        <SidebarBody {...body} />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} role="presentation" />
          <div className="absolute inset-y-0 left-0 w-[260px] bg-white shadow-2xl">
            <div className="flex items-center justify-end px-2 pt-2">
              <button type="button" onClick={onMobileClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted" aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <SidebarBody {...body} />
          </div>
        </div>
      ) : null}
    </>
  )
}
```

- [ ] **Step 2: Create `EmailListToolbar.jsx`**

```jsx
import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, MailOpen, Menu, RefreshCcw } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function EmailListToolbar({
  allChecked, someChecked, onToggleAll,
  checkedCount, onBulkMarkRead, markingRead, showBulkMarkRead,
  onRefresh, refreshing,
  rangeLabel, onPrev, onNext, prevDisabled, nextDisabled,
  onOpenSidebar,
}) {
  const checkboxRef = useRef(null)
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = !allChecked && someChecked
  }, [allChecked, someChecked])
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-surface-border bg-white px-2 py-1.5 sm:px-3">
      <button type="button" onClick={onOpenSidebar} className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted lg:hidden" aria-label="Open menu">
        <Menu size={16} />
      </button>
      <label className="flex cursor-pointer items-center justify-center rounded-lg p-2 hover:bg-surface-muted" title="Select all on page">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allChecked}
          onChange={onToggleAll}
          className="h-3.5 w-3.5 rounded border-slate-400 text-brand-700"
          aria-label="Select all conversations on this page"
        />
      </label>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted disabled:opacity-50"
        title="Refresh"
        aria-label="Refresh"
      >
        <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
      </button>
      {checkedCount > 0 && showBulkMarkRead ? (
        <button
          type="button"
          onClick={onBulkMarkRead}
          disabled={markingRead}
          className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-muted disabled:opacity-50"
        >
          <MailOpen size={13} />
          {markingRead ? 'Marking…' : `Mark ${checkedCount} read`}
        </button>
      ) : null}
      <div className="ml-auto flex items-center gap-0.5">
        {rangeLabel ? <span className="mr-1 text-xs tabular-nums text-ink-muted">{rangeLabel}</span> : null}
        <button type="button" onClick={onPrev} disabled={prevDisabled}
          className={cn('rounded-lg p-2 text-ink-muted hover:bg-surface-muted', prevDisabled && 'opacity-40 hover:bg-transparent')}
          aria-label="Newer page">
          <ChevronLeft size={16} />
        </button>
        <button type="button" onClick={onNext} disabled={nextDisabled}
          className={cn('rounded-lg p-2 text-ink-muted hover:bg-surface-muted', nextDisabled && 'opacity-40 hover:bg-transparent')}
          aria-label="Older page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `EmailRowList.jsx`**

```jsx
import { Link } from 'react-router-dom'
import { MailOpen, Paperclip, UserRound } from 'lucide-react'
import { cn } from '@/utils/cn'
import { SkeletonEmailList } from '@/components/shared/SkeletonLoader'
import { formatEmailDateTime } from '@/features/gmail/gmailParserUtils'

function rowSenderLabel(thread, box) {
  if (box === 'sent') {
    const first = (thread.lastMessage?.to || [])[0]
    const label = first?.name && first.name !== 'Unknown' ? first.name : first?.email
    return label ? `To: ${label}` : 'To: —'
  }
  const from = thread.lastMessage?.from
  return from?.name && from.name !== 'Unknown' ? from.name : from?.email || 'Conversation'
}

function EmailRow({ thread, box, checked, onToggleChecked, onOpen, onMarkRead }) {
  const leadLabel = thread.lead?.id
    ? thread.lead.title || thread.lead.contactName || thread.lead.email || 'Lead'
    : ''
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(thread.threadId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(thread.threadId)
        }
      }}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-2 border-b border-surface-border px-2 py-2 text-left transition-colors sm:px-3',
        thread.isUnread ? 'bg-white hover:shadow-sm' : 'bg-surface-muted/40 hover:bg-surface-muted/70',
      )}
    >
      <label className="flex shrink-0 items-center justify-center rounded p-1.5" onClick={(e) => e.stopPropagation()} role="presentation">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggleChecked(thread.threadId)}
          className="h-3.5 w-3.5 rounded border-slate-400 text-brand-700"
          aria-label={`Select conversation ${thread.subject}`}
        />
      </label>
      <span className={cn('w-[130px] shrink-0 truncate text-[13px] sm:w-[180px]', thread.isUnread ? 'font-bold text-ink' : 'text-ink-muted')}>
        {rowSenderLabel(thread, box)}
        {thread.messageCount > 1 ? <span className="ml-1 font-normal text-ink-muted">({thread.messageCount})</span> : null}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px]">
        <span className={cn(thread.isUnread ? 'font-bold text-ink' : 'text-ink')}>{thread.subject}</span>
        {thread.snippet ? <span className="text-ink-muted"> — {thread.snippet}</span> : null}
      </span>
      {thread.hasAttachments ? <Paperclip size={13} className="shrink-0 text-ink-muted" /> : null}
      {leadLabel ? (
        <Link
          to={`/leads/${thread.lead.id}`}
          onClick={(e) => e.stopPropagation()}
          className="hidden max-w-[140px] shrink-0 items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-100 md:inline-flex"
        >
          <UserRound size={9} className="shrink-0" />
          <span className="truncate">{leadLabel}</span>
        </Link>
      ) : null}
      <span className="relative flex w-[74px] shrink-0 items-center justify-end">
        <span
          className={cn('text-[11px] tabular-nums', thread.isUnread ? 'font-bold text-ink' : 'text-ink-muted', onMarkRead && thread.isUnread && 'group-hover:invisible')}
          title={formatEmailDateTime(thread.lastMessageAt)}
        >
          {thread.lastDateFormatted}
        </span>
        {onMarkRead && thread.isUnread ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMarkRead(thread.threadId) }}
            className="invisible absolute right-0 rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink group-hover:visible"
            title="Mark as read"
            aria-label="Mark as read"
          >
            <MailOpen size={14} />
          </button>
        ) : null}
      </span>
    </div>
  )
}

export default function EmailRowList({ rows, box, checkedIds, onToggleChecked, onOpen, onMarkRead, loading, emptyHint, emptyAction = null }) {
  if (loading && rows.length === 0) return <SkeletonEmailList rows={10} />
  if (rows.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-xs text-ink-muted">
        <p className="text-sm font-medium text-ink">No conversations here.</p>
        {emptyHint ? <p className="mx-auto mt-2 max-w-md leading-relaxed">{emptyHint}</p> : null}
        {emptyAction}
      </div>
    )
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {rows.map((thread) => (
        <EmailRow
          key={thread.threadId}
          thread={thread}
          box={box}
          checked={checkedIds.has(thread.threadId)}
          onToggleChecked={onToggleChecked}
          onOpen={onOpen}
          onMarkRead={onMarkRead}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

Run (from repo root): `npm run build`
Expected: exit 0 (new files compile; nothing imports them yet).

- [ ] **Step 5: Commit**

```bash
git add client/src/features/email/inbox/EmailSidebar.jsx client/src/features/email/inbox/EmailListToolbar.jsx client/src/features/email/inbox/EmailRowList.jsx
git commit -m "feat(email): Gmail-style sidebar, list toolbar, row list components"
```

---

### Task 2: Thread mode — EmailThreadPane + InlineReplyBox

**Files:**
- Create: `client/src/features/email/inbox/InlineReplyBox.jsx`
- Create: `client/src/features/email/inbox/EmailThreadPane.jsx`

**Interfaces:**
- Consumes: `GmailMessageCard` (default export, props `{ message, defaultExpanded, mailboxMode, onOpenAttachment, onSaveAttachmentToLead }`), `buildReplyQuoteHtml(message)`, `useSendEmailForLeadMutation`, `useUploadEmailAttachmentsMutation`, `Select`, `IconInput`, parsed thread objects from `parseGmailThread`/`parseStoredThread`: `{ threadId, subject, participants, messages[], lastMessage, messageCount }` where each message has `{ id, subject, from: {name,email}, to: [{name,email}], cc: [{name,email}], date, dateFormatted, bodyHtml, bodyText, snippet, attachments }`.
- Produces (used by Task 3):
  - `EmailThreadPane({ thread, loading, onBack, viewLeadId, mailboxMode, onOpenAttachment, onSaveAttachmentToLead, myEmail, leads, leadByEmail, onSent })` — default export.
  - `InlineReplyBox({ thread, myEmail, leads, leadByEmail, defaultLeadId, onSent })` — default export (rendered by EmailThreadPane).

- [ ] **Step 1: Create `InlineReplyBox.jsx`**

Counterpart/CC prefill logic is copied from today's `openReplyCompose`/`openReplyAllCompose` in `EmailPage.jsx` (that page is rewritten in Task 3, so this box becomes the only home of reply prefill for the inbox).

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Bold, ChevronDown, ChevronUp, Ellipsis, Forward, Italic, Link2, List, ListOrdered,
  Paperclip, Reply, ReplyAll, Underline, X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Select } from '@/components/ui/Select'
import { useSendEmailForLeadMutation, useUploadEmailAttachmentsMutation } from '@/features/email/emailApi'
import { buildReplyQuoteHtml } from '@/features/email/buildReplyQuoteHtml'

const GMAIL_ATTACHMENT_SOFT_CAP = 24 * 1024 * 1024

function normalizeRecipients(value) {
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean)
}

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Reply target: if I sent the last message, reply to its first recipient, not myself. */
function counterpartOf(last, myEmail) {
  const fromEmail = String(last?.from?.email || '').trim().toLowerCase()
  return fromEmail && fromEmail !== myEmail ? last.from : (last?.to || [])[0] || null
}

function replyAllCc(thread, myEmail, counterpartEmail) {
  const last = thread?.lastMessage
  const fromEmail = String(last?.from?.email || '').trim().toLowerCase()
  const seen = new Set([fromEmail, myEmail, counterpartEmail].filter(Boolean))
  const cc = []
  for (const msg of thread?.messages || []) {
    for (const addr of [...(msg.to || []), ...(msg.cc || [])]) {
      const e = String(addr?.email || '').trim().toLowerCase()
      if (!e || seen.has(e)) continue
      seen.add(e)
      cc.push(addr.email.trim())
    }
  }
  return cc.join(', ')
}

export default function InlineReplyBox({ thread, myEmail, leads, leadByEmail, defaultLeadId, onSent }) {
  const editorRef = useRef(null)
  const [mode, setMode] = useState(null) // null | 'reply' | 'replyAll' | 'forward'
  const [leadId, setLeadId] = useState('')
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState('')
  const [quotedHtml, setQuotedHtml] = useState('')
  const [showQuote, setShowQuote] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState([])
  const [sendEmail, { isLoading: sending }] = useSendEmailForLeadMutation()
  const [uploadAttachments, { isLoading: uploading }] = useUploadEmailAttachmentsMutation()

  const last = thread?.lastMessage
  const counterpart = useMemo(() => counterpartOf(last, myEmail), [last, myEmail])
  const counterpartEmail = String(counterpart?.email || '').trim().toLowerCase()
  const matchedLead = counterpartEmail ? leadByEmail.get(counterpartEmail) : null

  // Collapse the box whenever the user navigates to a different thread.
  useEffect(() => {
    setMode(null)
  }, [thread?.threadId])

  function open(nextMode) {
    if (!last) return
    const baseSubject = String(thread?.subject || '').replace(/^(re|fwd):\s*/i, '')
    if (nextMode === 'forward') {
      setToInput('')
      setCcInput('')
      setShowCc(false)
      setSubject(`Fwd: ${baseSubject}`)
    } else {
      setToInput(matchedLead?.email || counterpart?.email || '')
      setCcInput(nextMode === 'replyAll' ? replyAllCc(thread, myEmail, counterpartEmail) : '')
      setShowCc(nextMode === 'replyAll')
      setSubject(`Re: ${baseSubject}`)
    }
    setLeadId(matchedLead?.id || defaultLeadId || '')
    setQuotedHtml(buildReplyQuoteHtml(last))
    setShowQuote(false)
    setUploadedAttachments([])
    setMode(nextMode)
    window.setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '<p><br></p>'
        document.execCommand('defaultParagraphSeparator', false, 'p')
        editorRef.current.focus()
      }
    }, 0)
  }

  function execCmd(command, value = undefined) {
    editorRef.current?.focus()
    document.execCommand(command, false, value ?? null)
  }

  function handleToolbarMouseDown(e, command, value) {
    e.preventDefault()
    execCmd(command, value)
  }

  function handleLinkMouseDown(e) {
    e.preventDefault()
    const url = window.prompt('Enter URL')
    if (url) execCmd('createLink', url)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const tooLarge = files.find((f) => f.size > GMAIL_ATTACHMENT_SOFT_CAP)
    if (tooLarge) {
      toast.error(`File too large (max 24 MB): ${tooLarge.name}`)
      return
    }
    const existingBytes = uploadedAttachments.reduce((sum, a) => sum + (Number(a.sizeBytes) || 0), 0)
    const incomingBytes = files.reduce((sum, f) => sum + f.size, 0)
    if (existingBytes + incomingBytes > GMAIL_ATTACHMENT_SOFT_CAP) {
      toast.error('Total attachments exceed the ~24 MB Gmail limit.')
      return
    }
    try {
      const res = await uploadAttachments(files).unwrap()
      const rows = Array.isArray(res?.data) ? res.data : []
      setUploadedAttachments((prev) => [...prev, ...rows])
      e.target.value = ''
    } catch {
      toast.error('Upload failed')
    }
  }

  async function handleSend() {
    if (!leadId) return toast.error('Pick a lead to send from the CRM')
    const to = normalizeRecipients(toInput)
    if (!to.length) return toast.error('At least one recipient is required')
    const written = editorRef.current?.innerHTML || '<p><br></p>'
    const bodyHtml = quotedHtml ? `${written}${quotedHtml}` : written
    try {
      await sendEmail({
        leadId,
        to,
        cc: normalizeRecipients(ccInput),
        bcc: [],
        subject,
        bodyHtml,
        attachments: uploadedAttachments,
        // Forward starts a new thread; replies stay in this one.
        threadId: mode === 'forward' ? null : thread?.threadId || null,
      }).unwrap()
      toast.success('Email sent')
      setMode(null)
      onSent?.()
    } catch {
      toast.error('Could not send email')
    }
  }

  if (!last) return null

  if (!mode) {
    return (
      <div className="flex gap-2 px-1 py-3">
        <button type="button" onClick={() => open('reply')}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-surface-border bg-white px-4 text-[13px] font-semibold text-ink hover:bg-surface-muted">
          <Reply size={14} /> Reply
        </button>
        {(thread?.participants?.length || 0) > 2 || (last?.cc || []).length > 0 ? (
          <button type="button" onClick={() => open('replyAll')}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-surface-border bg-white px-4 text-[13px] font-semibold text-ink hover:bg-surface-muted">
            <ReplyAll size={14} /> Reply all
          </button>
        ) : null}
        <button type="button" onClick={() => open('forward')}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-surface-border bg-white px-4 text-[13px] font-semibold text-ink hover:bg-surface-muted">
          <Forward size={14} /> Forward
        </button>
      </div>
    )
  }

  return (
    <div className="mb-2 rounded-xl border border-surface-border bg-white shadow-md">
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
          {mode === 'forward' ? <Forward size={13} /> : mode === 'replyAll' ? <ReplyAll size={13} /> : <Reply size={13} />}
          {mode === 'forward' ? 'Forward' : mode === 'replyAll' ? 'Reply all' : 'Reply'}
        </span>
        {matchedLead ? (
          <span className="truncate rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
            Lead: {matchedLead.title || matchedLead.contactName || matchedLead.email}
          </span>
        ) : (
          <Select className="h-7 max-w-[240px] rounded-lg text-[11px]" value={leadId} onChange={(e) => setLeadId(e.target.value)} aria-label="Send as lead email">
            <option value="">Pick lead to send…</option>
            {leads.filter((l) => l.email).map((l) => (
              <option key={l.id} value={l.id}>{l.title || l.contactName || l.email}</option>
            ))}
          </Select>
        )}
        <button type="button" onClick={() => setMode(null)} className="ml-auto rounded-lg p-1 text-ink-muted hover:bg-surface-muted" aria-label="Discard draft">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-1.5 px-3 pt-2">
        <div className="flex items-center gap-2 border-b border-surface-border/70 pb-1.5">
          <span className="w-8 shrink-0 text-[11px] text-ink-muted">To</span>
          <input
            type="text"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            placeholder="recipient@example.com"
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button type="button" onClick={() => setShowCc((v) => !v)} className="shrink-0 text-[11px] text-ink-muted hover:text-ink">
            Cc {showCc ? <ChevronUp size={10} className="inline" /> : <ChevronDown size={10} className="inline" />}
          </button>
        </div>
        {showCc ? (
          <div className="flex items-center gap-2 border-b border-surface-border/70 pb-1.5">
            <span className="w-8 shrink-0 text-[11px] text-ink-muted">Cc</span>
            <input
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              placeholder="cc@example.com"
              className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2 border-b border-surface-border/70 pb-1.5">
          <span className="w-8 shrink-0 text-[11px] text-ink-muted">Sub</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none"
            aria-label="Subject"
          />
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'max-h-[40vh] min-h-[120px] overflow-y-auto px-4 py-3 text-sm text-ink outline-none',
          '[&_p]:mb-2 [&_p:last-child]:mb-0',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2',
          '[&_a]:text-brand-600 [&_a]:underline',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted',
        )}
      />

      {quotedHtml ? (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setShowQuote((v) => !v)}
            className="rounded-full border border-surface-border bg-surface-muted/60 px-2 py-0.5 text-ink-muted hover:bg-surface-muted"
            title={showQuote ? 'Hide quoted text' : 'Show quoted text'}
            aria-label={showQuote ? 'Hide quoted text' : 'Show quoted text'}
          >
            <Ellipsis size={14} />
          </button>
          {showQuote ? (
            <div
              className="mt-2 max-h-[30vh] overflow-y-auto rounded-lg border border-surface-border bg-surface-muted/30 px-3 py-2 text-xs text-ink-muted"
              // buildReplyQuoteHtml output is DOMPurify-sanitized
              dangerouslySetInnerHTML={{ __html: quotedHtml }}
            />
          ) : null}
        </div>
      ) : null}

      {uploadedAttachments.length ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {uploadedAttachments.map((a, i) => (
            <span key={`${a.fileUrl}-${i}`} className="inline-flex max-w-[200px] items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-ink">
              <Paperclip size={10} className="shrink-0 text-ink-muted" />
              <span className="truncate">{a.fileName}</span>
              {a.sizeBytes ? <span className="shrink-0 text-ink-faint">{formatBytes(a.sizeBytes)}</span> : null}
              <button
                type="button"
                onClick={() => setUploadedAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="ml-0.5 shrink-0 rounded-full p-0.5 text-ink-muted hover:bg-slate-100 hover:text-ink"
                aria-label={`Remove ${a.fileName}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-0.5 border-t border-surface-border px-3 py-2">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || uploading || !leadId}
          className="mr-2 h-9 rounded-full bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
        {[
          { icon: Bold, cmd: 'bold', title: 'Bold' },
          { icon: Italic, cmd: 'italic', title: 'Italic' },
          { icon: Underline, cmd: 'underline', title: 'Underline' },
          { icon: List, cmd: 'insertUnorderedList', title: 'Bullet list' },
          { icon: ListOrdered, cmd: 'insertOrderedList', title: 'Numbered list' },
        ].map(({ icon: Icon, cmd, title }) => (
          <button key={cmd} type="button" title={title} onMouseDown={(e) => handleToolbarMouseDown(e, cmd)}
            className="rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink">
            <Icon size={14} />
          </button>
        ))}
        <button type="button" title="Insert link" onMouseDown={handleLinkMouseDown} className="rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink">
          <Link2 size={14} />
        </button>
        <label className="cursor-pointer rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink" title="Attach files">
          <Paperclip size={14} />
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {!leadId ? <span className="ml-2 text-[11px] text-amber-700">Pick a lead above to enable Send</span> : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `EmailThreadPane.jsx`**

```jsx
import { ArrowLeft, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import GmailMessageCard from '@/features/gmail/GmailMessageCard'
import { SkeletonEmailList } from '@/components/shared/SkeletonLoader'
import InlineReplyBox from '@/features/email/inbox/InlineReplyBox'

export default function EmailThreadPane({
  thread, loading, onBack, viewLeadId,
  mailboxMode, onOpenAttachment, onSaveAttachmentToLead,
  myEmail, leads, leadByEmail, onSent,
}) {
  if (loading && !thread) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <SkeletonEmailList rows={4} />
      </div>
    )
  }
  if (!thread) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-white p-8 text-center">
        <p className="text-sm font-medium text-ink">Conversation not found.</p>
        <button type="button" onClick={onBack} className="text-xs font-semibold text-brand-700 hover:underline">
          Back to inbox
        </button>
      </div>
    )
  }
  const participants = (thread.participants || []).map((p) => p.name || p.email).filter(Boolean)
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-surface-border px-2 py-2 sm:px-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
          aria-label="Back to list"
          title="Back to list"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-snug text-ink sm:text-base">{thread.subject}</h1>
          <p className="truncate text-[11px] text-ink-muted">
            {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}
            {participants.length ? ` · ${participants.join(', ')}` : ''}
          </p>
        </div>
        {viewLeadId ? (
          <Link
            to={`/leads/${viewLeadId}`}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 text-xs font-semibold text-green-700 hover:bg-green-100"
          >
            <UserRound size={13} />
            View lead
          </Link>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-muted/20 px-2 py-2 sm:px-4 sm:py-3">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          {thread.messages.map((message, idx) => (
            <GmailMessageCard
              key={message.id}
              message={message}
              defaultExpanded={idx === thread.messages.length - 1}
              mailboxMode={mailboxMode}
              onOpenAttachment={onOpenAttachment}
              onSaveAttachmentToLead={onSaveAttachmentToLead}
            />
          ))}
          <InlineReplyBox
            thread={thread}
            myEmail={myEmail}
            leads={leads}
            leadByEmail={leadByEmail}
            defaultLeadId={viewLeadId || ''}
            onSent={onSent}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add client/src/features/email/inbox/InlineReplyBox.jsx client/src/features/email/inbox/EmailThreadPane.jsx
git commit -m "feat(email): thread pane with inline reply box"
```

---

### Task 3: Rewrite EmailPage — URL state, single-box fetching, pagination, bulk mark-read

**Files:**
- Modify: `client/src/pages/EmailPage.jsx` (full rewrite of the component body; imports of removed pieces dropped)

**Interfaces:**
- Consumes: everything produced by Tasks 1–2, plus existing hooks: `useGetMailboxThreadsQuery`, `useGetMailboxThreadQuery`, `useGetMailboxInboxBadgeQuery`, `useMarkMailboxThreadReadMutation`, `useSaveMailboxAttachmentToLeadMutation`, `useGetEmailThreadsQuery`, `useGetEmailThreadQuery`, `useSyncEmailRepliesMutation`, `useGetGoogleEmailStatusQuery`, `useGetLeadsQuery`, `useSyncLeadEmailsMutation`, `parseGmailThread`, `parseStoredThread`, `EmailComposerDrawer`, `PageShell`.
- Produces: the `/email` route page. No other file imports from it.

Behavior contract (all from spec):
- URL: `?box=inbox|sent` (default `inbox`) + `?threadId=`. Both deep-linkable.
- One mailbox list query for the active box; `limit: 40`; `pageToken` from a token-stack state (`{ tokens: [undefined], pageIndex: 0 }`); Next pushes `meta.nextPageToken`, Prev decrements. Range label `${pageIndex*40 + 1}–${pageIndex*40 + rows.length}`. Stack resets on box/search/filter change.
- 20s polling only when `box === 'inbox' && pageIndex === 0`.
- `filterMode === 'lead-linked'` (or a `leadId` filter) switches the list source to `useGetEmailThreadsQuery` (CRM threads); pagination controls hidden.
- No auto-select of first thread. Opening an unread mailbox thread marks it read (after its data loads). Bulk mark-read = `Promise.allSettled` over checked ids.
- Deep-linked unknown threadId: try mailbox endpoint when connected with scope; if it errors/returns null, fall back to CRM thread endpoint; both empty → "Conversation not found" state in pane.
- Checked selection clears on box/filter/search/page/thread change.
- Existing preserved verbatim: connect CTA, scope-missing banner, error banner, attachment preview/save modal, composer drawer, lead matching (`matchEmails` → `useGetLeadsQuery({ emails })` → `leadByEmail`).

- [ ] **Step 1: Rewrite `client/src/pages/EmailPage.jsx`**

```jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { PageShell } from '@/components/layout/PageShell'
import { Select } from '@/components/ui/Select'
import { IconInput } from '@/components/ui/IconInput'
import EmailSidebar from '@/features/email/inbox/EmailSidebar'
import EmailListToolbar from '@/features/email/inbox/EmailListToolbar'
import EmailRowList from '@/features/email/inbox/EmailRowList'
import EmailThreadPane from '@/features/email/inbox/EmailThreadPane'
import { parseGmailThread, parseStoredThread } from '@/features/gmail/gmailParserUtils'
import {
  useGetEmailThreadQuery,
  useGetEmailThreadsQuery,
  useGetMailboxInboxBadgeQuery,
  useGetMailboxThreadQuery,
  useGetMailboxThreadsQuery,
  useMarkMailboxThreadReadMutation,
  useSaveMailboxAttachmentToLeadMutation,
  useSyncEmailRepliesMutation,
} from '@/features/email/emailApi'
import { EmailComposerDrawer } from '@/features/email/EmailComposerDrawer'
import { useGetGoogleEmailStatusQuery, useGetLeadsQuery, useSyncLeadEmailsMutation } from '@/features/leads/leadsApi'
import { readAuthFromStorage } from '@/features/auth/authSlice'
import { useAppSelector } from '@/app/hooks'
import { selectResolvedActiveWorkspaceId } from '@/features/workspace/workspaceSlice'

const PAGE_SIZE = 40

export function EmailPage() {
  const navigate = useNavigate()
  const workspaceId = useAppSelector(selectResolvedActiveWorkspaceId)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedThreadId = searchParams.get('threadId')
  const box = searchParams.get('box') === 'sent' ? 'sent' : 'inbox'

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'lead-linked'
  const [leadId, setLeadId] = useState('')
  const [hasAttachments, setHasAttachments] = useState(false)
  const [pageTokens, setPageTokens] = useState([undefined])
  const [pageIndex, setPageIndex] = useState(0)
  const [checkedIds, setCheckedIds] = useState(() => new Set())
  const [bulkMarking, setBulkMarking] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeInitial, setComposeInitial] = useState(null)
  const [saveTarget, setSaveTarget] = useState(null)
  const [saveLeadId, setSaveLeadId] = useState('')

  const setUrlState = useCallback(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v)
            else next.delete(k)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )
  const selectThread = useCallback((id) => setUrlState({ threadId: id || null }), [setUrlState])
  const changeBox = useCallback((nextBox) => setUrlState({ box: nextBox === 'sent' ? 'sent' : null, threadId: null }), [setUrlState])

  const { data: googleEmailStatus } = useGetGoogleEmailStatusQuery()
  const googleEmailConnected = Boolean(googleEmailStatus?.data?.connected)
  const googleReadMailbox = googleEmailStatus?.data?.readMailbox
  const googleInboxScopeMissing = googleEmailConnected && googleReadMailbox === false
  const skipMailboxApi = !googleEmailConnected || googleInboxScopeMissing
  const myEmail = String(googleEmailStatus?.data?.email || '').trim().toLowerCase()

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  const crmMode = filterMode === 'lead-linked' || Boolean(leadId)

  // Pagination + selection reset whenever the list identity changes.
  useEffect(() => {
    setPageTokens([undefined])
    setPageIndex(0)
    setCheckedIds(new Set())
  }, [box, debouncedSearch, crmMode, leadId, hasAttachments])
  useEffect(() => {
    setCheckedIds(new Set())
  }, [pageIndex, selectedThreadId])

  const { data: badgeRes } = useGetMailboxInboxBadgeQuery(undefined, {
    skip: skipMailboxApi,
    pollingInterval: 30000,
  })

  const mailboxParams = useMemo(
    () => ({ box, search: debouncedSearch || undefined, limit: PAGE_SIZE, pageToken: pageTokens[pageIndex] }),
    [box, debouncedSearch, pageTokens, pageIndex],
  )
  const {
    data: mailboxRes,
    isFetching: loadingMailbox,
    isError: mailboxError,
    error: mailboxErrorDetail,
    refetch: refetchMailbox,
  } = useGetMailboxThreadsQuery(mailboxParams, {
    skip: skipMailboxApi || crmMode,
    pollingInterval: box === 'inbox' && pageIndex === 0 ? 20000 : 0,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })

  const crmQuery = useMemo(
    () => ({ search: debouncedSearch || undefined, leadId: leadId || undefined, hasAttachments: hasAttachments || undefined, limit: 80 }),
    [debouncedSearch, leadId, hasAttachments],
  )
  const { data: crmThreadsRes, isFetching: loadingCrmThreads, refetch: refetchCrm } = useGetEmailThreadsQuery(crmQuery, {
    skip: !googleEmailConnected || !crmMode,
  })

  const rawMailboxThreads = useMemo(() => (Array.isArray(mailboxRes?.data) ? mailboxRes.data : []), [mailboxRes?.data])
  const rawCrmThreads = useMemo(() => (Array.isArray(crmThreadsRes?.data) ? crmThreadsRes.data : []), [crmThreadsRes?.data])
  const nextPageToken = mailboxRes?.meta?.nextPageToken || null

  const [syncReplies, { isLoading: syncingAll }] = useSyncEmailRepliesMutation()
  const [syncLeadEmails, { isLoading: syncingLead }] = useSyncLeadEmailsMutation()
  const [markMailboxThreadRead] = useMarkMailboxThreadReadMutation()
  const [saveAttachment, { isLoading: savingAtt }] = useSaveMailboxAttachmentToLeadMutation()
  const { data: leadsData } = useGetLeadsQuery({ page: 1, limit: 400, search: '' }, { skip: !googleEmailConnected })
  const leads = useMemo(() => (Array.isArray(leadsData?.data) ? leadsData.data : []), [leadsData?.data])

  // The broad `leads` fetch above is capped server-side (most-recently-created first), so an
  // older lead's email can silently miss it. Look up exactly the sender emails currently on
  // screen so matching (list chips, inline-reply lead prefill) doesn't depend on recency.
  const matchEmails = useMemo(() => {
    const set = new Set()
    for (const t of rawMailboxThreads) {
      const e = String(t.lastMessage?.from?.email || '').toLowerCase().trim()
      if (e) set.add(e)
    }
    return Array.from(set)
  }, [rawMailboxThreads])
  const { data: matchedLeadsData } = useGetLeadsQuery(
    { emails: matchEmails.join(',') },
    { skip: !googleEmailConnected || !matchEmails.length },
  )
  const matchedLeads = useMemo(
    () => (Array.isArray(matchedLeadsData?.data) ? matchedLeadsData.data : []),
    [matchedLeadsData?.data],
  )

  const leadByEmail = useMemo(() => {
    const m = new Map()
    for (const l of leads) {
      const e = String(l.email || '').toLowerCase().trim()
      if (e) m.set(e, l)
    }
    for (const l of matchedLeads) {
      const e = String(l.email || '').toLowerCase().trim()
      if (e) m.set(e, l)
    }
    return m
  }, [leads, matchedLeads])

  const rows = useMemo(() => {
    const source = crmMode ? rawCrmThreads : rawMailboxThreads
    let list = source.map((t) => {
      if (t.lead?.id) return t
      const senderEmail = String(t.lastMessage?.from?.email || '').toLowerCase().trim()
      const matched = senderEmail ? leadByEmail.get(senderEmail) : null
      if (!matched) return t
      return { ...t, lead: { id: matched.id, title: matched.title, contactName: matched.contactName, email: matched.email } }
    })
    if (hasAttachments && !crmMode) list = list.filter((t) => t.hasAttachments)
    if (crmMode) list = [...list].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    return list
  }, [crmMode, rawCrmThreads, rawMailboxThreads, leadByEmail, hasAttachments])

  // --- Thread detail: prefer mailbox source, fall back to CRM-stored thread.
  const knownMailbox = useMemo(() => rawMailboxThreads.some((t) => t.threadId === selectedThreadId), [rawMailboxThreads, selectedThreadId])
  const knownCrm = useMemo(() => rawCrmThreads.some((t) => t.threadId === selectedThreadId), [rawCrmThreads, selectedThreadId])
  const preferMailbox = Boolean(selectedThreadId) && !skipMailboxApi && (knownMailbox || !knownCrm)

  const {
    data: mailboxThreadRes,
    isFetching: loadingMailboxThread,
    isError: mailboxThreadError,
  } = useGetMailboxThreadQuery(selectedThreadId, { skip: !selectedThreadId || !preferMailbox })
  const mailboxThreadMissing =
    preferMailbox && !loadingMailboxThread && (mailboxThreadError || !mailboxThreadRes?.data?.messages?.length)
  const useCrmThread = Boolean(selectedThreadId) && googleEmailConnected && (!preferMailbox || mailboxThreadMissing)
  const { data: crmThreadRes, isFetching: loadingCrmThread } = useGetEmailThreadQuery(
    { threadId: selectedThreadId },
    { skip: !useCrmThread },
  )

  const parsedThread = useMemo(() => {
    if (!selectedThreadId) return null
    const raw = mailboxThreadRes?.data
    if (preferMailbox && raw?.id && String(raw.id) === String(selectedThreadId) && raw.messages?.length) {
      return parseGmailThread(raw)
    }
    if (useCrmThread && Array.isArray(crmThreadRes?.data) && crmThreadRes.data.length) {
      return parseStoredThread(crmThreadRes.data)
    }
    return null
  }, [selectedThreadId, preferMailbox, mailboxThreadRes?.data, useCrmThread, crmThreadRes?.data])

  const isMailboxThread = Boolean(parsedThread) && preferMailbox && !mailboxThreadMissing
  const loadingThread = loadingMailboxThread || loadingCrmThread

  useEffect(() => {
    if (!googleEmailConnected) selectThread(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleEmailConnected])

  // Gmail behavior: opening an unread conversation marks it read.
  useEffect(() => {
    if (!isMailboxThread || !parsedThread?.isUnread || googleInboxScopeMissing) return
    markMailboxThreadRead(parsedThread.threadId).catch(() => {})
  }, [isMailboxThread, parsedThread, googleInboxScopeMissing, markMailboxThreadRead])

  const viewLeadId = useMemo(() => {
    const row = rows.find((t) => t.threadId === selectedThreadId)
    if (row?.lead?.id) return row.lead.id
    const senderEmail = String(parsedThread?.lastMessage?.from?.email || '').toLowerCase().trim()
    return (senderEmail && senderEmail !== myEmail && leadByEmail.get(senderEmail)?.id) || null
  }, [rows, selectedThreadId, parsedThread, leadByEmail, myEmail])

  // --- Toolbar actions
  const toggleChecked = useCallback((id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const pageIds = useMemo(() => rows.map((t) => t.threadId), [rows])
  const allChecked = pageIds.length > 0 && pageIds.every((id) => checkedIds.has(id))
  const toggleAll = useCallback(() => {
    setCheckedIds(allChecked ? new Set() : new Set(pageIds))
  }, [allChecked, pageIds])

  const bulkMarkRead = useCallback(async () => {
    const ids = rows.filter((t) => checkedIds.has(t.threadId) && t.isUnread).map((t) => t.threadId)
    setBulkMarking(true)
    try {
      if (ids.length) await Promise.allSettled(ids.map((id) => markMailboxThreadRead(id).unwrap()))
    } finally {
      setBulkMarking(false)
      setCheckedIds(new Set())
    }
  }, [rows, checkedIds, markMailboxThreadRead])

  const syncing = syncingAll || syncingLead
  const handleRefresh = useCallback(async () => {
    if (crmMode) {
      try {
        if (leadId) await syncLeadEmails({ id: leadId }).unwrap()
        else await syncReplies().unwrap()
        refetchCrm()
      } catch (err) {
        toast.error(err?.data?.error?.message || 'Sync failed')
      }
      return
    }
    refetchMailbox()
  }, [crmMode, leadId, syncLeadEmails, syncReplies, refetchCrm, refetchMailbox])

  const goNext = useCallback(() => {
    if (!nextPageToken) return
    setPageTokens((prev) => [...prev.slice(0, pageIndex + 1), nextPageToken])
    setPageIndex((i) => i + 1)
  }, [nextPageToken, pageIndex])
  const goPrev = useCallback(() => setPageIndex((i) => Math.max(0, i - 1)), [])

  const rangeLabel = crmMode
    ? `${rows.length}`
    : rows.length
      ? `${pageIndex * PAGE_SIZE + 1}–${pageIndex * PAGE_SIZE + rows.length}`
      : ''

  // --- Attachments (unchanged behavior)
  const openAttachmentPreview = useCallback(
    async (messageId, att) => {
      const t = readAuthFromStorage().accessToken
      const headers = new Headers()
      if (t) headers.set('Authorization', `Bearer ${t}`)
      if (workspaceId) headers.set('x-workspace-id', workspaceId)
      const q = new URLSearchParams({ fileName: att.name || 'attachment' })
      const url = `/api/v1/email/mailbox-attachments/${encodeURIComponent(messageId)}/${encodeURIComponent(att.id)}?${q}`
      try {
        const res = await fetch(url, { headers, credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load attachment')
        const blob = await res.blob()
        const obj = URL.createObjectURL(blob)
        window.open(obj, '_blank', 'noopener,noreferrer')
        window.setTimeout(() => URL.revokeObjectURL(obj), 120000)
      } catch {
        toast.error('Could not open attachment')
      }
    },
    [workspaceId],
  )
  const openSaveModal = useCallback((messageId, att) => {
    setSaveTarget({ messageId, attachment: att })
    setSaveLeadId('')
  }, [])
  const submitSaveToLead = useCallback(async () => {
    if (!saveTarget?.messageId || !saveTarget?.attachment?.id || !saveLeadId) {
      toast.error('Pick a lead')
      return
    }
    try {
      await saveAttachment({
        messageId: saveTarget.messageId,
        attachmentId: saveTarget.attachment.id,
        fileName: saveTarget.attachment.name || 'attachment',
        leadId: saveLeadId,
      }).unwrap()
      toast.success('Saved to lead documents')
      setSaveTarget(null)
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Save failed')
    }
  }, [saveAttachment, saveLeadId, saveTarget])

  const openNewCompose = useCallback(() => {
    const selected = leadId ? leads.find((l) => String(l.id) === String(leadId)) : null
    setComposeInitial(selected ? { leadId: selected.id, to: selected.email || '' } : null)
    setComposeOpen(true)
  }, [leadId, leads])

  const mailboxErrorMessage = (() => {
    if (!mailboxError) return ''
    const raw =
      mailboxErrorDetail?.data?.error?.message ||
      mailboxErrorDetail?.data?.message ||
      mailboxErrorDetail?.error ||
      ''
    const s = String(raw || '')
    if (/insufficient authentication scopes/i.test(s)) {
      return 'Google is connected without inbox read permission. Open Integrations → Google Settings, click Reconnect Google, and accept Gmail read access so the mailbox can load.'
    }
    if (s) return s
    return 'Could not load mailbox from Google. Try reconnecting Google under Integrations.'
  })()

  const loadingList = crmMode ? loadingCrmThreads : loadingMailbox
  const emptyHint = crmMode
    ? 'CRM-linked lead emails appear here after you email a lead or sync replies.'
    : 'Reads your live Gmail since Google was connected. Refreshes every 20 seconds.'
  const emptyAction =
    !crmMode && pageIndex > 0 && rows.length === 0 ? (
      <button type="button" className="mt-3 text-xs font-semibold text-brand-700 hover:underline" onClick={() => { setPageTokens([undefined]); setPageIndex(0) }}>
        Back to first page
      </button>
    ) : null

  const sidebarProps = {
    box,
    onBoxChange: changeBox,
    unreadCount: Number(badgeRes?.data?.unread || 0),
    unreadApproximate: Boolean(badgeRes?.data?.unreadApproximate),
    filterMode,
    onFilterModeChange: (m) => { setFilterMode(m); selectThread(null); setSidebarOpen(false) },
    hasAttachments,
    onHasAttachmentsChange: setHasAttachments,
    leadId,
    onLeadIdChange: (id) => { setLeadId(id); selectThread(null) },
    leads,
    onCompose: openNewCompose,
    composeDisabled: !googleEmailConnected,
  }

  return (
    <PageShell fullWidth>
      <div className="h-full px-2 py-2.5 lg:px-3">
        <section className="flex h-[calc(100dvh-88px)] min-h-0 flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm">
          {!googleEmailConnected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="max-w-md text-sm font-semibold text-ink">Connect Google in Google Settings</p>
              <p className="max-w-lg text-sm text-ink-muted">
                The inbox loads your Gmail (Inbox + Sent, since Google was connected) merged with any CRM-linked lead emails.
              </p>
              <button
                type="button"
                className="h-10 rounded-lg bg-slate-800 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => navigate('/integrations?tab=google')}
              >
                Open Google Settings
              </button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <EmailSidebar {...sidebarProps} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {googleInboxScopeMissing ? (
                  <div className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2 text-xs text-amber-950">
                    Google is connected without Gmail read permission — live Inbox/Sent mail won&apos;t load, but CRM-linked lead emails still will.{' '}
                    <button type="button" className="font-semibold underline" onClick={() => navigate('/integrations?tab=google')}>
                      Reconnect Google
                    </button>{' '}
                    to fix.
                  </div>
                ) : mailboxError ? (
                  <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-900">{mailboxErrorMessage}</div>
                ) : null}

                {selectedThreadId ? (
                  <EmailThreadPane
                    thread={parsedThread}
                    loading={loadingThread}
                    onBack={() => selectThread(null)}
                    viewLeadId={viewLeadId}
                    mailboxMode={isMailboxThread}
                    onOpenAttachment={isMailboxThread ? openAttachmentPreview : undefined}
                    onSaveAttachmentToLead={isMailboxThread ? openSaveModal : undefined}
                    myEmail={myEmail}
                    leads={leads}
                    leadByEmail={leadByEmail}
                    onSent={() => {}}
                  />
                ) : (
                  <>
                    <div className="shrink-0 border-b border-surface-border px-2.5 py-2 sm:px-3">
                      <IconInput
                        icon={Search}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search mail…"
                        className="h-10 min-h-0 rounded-full bg-surface-muted/40 text-sm"
                        aria-label="Search mail"
                      />
                    </div>
                    <EmailListToolbar
                      allChecked={allChecked}
                      someChecked={checkedIds.size > 0}
                      onToggleAll={toggleAll}
                      checkedCount={checkedIds.size}
                      onBulkMarkRead={bulkMarkRead}
                      markingRead={bulkMarking}
                      showBulkMarkRead={!crmMode && !googleInboxScopeMissing}
                      onRefresh={handleRefresh}
                      refreshing={loadingList || syncing}
                      rangeLabel={rangeLabel}
                      onPrev={goPrev}
                      onNext={goNext}
                      prevDisabled={crmMode || pageIndex === 0}
                      nextDisabled={crmMode || !nextPageToken}
                      onOpenSidebar={() => setSidebarOpen(true)}
                    />
                    <EmailRowList
                      rows={rows}
                      box={box}
                      checkedIds={checkedIds}
                      onToggleChecked={toggleChecked}
                      onOpen={selectThread}
                      onMarkRead={!crmMode && !googleInboxScopeMissing ? (id) => markMailboxThreadRead(id).catch(() => {}) : undefined}
                      loading={loadingList}
                      emptyHint={emptyHint}
                      emptyAction={emptyAction}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {saveTarget ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">Save attachment to lead</p>
                <p className="mt-1 truncate text-xs text-ink-muted">{saveTarget.attachment?.name}</p>
              </div>
              <button type="button" className="rounded-lg p-1 text-ink-muted hover:bg-slate-100" onClick={() => setSaveTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <label className="mt-4 block text-xs font-medium text-ink-muted">Lead</label>
            <Select className="mt-1 h-10 rounded-lg text-sm" value={saveLeadId} onChange={(e) => setSaveLeadId(e.target.value)}>
              <option value="">Select lead…</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title || l.contactName || l.email || l.id}
                </option>
              ))}
            </Select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-9 rounded-lg border border-surface-border px-3 text-sm" onClick={() => setSaveTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!saveLeadId || savingAtt}
                className="h-9 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => submitSaveToLead()}
              >
                {savingAtt ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EmailComposerDrawer
        open={composeOpen}
        initial={composeInitial}
        onClose={() => setComposeOpen(false)}
        onSent={() => {}}
      />
    </PageShell>
  )
}
```

Note for implementer: `useGetEmailThreadQuery` responses — check the actual shape returned by `/email/threads/:threadId` before finishing; today's code passes `leadThreadRes.data` straight into `parseStoredThread(...)`, which expects an array of stored messages. The rewrite above assumes the same (`Array.isArray(crmThreadRes?.data)`). If the endpoint wraps differently, keep parity with the old page's usage.

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: exit 0. Also confirm no other file imports removed symbols from EmailPage (it has no named exports besides `EmailPage`): `grep -r "from '@/pages/EmailPage'" client/src` → only the route import in `App.jsx`.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/EmailPage.jsx
git commit -m "feat(email): rebuild /email as Gmail-style inbox with pagination and inline reply"
```

---

### Task 4: End-to-end verification

**Files:** none (manual verification against dev servers)

- [ ] **Step 1: Start servers**

Run: `npm run dev:server` and `npm run dev:client` (background). Open `http://localhost:5173/email` (or the port Vite reports; user had 5175).

- [ ] **Step 2: Walk the spec checklist**

1. Inbox loads rows; unread bold + white; read gray. Sidebar Inbox badge ≈ unread count.
2. Row click → thread view; back arrow → list. URL carries `threadId`.
3. Open unread thread → its row unbolds after return; badge decrements.
4. Inline Reply on a lead-matched thread: To/subject prefilled, quoted text behind `…` toggle, Send succeeds, appears in thread after refetch.
5. Thread with no matched lead: Send disabled until lead picked in the inline box.
6. Forward: `Fwd:` subject, empty To, quote present, sends as new thread.
7. Pagination: next/prev across ≥2 pages, range label updates, search input resets to page 1.
8. Sent box via sidebar: rows show `To: <name>`, no unread bolding expected.
9. Select-all + individual checkboxes; bulk "Mark N read" clears unread styling.
10. Lead-linked filter + lead select: CRM threads listed, pagination hidden.
11. Deep-link `/email?box=sent&threadId=<known-id>` after hard refresh → thread renders.
12. Mobile width (~390px): hamburger opens sidebar drawer; list/thread swap works.
13. LeadDetailPage → lead email tab still renders (shared components untouched).

- [ ] **Step 3: Fix anything found, re-verify, commit fixes**

```bash
git add -A client/src
git commit -m "fix(email): polish from inbox reskin verification"
```

---

## Self-Review Notes

- Spec coverage: sidebar (T1), row list + toolbar + pagination (T1/T3), thread pane + inline reply + forward (T2), URL state + single-box fetch + bulk mark-read + deep-link fallback + auto mark-read (T3), manual checklist (T4). Fake-affordance ban respected (no star/archive/trash anywhere).
- Old page behaviors preserved: connect CTA, scope banner, error banner, attachment preview/save, composer drawer, lead matching maps, sync actions (folded into refresh), 20s poll. Auto-select-first-thread intentionally removed per spec.
- Type consistency: `EmailThreadPane` props match Task 3 call site; `InlineReplyBox` props match Task 2 call site; sidebar/toolbar/rowlist props match `sidebarProps`/toolbar JSX in Task 3.
