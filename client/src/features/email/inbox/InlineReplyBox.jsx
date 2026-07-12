import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Bold, ChevronDown, ChevronUp, Ellipsis, Forward, Italic, Link2, List, ListOrdered,
  Paperclip, Reply, ReplyAll, Underline, X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Select } from '@/components/ui/Select'
import { useSendEmailForLeadMutation, useUploadEmailAttachmentsMutation } from '@/features/email/emailApi'
import { buildReplyQuoteHtml } from '@/features/email/buildReplyQuoteHtml'

const GMAIL_ATTACHMENT_SOFT_CAP = 24 * 1024 * 1024

function normalizeRecipients(value) {
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean)
}

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Reply target: if I sent the last message, reply to its first recipient, not myself. */
function counterpartOf(last, myEmail) {
  const fromEmail = String(last?.from?.email || '').trim().toLowerCase()
  return fromEmail && fromEmail !== myEmail ? last.from : (last?.to || [])[0] || null
}

function replyAllCc(thread, myEmail, counterpartEmail) {
  const last = thread?.lastMessage
  const fromEmail = String(last?.from?.email || '').trim().toLowerCase()
  const seen = new Set([fromEmail, myEmail, counterpartEmail].filter(Boolean))
  const cc = []
  for (const msg of thread?.messages || []) {
    for (const addr of [...(msg.to || []), ...(msg.cc || [])]) {
      const e = String(addr?.email || '').trim().toLowerCase()
      if (!e || seen.has(e)) continue
      seen.add(e)
      cc.push(addr.email.trim())
    }
  }
  return cc.join(', ')
}

export default function InlineReplyBox({ thread, myEmail, leads, leadByEmail, defaultLeadId, onSent }) {
  const editorRef = useRef(null)
  const [mode, setMode] = useState(null) // null | 'reply' | 'replyAll' | 'forward'
  const [leadId, setLeadId] = useState('')
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState('')
  const [quotedHtml, setQuotedHtml] = useState('')
  const [showQuote, setShowQuote] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState([])
  const [sendEmail, { isLoading: sending }] = useSendEmailForLeadMutation()
  const [uploadAttachments, { isLoading: uploading }] = useUploadEmailAttachmentsMutation()

  const last = thread?.lastMessage
  const counterpart = useMemo(() => counterpartOf(last, myEmail), [last, myEmail])
  const counterpartEmail = String(counterpart?.email || '').trim().toLowerCase()
  const matchedLead = counterpartEmail ? leadByEmail.get(counterpartEmail) : null

  // Collapse the box whenever the user navigates to a different thread.
  useEffect(() => {
    setMode(null)
  }, [thread?.threadId])

  function open(nextMode) {
    if (!last) return
    const baseSubject = String(thread?.subject || '').replace(/^(re|fwd):\s*/i, '')
    if (nextMode === 'forward') {
      setToInput('')
      setCcInput('')
      setShowCc(false)
      setSubject(`Fwd: ${baseSubject}`)
    } else {
      setToInput(matchedLead?.email || counterpart?.email || '')
      setCcInput(nextMode === 'replyAll' ? replyAllCc(thread, myEmail, counterpartEmail) : '')
      setShowCc(nextMode === 'replyAll')
      setSubject(`Re: ${baseSubject}`)
    }
    setLeadId(matchedLead?.id || defaultLeadId || '')
    setQuotedHtml(buildReplyQuoteHtml(last))
    setShowQuote(false)
    setUploadedAttachments([])
    setMode(nextMode)
    window.setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '<p><br></p>'
        document.execCommand('defaultParagraphSeparator', false, 'p')
        editorRef.current.focus()
      }
    }, 0)
  }

  function execCmd(command, value = undefined) {
    editorRef.current?.focus()
    document.execCommand(command, false, value ?? null)
  }

  function handleToolbarMouseDown(e, command, value) {
    e.preventDefault()
    execCmd(command, value)
  }

  function handleLinkMouseDown(e) {
    e.preventDefault()
    const url = window.prompt('Enter URL')
    if (url) execCmd('createLink', url)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const tooLarge = files.find((f) => f.size > GMAIL_ATTACHMENT_SOFT_CAP)
    if (tooLarge) {
      toast.error(`File too large (max 24 MB): ${tooLarge.name}`)
      return
    }
    const existingBytes = uploadedAttachments.reduce((sum, a) => sum + (Number(a.sizeBytes) || 0), 0)
    const incomingBytes = files.reduce((sum, f) => sum + f.size, 0)
    if (existingBytes + incomingBytes > GMAIL_ATTACHMENT_SOFT_CAP) {
      toast.error('Total attachments exceed the ~24 MB Gmail limit.')
      return
    }
    try {
      const res = await uploadAttachments(files).unwrap()
      const rows = Array.isArray(res?.data) ? res.data : []
      setUploadedAttachments((prev) => [...prev, ...rows])
      e.target.value = ''
    } catch {
      toast.error('Upload failed')
    }
  }

  async function handleSend() {
    if (!leadId) return toast.error('Pick a lead to send from the CRM')
    const to = normalizeRecipients(toInput)
    if (!to.length) return toast.error('At least one recipient is required')
    const written = editorRef.current?.innerHTML || '<p><br></p>'
    const bodyHtml = quotedHtml ? `${written}${quotedHtml}` : written
    try {
      await sendEmail({
        leadId,
        to,
        cc: normalizeRecipients(ccInput),
        bcc: [],
        subject,
        bodyHtml,
        attachments: uploadedAttachments,
        // Forward starts a new thread; replies stay in this one.
        threadId: mode === 'forward' ? null : thread?.threadId || null,
      }).unwrap()
      toast.success('Email sent')
      setMode(null)
      onSent?.()
    } catch {
      toast.error('Could not send email')
    }
  }

  if (!last) return null

  if (!mode) {
    return (
      <div className="flex gap-2 px-1 py-3">
        <button type="button" onClick={() => open('reply')}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-surface-border bg-white px-4 text-[13px] font-semibold text-ink hover:bg-surface-muted">
          <Reply size={14} /> Reply
        </button>
        {(thread?.participants?.length || 0) > 2 || (last?.cc || []).length > 0 ? (
          <button type="button" onClick={() => open('replyAll')}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-surface-border bg-white px-4 text-[13px] font-semibold text-ink hover:bg-surface-muted">
            <ReplyAll size={14} /> Reply all
          </button>
        ) : null}
        <button type="button" onClick={() => open('forward')}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-surface-border bg-white px-4 text-[13px] font-semibold text-ink hover:bg-surface-muted">
          <Forward size={14} /> Forward
        </button>
      </div>
    )
  }

  return (
    <div className="mb-2 rounded-xl border border-surface-border bg-white shadow-md">
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
          {mode === 'forward' ? <Forward size={13} /> : mode === 'replyAll' ? <ReplyAll size={13} /> : <Reply size={13} />}
          {mode === 'forward' ? 'Forward' : mode === 'replyAll' ? 'Reply all' : 'Reply'}
        </span>
        {matchedLead ? (
          <span className="truncate rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
            Lead: {matchedLead.title || matchedLead.contactName || matchedLead.email}
          </span>
        ) : (
          <Select className="h-7 max-w-[240px] rounded-lg text-[11px]" value={leadId} onChange={(e) => setLeadId(e.target.value)} aria-label="Send as lead email">
            <option value="">Pick lead to send…</option>
            {leads.filter((l) => l.email).map((l) => (
              <option key={l.id} value={l.id}>{l.title || l.contactName || l.email}</option>
            ))}
          </Select>
        )}
        <button type="button" onClick={() => setMode(null)} className="ml-auto rounded-lg p-1 text-ink-muted hover:bg-surface-muted" aria-label="Discard draft">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-1.5 px-3 pt-2">
        <div className="flex items-center gap-2 border-b border-surface-border/70 pb-1.5">
          <span className="w-8 shrink-0 text-[11px] text-ink-muted">To</span>
          <input
            type="text"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            placeholder="recipient@example.com"
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button type="button" onClick={() => setShowCc((v) => !v)} className="shrink-0 text-[11px] text-ink-muted hover:text-ink">
            Cc {showCc ? <ChevronUp size={10} className="inline" /> : <ChevronDown size={10} className="inline" />}
          </button>
        </div>
        {showCc ? (
          <div className="flex items-center gap-2 border-b border-surface-border/70 pb-1.5">
            <span className="w-8 shrink-0 text-[11px] text-ink-muted">Cc</span>
            <input
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              placeholder="cc@example.com"
              className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2 border-b border-surface-border/70 pb-1.5">
          <span className="w-8 shrink-0 text-[11px] text-ink-muted">Sub</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none"
            aria-label="Subject"
          />
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'max-h-[40vh] min-h-[120px] overflow-y-auto px-4 py-3 text-sm text-ink outline-none',
          '[&_p]:mb-2 [&_p:last-child]:mb-0',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2',
          '[&_a]:text-brand-600 [&_a]:underline',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted',
        )}
      />

      {quotedHtml ? (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setShowQuote((v) => !v)}
            className="rounded-full border border-surface-border bg-surface-muted/60 px-2 py-0.5 text-ink-muted hover:bg-surface-muted"
            title={showQuote ? 'Hide quoted text' : 'Show quoted text'}
            aria-label={showQuote ? 'Hide quoted text' : 'Show quoted text'}
          >
            <Ellipsis size={14} />
          </button>
          {showQuote ? (
            <div
              className="mt-2 max-h-[30vh] overflow-y-auto rounded-lg border border-surface-border bg-surface-muted/30 px-3 py-2 text-xs text-ink-muted"
              // buildReplyQuoteHtml output is DOMPurify-sanitized
              dangerouslySetInnerHTML={{ __html: quotedHtml }}
            />
          ) : null}
        </div>
      ) : null}

      {uploadedAttachments.length ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {uploadedAttachments.map((a, i) => (
            <span key={`${a.fileUrl}-${i}`} className="inline-flex max-w-[200px] items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-ink">
              <Paperclip size={10} className="shrink-0 text-ink-muted" />
              <span className="truncate">{a.fileName}</span>
              {a.sizeBytes ? <span className="shrink-0 text-ink-faint">{formatBytes(a.sizeBytes)}</span> : null}
              <button
                type="button"
                onClick={() => setUploadedAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="ml-0.5 shrink-0 rounded-full p-0.5 text-ink-muted hover:bg-slate-100 hover:text-ink"
                aria-label={`Remove ${a.fileName}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-0.5 border-t border-surface-border px-3 py-2">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || uploading || !leadId}
          className="mr-2 h-9 rounded-full bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
        {[
          { icon: Bold, cmd: 'bold', title: 'Bold' },
          { icon: Italic, cmd: 'italic', title: 'Italic' },
          { icon: Underline, cmd: 'underline', title: 'Underline' },
          { icon: List, cmd: 'insertUnorderedList', title: 'Bullet list' },
          { icon: ListOrdered, cmd: 'insertOrderedList', title: 'Numbered list' },
        ].map(({ icon: Icon, cmd, title }) => (
          <button key={cmd} type="button" title={title} onMouseDown={(e) => handleToolbarMouseDown(e, cmd)}
            className="rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink">
            <Icon size={14} />
          </button>
        ))}
        <button type="button" title="Insert link" onMouseDown={handleLinkMouseDown} className="rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink">
          <Link2 size={14} />
        </button>
        <label className="cursor-pointer rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink" title="Attach files">
          <Paperclip size={14} />
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {!leadId ? <span className="ml-2 text-[11px] text-amber-700">Pick a lead above to enable Send</span> : null}
      </div>
    </div>
  )
}
