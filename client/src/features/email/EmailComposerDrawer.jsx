import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  AlertCircle, Bold, Italic, Underline, LayoutTemplate, List, ListOrdered, Link2,
  Mail, MessageSquare, Paperclip, Search, Users, X,
} from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { IconInput } from '@/components/ui/IconInput'
import { useGetLeadFilesQuery, useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useSendEmailForLeadMutation, useUploadEmailAttachmentsMutation } from '@/features/email/emailApi'
import {
  FALLBACK_MERGE_KEYS,
  buildLeadMergeValues,
  extractMergeKeysFromTemplate,
  mergeFieldLabel,
} from '@/features/leads/utils/mergeLeadValues'
import { LEAD_MERGE_FIELDS } from '@/features/templates/mergeTags'
import { useGetTemplatesQuery } from '@/features/templates/templatesApi'
import { cn } from '@/utils/cn'

const GMAIL_ATTACHMENT_SOFT_CAP = 24 * 1024 * 1024
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CURLY_TAG_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
const AT_TAG_RE = /@([a-z][a-z0-9_]*)/gi
const MERGE_FIELD_SET = new Set(LEAD_MERGE_FIELDS)

function mergeBlankSpan(key) {
  return `<span data-merge-blank="${key}" data-sync-group="${key}" title="Type ${mergeFieldLabel(key).toLowerCase()} here"></span>`
}

/** Body: known-but-empty fields become typable dark-red blanks instead of vanishing. */
function fillBodyMergeTags(input, values) {
  let out = String(input || '')
  out = out.replace(CURLY_TAG_RE, (_m, rawKey) => {
    const key = String(rawKey || '').toLowerCase()
    const v = values[key]
    if (v != null && String(v).trim()) return String(v)
    if (FALLBACK_MERGE_KEYS.has(key)) return ''
    return key in values ? mergeBlankSpan(key) : ''
  })
  out = out.replace(AT_TAG_RE, (match, rawKey) => {
    const key = String(rawKey || '').toLowerCase()
    if (!MERGE_FIELD_SET.has(key)) return match
    const v = values[key]
    if (v != null && String(v).trim()) return String(v)
    return FALLBACK_MERGE_KEYS.has(key) ? '' : mergeBlankSpan(key)
  })
  return out
}

/** Subject is plain text: keep missing tokens visible so they can be edited (and gate send on them). */
function fillSubjectMergeTags(input, values) {
  let out = String(input || '')
  out = out.replace(CURLY_TAG_RE, (m, rawKey) => {
    const key = String(rawKey || '').toLowerCase()
    const v = values[key]
    if (v != null && String(v).trim()) return String(v)
    if (FALLBACK_MERGE_KEYS.has(key)) return ''
    return key in values ? m : ''
  })
  out = out.replace(AT_TAG_RE, (match, rawKey) => {
    const key = String(rawKey || '').toLowerCase()
    if (!MERGE_FIELD_SET.has(key)) return match
    const v = values[key]
    if (v != null && String(v).trim()) return String(v)
    return FALLBACK_MERGE_KEYS.has(key) ? '' : match
  })
  return out
}

function normalizeRecipients(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean)
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean)
}

function RecipientChipsInput({ values, onChange, placeholder, autoValue = null, maxValues = Infinity }) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const atCapacity = values.length >= maxValues

  function commit(raw) {
    const parts = String(raw || '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)
    if (!parts.length) return
    const invalid = parts.find((p) => !EMAIL_RE.test(p))
    if (invalid) {
      toast.error(`Invalid email: ${invalid}`)
      return
    }
    const next = [...values]
    for (const p of parts) {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p)
    }
    if (next.length > maxValues) {
      toast.error(`Only ${maxValues} recipient${maxValues === 1 ? '' : 's'} allowed here`)
      return
    }
    onChange(next)
    setDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1))
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text')
    if (/[,;\s]/.test(text)) {
      e.preventDefault()
      commit(`${draft} ${text}`)
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1 rounded-xl border border-slate-300 bg-white px-2 py-1 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100"
    >
      <Mail className="ml-1 h-3.5 w-3.5 shrink-0 text-ink-muted" strokeWidth={1.75} />
      {values.map((email) => (
        <span
          key={email}
          className={cn(
            'inline-flex max-w-[220px] items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
            email === autoValue ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-slate-300 bg-slate-50 text-ink',
          )}
        >
          <span className="truncate">{email}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(values.filter((v) => v !== email)) }}
            className="shrink-0 rounded-full p-0.5 text-ink-muted hover:bg-slate-200 hover:text-ink"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {!atCapacity && (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder={values.length ? '' : placeholder}
          className="h-6 min-w-[140px] flex-1 border-0 bg-transparent px-1 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
      )}
    </div>
  )
}

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Sync all merge blanks with the same sync-group to a new text value. */
function syncMergeGroup(editorRef, syncGroupId, newText) {
  if (!editorRef.current) return
  const blanks = editorRef.current.querySelectorAll(`[data-sync-group="${syncGroupId}"]`)
  for (const blank of blanks) {
    blank.textContent = newText
  }
}

export function EmailComposerDrawer({ open, onClose, initial = null, onSent }) {
  const editorRef = useRef(null)
  const [leadId, setLeadId] = useState('')
  const [toRecipients, setToRecipients] = useState([])
  const [ccRecipients, setCcRecipients] = useState([])
  const [bccRecipients, setBccRecipients] = useState([])
  const [autoLeadEmail, setAutoLeadEmail] = useState(null)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [selectedLeadFileIds, setSelectedLeadFileIds] = useState([])
  const [showLeadDocsModal, setShowLeadDocsModal] = useState(false)
  const [leadDocsSearch, setLeadDocsSearch] = useState('')
  const [uploadedAttachments, setUploadedAttachments] = useState([])

  const user = useSelector((s) => s.auth.user)
  const senderName = user?.name || user?.email || 'Sales team'

  const { data: leadsData } = useGetLeadsQuery({ page: 1, limit: 300, search: '' }, { skip: !open })
  const { data: leadFilesData } = useGetLeadFilesQuery(leadId, { skip: !open || !leadId })
  const { data: templatesRes, isLoading: templatesLoading } = useGetTemplatesQuery(undefined, { skip: !open })
  const [uploadAttachments, { isLoading: uploading }] = useUploadEmailAttachmentsMutation()
  const [sendEmail, { isLoading: sending }] = useSendEmailForLeadMutation()

  const leads = useMemo(() => {
    const rows = Array.isArray(leadsData?.data) ? leadsData.data : []
    return rows.filter((l) => String(l.email || '').trim())
  }, [leadsData])
  const templates = Array.isArray(templatesRes?.data) ? templatesRes.data : []
  const selectedTemplate = templates.find((t) => String(t.id) === String(templateId)) || null
  const selectedLead = leads.find((l) => String(l.id) === String(leadId)) || null

  // Blanks still empty in the body (data-merge-blank spans) — recomputed on every keystroke.
  const unfilledBodyKeys = useMemo(() => {
    const div = document.createElement('div')
    div.innerHTML = bodyHtml || ''
    return [...div.querySelectorAll('[data-merge-blank]')]
      .filter((el) => !el.textContent.replace(/[\u00a0\u200b]/g, '').trim())
      .map((el) => el.getAttribute('data-merge-blank'))
  }, [bodyHtml])

  // Merge tokens still sitting in the subject line (plain text, no spans there).
  // Only checked while a template is active, so a plain "john@company.com" in a
  // hand-written subject can't false-positive on the @tag syntax.
  const unfilledSubjectKeys = useMemo(
    () => (selectedTemplate ? extractMergeKeysFromTemplate(subject, '') : []),
    [selectedTemplate, subject],
  )

  const unresolvedKeys = useMemo(
    () => [...new Set([...unfilledBodyKeys, ...unfilledSubjectKeys])],
    [unfilledBodyKeys, unfilledSubjectKeys],
  )
  const leadFiles = Array.isArray(leadFilesData?.data) ? leadFilesData.data : []
  const filteredLeadFiles = leadFiles.filter((f) =>
    `${f.fileName || ''} ${f.mimeType || ''}`.toLowerCase().includes(leadDocsSearch.toLowerCase()),
  )

  function handleEditorInput() {
    // Update bodyHtml state with current editor content
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
    }

    // Get current selection to detect if user is editing inside a merge-blank
    const selection = window.getSelection()
    if (!selection.rangeCount || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const node = range.commonAncestorContainer

    // Find the closest merge-blank span if we're editing inside one
    let blankSpan = null
    if (node.nodeType === Node.TEXT_NODE) {
      blankSpan = node.parentElement?.closest('[data-merge-blank]')
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      blankSpan = node.closest('[data-merge-blank]')
    }

    if (!blankSpan) return

    // Extract sync-group ID and new text
    const syncGroupId = blankSpan.getAttribute('data-sync-group')
    if (!syncGroupId) return

    const newText = blankSpan.textContent || ''

    // Sync all blanks with the same sync-group to the new text
    syncMergeGroup(editorRef, syncGroupId, newText)
  }

  useEffect(() => {
    if (!open) return
    setLeadId(initial?.leadId || '')
    setToRecipients(normalizeRecipients(initial?.to))
    setCcRecipients(normalizeRecipients(initial?.cc))
    setBccRecipients(normalizeRecipients(initial?.bcc))
    setAutoLeadEmail(initial?.leadId ? normalizeRecipients(initial?.to)[0] || null : null)
    setShowCcBcc(Boolean(normalizeRecipients(initial?.cc).length || normalizeRecipients(initial?.bcc).length))
    setTemplateId('')
    setSubject(initial?.subject || '')
    setBodyHtml(initial?.bodyHtml || '')
    setSelectedLeadFileIds([])
    setShowLeadDocsModal(false)
    setLeadDocsSearch('')
    setUploadedAttachments([])
  }, [open, initial])

  // Sync editor HTML when opening
  useEffect(() => {
    if (!open || !editorRef.current) return
    editorRef.current.innerHTML = bodyHtml || ''
    // Set default paragraph separator so Enter creates <p> not <div>
    document.execCommand('defaultParagraphSeparator', false, 'p')
  }, [open]) // intentionally only on open change

  const pickedLeadAttachments = leadFiles
    .filter((f) => selectedLeadFileIds.includes(f.id))
    .map((f) => ({ fileName: f.fileName, fileUrl: f.fileUrl, mimeType: f.mimeType || null, sizeBytes: f.sizeBytes || 0 }))

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

  function applyTemplate(template, lead) {
    const mergeValues = buildLeadMergeValues(lead || {}, senderName)
    const mergedSubject = fillSubjectMergeTags(template.subject, mergeValues)
    const mergedBody = fillBodyMergeTags(template.bodyHtml, mergeValues)
    setSubject(mergedSubject)
    setBodyHtml(mergedBody)
    if (editorRef.current) editorRef.current.innerHTML = mergedBody || ''
    if (mergedBody.includes('data-merge-blank') || extractMergeKeysFromTemplate(mergedSubject, '').length) {
      toast('Some lead fields are empty — fill the dark-red blanks before sending.', { icon: '✍️' })
    }
  }

  function handleTemplateChange(nextId) {
    setTemplateId(nextId)
    if (!nextId) return
    const tpl = templates.find((t) => String(t.id) === String(nextId))
    if (!tpl) return
    if (!selectedLead) {
      toast.error('Select a lead first — the template fills in their details')
      return
    }
    applyTemplate(tpl, selectedLead)
  }

  function handleLeadChange(nextLeadId) {
    setLeadId(nextLeadId)
    setLeadDocsSearch('')
    const nextLead = leads.find((l) => String(l.id) === String(nextLeadId)) || null
    const nextEmail = String(nextLead?.email || '').trim() || null
    setToRecipients((prev) => {
      // Lead email owns the single To slot; keep a manual entry only when no lead is picked.
      if (nextEmail) return [nextEmail]
      return autoLeadEmail ? prev.filter((v) => v.toLowerCase() !== autoLeadEmail.toLowerCase()) : prev
    })
    setAutoLeadEmail(nextEmail)
    // Re-fill the selected template with the new lead's details.
    if (selectedTemplate && nextLead) applyTemplate(selectedTemplate, nextLead)
  }

  async function handleSend() {
    if (!leadId) return toast.error('Please select a lead')
    if (unresolvedKeys.length) {
      return toast.error(`Fill in the blanks first: ${unresolvedKeys.map(mergeFieldLabel).join(', ')}`)
    }
    const to = toRecipients
    if (!to.length) return toast.error('At least one recipient is required')
    const cc = ccRecipients
    const bcc = bccRecipients
    const rawHtml = editorRef.current?.innerHTML || bodyHtml || ''
    // Blank markers are editor-only; send clean spans.
    const html = rawHtml.replace(/\s*data-merge-blank="[^"]*"/g, '').replace(/\u200b/g, '')
    const attachments = [...uploadedAttachments, ...pickedLeadAttachments]
    try {
      await sendEmail({ leadId, to, cc, bcc, subject, bodyHtml: html, attachments, threadId: initial?.threadId || null }).unwrap()
      toast.success('Email sent')
      onClose?.()
      onSent?.()
    } catch {
      toast.error('Could not send email')
    }
  }

  // Use onMouseDown + preventDefault to keep editor focus when clicking toolbar
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

  if (!open) return null

  const totalAttachmentCount = uploadedAttachments.length + selectedLeadFileIds.length

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto flex w-full max-w-[min(92vw,760px)] max-h-[92dvh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-base font-semibold text-ink">{initial?.threadId ? 'Reply' : 'New email'}</p>
              {totalAttachmentCount > 0 && (
                <p className="text-xs text-ink-muted">{totalAttachmentCount} attachment{totalAttachmentCount !== 1 ? 's' : ''}</p>
              )}
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-subtle">
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="scrollbar-subtle flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {/* Lead selector */}
            <div className="grid grid-cols-[96px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Lead</label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" strokeWidth={1.75} />
                <Select className="pl-9 h-9" value={leadId} onChange={(e) => handleLeadChange(e.target.value)}>
                  <option value="">Select lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.title || lead.contactName || 'Lead'} ({lead.email})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Template */}
            <div className="grid grid-cols-[96px_1fr] items-start gap-2">
              <label className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Template</label>
              <div className="space-y-2">
                <div className="relative">
                  <LayoutTemplate className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" strokeWidth={1.75} />
                  <Select className="pl-9 h-9" value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} disabled={templatesLoading}>
                    <option value="">No template — write your own</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </div>
                {selectedTemplate && !unresolvedKeys.length ? (
                  <p className="text-xs text-ink-muted">Subject and body filled with this lead&apos;s details — edit freely below.</p>
                ) : null}
                {!selectedTemplate ? (
                  <p className="text-xs text-ink-faint">
                    Pick a template to auto-fill from the lead, or{' '}
                    <a href="/templates" target="_blank" rel="noreferrer" className="text-brand-600 underline">create your own</a>.
                  </p>
                ) : null}
                {unresolvedKeys.length > 0 ? (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>
                      This lead is missing: <span className="font-semibold">{unresolvedKeys.map(mergeFieldLabel).join(', ')}</span>.
                      Type into the dark-red blanks below — Send unlocks once every blank is filled.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* To */}
            <div className="grid grid-cols-[96px_1fr] items-start gap-2">
              <label className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">To</label>
              <div className="flex items-start gap-1">
                <div className="flex-1">
                  <RecipientChipsInput
                    values={toRecipients}
                    onChange={setToRecipients}
                    placeholder="recipient@example.com"
                    autoValue={autoLeadEmail}
                    maxValues={1}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCcBcc((v) => !v)}
                  className="mt-1.5 shrink-0 rounded-lg px-2 py-1 text-xs text-ink-muted hover:bg-surface-subtle"
                >
                  CC/BCC
                </button>
              </div>
            </div>

            {/* CC/BCC */}
            {showCcBcc && (
              <>
                <div className="grid grid-cols-[96px_1fr] items-start gap-2">
                  <label className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">CC</label>
                  <RecipientChipsInput values={ccRecipients} onChange={setCcRecipients} placeholder="cc@example.com" />
                </div>
                <div className="grid grid-cols-[96px_1fr] items-start gap-2">
                  <label className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">BCC</label>
                  <RecipientChipsInput values={bccRecipients} onChange={setBccRecipients} placeholder="bcc@example.com" />
                </div>
              </>
            )}

            {/* Subject */}
            <div className="grid grid-cols-[96px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Subject</label>
              <IconInput icon={MessageSquare} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line" className="h-9" />
            </div>

            {/* Editor */}
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
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
                    className="rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink"
                  >
                    <Icon size={14} />
                  </button>
                ))}
                <div className="mx-1 h-4 w-px bg-slate-300" />
                <button type="button" title="Bullet list" onMouseDown={(e) => handleToolbarMouseDown(e, 'insertUnorderedList')} className="rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink"><List size={14} /></button>
                <button type="button" title="Numbered list" onMouseDown={(e) => handleToolbarMouseDown(e, 'insertOrderedList')} className="rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink"><ListOrdered size={14} /></button>
                <div className="mx-1 h-4 w-px bg-slate-300" />
                <button type="button" title="Insert link" onMouseDown={handleLinkMouseDown} className="rounded p-1.5 text-ink-muted hover:bg-slate-200 hover:text-ink"><Link2 size={14} /></button>
              </div>

              {/* Content editable area */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className={cn(
                  'min-h-[220px] max-h-[50vh] overflow-y-auto px-4 py-3 text-sm text-ink outline-none',
                  '[&_p]:mb-2 [&_p:last-child]:mb-0',
                  '[&_div]:mb-1',
                  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2',
                  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2',
                  '[&_li]:mb-0.5',
                  '[&_a]:text-brand-600 [&_a]:underline',
                  '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted',
                  // Merge blanks: dark-red underlined gap while empty; shrinks to typed text once filled.
                  '[&_[data-merge-blank]]:inline-block [&_[data-merge-blank]]:align-baseline [&_[data-merge-blank]]:px-0.5',
                  '[&_[data-merge-blank]]:border-b-2 [&_[data-merge-blank]]:border-red-800 [&_[data-merge-blank]]:text-red-800 [&_[data-merge-blank]]:font-medium',
                  '[&_[data-merge-blank]:empty]:min-w-[3ch]',
                )}
                onInput={handleEditorInput}
                data-placeholder="Write your email here…"
                style={{ '--placeholder': 'attr(data-placeholder)' }}
              />
            </div>

            {/* Attachments section */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Attachments {totalAttachmentCount > 0 ? `(${totalAttachmentCount})` : ''}
                </span>
                <div className="flex gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-subtle shadow-sm">
                    <Paperclip size={12} />
                    Upload
                    <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                  {leadId ? (
                    <button
                      type="button"
                      onClick={() => setShowLeadDocsModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-subtle shadow-sm"
                    >
                      From lead docs
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Attachment chips */}
              {totalAttachmentCount > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {uploadedAttachments.map((a, i) => (
                    <span key={`${a.fileUrl}-${i}`} className="inline-flex max-w-[200px] items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-ink">
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
                  {pickedLeadAttachments.map((a) => (
                    <span key={a.fileUrl} className="inline-flex max-w-[200px] items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-800">
                      <Paperclip size={10} className="shrink-0" />
                      <span className="truncate">{a.fileName}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLeadFileIds((prev) => prev.filter((id) => id !== leadFiles.find((f) => f.fileName === a.fileName)?.id))}
                        className="ml-0.5 shrink-0 rounded-full p-0.5 hover:bg-brand-100"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-faint">No attachments yet. Upload files or pick from lead documents.</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl border border-slate-300 px-4 text-sm text-ink-muted hover:bg-surface-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || uploading || unresolvedKeys.length > 0}
              title={unresolvedKeys.length ? `Fill in the blanks first: ${unresolvedKeys.map(mergeFieldLabel).join(', ')}` : undefined}
              className="h-9 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending…' : uploading ? 'Uploading…' : 'Send now'}
            </button>
          </div>
        </div>
      </div>

      {/* Lead docs picker modal */}
      {showLeadDocsModal ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowLeadDocsModal(false)} />
          <div className="relative z-[121] flex h-[65vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3">
              <p className="text-sm font-semibold text-ink">Attach from lead documents</p>
              <button type="button" onClick={() => setShowLeadDocsModal(false)} className="rounded p-1 text-ink-muted hover:bg-surface-subtle"><X size={16} /></button>
            </div>
            <IconInput icon={Search} className="mb-3 h-9 text-xs" value={leadDocsSearch} onChange={(e) => setLeadDocsSearch(e.target.value)} placeholder="Search documents…" />
            <div className="flex-1 space-y-1.5 overflow-y-auto">
              {!leadId && <p className="text-sm text-ink-muted">Select a lead first.</p>}
              {filteredLeadFiles.map((f) => (
                <label key={f.id} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition', selectedLeadFileIds.includes(f.id) ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:bg-surface-subtle')}>
                  <input
                    type="checkbox"
                    checked={selectedLeadFileIds.includes(f.id)}
                    onChange={(e) => setSelectedLeadFileIds((prev) => e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id))}
                    className="rounded border-slate-300 text-brand-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{f.fileName}</p>
                    <p className="text-xs text-ink-muted">{f.mimeType || 'file'}{f.sizeBytes ? ` • ${formatBytes(f.sizeBytes)}` : ''}</p>
                  </div>
                </label>
              ))}
              {leadId && !filteredLeadFiles.length && <p className="text-sm text-ink-muted">No documents found.</p>}
            </div>
            <div className="mt-3 flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button type="button" onClick={() => setShowLeadDocsModal(false)} className="h-9 rounded-xl border border-slate-300 px-4 text-sm text-ink-muted hover:bg-surface-subtle">
                Done ({selectedLeadFileIds.length} selected)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
