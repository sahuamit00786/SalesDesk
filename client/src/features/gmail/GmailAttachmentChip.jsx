import { FolderInput, Paperclip } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function GmailAttachmentChip({
  attachment,
  messageId,
  mailboxMode = false,
  onPreview,
  onRequestSaveToLead,
}) {
  const cfg = attachment?.color || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }

  const open = () => {
    if (mailboxMode && messageId && onPreview) onPreview(messageId, attachment)
    else if (attachment?.fileUrl) window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="group relative inline-flex max-w-full">
      <button
        type="button"
        onClick={open}
        title={attachment?.name || 'Attachment'}
        style={{
          border: `1px solid ${cfg.border}`,
          background: cfg.bg,
        }}
        className={cn(
          'flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-left shadow-sm transition',
          mailboxMode || attachment?.fileUrl ? 'cursor-pointer hover:brightness-[1.02]' : 'cursor-default',
        )}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: cfg.text,
            background: 'white',
            border: `1px solid ${cfg.border}`,
            borderRadius: '6px',
            padding: '2px 6px',
            letterSpacing: '0.04em',
          }}
        >
          {(attachment?.icon || 'file').toUpperCase()}
        </span>
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-ink-muted opacity-70" aria-hidden />
        <span className="min-w-0 truncate text-xs font-medium text-ink">{attachment?.name || 'Attachment'}</span>
        <span className="shrink-0 text-[10px] text-ink-muted">{attachment?.size || ''}</span>
      </button>
      {mailboxMode && messageId && onRequestSaveToLead ? (
        <div className="absolute -right-1 -top-1 z-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            title="Save to lead documents"
            onClick={(e) => {
              e.stopPropagation()
              onRequestSaveToLead(messageId, attachment)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 shadow-md hover:bg-slate-50"
          >
            <FolderInput className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}
