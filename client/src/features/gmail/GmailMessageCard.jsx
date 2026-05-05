import { useState } from 'react'
import GmailEmailBody from '@/features/gmail/GmailEmailBody'
import GmailAttachmentChip from '@/features/gmail/GmailAttachmentChip'

export default function GmailMessageCard({ message, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className={`overflow-hidden rounded-2xl border border-surface-border bg-white ${!expanded ? 'cursor-pointer hover:bg-surface-muted' : ''}`}>
      <div className="flex items-start gap-3 px-5 py-3" onClick={() => setExpanded((prev) => !prev)} role="presentation">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{message.from.initials || '??'}</div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-ink">{message.from.name}</span>
            <span className="truncate text-[11px] text-ink-muted">&lt;{message.from.email}&gt;</span>
          </div>
          {expanded ? (
            <div className="mt-0.5 truncate text-[11px] text-ink-muted">
              To: {(message.to || []).map((t) => t.name || t.email).join(', ') || '-'}
            </div>
          ) : (
            <div className="mt-0.5 truncate text-[12px] text-ink-muted">{message.snippet}</div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="whitespace-nowrap text-[11px] text-ink-muted">{message.dateFormatted}</span>
          {expanded ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); setExpanded(false) }} className="h-7 w-7 rounded-lg text-ink-muted hover:bg-surface-subtle">
              ↑
            </button>
          ) : null}
        </div>
      </div>
      {expanded ? (
        <>
          <div className="border-t border-surface-border">
            <GmailEmailBody html={message.bodyHtml} />
          </div>
          {message.attachments?.length ? (
            <div className="flex flex-wrap gap-2 border-t border-surface-border px-5 py-3">
              {message.attachments.map((att) => (
                <GmailAttachmentChip key={att.id} attachment={att} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
