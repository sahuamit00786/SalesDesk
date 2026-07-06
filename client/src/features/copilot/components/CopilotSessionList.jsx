import { MessageSquare, Plus, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function bucketFor(dateValue) {
  if (!dateValue) return 'Older'
  const date = startOfDay(dateValue)
  const today = startOfDay(new Date())
  const diffDays = Math.round((today - date) / 86400000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 7) return 'This week'
  return 'Older'
}

function relativeTime(dateValue) {
  if (!dateValue) return ''
  const diffMs = Date.now() - new Date(dateValue).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateValue).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const BUCKET_ORDER = ['Today', 'Yesterday', 'This week', 'Older']

function groupSessions(sessions) {
  const groups = new Map(BUCKET_ORDER.map((b) => [b, []]))
  for (const session of sessions) {
    const bucket = bucketFor(session.lastMessageAt || session.createdAt)
    groups.get(bucket).push(session)
  }
  return BUCKET_ORDER.map((label) => ({ label, sessions: groups.get(label) })).filter((g) => g.sessions.length > 0)
}

function handleDeleteClick(e, session, onDelete) {
  e.stopPropagation()
  const name = session.title || 'this conversation'
  if (window.confirm(`Delete "${name}"? This can't be undone.`)) {
    onDelete(session.id)
  }
}

export function CopilotSessionList({ sessions, activeSessionId, onSelect, onNew, onDelete, creatingNew }) {
  const groups = groupSessions(sessions)

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-muted/40">
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-ink">Copilot</span>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onNew}
          disabled={creatingNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary,#5B21B6)] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {!sessions.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-400">
              <MessageSquare className="h-5 w-5" />
            </span>
            <p className="text-xs text-ink-muted">No conversations yet. Start a new chat to ask about your CRM data.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.sessions.map((session) => {
                  const active = session.id === activeSessionId
                  return (
                    <div
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelect(session.id)
                        }
                      }}
                      className={cn(
                        'group flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                        active
                          ? 'bg-white font-medium text-ink shadow-sm ring-1 ring-brand-100'
                          : 'text-ink-muted hover:bg-white/70 hover:text-ink',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                          active ? 'bg-brand-50 text-brand-600' : 'bg-black/[0.04] text-ink-faint group-hover:text-brand-500',
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{session.title || 'New conversation'}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-ink-faint group-hover:hidden">
                        {relativeTime(session.lastMessageAt || session.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, session, onDelete)}
                        aria-label="Delete conversation"
                        title="Delete conversation"
                        className="hidden shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger group-hover:block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
