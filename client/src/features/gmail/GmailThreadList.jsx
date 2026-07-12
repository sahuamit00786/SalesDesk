import { Link } from 'react-router-dom'
import { Paperclip, Search, UserRound } from 'lucide-react'
import { cn } from '@/utils/cn'
import { IconInput } from '@/components/ui/IconInput'
import { SkeletonEmailList } from '@/components/shared/SkeletonLoader'
import GmailAvatar from '@/features/gmail/GmailAvatar'
import { formatEmailDateTime } from '@/features/gmail/gmailParserUtils'

function ThreadListItem({ thread, isActive, onClick }) {
  const senderName =
    thread.lastMessage?.from?.name && thread.lastMessage.from.name !== 'Unknown'
      ? thread.lastMessage.from.name
      : thread.lastMessage?.from?.email || 'Conversation'
  const leadLabel = thread.lead?.id
    ? thread.lead.title || thread.lead.contactName || thread.lead.email || 'Lead'
    : ''
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'flex w-full cursor-pointer items-start gap-3 border-b border-surface-border border-l-[3px] px-3.5 py-3.5 text-left transition-colors',
        isActive
          ? 'border-l-brand-600 bg-surface-muted'
          : thread.isUnread
            ? 'border-l-transparent bg-white hover:bg-surface-muted/60'
            : 'border-l-transparent bg-surface-muted/30 hover:bg-surface-muted/60',
      )}
    >
      <GmailAvatar name={thread.lastMessage?.from?.name} email={thread.lastMessage?.from?.email} size="md" />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className={cn('truncate text-[13px]', thread.isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-muted')}>
            {senderName}
          </span>
          <span className="shrink-0 text-[10px] text-ink-muted" title={formatEmailDateTime(thread.lastMessageAt)}>
            {thread.lastDateFormatted}
          </span>
        </div>
        <div className={cn('mb-0.5 line-clamp-2 text-[13px] leading-snug', thread.isUnread ? 'font-semibold text-ink' : 'font-medium text-ink')}>
          {thread.subject}
        </div>
        {thread.snippet ? <div className="line-clamp-2 text-[11px] leading-relaxed text-ink-muted">{thread.snippet}</div> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="rounded border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
            {thread.messageCount} msg{thread.messageCount !== 1 ? 's' : ''}
          </span>
          {thread.hasAttachments ? (
            <span className="inline-flex items-center gap-0.5 rounded border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              <Paperclip size={9} /> Files
            </span>
          ) : null}
          {leadLabel ? (
            <Link
              to={`/leads/${thread.lead.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-[160px] items-center gap-1 rounded border border-brand-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-50 hover:underline"
            >
              <UserRound size={9} className="shrink-0" />
              <span className="truncate">{leadLabel}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function GmailThreadList({
  threads,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  listTitle = 'Inbox',
  disabledSearch = false,
  emptyHint,
  loading = false,
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-3 py-2.5">
        <span className="text-sm font-semibold text-ink">{listTitle}</span>
        <span className="rounded border border-surface-border bg-surface-muted/50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-muted">
          {threads.length}
        </span>
      </div>
      <div className="shrink-0 border-b border-surface-border px-2.5 py-2">
        <IconInput
          icon={Search}
          type="text"
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          readOnly={disabledSearch}
          placeholder="Search…"
          className="h-10 min-h-0 rounded-xl bg-surface-muted/30 text-xs disabled:cursor-not-allowed disabled:bg-surface-muted"
          aria-label="Search threads"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading && threads.length === 0 ? (
          <SkeletonEmailList rows={8} />
        ) : threads.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-ink-muted">
            <p className="font-medium text-ink">No conversations match your filters.</p>
            {emptyHint ? <p className="mt-2 text-left leading-relaxed text-ink-muted">{emptyHint}</p> : null}
          </div>
        ) : (
          threads.map((thread) => (
            <ThreadListItem
              key={thread.threadId}
              thread={thread}
              isActive={thread.threadId === selectedId}
              onClick={() => onSelect(thread.threadId)}
            />
          ))
        )}
      </div>
    </div>
  )
}
