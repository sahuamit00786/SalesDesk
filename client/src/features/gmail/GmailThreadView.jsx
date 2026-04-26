import GmailMessageCard from '@/features/gmail/GmailMessageCard'
import GmailReplyBox from '@/features/gmail/GmailReplyBox'

function EmptyThreadState() {
  return <div className="p-6 text-sm text-ink-muted">Select a thread on the left.</div>
}

export default function GmailThreadView({ thread, onBack, onSync, onCreateEmail }) {
  if (!thread) return <EmptyThreadState />
  const participants = (thread.participants || []).map((p) => p.name || p.email).filter(Boolean)
  return (
    <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden bg-surface-muted">
      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-surface-border bg-white px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="leading-tight text-xl font-semibold text-ink">{thread.subject}</h1>
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
            {thread.messageCount} messages in this thread
            {participants.length ? ` · Participants: ${participants.join(', ')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBack} className="h-8 rounded-lg border border-surface-border px-3 text-sm text-ink-muted hover:bg-surface-subtle">
            ← Back
          </button>
          <button type="button" onClick={onSync} className="h-8 rounded-lg border border-surface-border px-3 text-sm text-ink-muted hover:bg-surface-subtle">
            Sync replies
          </button>
          <button type="button" onClick={onCreateEmail} className="h-8 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
            + Create email
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col gap-3">
          {thread.messages.map((msg, idx) => (
            <GmailMessageCard
              key={msg.id}
              message={msg}
              defaultExpanded={idx === thread.messages.length - 1}
            />
          ))}
        </div>
      </div>
      <GmailReplyBox toLabel={thread.lastMessage?.from?.email} onCreateEmail={onCreateEmail} />
    </div>
  )
}
