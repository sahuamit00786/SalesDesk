import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import GmailEmailBody from '@/features/gmail/GmailEmailBody'
import GmailAttachmentChip from '@/features/gmail/GmailAttachmentChip'
import GmailAvatar from '@/features/gmail/GmailAvatar'
import { formatEmailDateTime } from '@/features/gmail/gmailParserUtils'

export default function GmailMessageCard({
  message,
  defaultExpanded = false,
  mailboxMode = false,
  onOpenAttachment,
  onSaveAttachmentToLead,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const showUnread = message.isUnread && !expanded
  return (
    <div
      className={`overflow-hidden rounded-lg border border-surface-border bg-white shadow-sm ${!expanded ? 'cursor-pointer hover:bg-surface-muted/40' : ''}`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5" onClick={() => setExpanded((prev) => !prev)} role="presentation">
        {showUnread ? <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" title="Unread" /> : null}
        <GmailAvatar name={message.from.name} email={message.from.email} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cn('truncate text-[12px]', showUnread ? 'font-bold text-ink' : 'font-semibold text-ink')}>{message.from.name}</span>
            <span className="truncate text-[11px] text-ink-muted">&lt;{message.from.email}&gt;</span>
          </div>
          {expanded ? (
            <div className="mt-0.5 break-words text-[11px] leading-snug text-ink-muted">
              To: {(message.to || []).map((t) => t.name || t.email).join(', ') || '-'}
            </div>
          ) : (
            <div className="mt-0.5 line-clamp-2 text-[11px] text-ink-muted">{message.snippet}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="whitespace-nowrap text-[10px] text-ink-muted" title={formatEmailDateTime(message.date)}>
            {message.dateFormatted}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((prev) => !prev)
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>
      {expanded ? (
        <>
          <div className="border-t border-surface-border bg-surface-muted/40 px-3 pb-3 pt-1">
            <div className="overflow-hidden rounded-md border border-surface-border bg-white">
              <GmailEmailBody html={message.bodyHtml} />
            </div>
          </div>
          {message.attachments?.length ? (
            <div className="flex flex-wrap gap-2 border-t border-surface-border px-3 py-2">
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
