import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, Check, ChevronDown, Clock, Copy, CornerUpLeft, Download, FileText, MapPin, Star } from '@/components/ui/icons'
import { getFileUrl } from '@/features/documents/documentUtils'
import { WhatsAppFormattedText } from '../WhatsAppFormattedText'
import { cn } from '@/utils/cn'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

/** Real tick icons (single/double check, clock, warning) instead of text glyphs. */
function MessageStatusIcon({ status }) {
  if (status === 'queued') return <Clock size={11} className="text-ink-muted" />
  if (status === 'failed') return <AlertTriangle size={11} className="text-red-600" />
  if (status === 'sent') return <Check size={13} className="text-ink-muted" />
  if (status === 'delivered' || status === 'read') {
    return (
      <span className="relative inline-block h-3 w-4" style={status === 'read' ? { color: 'var(--wa-tick-read)' } : undefined}>
        <Check size={13} className={cn('absolute left-0 top-0', status !== 'read' && 'text-ink-muted')} />
        <Check size={13} className={cn('absolute left-1 top-0', status !== 'read' && 'text-ink-muted')} />
      </span>
    )
  }
  return null
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function previewTextFor(message) {
  if (!message) return ''
  if (message.type === 'text' || message.type === 'template') return message.textBody || ''
  if (message.type === 'location') return message.locationName || 'Location'
  return message.caption || `[${message.type}]`
}

/** Time + star + ticks, at 0.75x the message body's font size (14px * 0.75 = 10.5px).
 * Rendered twice for text bubbles — once invisible inline (reserves space so text
 * wraps around it) and once for real on top, fixed to the bottom-right corner. */
function MessageMeta({ message, outbound, timeText }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] leading-none text-ink-muted">
      {message.isStarred ? <Star size={10} className="fill-amber-500 text-amber-500" /> : null}
      <span>{timeText}</span>
      {outbound ? <MessageStatusIcon status={message.status} /> : null}
    </span>
  )
}

function MediaPlaceholder({ message, label }) {
  if (message.errorMessage) return <p className="text-xs italic text-red-600">Couldn't download {label}</p>
  return <p className="text-xs italic text-ink-muted">Downloading {label}…</p>
}

function MessageBody({ message, outbound, timeText }) {
  const url = message.mediaUrl ? getFileUrl(message.mediaUrl) : null

  switch (message.type) {
    case 'text':
      return (
        <p className="whitespace-pre-wrap break-words pr-1 text-sm">
          <WhatsAppFormattedText text={message.textBody} />
          {/* Invisible twin of the fixed meta below — same markup/size, so it takes up
              real space in the text flow and forces a wrap onto a new line whenever the
              last line of text is too wide to leave room for the time next to it. */}
          <span className="invisible ml-2 align-bottom">
            <MessageMeta message={message} outbound={outbound} timeText={timeText} />
          </span>
        </p>
      )
    case 'template':
      if (!message.templateName) {
        return (
          <p className="whitespace-pre-wrap break-words pr-1 text-sm">
            <WhatsAppFormattedText text={message.textBody} />
            <span className="invisible ml-2 align-bottom">
              <MessageMeta message={message} outbound={outbound} timeText={timeText} />
            </span>
          </p>
        )
      }
      return (
        <div>
          <p className="whitespace-pre-wrap break-words pr-1 text-sm">
            <WhatsAppFormattedText text={message.textBody} />
          </p>
          {/* Very small template name tag — the invisible meta twin now lives here since
              this is the bubble's actual last line, so the fixed meta below still has room. */}
          <p className="mt-1 whitespace-pre-wrap break-words pr-1 text-[9px] italic text-ink-muted">
            Template: {message.templateName}
            <span className="invisible ml-2 align-bottom">
              <MessageMeta message={message} outbound={outbound} timeText={timeText} />
            </span>
          </p>
        </div>
      )
    case 'image':
      return (
        <div>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt={message.caption || 'Image'} className="max-h-72 max-w-full rounded-md object-contain" />
            </a>
          ) : (
            <MediaPlaceholder message={message} label="image" />
          )}
          {message.caption ? (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              <WhatsAppFormattedText text={message.caption} />
            </p>
          ) : null}
        </div>
      )
    case 'sticker':
      return url ? <img src={url} alt="Sticker" className="h-32 w-32 object-contain" /> : <MediaPlaceholder message={message} label="sticker" />
    case 'video':
      return url ? (
        <video controls src={url} className="max-h-72 max-w-full rounded-md" />
      ) : (
        <MediaPlaceholder message={message} label="video" />
      )
    case 'audio':
      return url ? <audio controls src={url} className="max-w-full" /> : <MediaPlaceholder message={message} label="audio" />
    case 'document':
      return url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border border-black/10 bg-white/60 px-2.5 py-2 text-sm">
          <FileText size={16} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{message.fileName || 'Document'}</span>
          <Download size={14} className="shrink-0" />
        </a>
      ) : (
        <MediaPlaceholder message={message} label="document" />
      )
    case 'location':
      return (
        <a
          href={`https://maps.google.com/?q=${message.latitude},${message.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-brand-700 hover:underline"
        >
          <MapPin size={16} className="shrink-0" />
          {message.locationName || 'Shared location'}
        </a>
      )
    default:
      return <p className="text-xs italic text-ink-muted">[{message.type || 'unsupported'} message]</p>
  }
}

export function WhatsAppMessageBubble({
  message,
  quotedMessage,
  isFirstInGroup,
  isLastInGroup,
  highlighted,
  onReply,
  onReact,
  onStar,
  onJumpToReply,
  onMenuOpenChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const outbound = message.direction === 'outbound'

  useEffect(() => {
    onMenuOpenChange?.(menuOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return undefined
    function handlePointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  function copyText() {
    const text = previewTextFor(message)
    if (!text) return
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Could not copy'),
    )
    setMenuOpen(false)
  }

  const timeText = formatTime(message.waTimestamp || message.createdAt)

  return (
    <div
      className={cn(
        'group flex w-full lf-wa-message-in',
        outbound ? 'justify-end' : 'justify-start',
        isFirstInGroup ? 'mt-2.5' : 'mt-0.5',
        isLastInGroup ? 'mb-1' : 'mb-0',
      )}
    >
      <div
        title={outbound && message.sentBy?.name ? `Sent by ${message.sentBy.name}` : undefined}
        className={cn(
          'relative min-w-[84px] max-w-[75%] px-3 py-2 shadow-sm transition-colors',
          // Inner corners (facing the center of the chat) are always fully rounded.
          // The outer-top corner is only rounded ("canonical") at the START of a
          // same-sender run — squared off (rounded-none, not just "sm") everywhere
          // else so the grouped/ungrouped shapes read as clearly different, not just
          // subtly different. The outer-bottom corner is always squared — the tail
          // nub below is what marks "end of group", not a rounded corner.
          outbound
            ? cn('rounded-tl-lg rounded-bl-lg rounded-br-none text-[#111b21]', isFirstInGroup ? 'rounded-tr-lg' : 'rounded-tr-none')
            : cn('rounded-tr-lg rounded-br-lg rounded-bl-none border border-black/[0.04] text-[#111b21]', isFirstInGroup ? 'rounded-tl-lg' : 'rounded-tl-none'),
          highlighted && 'ring-2 ring-amber-400',
        )}
        style={{ backgroundColor: outbound ? 'var(--wa-bubble-out)' : 'var(--wa-bubble-in)' }}
      >
        {isLastInGroup ? (
          <span
            aria-hidden
            className="absolute bottom-0 h-3.5 w-3.5"
            style={{
              [outbound ? 'right' : 'left']: '-7px',
              backgroundColor: outbound ? 'var(--wa-bubble-out)' : 'var(--wa-bubble-in)',
              clipPath: outbound ? 'polygon(0 0, 0 100%, 100% 100%)' : 'polygon(100% 0, 100% 100%, 0 100%)',
            }}
          />
        ) : null}
        {message.replyToWaMessageId ? (
          <button
            type="button"
            onClick={() => onJumpToReply?.(message.replyToWaMessageId)}
            className="mb-1.5 block w-full rounded-lg border-l-4 border-emerald-500 bg-black/5 px-2 py-1 text-left text-xs text-ink-muted hover:bg-black/10"
          >
            <span className="line-clamp-2">
              {quotedMessage ? <WhatsAppFormattedText text={previewTextFor(quotedMessage)} /> : 'Original message'}
            </span>
          </button>
        ) : null}

        <MessageBody message={message} outbound={outbound} timeText={timeText} />

        {message.type === 'text' || message.type === 'template' ? (
          // Fixed to the bubble's last row, bottom-right — the invisible twin inside
          // MessageBody already reserved this exact amount of space in the text flow.
          <span className="pointer-events-none absolute bottom-1.5 right-2.5">
            <MessageMeta message={message} outbound={outbound} timeText={timeText} />
          </span>
        ) : (
          <div className={cn('mt-1 flex items-center gap-1', outbound ? 'justify-end' : 'justify-start')}>
            <MessageMeta message={message} outbound={outbound} timeText={timeText} />
          </div>
        )}
        {message.status === 'failed' && message.errorMessage ? (
          <p className="mt-1 text-[10px] text-red-700">{message.errorMessage}</p>
        ) : null}

        {message.reaction ? (
          <span
            key={message.reaction}
            className={cn(
              'absolute -bottom-2.5 rounded-full border border-surface-border bg-white px-1 text-xs shadow-sm lf-wa-reaction-pop',
              outbound ? 'left-1' : 'right-1',
            )}
          >
            {message.reaction}
          </span>
        ) : null}

        {/* WhatsApp-style per-message menu trigger — sits just outside the bubble,
            on the side facing the center of the chat, shown on hover (or while open). */}
        <button
          type="button"
          className={cn(
            'absolute top-1 rounded-full p-0.5 text-ink-muted opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100',
            outbound ? '-left-6' : '-right-6',
            menuOpen && 'opacity-100 bg-black/10',
          )}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Message options"
        >
          <ChevronDown size={14} />
        </button>

        {menuOpen ? (
          <div
            ref={menuRef}
            className={cn('absolute top-7 z-20 w-44 overflow-hidden rounded-xl border border-surface-border bg-white py-1 text-ink shadow-2xl', outbound ? 'right-0' : 'left-0')}
          >
            <div className="flex items-center justify-around border-b border-surface-border px-1.5 py-1.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={cn('grid h-7 w-7 place-items-center rounded-full text-base transition-transform hover:scale-125', message.reaction === emoji && 'bg-emerald-50')}
                  onClick={() => {
                    setMenuOpen(false)
                    onReact?.(message.reaction === emoji ? '' : emoji)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted" onClick={() => { setMenuOpen(false); onReply?.(message) }}>
              <CornerUpLeft size={14} className="text-ink-muted" /> Reply
            </button>
            {message.type === 'text' || message.type === 'template' ? (
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted" onClick={copyText}>
                <Copy size={14} className="text-ink-muted" /> Copy
              </button>
            ) : null}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
              onClick={() => { setMenuOpen(false); onStar?.(!message.isStarred) }}
            >
              <Star size={14} className={message.isStarred ? 'fill-amber-500 text-amber-500' : 'text-ink-muted'} />
              {message.isStarred ? 'Unstar' : 'Star'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
