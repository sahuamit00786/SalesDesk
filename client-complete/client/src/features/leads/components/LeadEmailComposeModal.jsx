import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  Bold,
  Italic,
  LayoutTemplate,
  Link2,
  List,
  ListOrdered,
  Mail,
  MessageSquare,
  Paperclip,
  Underline,
  X,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import { IconInput } from '@/components/ui/IconInput'
import { Select } from '@/components/ui/Select'
import { DocumentPickerModal } from '@/features/documents/components/DocumentPickerModal'
import { useUploadEmailAttachmentsMutation } from '@/features/email/emailApi'
import { useSendLeadEmailMutation } from '@/features/leads/leadsApi'
import {
  buildLeadMergeValues,
  mergeFieldLabel,
  missingMergeKeysForLead,
} from '@/features/leads/utils/mergeLeadValues'
import { fillMergeTags } from '@/features/templates/mergeTags'
import { useGetTemplatesQuery } from '@/features/templates/templatesApi'
import { cn } from '@/utils/cn'

const GMAIL_ATTACHMENT_SOFT_CAP = 24 * 1024 * 1024

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function htmlHasContent(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return Boolean(div.textContent?.replace(/\u00a0/g, ' ').trim())
}

function normalizeRecipients(value) {
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean)
}

function templateAttachmentsToEmailShape(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .map((a) => ({
      fileName: a.filename || a.fileName || 'attachment',
      fileUrl: a.url || a.fileUrl || '',
      mimeType: a.mimeType || null,
      sizeBytes: Number(a.size ?? a.sizeBytes ?? 0),
    }))
    .filter((a) => a.fileUrl)
}

export function LeadEmailComposeModal({
  open,
  onClose,
  leadId,
  lead = null,
  leadEmail = '',
  googleEmailConnected = false,
  initialSubject = '',
  initialBodyHtml = '',
  threadId = null,
}) {
  const editorRef = useRef(null)
  const [toInput, setToInput] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [galleryAttachments, setGalleryAttachments] = useState([])
  const [templateAttachments, setTemplateAttachments] = useState([])
  const [showDocumentPicker, setShowDocumentPicker] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState([])

  const user = useSelector((s) => s.auth.user)
  const senderName = user?.name || user?.email || 'Sales team'

  const { data: templatesRes, isLoading: templatesLoading } = useGetTemplatesQuery(undefined, { skip: !open })
  const templates = templatesRes?.data || []
  const selectedTemplate = templates.find((t) => String(t.id) === String(templateId))

  const missingMergeKeys = useMemo(
    () => (selectedTemplate && lead ? missingMergeKeysForLead(selectedTemplate, lead, senderName) : []),
    [selectedTemplate, lead, senderName],
  )

  const [uploadAttachments, { isLoading: uploading }] = useUploadEmailAttachmentsMutation()
  const [sendLeadEmail, { isLoading: sending }] = useSendLeadEmailMutation()

  const totalAttachmentCount = uploadedAttachments.length + galleryAttachments.length + templateAttachments.length

  useEffect(() => {
    if (!open) return
    setToInput(leadEmail || '')
    setSubject(initialSubject || '')
    setBodyHtml(initialBodyHtml || '')
    setTemplateId('')
    setGalleryAttachments([])
    setTemplateAttachments([])
    setShowDocumentPicker(false)
    setUploadedAttachments([])
  }, [open, leadEmail, initialSubject, initialBodyHtml])

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape' && !showDocumentPicker) onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, showDocumentPicker])

  useEffect(() => {
    if (!open || !editorRef.current) return
    editorRef.current.innerHTML = bodyHtml || ''
    document.execCommand('defaultParagraphSeparator', false, 'p')
  }, [open]) // sync only when modal opens

  function execCmd(command, value = undefined) {
    editorRef.current?.focus()
    document.execCommand(command, false, value ?? null)
    setBodyHtml(editorRef.current?.innerHTML || '')
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

  function applyTemplate(template) {
    if (!template) return
    const mergeValues = buildLeadMergeValues(lead || {}, senderName)
    const mergedSubject = fillMergeTags(template.subject, mergeValues)
    const mergedBody = fillMergeTags(template.bodyHtml, mergeValues)
    setSubject(mergedSubject)
    setBodyHtml(mergedBody)
    if (editorRef.current) {
      editorRef.current.innerHTML = mergedBody || ''
    }
    setTemplateAttachments(templateAttachmentsToEmailShape(template.attachments))
  }

  function handleTemplateChange(nextId) {
    setTemplateId(nextId)
    if (!nextId) {
      setTemplateAttachments([])
      return
    }
    const tpl = templates.find((t) => String(t.id) === String(nextId))
    if (!tpl) return
    const missing = lead ? missingMergeKeysForLead(tpl, lead, senderName) : []
    if (missing.length) {
      toast.error(`Some fields are empty: ${missing.map(mergeFieldLabel).join(', ')}`, { duration: 5000 })
    }
    applyTemplate(tpl)
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
    const to = normalizeRecipients(toInput)
    if (!to.length) return toast.error('At least one recipient is required')
    const html = editorRef.current?.innerHTML || bodyHtml || ''
    if (!htmlHasContent(html)) return toast.error('Write a message before sending')
    const attachments = [
      ...uploadedAttachments,
      ...templateAttachments,
      ...galleryAttachments.map(({ fileName, fileUrl, mimeType, sizeBytes }) => ({
        fileName,
        fileUrl,
        mimeType,
        sizeBytes,
      })),
    ]
    try {
      await sendLeadEmail({
        id: leadId,
        to,
        subject: subject.trim(),
        bodyHtml: html,
        attachments,
        threadId,
      }).unwrap()
      toast.success('Email sent')
      onClose?.()
    } catch (err) {
      const code = err?.data?.error?.code
      if (code === 'GOOGLE_TOKEN_INVALID') {
        toast.error('Google token expired — reconnect your Google account in Integrations.', { duration: 6000 })
      } else {
        toast.error(err?.data?.error?.message || 'Could not send email')
      }
    }
  }

  if (!open) return null

  const bodyReady = htmlHasContent(bodyHtml)

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-labelledby="compose-email-title"
          className="pointer-events-auto flex w-[min(820px,94vw)] max-h-[90dvh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-5 py-4">
            <div>
              <p id="compose-email-title" className="text-base font-semibold text-ink">
                {threadId ? 'Reply' : 'New Message'}
              </p>
              {totalAttachmentCount > 0 ? (
                <p className="text-xs text-ink-muted">
                  {totalAttachmentCount} attachment{totalAttachmentCount !== 1 ? 's' : ''}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-brand-50 hover:text-ink"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          <div className="scrollbar-subtle flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-[72px_1fr] items-start gap-3">
              <label htmlFor="compose-email-template" className="pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Template</label>
              <div className="space-y-2">
                <div className="relative">
                  <LayoutTemplate className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" strokeWidth={1.75} />
                  <Select
                    id="compose-email-template"
                    className="h-10 pl-9"
                    value={templateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    disabled={templatesLoading}
                  >
                    <option value="">No template — write from scratch</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </div>
                {selectedTemplate ? (
                  <p className="text-xs text-ink-muted">
                    Fills subject, body, and attachments with lead merge tags for this recipient.
                  </p>
                ) : null}
                {missingMergeKeys.length > 0 ? (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>
                      Missing on this lead: {missingMergeKeys.map(mergeFieldLabel).join(', ')}. Empty placeholders were used — edit before sending.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-[72px_1fr] items-center gap-3">
              <label htmlFor="compose-email-to" className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">To</label>
              <IconInput
                id="compose-email-to"
                icon={Mail}
                className="h-10"
                placeholder="recipient@example.com"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-[72px_1fr] items-center gap-3">
              <label htmlFor="compose-email-subject" className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Subject</label>
              <IconInput
                id="compose-email-subject"
                icon={MessageSquare}
                className="h-10"
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm transition-shadow focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/15">
              <div className="flex flex-wrap items-center gap-0.5 border-b border-surface-border bg-slate-50/80 px-2 py-1.5">
                {[
                  { icon: Bold, cmd: 'bold', title: 'Bold' },
                  { icon: Italic, cmd: 'italic', title: 'Italic' },
                  { icon: Underline, cmd: 'underline', title: 'Underline' },
                ].map(({ icon: Icon, cmd, title }) => (
                  <button
                    key={cmd}
                    type="button"
                    title={title}
                    onMouseDown={(e) => handleToolbarMouseDown(e, cmd)}
                    className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-brand-100 hover:text-brand-700"
                  >
                    <Icon size={15} />
                  </button>
                ))}
                <div className="mx-1 h-4 w-px bg-surface-border" />
                <button type="button" title="Bullet list" onMouseDown={(e) => handleToolbarMouseDown(e, 'insertUnorderedList')} className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-brand-100 hover:text-brand-700"><List size={15} /></button>
                <button type="button" title="Numbered list" onMouseDown={(e) => handleToolbarMouseDown(e, 'insertOrderedList')} className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-brand-100 hover:text-brand-700"><ListOrdered size={15} /></button>
                <div className="mx-1 h-4 w-px bg-surface-border" />
                <button type="button" title="Insert link" onMouseDown={handleLinkMouseDown} className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-brand-100 hover:text-brand-700"><Link2 size={15} /></button>
                <button
                  type="button"
                  title="Insert signature"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-brand-100 hover:text-brand-700"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    execCmd('insertHTML', '<p><br></p><p>Thanks,</p>')
                  }}
                >
                  Signature
                </button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className={cn(
                  'min-h-[220px] max-h-[40vh] overflow-y-auto px-4 py-3 text-sm text-ink outline-none',
                  '[&_p]:mb-2 [&_p:last-child]:mb-0',
                  '[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5',
                  '[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5',
                  '[&_a]:text-brand-600 [&_a]:underline',
                  'empty:before:text-ink-muted empty:before:content-[attr(data-placeholder)]',
                )}
                data-placeholder="Write your message..."
                onInput={(e) => setBodyHtml(e.currentTarget.innerHTML)}
              />
            </div>

            <div className="rounded-xl border border-surface-border bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Paperclip size={14} className="text-ink-muted" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    Attachments {totalAttachmentCount > 0 ? `(${totalAttachmentCount})` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-border bg-white px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-brand-50">
                    <Paperclip size={12} />
                    Upload
                    <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDocumentPicker(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    From documents
                  </button>
                </div>
              </div>

              {totalAttachmentCount > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {uploadedAttachments.map((a, i) => (
                    <span key={`${a.fileUrl}-${i}`} className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-surface-border bg-white px-2.5 py-1 text-xs text-ink">
                      <Paperclip size={10} className="shrink-0 text-ink-muted" />
                      <span className="truncate">{a.fileName}</span>
                      {a.sizeBytes ? <span className="shrink-0 text-ink-faint">{formatBytes(a.sizeBytes)}</span> : null}
                      <button
                        type="button"
                        onClick={() => setUploadedAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="ml-0.5 shrink-0 rounded-full p-0.5 text-ink-muted hover:bg-slate-100 hover:text-ink"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {templateAttachments.map((a, i) => (
                    <span key={`tpl-${a.fileUrl}-${i}`} className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-900">
                      <LayoutTemplate size={10} className="shrink-0" />
                      <span className="truncate">{a.fileName}</span>
                      <button
                        type="button"
                        onClick={() => setTemplateAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="ml-0.5 shrink-0 rounded-full p-0.5 hover:bg-violet-100"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {galleryAttachments.map((a) => (
                    <span key={a.id || a.fileUrl} className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-800">
                      <Paperclip size={10} className="shrink-0" />
                      <span className="truncate">{a.fileName}</span>
                      <button
                        type="button"
                        onClick={() => setGalleryAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                        className="ml-0.5 shrink-0 rounded-full p-0.5 hover:bg-brand-100"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">Upload files or pick from the lead document gallery.</p>
              )}
            </div>

            {!googleEmailConnected ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Connect Google in Integrations to send email from your account.
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-surface-border bg-slate-50/50 px-5 py-4">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={sending || uploading || !googleEmailConnected || !toInput.trim() || !bodyReady}
              onClick={handleSend}
            >
              {sending ? 'Sending…' : uploading ? 'Uploading…' : 'Send'}
            </Button>
          </div>
        </div>
      </div>

      <DocumentPickerModal
        open={showDocumentPicker}
        onClose={() => setShowDocumentPicker(false)}
        onConfirm={setGalleryAttachments}
        leadId={leadId}
        initialSelected={galleryAttachments}
      />
    </>
  )
}
