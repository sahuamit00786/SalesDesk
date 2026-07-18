import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, X } from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { Select } from '@/components/ui/Select'
import { IconInput } from '@/components/ui/IconInput'
import EmailSidebar from '@/features/email/inbox/EmailSidebar'
import EmailListToolbar from '@/features/email/inbox/EmailListToolbar'
import EmailRowList from '@/features/email/inbox/EmailRowList'
import EmailThreadPane from '@/features/email/inbox/EmailThreadPane'
import { parseGmailThread, parseStoredThread, parseAurinkoThread } from '@/features/gmail/gmailParserUtils'
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
      // Aurinko-backed mailbox returns pre-normalized messages (metadata from
      // DB + lazily fetched bodies); Gmail-backed returns raw Gmail payloads.
      if (mailboxThreadRes?.meta?.source === 'aurinko') return parseAurinkoThread(raw)
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
    // Single URL update per click: box + threadId change together (two queued
    // setSearchParams calls clobber each other — the second sees stale params).
    onBoxChange: (b) => { setFilterMode('all'); setSidebarOpen(false); changeBox(b) },
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
