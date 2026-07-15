import { ArrowLeft, Reply, ReplyAll, UserRound } from '@/components/ui/icons'
import { Link } from 'react-router-dom'
import GmailMessageCard from '@/features/gmail/GmailMessageCard'

function EmptyThreadState() {
  return <div className="p-6 text-sm text-ink-muted">Select an email from the inbox.</div>
}

export default function GmailThreadView({
  thread,
  onBack,
  onCreateEmail,
  onReply,
  onReplyAll,
  mailboxMode = false,
  showReplyButton = true,
  onOpenAttachment,
  onSaveAttachmentToLead,
  viewLeadId = null,
}) {
  if (!thread) return <EmptyThreadState />
  const participants = (thread.participants || []).map((p) => p.name || p.email).filter(Boolean)
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-surface-border bg-surface-muted/25 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-start gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted lg:hidden"
              aria-label="Back to inbox"
            >
              <ArrowLeft size={16} />
            </button>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-snug text-ink md:text-lg">{thread.subject}</h1>
            <p className="mt-1 text-[11px] text-ink-muted">
              {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}
              {participants.length ? ` · ${participants.join(', ')}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {viewLeadId ? (
            <Link
              to={`/leads/${viewLeadId}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 text-xs font-semibold text-green-700 hover:bg-green-100"
            >
              <UserRound size={13} />
              View lead
            </Link>
          ) : null}
          <button type="button" onClick={onCreateEmail} className="inline-flex h-8 items-center rounded-lg border border-surface-border bg-white px-2.5 text-xs font-medium text-ink hover:bg-surface-muted">
            + Create email
          </button>
          {showReplyButton && onReplyAll ? (
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-ink hover:bg-surface-muted"
              onClick={() => onReplyAll(thread)}
            >
              <ReplyAll size={13} className="mr-1" />
              Reply All
            </button>
          ) : null}
          {showReplyButton && onReply ? (
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-lg bg-[var(--brand-primary)] px-3 text-xs font-semibold cx-icon-inherit text-white hover:bg-[var(--brand-primary-dark)]"
              onClick={() => onReply(thread)}
            >
              <Reply size={13} className="mr-1" />
              Reply
            </button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-muted/20 px-2 py-2 pb-4 sm:px-3 sm:py-3 sm:pb-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {thread.messages.map((msg, idx) => (
            <GmailMessageCard
              key={msg.id}
              message={msg}
              defaultExpanded={idx === thread.messages.length - 1}
              mailboxMode={mailboxMode}
              onOpenAttachment={onOpenAttachment}
              onSaveAttachmentToLead={onSaveAttachmentToLead}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
