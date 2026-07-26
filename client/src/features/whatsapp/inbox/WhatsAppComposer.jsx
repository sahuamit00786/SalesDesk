import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Bold, Italic, LayoutTemplate, Paperclip, Send, X } from '@/components/ui/icons'
import { useSendWhatsAppMessageMutation, useUploadWhatsAppMediaMutation } from '@/features/whatsapp/whatsappApi'
import { createRipple } from '@/features/whatsapp/useRipple'
import { TemplatePickerModal } from './TemplatePickerModal'

const MIME_TYPE_MAP = [
  { prefix: 'image/', type: 'image' },
  { prefix: 'video/', type: 'video' },
  { prefix: 'audio/', type: 'audio' },
]

const MAX_CHARS = 4096
// WhatsApp's own text formatting markers — Meta renders these as real bold/italic/etc.
const FORMAT_BUTTONS = [
  { icon: Bold, marker: '*', label: 'Bold' },
  { icon: Italic, marker: '_', label: 'Italic' },
  { text: 'S', className: 'line-through', marker: '~', label: 'Strikethrough' },
  { text: '</>', className: 'font-mono text-[10px]', marker: '```', label: 'Monospace' },
]

function mediaTypeForFile(file) {
  const match = MIME_TYPE_MAP.find((m) => file.type.startsWith(m.prefix))
  return match?.type || 'document'
}

function previewTextFor(message) {
  if (!message) return ''
  if (message.type === 'text') return message.textBody || ''
  return message.caption || `[${message.type}]`
}

export function WhatsAppComposer({ conversationId, disabled, replyingTo, onCancelReply, onSent, windowOpen = true }) {
  const [text, setText] = useState('')
  const [sendMessage, { isLoading: sending }] = useSendWhatsAppMessageMutation()
  const [uploadMedia, { isLoading: uploading }] = useUploadWhatsAppMediaMutation()
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  /** Wraps the current selection (or inserts at the cursor) with a formatting marker pair. */
  function applyFormat(marker) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const selected = text.slice(start, end)
    const next = `${text.slice(0, start)}${marker}${selected}${marker}${text.slice(end)}`
    setText(next.slice(0, MAX_CHARS))
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + marker.length + selected.length + (selected ? marker.length : 0)
      el.setSelectionRange(cursor, cursor)
    })
  }

  async function handleSendText() {
    const value = text.trim()
    if (!value || !conversationId) return
    setText('')
    try {
      const res = await sendMessage({ id: conversationId, type: 'text', text: value, replyToMessageId: replyingTo?.id || null }).unwrap()
      onCancelReply?.()
      onSent?.()
      // The request itself can succeed (200) while WhatsApp still rejected the send —
      // the failed bubble shows in the thread either way, this just surfaces why.
      if (res?.data?.status === 'failed') toast.error(res.data.errorMessage || 'WhatsApp rejected this message')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Message failed to send')
    }
  }

  /** Outside the 24h window, free-form text is a dead end (Meta rejects it) — clicking
   * or tabbing into the input opens the template picker instead of letting you type. */
  function handleComposerInputIntercept(e) {
    if (windowOpen) return
    e.preventDefault()
    textareaRef.current?.blur()
    setTemplatePickerOpen(true)
  }

  async function handleAttach(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !conversationId) return
    try {
      const uploaded = await uploadMedia(file).unwrap()
      const res = await sendMessage({
        id: conversationId,
        type: mediaTypeForFile(file),
        mediaRef: uploaded.data.mediaRef,
        fileName: uploaded.data.fileName,
        mimeType: uploaded.data.mimeType,
        replyToMessageId: replyingTo?.id || null,
      }).unwrap()
      onCancelReply?.()
      onSent?.()
      if (res?.data?.status === 'failed') toast.error(res.data.errorMessage || 'WhatsApp rejected this message')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Attachment failed to send')
    }
  }

  return (
    <div className="shrink-0 border-t border-surface-border bg-white">
      {replyingTo ? (
        <div className="flex items-start gap-2 border-b border-surface-border bg-surface-subtle px-3 py-2">
          <div className="min-w-0 flex-1 rounded-md border-l-4 border-emerald-500 bg-white px-2 py-1">
            <p className="text-[11px] font-semibold text-emerald-700">
              {replyingTo.direction === 'outbound' ? 'You' : 'Replying to'}
            </p>
            <p className="truncate text-xs text-ink-muted">{previewTextFor(replyingTo)}</p>
          </div>
          <button type="button" className="shrink-0 rounded-full p-1 text-ink-muted hover:bg-surface-muted" onClick={onCancelReply} aria-label="Cancel reply">
            <X size={16} />
          </button>
        </div>
      ) : null}
      <div className="flex items-center gap-0.5 border-b border-surface-border/60 px-3 py-1">
        {FORMAT_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.label}
            className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-md text-ink-muted hover:bg-surface-muted"
            onClick={() => applyFormat(btn.marker)}
            onMouseDown={createRipple}
            disabled={disabled}
          >
            {btn.icon ? <btn.icon size={14} /> : <span className={btn.className}>{btn.text}</span>}
          </button>
        ))}
        {text.length > 0 ? (
          <span className={`ml-auto text-[10px] tabular-nums ${text.length > MAX_CHARS - 100 ? 'text-red-600' : 'text-ink-muted'}`}>
            {text.length}/{MAX_CHARS}
          </span>
        ) : null}
      </div>
      <div className="flex items-end gap-2 px-3 py-2.5">
        <input ref={fileInputRef} type="file" hidden onChange={handleAttach} />
        <button
          type="button"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-ink-muted hover:bg-surface-muted disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          onMouseDown={createRipple}
          disabled={disabled || uploading}
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <button
          type="button"
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition-colors disabled:opacity-50 ${
            windowOpen ? 'text-ink-muted hover:bg-surface-muted' : 'text-white'
          }`}
          style={!windowOpen ? { backgroundColor: 'var(--wa-accent)' } : undefined}
          onClick={() => setTemplatePickerOpen(true)}
          onMouseDown={createRipple}
          disabled={disabled || !conversationId}
          title="Send a template — required to message a cold contact"
          aria-label="Send a template"
        >
          <LayoutTemplate size={18} />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          maxLength={MAX_CHARS}
          className={`max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:border-[var(--wa-accent)] ${
            windowOpen ? 'border-surface-border' : 'border-red-200'
          }`}
          placeholder={windowOpen ? 'Type a message…' : 'Outside 24h window — use a template above'}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onMouseDown={handleComposerInputIntercept}
          onFocus={handleComposerInputIntercept}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendText()
            }
          }}
        />
        <button
          type="button"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-white transition-transform active:scale-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--wa-accent)' }}
          onClick={handleSendText}
          onMouseDown={createRipple}
          disabled={disabled || sending || !text.trim()}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>

      {templatePickerOpen ? (
        <TemplatePickerModal
          conversationId={conversationId}
          onClose={() => setTemplatePickerOpen(false)}
          onSent={() => onSent?.()}
        />
      ) : null}
    </div>
  )
}
