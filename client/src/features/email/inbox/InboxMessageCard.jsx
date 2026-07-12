import { useState } from 'react'
import { ChevronDown, CornerUpLeft } from 'lucide-react'
import { cn } from '@/utils/cn'
import GmailEmailBody from '@/features/gmail/GmailEmailBody'
import GmailAttachmentChip from '@/features/gmail/GmailAttachmentChip'
import GmailAvatar from '@/features/gmail/GmailAvatar'
import { formatEmailDateTime } from '@/features/gmail/gmailParserUtils'

/**
 * One message in the inbox thread timeline: avatar rail on the left (with a
 * connector line drawn by the parent), card on the right. Distinct from the
 * shared GmailMessageCard so LeadDetailPage stays untouched.
 */
export default function InboxMessageCard({
  message,
  isReply = false,
  defaultExpanded = false,
  mailboxMode = false,
  myEmail = '',
  onOpenAttachment,
  onSaveAttachmentToLead,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const fromEmail = String(message.from?.email || '').trim().toLowerCase()
  const isMine = Boolean(myEmail) && fromEmail === myEmail
  const senderName = isMine ? 'You' : message.from?.name || message.from?.email || 'Unknown'
  const toLine = (message.to || []).map((t) => (String(t.email || '').toLowerCase() === myEmail ? 'me' : t.name || t.email)).join(', ')
  const showUnread = message.isUnread && !expanded

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-white transition-shadow',
        expanded ? 'border-surface-border shadow-md' : 'cursor-pointer border-surface-border/80 shadow-sm hover:shadow-md',
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-3" onClick={() => setExpanded((prev) => !prev)} role="presentation">
        {showUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" title="Unread" /> : null}
        {isReply ? <CornerUpLeft size={13} className="shrink-0 text-ink-faint" title="Reply in thread" /> : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className={cn('truncate text-[13px]', showUnread ? 'font-bold text-ink' : 'font-semibold text-ink')}>{senderName}</span>
            {!isMine ? <span className="truncate text-[11px] text-ink-muted">&lt;{message.from?.email}&gt;</span> : null}
          </div>
          {expanded ? (
            <span className="mt-0.5 truncate text-[11px] text-ink-muted">To: {toLine || '—'}</span>
          ) : (
            <span className="mt-0.5 truncate text-[12px] text-ink-muted">{message.snippet}</span>
          )}
        </div>
        <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-ink-muted" title={formatEmailDateTime(message.date)}>
          {formatEmailDateTime(message.date)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((prev) => !prev)
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
          aria-label={expanded ? 'Collapse message' : 'Expand message'}
        >
          <ChevronDown size={15} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>
      {expanded ? (
        <>
          <div className="border-t border-surface-border/70 px-4 py-3">
            <GmailEmailBody html={message.bodyHtml} />
          </div>
          {message.attachments?.length ? (
            <div className="flex flex-wrap gap-2 border-t border-surface-border/70 bg-surface-muted/30 px-4 py-2.5">
              {message.attachments.map((att) => (
                <GmailAttachmentChip
                  key={att.id}
                  attachment={att}
                  messageId={mailboxMode ? message.id : undefined}
                  mailboxMode={mailboxMode}
                  onPreview={onOpenAttachment}
                  onRequestSaveToLead={onSaveAttachmentToLead}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** Timeline row: avatar + connector rail on the left, content on the right. */
export function ThreadTimelineRow({ name, email, isLast = false, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex w-10 shrink-0 flex-col items-center">
        <GmailAvatar name={name} email={email} size="md" />
        {!isLast ? <div className="mt-1.5 w-px flex-1 rounded bg-surface-border" /> : null}
      </div>
      <div className={cn('min-w-0 flex-1', isLast ? 'pb-1' : 'pb-3')}>{children}</div>
    </div>
  )
}
