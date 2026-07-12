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
