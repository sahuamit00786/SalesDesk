import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { IconInput } from '@/components/ui/IconInput'

function ThreadListItem({ thread, isActive, onClick }) {
  const senderName =
    thread.lastMessage?.from?.name && thread.lastMessage.from.name !== 'Unknown'
      ? thread.lastMessage.from.name
      : thread.lastMessage?.from?.email || 'Conversation'
  const senderInitials =
    thread.lastMessage?.from?.initials && thread.lastMessage.from.initials !== '??'
      ? thread.lastMessage.from.initials
      : (thread.subject || 'C').charAt(0).toUpperCase()
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 border-b border-surface-border border-l-[3px] px-3 py-2.5 text-left transition-colors',
        isActive
          ? 'border-l-brand-600 bg-surface-muted'
          : 'border-l-transparent hover:bg-surface-muted/60',
      )}
    >
      <div
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          thread.isUnread ? 'bg-brand-500' : 'bg-surface-border',
        )}
      />
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          isActive ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink-muted',
        )}
      >
        {senderInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className={cn('truncate text-[12px]', thread.isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-muted')}>
            {senderName}
          </span>
          <span className="shrink-0 text-[10px] text-ink-muted">{thread.lastDateFormatted}</span>
        </div>
        <div className={cn('mb-0.5 line-clamp-2 text-[12px] leading-snug', thread.isUnread ? 'font-semibold text-ink' : 'font-medium text-ink')}>
          {thread.subject}
        </div>
        {thread.snippet ? <div className="line-clamp-2 text-[11px] leading-relaxed text-ink-muted">{thread.snippet}</div> : null}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="rounded border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
            {thread.messageCount} msg{thread.messageCount !== 1 ? 's' : ''}
          </span>
          {thread.hasAttachments ? (
            <span className="rounded border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              Files
            </span>
          ) : null}
          {thread.lead?.id ? (
            <span className="rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-800">
              Lead
            </span>
          ) : null}
        </div>
      </div>
    </button>
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
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{listTitle}</span>
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
          className="h-9 min-h-0 rounded-lg bg-surface-muted/30 text-xs disabled:cursor-not-allowed disabled:bg-surface-muted"
          aria-label="Search threads"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {threads.length === 0 ? (
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
