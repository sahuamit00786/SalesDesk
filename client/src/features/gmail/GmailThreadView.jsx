import { useState } from 'react'
import { Archive, EllipsisVertical, Forward, Reply, Trash2 } from 'lucide-react'
import GmailMessageCard from '@/features/gmail/GmailMessageCard'
import GmailReplyBox from '@/features/gmail/GmailReplyBox'

function EmptyThreadState() {
  return <div className="p-6 text-sm text-ink-muted">Select an email from the inbox.</div>
}

export default function GmailThreadView({ thread, onBack, onSync, onCreateEmail, onReply }) {
  const [menuOpen, setMenuOpen] = useState(false)
  if (!thread) return <EmptyThreadState />
  const participants = (thread.participants || []).map((p) => p.name || p.email).filter(Boolean)
  return (
    <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-surface-border bg-white px-4 py-2">
        <div className="flex items-center gap-1">
          <button type="button" className="h-8 rounded-lg border border-surface-border bg-white px-3 text-xs font-medium text-ink hover:bg-slate-50" onClick={() => onReply?.(thread)}>
            <Reply size={13} className="mr-1 inline-block" />
            Reply
          </button>
          <button type="button" className="h-8 rounded-lg border border-surface-border bg-white px-3 text-xs font-medium text-ink hover:bg-slate-50" onClick={() => onReply?.(thread)}>
            <Forward size={13} className="mr-1 inline-block" />
            Forward
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-muted hover:bg-slate-50"><Archive size={14} /></button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-muted hover:bg-slate-50"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col gap-2 border-b border-surface-border bg-white px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="leading-tight text-sm font-semibold text-ink md:text-base">Subject: {thread.subject}</h1>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
            {thread.messageCount} messages in this thread
            {participants.length ? ` · Participants: ${participants.join(', ')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onCreateEmail} className="h-7 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700">
            + Create email
          </button>
          <div className="relative">
            <button
              type="button"
              aria-label="More actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted hover:bg-surface-subtle"
            >
              <EllipsisVertical size={14} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-8 z-20 w-36 overflow-hidden rounded-lg border border-surface-border bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onBack?.()
                  }}
                  className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-subtle"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onSync?.()
                  }}
                  className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-subtle"
                >
                  Sync replies
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-50/40 p-3">
        <div className="flex flex-col gap-3">
          {thread.messages.map((msg, idx) => (
            <GmailMessageCard
              key={msg.id}
              message={msg}
              defaultExpanded={idx === thread.messages.length - 1}
            />
          ))}
        </div>
      </div>
      <GmailReplyBox toLabel={thread.lastMessage?.from?.email} onCreateEmail={onCreateEmail} />
    </div>
  )
}
