import { useEffect, useMemo, useState } from 'react'
import { Filter, RefreshCcw } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import GmailThreadList from '@/features/gmail/GmailThreadList'
import GmailThreadView from '@/features/gmail/GmailThreadView'
import { parseStoredThread } from '@/features/gmail/gmailParserUtils'
import { useGetEmailThreadQuery, useGetEmailThreadsQuery, useSyncEmailRepliesMutation } from '@/features/email/emailApi'
import { EmailComposerDrawer } from '@/features/email/EmailComposerDrawer'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'

export function EmailPage() {
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState('')
  const [leadId, setLeadId] = useState('')
  const [hasAttachments, setHasAttachments] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeInitial, setComposeInitial] = useState(null)

  const query = {
    search: search || undefined,
    direction: direction || undefined,
    leadId: leadId || undefined,
    hasAttachments: hasAttachments || undefined,
    limit: 80,
  }
  const { data: threadsRes, isFetching, refetch } = useGetEmailThreadsQuery(query, { pollingInterval: 45000 })
  const threads = Array.isArray(threadsRes?.data) ? threadsRes.data : []
  const { data: threadRes, isFetching: loadingThread } = useGetEmailThreadQuery({ threadId: selectedThreadId }, { skip: !selectedThreadId })
  const [syncReplies, { isLoading: syncing }] = useSyncEmailRepliesMutation()
  const { data: leadsData } = useGetLeadsQuery({ page: 1, limit: 300, search: '' })
  const leads = Array.isArray(leadsData?.data) ? leadsData.data : []

  useEffect(() => {
    if (!threads.length) return
    if (!selectedThreadId || !threads.find((t) => t.threadId === selectedThreadId)) {
      setSelectedThreadId(threads[0].threadId)
    }
  }, [threads, selectedThreadId])

  const parsedThread = useMemo(() => parseStoredThread(threadRes?.data || []), [threadRes?.data])
  const selectedLead = threadRes?.data?.[0]?.lead || null

  function openNewCompose() {
    setComposeInitial(null)
    setComposeOpen(true)
  }

  function openReplyCompose() {
    const last = parsedThread?.lastMessage
    setComposeInitial({
      leadId: selectedLead?.id || '',
      to: last?.from?.email || '',
      subject: parsedThread?.subject ? `Re: ${parsedThread.subject}` : 'Re:',
      threadId: selectedThreadId,
    })
    setComposeOpen(true)
  }

  return (
    <PageShell fullWidth>
      <div className="h-full px-2 py-2.5 lg:px-3">
        <section className="flex h-[calc(100dvh-88px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Filter size={15} />
              Email Inbox
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emails..."
              className="h-8 w-full rounded-md border border-surface-border px-2 text-xs sm:ml-auto sm:w-[220px]"
            />
            <select className="h-8 rounded-md border border-surface-border px-2 text-xs" value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="">All directions</option>
              <option value="inbound">Received</option>
              <option value="outbound">Sent</option>
            </select>
            <select className="h-8 min-w-[180px] rounded-md border border-surface-border px-2 text-xs" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">All leads</option>
              {leads.filter((l) => l.email).map((lead) => <option key={lead.id} value={lead.id}>{lead.title || lead.contactName || lead.email}</option>)}
            </select>
            <label className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <input type="checkbox" checked={hasAttachments} onChange={(e) => setHasAttachments(e.target.checked)} />
              Has files
            </label>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-surface-border px-2 text-xs text-ink hover:bg-surface-subtle"
              onClick={async () => {
                await syncReplies().unwrap()
                refetch()
              }}
              disabled={syncing}
            >
              <RefreshCcw size={12} className={syncing ? 'animate-spin' : ''} />
              Sync
            </button>
            <button type="button" className="h-8 rounded-md bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700" onClick={openNewCompose}>
              New Message
            </button>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="min-h-0 border-r border-surface-border">
              {isFetching ? <div className="p-3 text-xs text-ink-muted">Loading inbox...</div> : null}
              <GmailThreadList threads={threads} selectedId={selectedThreadId} onSelect={setSelectedThreadId} />
            </div>
            <div className="min-h-0">
              {loadingThread ? <div className="p-4 text-xs text-ink-muted">Loading conversation...</div> : null}
              {!loadingThread ? (
                <GmailThreadView
                  thread={selectedThreadId ? parsedThread : null}
                  onBack={() => setSelectedThreadId(null)}
                  onSync={async () => {
                    await syncReplies().unwrap()
                    refetch()
                  }}
                  onCreateEmail={openNewCompose}
                  onReply={openReplyCompose}
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <EmailComposerDrawer
        open={composeOpen}
        initial={composeInitial}
        onClose={() => setComposeOpen(false)}
        onSent={() => {
          refetch()
          if (selectedThreadId) {
            // thread query auto re-runs due invalidation
          }
        }}
      />
    </PageShell>
  )
}
