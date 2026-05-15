import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Link2, List, ListOrdered, Mail, MessageSquare, Paperclip, Search, Type, Users, X } from 'lucide-react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Select } from '@/components/ui/Select'
import { IconInput } from '@/components/ui/IconInput'
import { useGetLeadFilesQuery, useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useSendEmailForLeadMutation, useUploadEmailAttachmentsMutation } from '@/features/email/emailApi'
import { cn } from '@/utils/cn'

/** Gmail ~25MB encoded message cap; stay under for uploads + HTML body. */
const GMAIL_ATTACHMENT_SOFT_CAP = 24 * 1024 * 1024

function normalizeRecipients(value) {
  return String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

export function EmailComposerDrawer({ open, onClose, initial = null, onSent }) {
  const editorRef = useRef(null)
  const [leadId, setLeadId] = useState('')
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [selectedLeadFileIds, setSelectedLeadFileIds] = useState([])
  const [showLeadDocsModal, setShowLeadDocsModal] = useState(false)
  const [leadDocsSearch, setLeadDocsSearch] = useState('')
  const [attachmentTab, setAttachmentTab] = useState('uploaded')
  const [uploadedAttachments, setUploadedAttachments] = useState([])

  const { data: leadsData } = useGetLeadsQuery({ page: 1, limit: 300, search: '' }, { skip: !open })
  const { data: leadFilesData } = useGetLeadFilesQuery(leadId, { skip: !open || !leadId })
  const [uploadAttachments, { isLoading: uploading }] = useUploadEmailAttachmentsMutation()
  const [sendEmail, { isLoading: sending }] = useSendEmailForLeadMutation()

  const leads = useMemo(() => {
    const rows = Array.isArray(leadsData?.data) ? leadsData.data : []
    return rows.filter((l) => String(l.email || '').trim())
  }, [leadsData])
  const leadFiles = Array.isArray(leadFilesData?.data) ? leadFilesData.data : []
  const filteredLeadFiles = leadFiles.filter((f) => `${f.fileName || ''} ${f.mimeType || ''}`.toLowerCase().includes(leadDocsSearch.toLowerCase()))

  useEffect(() => {
    if (!open) return
    setLeadId(initial?.leadId || '')
    setToInput(initial?.to || '')
    setCcInput(initial?.cc || '')
    setBccInput(initial?.bcc || '')
    setSubject(initial?.subject || '')
    setBodyHtml(initial?.bodyHtml || '')
    setSelectedLeadFileIds([])
    setShowLeadDocsModal(false)
    setLeadDocsSearch('')
    setAttachmentTab('uploaded')
    setUploadedAttachments([])
  }, [open, initial])

  useEffect(() => {
    if (open && editorRef.current) editorRef.current.innerHTML = bodyHtml || ''
  }, [open, bodyHtml])

  const pickedLeadAttachments = leadFiles
    .filter((f) => selectedLeadFileIds.includes(f.id))
    .map((f) => ({ fileName: f.fileName, fileUrl: f.fileUrl, mimeType: f.mimeType || null, sizeBytes: f.sizeBytes || 0 }))

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const tooLarge = files.find((f) => f.size > GMAIL_ATTACHMENT_SOFT_CAP)
    if (tooLarge) {
      toast.error(`Each file must be under 24MB (Gmail limit ~25MB per message): ${tooLarge.name}`)
      return
    }
    const existingBytes = uploadedAttachments.reduce((sum, a) => sum + (Number(a.sizeBytes) || 0), 0)
    const incomingBytes = files.reduce((sum, f) => sum + f.size, 0)
    if (existingBytes + incomingBytes > GMAIL_ATTACHMENT_SOFT_CAP) {
      toast.error('Total attachment size is too large for one Gmail message (~25MB). Send fewer or smaller files.')
      return
    }
    try {
      const res = await uploadAttachments(files).unwrap()
      const rows = Array.isArray(res?.data) ? res.data : []
      setUploadedAttachments((prev) => [...prev, ...rows])
      toast.success('Attachment uploaded')
      e.target.value = ''
    } catch {
      toast.error('Upload failed')
    }
  }

  async function handleSend() {
    if (!leadId) return toast.error('Please select a lead')
    const to = normalizeRecipients(toInput)
    const cc = normalizeRecipients(ccInput)
    const bcc = normalizeRecipients(bccInput)
    if (!to.length) return toast.error('At least one recipient is required')
    const html = editorRef.current?.innerHTML || bodyHtml || ''
    const attachments = [...uploadedAttachments, ...pickedLeadAttachments]
    try {
      await sendEmail({
        leadId,
        to,
        cc,
        bcc,
        subject,
        bodyHtml: html,
        attachments,
        threadId: initial?.threadId || null,
      }).unwrap()
      toast.success('Email sent')
      onClose?.()
      onSent?.()
    } catch {
      toast.error('Could not send email')
    }
  }

  function exec(command, value = undefined) {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={initial?.threadId ? 'Reply Email' : 'New Message'}
      description="Compose with recipients, quoted thread (when replying), and attachments (keep total under ~24MB per Gmail message)."
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="h-9 rounded-lg border border-slate-300 px-3 text-xs text-ink-muted hover:bg-surface-subtle" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="h-9 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60" onClick={handleSend} disabled={sending || uploading}>
            {sending ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Lead</label>
          <div className="relative">
            <Users
              className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
              strokeWidth={1.75}
              aria-hidden
            />
            <Select
              className="pl-9"
              value={leadId}
              onChange={(e) => {
                const nextLeadId = e.target.value
                setLeadId(nextLeadId)
                setLeadDocsSearch('')
              }}
            >
              <option value="">Select lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {(lead.title || lead.contactName || 'Lead')} ({lead.email})
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">To</label>
          <IconInput icon={Mail} value={toInput} onChange={(e) => setToInput(e.target.value)} placeholder="a@x.com, b@y.com" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <IconInput icon={Mail} value={ccInput} onChange={(e) => setCcInput(e.target.value)} placeholder="CC recipients" aria-label="CC recipients" />
          <IconInput icon={Mail} value={bccInput} onChange={(e) => setBccInput(e.target.value)} placeholder="BCC recipients" aria-label="BCC recipients" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Subject</label>
          <IconInput icon={MessageSquare} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject line" />
        </div>

        <div className="rounded-xl border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center gap-1 border-b border-slate-300 p-2">
            <button type="button" className="rounded p-1.5 hover:bg-slate-100" onClick={() => exec('bold')}><Type size={14} /></button>
            <button type="button" className="rounded p-1.5 hover:bg-slate-100" onClick={() => exec('italic')}><span className="text-xs italic">I</span></button>
            <button type="button" className="rounded p-1.5 hover:bg-slate-100" onClick={() => exec('underline')}><span className="text-xs underline">U</span></button>
            <button type="button" className="rounded p-1.5 hover:bg-slate-100" onClick={() => exec('insertUnorderedList')}><List size={14} /></button>
            <button type="button" className="rounded p-1.5 hover:bg-slate-100" onClick={() => exec('insertOrderedList')}><ListOrdered size={14} /></button>
            <button
              type="button"
              className="rounded p-1.5 hover:bg-slate-100"
              onClick={() => {
                const url = window.prompt('Enter URL')
                if (url) exec('createLink', url)
              }}
            >
              <Link2 size={14} />
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[220px] w-full px-3 py-2 text-sm outline-none"
            onInput={(e) => setBodyHtml(e.currentTarget.innerHTML)}
          />
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink"
              onClick={() => {
                setAttachmentTab('uploaded')
                setShowLeadDocsModal(true)
              }}
            >
              Attachments
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-brand-700 shadow-sm">
              <Paperclip size={13} />
              Upload files
              <input type="file" multiple className="hidden" onChange={handleUpload} />
            </label>
          </div>
          {leadId ? (
            <button
              type="button"
              className="mb-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-sm hover:bg-slate-50"
              onClick={() => {
                setAttachmentTab('select')
                setShowLeadDocsModal(true)
              }}
            >
              Select lead documents ({selectedLeadFileIds.length})
            </button>
          ) : null}
          <div className="space-y-1 text-xs">
            {uploadedAttachments.map((a, i) => (
              <div key={`${a.fileUrl}-${i}`} className="rounded border border-slate-300 bg-white px-2 py-1">
                {a.fileName}
              </div>
            ))}
          </div>
        </div>
      </div>
      {showLeadDocsModal ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/35" onClick={() => setShowLeadDocsModal(false)} aria-label="Close lead documents modal" />
          <div className="relative z-[131] flex h-[72vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-300 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <div>
                <p className="text-sm font-semibold text-ink">Lead Documents</p>
                <p className="text-xs text-ink-muted">Filtered files of selected lead only.</p>
              </div>
              <button type="button" className="rounded p-1 text-ink-muted hover:bg-surface-subtle" onClick={() => setShowLeadDocsModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  'h-9 rounded-lg px-3 text-xs font-semibold',
                  attachmentTab === 'uploaded' ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-ink-muted',
                )}
                onClick={() => setAttachmentTab('uploaded')}
              >
                Uploaded
              </button>
              <button
                type="button"
                className={cn(
                  'h-9 rounded-lg px-3 text-xs font-semibold',
                  attachmentTab === 'select' ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-ink-muted',
                )}
                onClick={() => setAttachmentTab('select')}
              >
                Select from system
              </button>
            </div>
            {attachmentTab === 'select' ? (
              <div className="mt-3 space-y-1.5">
                <label className="sr-only" htmlFor="lead-docs-search">
                  Search lead documents
                </label>
                <IconInput
                  id="lead-docs-search"
                  icon={Search}
                  className="h-9 min-h-0 text-xs"
                  value={leadDocsSearch}
                  onChange={(e) => setLeadDocsSearch(e.target.value)}
                  placeholder="Search lead documents..."
                />
              </div>
            ) : null}
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
              {attachmentTab === 'uploaded' ? (
                <>
                  {uploadedAttachments.map((a, i) => (
                    <div key={`${a.fileUrl}-${i}`} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                      <p className="truncate text-sm font-medium text-ink">{a.fileName}</p>
                      <p className="text-xs text-ink-muted">{a.mimeType || 'file'}{a.sizeBytes ? ` • ${(a.sizeBytes / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                    </div>
                  ))}
                  {!uploadedAttachments.length ? <p className="text-sm text-ink-muted">No uploaded attachments yet.</p> : null}
                </>
              ) : (
                <>
                  {!leadId ? <p className="text-sm text-ink-muted">Select a lead first to browse system documents.</p> : null}
                  {filteredLeadFiles.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedLeadFileIds.includes(f.id)}
                        onChange={(e) =>
                          setSelectedLeadFileIds((prev) => (e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id)))
                        }
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{f.fileName}</p>
                        <p className="text-xs text-ink-muted">{f.mimeType || 'file'}{f.sizeBytes ? ` • ${(f.sizeBytes / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                      </div>
                    </label>
                  ))}
                  {leadId && !filteredLeadFiles.length ? <p className="text-sm text-ink-muted">No documents found for this lead.</p> : null}
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-300 pt-3">
              <button type="button" className="h-9 rounded-lg border border-slate-300 px-3 text-xs text-ink-muted hover:bg-surface-subtle" onClick={() => setShowLeadDocsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </RightDrawer>
  )
}
