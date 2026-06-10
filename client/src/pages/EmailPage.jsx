import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronUp, Filter, RefreshCcw, X } from 'lucide-react'
import { SkeletonEmailList } from '@/components/shared/SkeletonLoader'
import { PageShell } from '@/components/layout/PageShell'
import { Select } from '@/components/ui/Select'
import GmailThreadList from '@/features/gmail/GmailThreadList'
import GmailThreadView from '@/features/gmail/GmailThreadView'
import { parseGmailThread, parseStoredThread } from '@/features/gmail/gmailParserUtils'
import {
  useGetEmailThreadQuery,
  useGetEmailThreadsQuery,
  useGetMailboxThreadQuery,
  useGetMailboxThreadsQuery,
  useMarkMailboxThreadReadMutation,
  useSaveMailboxAttachmentToLeadMutation,
  useSyncEmailRepliesMutation,
} from '@/features/email/emailApi'
import { buildReplyQuoteHtml } from '@/features/email/buildReplyQuoteHtml'
import { EmailComposerDrawer } from '@/features/email/EmailComposerDrawer'
import { useGetGoogleEmailStatusQuery, useGetLeadsQuery, useSyncLeadEmailsMutation } from '@/features/leads/leadsApi'
import { readAuthFromStorage } from '@/features/auth/authSlice'
import { useAppSelector } from '@/app/hooks'
import { selectResolvedActiveWorkspaceId } from '@/features/workspace/workspaceSlice'

export function EmailPage() {
  const navigate = useNavigate()
  const workspaceId = useAppSelector(selectResolvedActiveWorkspaceId)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [mailboxTab, setMailboxTab] = useState('inbox')
  const [leadOnly, setLeadOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [direction, setDirection] = useState('')
  const [leadId, setLeadId] = useState('')
  const [hasAttachments, setHasAttachments] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeInitial, setComposeInitial] = useState(null)
  const [saveTarget, setSaveTarget] = useState(null)
  const [saveLeadId, setSaveLeadId] = useState('')

  const { data: googleEmailStatus } = useGetGoogleEmailStatusQuery()
  const googleEmailConnected = Boolean(googleEmailStatus?.data?.connected)
  const googleReadMailbox = googleEmailStatus?.data?.readMailbox
  const googleInboxScopeMissing = googleEmailConnected && googleReadMailbox === false
  const skipMailboxApi = !googleEmailConnected || googleInboxScopeMissing || leadOnly
  const showInboxScopeWarning = googleInboxScopeMissing && !leadOnly
  const fetchLeadCrmThreads = leadOnly && Boolean(leadId)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (leadOnly) {
      setMailboxTab('inbox')
      setSelectedThreadId(null)
    }
  }, [leadOnly])

  useEffect(() => {
    setSelectedThreadId(null)
  }, [leadId])

  const mailboxParams = useMemo(
    () => ({
      box: mailboxTab === 'sent' ? 'sent' : 'inbox',
      search: debouncedSearch || undefined,
      limit: 40,
    }),
    [mailboxTab, debouncedSearch],
  )

  const leadQuery = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      direction: direction || undefined,
      leadId,
      hasAttachments: hasAttachments || undefined,
      limit: 80,
    }),
    [debouncedSearch, direction, leadId, hasAttachments],
  )

  const {
    data: mailboxThreadsRes,
    isFetching: loadingMailbox,
    isError: mailboxThreadsError,
    error: mailboxThreadsErrorDetail,
  } = useGetMailboxThreadsQuery(mailboxParams, {
    skip: skipMailboxApi,
    pollingInterval: googleEmailConnected && !leadOnly ? 20000 : 0,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })

  const { data: threadsRes, isFetching: loadingLeadThreads } = useGetEmailThreadsQuery(leadQuery, {
    skip: !fetchLeadCrmThreads || !googleEmailConnected,
  })

  const rawMailboxThreads = useMemo(
    () => (Array.isArray(mailboxThreadsRes?.data) ? mailboxThreadsRes.data : []),
    [mailboxThreadsRes?.data],
  )

  const rawLeadThreads = useMemo(
    () => (Array.isArray(threadsRes?.data) ? threadsRes.data : []),
    [threadsRes?.data],
  )

  const { data: leadThreadRes, isFetching: loadingLeadThread } = useGetEmailThreadQuery(
    { threadId: selectedThreadId },
    { skip: !fetchLeadCrmThreads || !selectedThreadId || !googleEmailConnected },
  )
  const { data: mailboxThreadRes, isFetching: loadingMailboxThread } = useGetMailboxThreadQuery(selectedThreadId, {
    skip: !selectedThreadId || !googleEmailConnected || googleInboxScopeMissing || leadOnly,
  })

  const [syncReplies, { isLoading: syncingAll }] = useSyncEmailRepliesMutation()
  const [syncLeadEmails, { isLoading: syncingLead }] = useSyncLeadEmailsMutation()
  const syncing = syncingAll || syncingLead
  const [markMailboxThreadRead] = useMarkMailboxThreadReadMutation()
  const [saveAttachment, { isLoading: savingAtt }] = useSaveMailboxAttachmentToLeadMutation()
  const { data: leadsData } = useGetLeadsQuery({ page: 1, limit: 400, search: '' }, { skip: !googleEmailConnected })
  const leads = Array.isArray(leadsData?.data) ? leadsData.data : []

  const leadByEmail = useMemo(() => {
    const m = new Map()
    for (const l of leads) {
      const e = String(l.email || '').toLowerCase().trim()
      if (e) m.set(e, l)
    }
    return m
  }, [leads])

  const threads = useMemo(() => {
    if (fetchLeadCrmThreads) return rawLeadThreads
    let list = rawMailboxThreads.map((t) => {
      if (t.lead?.id) return t
      const senderEmail = String(t.lastMessage?.from?.email || '').toLowerCase().trim()
      const matched = senderEmail ? leadByEmail.get(senderEmail) : null
      if (!matched) return t
      return { ...t, lead: { id: matched.id } }
    })
    if (hasAttachments) list = list.filter((t) => t.hasAttachments)
    return list
  }, [fetchLeadCrmThreads, rawLeadThreads, rawMailboxThreads, leadByEmail, hasAttachments])

  useEffect(() => {
    if (!googleEmailConnected) setSelectedThreadId(null)
  }, [googleEmailConnected])

  useEffect(() => {
    if (!threads.length) return
    if (!selectedThreadId || !threads.find((t) => t.threadId === selectedThreadId)) {
      setSelectedThreadId(threads[0].threadId)
    }
  }, [threads, selectedThreadId])

  useEffect(() => {
    if (leadOnly || googleInboxScopeMissing || !googleEmailConnected || !selectedThreadId) return
    const row = threads.find((t) => t.threadId === selectedThreadId)
    if (!row?.isUnread) return
    markMailboxThreadRead(selectedThreadId).catch(() => {})
  }, [selectedThreadId, leadOnly, googleInboxScopeMissing, googleEmailConnected, threads, markMailboxThreadRead])

  const parsedThread = useMemo(() => {
    if (!selectedThreadId) return null
    if (fetchLeadCrmThreads) {
      if (!leadThreadRes?.data) return null
      return parseStoredThread(leadThreadRes.data)
    }
    const raw = mailboxThreadRes?.data
    if (!raw?.id || String(raw.id) !== String(selectedThreadId) || !raw.messages?.length) return null
    return parseGmailThread(raw)
  }, [fetchLeadCrmThreads, leadThreadRes?.data, mailboxThreadRes?.data, selectedThreadId])

  const viewLeadId = fetchLeadCrmThreads ? leadId : (threads.find((t) => t.threadId === selectedThreadId)?.lead?.id || null)
  const loadingThread = fetchLeadCrmThreads ? loadingLeadThread : loadingMailboxThread
  const isFetching = fetchLeadCrmThreads ? loadingLeadThreads : loadingMailbox
  const detailPlaceholder = loadingThread && !parsedThread

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

  const openReplyCompose = useCallback(() => {
    const last = parsedThread?.lastMessage
    if (!last) return
    const fromEmail = String(last.from?.email || '').trim().toLowerCase()
    const matchedLead = fromEmail ? leads.find((l) => String(l.email || '').trim().toLowerCase() === fromEmail) : null
    setComposeInitial({
      leadId: matchedLead?.id || viewLeadId || leadId || '',
      to: matchedLead?.email || last.from?.email || '',
      subject: parsedThread?.subject ? `Re: ${parsedThread.subject}` : 'Re:',
      threadId: selectedThreadId,
      bodyHtml: buildReplyQuoteHtml(last),
    })
    setComposeOpen(true)
  }, [parsedThread, viewLeadId, leadId, selectedThreadId, leads])

  const listTitle = leadOnly
    ? (leadId ? 'Lead emails' : 'Select a lead')
    : mailboxTab === 'sent'
      ? 'Outbox'
      : 'Inbox'

  const listEmptyHint = leadOnly
    ? (leadId
      ? 'No CRM emails for this lead yet. Send from the lead page or sync replies.'
      : 'Enable Lead only, then pick a lead in Filters to load their emails.')
    : mailboxTab === 'sent'
      ? 'Outbox lists mail in Gmail Sent since Google was connected.'
      : 'Reads your live Gmail Inbox since Google was connected. Refreshes every 20 seconds.'

  const mailboxErrorMessage = (() => {
    if (!mailboxThreadsError) return ''
    const raw =
      mailboxThreadsErrorDetail?.data?.error?.message ||
      mailboxThreadsErrorDetail?.data?.message ||
      mailboxThreadsErrorDetail?.error ||
      ''
    const s = String(raw || '')
    if (/insufficient authentication scopes/i.test(s)) {
      return 'Google is connected without inbox read permission. Open Integrations → Google Settings, click Reconnect Google, and accept Gmail read access so the mailbox can load.'
    }
    if (s) return s
    return 'Could not load mailbox from Google. Try reconnecting Google under Integrations.'
  })()

  const handleSync = useCallback(async () => {
    if (fetchLeadCrmThreads && leadId) {
      try {
        await syncLeadEmails({ id: leadId }).unwrap()
        toast.success('Replies synced for this lead')
      } catch (err) {
        toast.error(err?.data?.error?.message || 'Sync failed')
      }
      return
    }
    await syncReplies().unwrap()
  }, [fetchLeadCrmThreads, leadId, syncLeadEmails, syncReplies])

  return (
    <PageShell fullWidth>
      <div className="h-full px-2 py-2.5 lg:px-3">
        <section className="flex h-[calc(100dvh-88px)] min-h-0 flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-muted/40 px-3 py-2 sm:px-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Filter size={15} className="text-ink-muted" />
              Mail
            </div>
            <div className="flex rounded-lg border border-surface-border bg-white p-0.5">
              <button
                type="button"
                disabled={!googleEmailConnected || leadOnly}
                onClick={() => setMailboxTab('inbox')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  !leadOnly && mailboxTab === 'inbox' ? 'bg-[var(--brand-primary)] text-white' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                Inbox
              </button>
              <button
                type="button"
                disabled={!googleEmailConnected || leadOnly}
                onClick={() => setMailboxTab('sent')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  !leadOnly && mailboxTab === 'sent' ? 'bg-[var(--brand-primary)] text-white' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                Outbox
              </button>
            </div>
            <label className="ml-1 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border bg-white px-2.5 py-1 text-xs font-medium text-ink">
              <input type="checkbox" checked={leadOnly} disabled={!googleEmailConnected} onChange={(e) => setLeadOnly(e.target.checked)} />
              Lead only
            </label>
            <button
              type="button"
              disabled={!googleEmailConnected}
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-surface-border bg-white px-2.5 text-xs font-medium text-ink hover:bg-surface-muted disabled:opacity-50"
            >
              Filters {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button
              type="button"
              className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-surface-border bg-white px-2.5 text-xs text-ink hover:bg-surface-muted disabled:opacity-50"
              onClick={handleSync}
              disabled={syncing || !googleEmailConnected || (leadOnly && !leadId)}
            >
              <RefreshCcw size={12} className={syncing ? 'animate-spin' : ''} />
              Sync CRM mail
            </button>
            <button
              type="button"
              className="h-8 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              onClick={openNewCompose}
              disabled={!googleEmailConnected}
            >
              New message
            </button>
          </div>

          {filtersOpen && googleEmailConnected ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-muted/50 px-3 py-2 sm:px-4">
              <Select className="h-8 min-w-[180px] rounded-lg px-2 text-xs" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                <option value="">All leads</option>
                {leads.filter((l) => l.email).map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title || lead.contactName || lead.email}
                    {lead.isOpportunity ? ' (Opportunity)' : ''}
                  </option>
                ))}
              </Select>
              {leadOnly ? (
                <Select className="h-8 min-w-[140px] rounded-lg px-2 text-xs" value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="">All directions</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </Select>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted">
                <input type="checkbox" checked={hasAttachments} onChange={(e) => setHasAttachments(e.target.checked)} />
                Has attachments
              </label>
              {(leadId || hasAttachments || direction) ? (
                <button
                  type="button"
                  className="text-xs text-brand-600 hover:underline"
                  onClick={() => { setLeadId(''); setHasAttachments(false); setDirection('') }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}

          {!googleEmailConnected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="max-w-md text-sm font-semibold text-ink">Connect Google in Google Settings</p>
              <p className="max-w-lg text-sm text-ink-muted">
                The mailbox view loads your Gmail (all threads since connection) or lead-filtered CRM mail when you enable Lead only.
              </p>
              <button
                type="button"
                className="h-10 rounded-lg bg-slate-800 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => navigate('/integrations?tab=google')}
              >
                Open Google Settings
              </button>
            </div>
          ) : showInboxScopeWarning ? (
            <div className="flex flex-1 flex-col justify-center gap-3 border-t border-amber-200/80 bg-amber-50/90 px-4 py-8 text-sm text-amber-950 sm:px-6">
              <p className="font-semibold">Inbox cannot load with the current Google permissions</p>
              <p className="max-w-xl text-xs leading-relaxed text-amber-900/90">
                This workspace&apos;s Google link can send mail but does not include Gmail <strong>read</strong> access. Open Integrations, click <strong>Reconnect Google</strong>, and approve the Gmail read scope on the consent screen. You can still use <strong>Lead only</strong> with a selected lead.
              </p>
              <button
                type="button"
                className="h-9 w-fit rounded-full bg-amber-700 px-4 text-xs font-semibold text-white hover:bg-amber-800"
                onClick={() => navigate('/integrations?tab=google')}
              >
                Open Google Settings
              </button>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 divide-y divide-surface-border lg:grid-cols-[minmax(280px,36%)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
              {mailboxThreadsError && !leadOnly ? (
                <div className="col-span-full border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-900 lg:col-span-2">{mailboxErrorMessage}</div>
              ) : null}
              <GmailThreadList
                threads={threads}
                selectedId={selectedThreadId}
                onSelect={setSelectedThreadId}
                search={search}
                onSearchChange={setSearch}
                listTitle={listTitle}
                disabledSearch={false}
                emptyHint={listEmptyHint}
              />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-muted/30">
                {isFetching && !threads.length ? <SkeletonEmailList rows={8} /> : null}
                {detailPlaceholder ? <SkeletonEmailList rows={4} /> : null}
                {!detailPlaceholder ? (
                  <GmailThreadView
                    thread={selectedThreadId ? parsedThread : null}
                    mailboxMode={!fetchLeadCrmThreads}
                    showReplyButton={fetchLeadCrmThreads || mailboxTab === 'inbox'}
                    onOpenAttachment={fetchLeadCrmThreads ? undefined : openAttachmentPreview}
                    onSaveAttachmentToLead={fetchLeadCrmThreads ? undefined : openSaveModal}
                    onBack={() => setSelectedThreadId(null)}
                    onSync={handleSync}
                    onCreateEmail={openNewCompose}
                    onReply={openReplyCompose}
                    viewLeadId={viewLeadId}
                  />
                ) : null}
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
