export default function GmailAttachmentChip({ attachment }) {
  const cfg = attachment?.color || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }
  const handleClick = () => {
    if (attachment?.fileUrl) window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer')
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '10px',
        border: `0.5px solid ${cfg.border}`,
        background: cfg.bg,
        cursor: attachment?.fileUrl ? 'pointer' : 'default',
      }}
      className="text-left"
    >
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          color: cfg.text,
          background: 'white',
          border: `0.5px solid ${cfg.border}`,
          borderRadius: '4px',
          padding: '1px 4px',
          letterSpacing: '0.5px',
        }}
      >
        {(attachment?.icon || 'file').toUpperCase()}
      </span>
      <span className="max-w-[160px] truncate text-xs text-ink">{attachment?.name || 'Attachment'}</span>
      <span className="text-[10px] text-ink-muted">{attachment?.size || ''}</span>
    </button>
  )
}
