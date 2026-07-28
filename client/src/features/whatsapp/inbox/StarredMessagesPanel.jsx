import { useMemo } from 'react'
import { Star, X } from '@/components/ui/icons'
import { useGetWhatsAppStarredMessagesQuery } from '@/features/whatsapp/whatsappApi'

function previewTextFor(message) {
  if (message.type === 'text') return message.textBody || ''
  return message.caption || `[${message.type}]`
}

/** Company-wide starred messages, across every conversation — this is a shared inbox, not per-agent. */
export function StarredMessagesPanel({ onClose, onOpenMessage }) {
  const { data, isFetching } = useGetWhatsAppStarredMessagesQuery()
  const rows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data?.data])

  return (
    <div className="fixed inset-0 z-[110] flex items-stretch justify-end bg-black/30" role="dialog" aria-modal>
      <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Star size={16} className="fill-amber-500 text-amber-500" />
            <p className="text-sm font-semibold text-ink">Starred messages</p>
          </div>
          <button type="button" className="rounded-full p-1.5 text-ink-muted hover:bg-surface-muted" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isFetching && !rows.length ? (
            <p className="p-4 text-center text-xs text-ink-muted">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-center text-xs text-ink-muted">No starred messages yet</p>
          ) : (
            rows.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => onOpenMessage(message)}
                className="block w-full border-b border-surface-border/60 px-4 py-3 text-left hover:bg-surface-muted"
              >
                <p className="text-xs font-semibold text-ink">{message.conversation?.contactName || message.conversation?.waPhoneNumber}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{previewTextFor(message)}</p>
                <p className="mt-1 text-[10px] text-ink-muted">{new Date(message.createdAt).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
