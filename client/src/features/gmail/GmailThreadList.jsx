function ThreadListItem({ thread, isActive, onClick }) {
  const senderName = thread.lastMessage?.from?.name && thread.lastMessage.from.name !== 'Unknown'
    ? thread.lastMessage.from.name
    : thread.lastMessage?.from?.email || 'Conversation'
  const senderInitials = thread.lastMessage?.from?.initials && thread.lastMessage.from.initials !== '??'
    ? thread.lastMessage.from.initials
    : (thread.subject || 'C').charAt(0).toUpperCase()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-surface-border border-l-2 px-3 py-3 text-left transition-colors ${
        isActive ? 'border-l-brand-500 bg-brand-50' : 'border-l-transparent hover:bg-surface-muted'
      }`}
    >
      <div className={`mt-2 h-1.5 w-1.5 rounded-full ${thread.isUnread ? 'bg-brand-500' : 'bg-transparent'}`} />
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
        {senderInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-[12px] font-medium text-ink-muted">
            {senderName}
          </span>
          <span className="flex-shrink-0 text-[10px] text-ink-muted">{thread.lastDateFormatted}</span>
        </div>
        <div className={`mb-1 truncate text-[13px] ${thread.isUnread ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>
          {thread.subject}
        </div>
        {thread.snippet ? (
          <div className="mb-1 truncate text-[11px] text-ink-muted">{thread.snippet}</div>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-surface-border bg-surface-subtle px-1.5 py-0.5 text-[10px] text-ink-muted">
            {thread.messageCount} msg{thread.messageCount !== 1 ? 's' : ''}
          </span>
          {thread.hasAttachments ? (
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">files</span>
          ) : null}
          {thread.isUnread ? (
            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">Unread</span>
          ) : (
            <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">Sent</span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function GmailThreadList({ threads, selectedId, onSelect }) {
  return (
    <div className="flex h-full w-[320px] min-w-[280px] max-w-[360px] flex-shrink-0 flex-col border-r border-surface-border bg-white">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <span className="text-sm font-semibold text-ink">Gmail threads</span>
        <span className="rounded-full border border-surface-border bg-surface-subtle px-2 py-0.5 text-xs text-ink-muted">{threads.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <ThreadListItem
            key={thread.threadId}
            thread={thread}
            isActive={thread.threadId === selectedId}
            onClick={() => onSelect(thread.threadId)}
          />
        ))}
      </div>
    </div>
  )
}
