import { ArrowLeft, UserRound } from '@/components/ui/icons'
import { Link } from 'react-router-dom'
import { SkeletonEmailList } from '@/components/shared/SkeletonLoader'
import InboxMessageCard, { ThreadTimelineRow } from '@/features/email/inbox/InboxMessageCard'
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-muted/20 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex w-full flex-col">
          {thread.messages.map((message, idx) => (
            <ThreadTimelineRow
              key={message.id}
              name={message.from?.name}
              email={message.from?.email}
              isLast={false}
            >
              <InboxMessageCard
                message={message}
                isReply={idx > 0}
                defaultExpanded={idx === thread.messages.length - 1}
                mailboxMode={mailboxMode}
                myEmail={myEmail}
                onOpenAttachment={onOpenAttachment}
                onSaveAttachmentToLead={onSaveAttachmentToLead}
              />
            </ThreadTimelineRow>
          ))}
          <ThreadTimelineRow name="You" email={myEmail} isLast>
            <InlineReplyBox
              thread={thread}
              myEmail={myEmail}
              leads={leads}
              leadByEmail={leadByEmail}
              defaultLeadId={viewLeadId || ''}
              onSent={onSent}
            />
          </ThreadTimelineRow>
        </div>
      </div>
    </div>
  )
}
