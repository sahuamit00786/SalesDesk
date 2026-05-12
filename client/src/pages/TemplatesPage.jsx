import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Eye, Paperclip, Search, Sparkles, X } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { DataGrid } from '@/components/shared/DataGrid'
import {
  useArchiveTemplateMutation,
  useCreateTemplateMutation,
  useGenerateTemplateContentMutation,
  useGetTemplatesQuery,
  useUpdateTemplateMutation,
} from '@/features/templates/templatesApi'
import {
  MentionPopover,
  popoverCoordsForSelection,
  popoverCoordsForTextField,
  insertMergeTagInTextField,
} from '@/features/templates/components/MentionPopover'
import {
  TemplateRichEditor,
  readMentionQueryFromSelection,
} from '@/features/templates/components/TemplateRichEditor'
import { AttachmentPickerModal } from '@/features/templates/components/AttachmentPickerModal'
import { EmailPreviewCard } from '@/features/templates/components/EmailPreviewCard'

const MAX_ATTACHMENTS = 3

function badgeLabel(v) {
  return String(v || '').replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function percent(part, total) {
  if (!total) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

const EMPTY_DRAFT = {
  name: '',
  category: 'cold_outreach',
  tags: [],
  subject: '',
  bodyHtml: '',
  attachments: [],
  skipIfAlreadySent: true,
  scheduleAt: null,
}

const LEAD_MERGE_FIELDS = [
  'first_name',
  'last_name',
  'contact_name',
  'company',
  'designation',
  'email',
  'phone',
  'value',
  'source',
  'status',
  'city',
  'state',
  'country',
  'sender_name',
]

const SAMPLE_PREVIEW_VALUES = {
  first_name: 'Amit',
  last_name: 'Sahu',
  contact_name: 'Amit Sahu',
  company: 'Connexify Labs',
  designation: 'Founder',
  email: 'amit@connexify.io',
  phone: '+91 98765 43210',
  value: '12000',
  source: 'cold_email',
  status: 'qualified',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  sender_name: 'Sales Team',
}

export default function TemplatesPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeId, setActiveId] = useState(null)
  const [drawerMode, setDrawerMode] = useState(null)
  const [extendedTab, setExtendedTab] = useState('preview')
  const [aiPrompt, setAiPrompt] = useState('Create a personalized cold outreach email for decision makers in SaaS companies.')
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false)

  const subjectRef = useRef(null)
  const bodyEditorRef = useRef(null)

  const [mention, setMention] = useState({
    open: false,
    source: null,
    query: '',
    start: null,
    anchor: { top: 0, left: 0 },
  })

  const { data } = useGetTemplatesQuery({ search, category })
  const templates = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data])
  const activeTemplate = useMemo(() => templates.find((t) => t.id === activeId) || null, [templates, activeId])
  const isDrawerOpen = drawerMode === 'create' || drawerMode === 'edit'

  const [createTemplate, createState] = useCreateTemplateMutation()
  const [updateTemplate, updateState] = useUpdateTemplateMutation()
  const [archiveTemplate] = useArchiveTemplateMutation()
  const [generateTemplateContent, generateState] = useGenerateTemplateContentMutation()

  useEffect(() => {
    if (activeTemplate && drawerMode === 'edit') {
      setDraft({
        name: activeTemplate.name || '',
        category: activeTemplate.category || 'cold_outreach',
        tags: activeTemplate.tags || [],
        subject: activeTemplate.subject || '',
        bodyHtml: activeTemplate.bodyHtml || '',
        attachments: activeTemplate.attachments || [],
        skipIfAlreadySent: activeTemplate.skipIfAlreadySent ?? true,
        scheduleAt: activeTemplate.scheduleAt || null,
      })
    }
  }, [activeTemplate?.id, drawerMode])

  const templateRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      const m = t.metrics || {}
      const matchesSearch =
        !q ||
        String(t.name || '').toLowerCase().includes(q) ||
        String(t.subject || '').toLowerCase().includes(q) ||
        (Array.isArray(t.tags) && t.tags.some((tag) => String(tag).toLowerCase().includes(q)))
      const matchesCategory = category === 'all' || t.category === category
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'sent' && (m.sentCount || 0) > 0) ||
        (statusFilter === 'never_sent' && !(m.sentCount > 0))
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [templates, search, category, statusFilter])

  const templateColumns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Template',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setActiveId(row.original.id)
              setExtendedTab('preview')
              setDrawerMode('edit')
            }}
            className="text-left"
          >
            <p className="font-semibold text-ink">{row.original.name}</p>
            <p className="max-w-[420px] truncate text-xs text-ink-muted">{row.original.subject || '-'}</p>
          </button>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => badgeLabel(row.original.category),
      },
      {
        id: 'openRate',
        header: 'Open Rate',
        accessorFn: (r) => percent(r.metrics?.openedCount || 0, r.metrics?.sentCount || 0),
      },
      {
        id: 'clickRate',
        header: 'Click Rate',
        accessorFn: (r) => percent(r.metrics?.clickedCount || 0, r.metrics?.sentCount || 0),
      },
      {
        id: 'replyRate',
        header: 'Reply Rate',
        accessorFn: (r) => percent(r.metrics?.repliedCount || 0, r.metrics?.sentCount || 0),
      },
      {
        id: 'sentTo',
        header: 'Sent To Leads',
        accessorFn: (r) => r.metrics?.uniqueLeadCount || 0,
      },
      {
        id: 'flags',
        header: 'Flags',
        accessorFn: (r) => `S:${r.metrics?.sentCount || 0} O:${r.metrics?.openedCount || 0} B:${r.metrics?.bouncedCount || 0} U:${r.metrics?.unsubscribedCount || 0}`,
      },
      {
        id: 'lastSent',
        header: 'Last Sent',
        accessorFn: (r) => (r.metrics?.lastSentAt ? new Date(r.metrics.lastSentAt).toLocaleString() : 'Never'),
      },
    ],
    [],
  )

  const mentionOptions = useMemo(() => {
    if (!mention.open) return []
    const q = (mention.query || '').trim().toLowerCase()
    if (!q) return LEAD_MERGE_FIELDS
    return LEAD_MERGE_FIELDS.filter((f) => f.includes(q))
  }, [mention.open, mention.query])

  function closeMention() {
    setMention((prev) => ({ ...prev, open: false, query: '', start: null, source: null }))
  }

  function refreshSubjectMention(el) {
    if (!el) return
    const value = el.value || ''
    const cursor = el.selectionStart ?? value.length
    const before = value.slice(0, cursor)
    const at = before.lastIndexOf('@')
    if (at < 0) return closeMention()
    const fragment = before.slice(at + 1)
    if (!/^[a-z0-9_]*$/i.test(fragment) || fragment.length > 40) return closeMention()
    const anchor = popoverCoordsForTextField(el, at)
    setMention({ open: true, source: 'subject', query: fragment, start: at, anchor })
  }

  function handleSubjectKeyUp(e) {
    refreshSubjectMention(e.currentTarget)
  }

  function handleSubjectInput(e) {
    refreshSubjectMention(e.currentTarget)
  }

  function handleSubjectClick(e) {
    refreshSubjectMention(e.currentTarget)
  }

  function handleBodyCaretChange() {
    const el = bodyEditorRef.current?.getElement?.()
    if (!el) return
    const query = readMentionQueryFromSelection(el)
    if (query == null) return closeMention()
    const anchor = popoverCoordsForSelection()
    setMention({ open: true, source: 'body', query, start: null, anchor })
  }

  function handlePickMention(field) {
    if (mention.source === 'subject') {
      const el = subjectRef.current
      const next = insertMergeTagInTextField(el, mention.start, field)
      setDraft((p) => ({ ...p, subject: next }))
    } else if (mention.source === 'body') {
      bodyEditorRef.current?.replaceMentionToken?.(mention.query, field)
    }
    closeMention()
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error('Template name is required')
      return
    }
    const payload = {
      ...draft,
      tags: draft.tags || [],
      subject: draft.subject || draft.name || 'Email update',
      bodyHtml: draft.bodyHtml || '',
    }
    try {
      if (drawerMode === 'create') {
        await createTemplate(payload).unwrap()
        toast.success('Template saved')
        setDrawerMode(null)
        setDraft(EMPTY_DRAFT)
        return
      }
      if (activeTemplate?.id && !String(activeTemplate.id).startsWith('d')) {
        await updateTemplate({ id: activeTemplate.id, ...payload }).unwrap()
        toast.success('Template updated')
      } else {
        await createTemplate(payload).unwrap()
        toast.success('Template saved')
      }
    } catch {
      toast.error('Could not save template')
    }
  }

  async function handleGenerateTemplate() {
    if (!aiPrompt.trim()) {
      toast.error('Describe what you want the email to do')
      return
    }
    try {
      const result = await generateTemplateContent({
        objective: aiPrompt,
        customPrompt: `Available lead fields for merge tags: {{first_name}}, {{last_name}}, {{contact_name}}, {{company}}, {{designation}}, {{email}}, {{phone}}, {{value}}, {{source}}, {{status}}, {{city}}, {{state}}, {{country}}, {{sender_name}}.`,
      }).unwrap()
      setDraft((prev) => ({
        ...prev,
        subject: result?.data?.subject || prev.subject,
        bodyHtml: result?.data?.bodyHtml || prev.bodyHtml,
        tags: result?.data?.suggestedTags?.length ? result.data.suggestedTags : prev.tags,
      }))
      toast.success('AI draft applied')
      setExtendedTab('preview')
    } catch (err) {
      const serverMessage = err?.data?.message || err?.error || ''
      toast.error(serverMessage || 'AI generation failed. Please try again.', { duration: 6000 })
    }
  }

  function handleAddAttachments(items) {
    setDraft((prev) => {
      const next = [...(prev.attachments || []), ...items].slice(0, MAX_ATTACHMENTS)
      return { ...prev, attachments: next }
    })
    toast.success(`Added ${items.length} attachment${items.length === 1 ? '' : 's'}`)
  }

  function handleRemoveAttachment(index) {
    setDraft((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index),
    }))
  }

  return (
    <PageShell fullWidth>
      <div className="min-h-[calc(100vh-130px)] px-2 pb-4 pt-2">
        <section className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Email Templates</h2>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_DRAFT)
                setExtendedTab('preview')
                setDrawerMode('create')
              }}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              + Create Template
            </button>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200">
              <Search className="h-4 w-4 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, subject, tag"
                className="w-64 bg-transparent text-sm outline-none"
              />
            </div>
            {['all', 'cold_outreach', 'follow_up', 'proposal', 're_engagement'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  category === id
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-surface-border text-ink-muted hover:bg-surface-muted'
                }`}
              >
                {badgeLabel(id)}
              </button>
            ))}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-surface-border px-2 text-xs"
            >
              <option value="all">All status</option>
              <option value="sent">Sent</option>
              <option value="never_sent">Never Sent</option>
            </select>
          </div>
          <DataGrid
            columns={templateColumns}
            data={templateRows}
            defaultPageSize={20}
            emptyTitle="No templates found"
            emptyDescription="Create your first template to start bulk outreach."
            maxHeightClass="max-h-[min(72vh,760px)]"
            toolbarRight={<span className="text-xs text-ink-muted">{templateRows.length} templates</span>}
            csvFilename="email-templates.csv"
          />
        </section>
      </div>

      <RightDrawer
        open={isDrawerOpen}
        onClose={() => setDrawerMode(null)}
        title={drawerMode === 'create' ? 'Create Email Template' : activeTemplate?.name || 'Template Details'}
        description={
          drawerMode === 'create'
            ? 'Compose a reusable email with merge variables, attachments, and AI assistance.'
            : 'Edit your template, attach files, and preview before saving.'
        }
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {drawerMode === 'edit' && activeTemplate?.id && !String(activeTemplate.id).startsWith('d') ? (
              <button
                type="button"
                onClick={() => archiveTemplate(activeTemplate.id)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50"
              >
                Archive template
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerMode(null)}
                className="rounded-lg border border-surface-border bg-white px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={createState.isLoading || updateState.isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
              >
                {createState.isLoading || updateState.isLoading
                  ? 'Saving...'
                  : drawerMode === 'create'
                    ? 'Save Template'
                    : 'Save Changes'}
              </button>
            </div>
          </div>
        }
        leftPanel={
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExtendedTab('preview')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    extendedTab === 'preview'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-ink-muted hover:bg-surface-muted'
                  }`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setExtendedTab('ai')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    extendedTab === 'ai'
                      ? 'border-2 border-purple-700 bg-purple-50 text-purple-700'
                      : 'text-ink-muted hover:bg-surface-muted'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Ask AI
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-ink-muted">Sample preview uses placeholder lead data.</p>
            </div>
            {extendedTab === 'preview' ? (
              <div className="scrollbar-subtle flex-1 overflow-y-auto bg-surface-muted/40 px-4 py-4">
                <EmailPreviewCard
                  subject={draft.subject || draft.name}
                  bodyHtml={draft.bodyHtml}
                  attachments={draft.attachments}
                  sampleValues={SAMPLE_PREVIEW_VALUES}
                />
              </div>
            ) : (
              <div className="scrollbar-subtle flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-purple-700">
                    <Sparkles className="h-4 w-4" />
                    Ask AI
                  </div>
                  <p className="mb-3 text-xs text-ink-muted">
                    Describe the email you want — audience, problem, value, call-to-action. The AI will draft a subject and body for you.
                  </p>
                  <textarea
                    className="min-h-[160px] w-full resize-y rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    placeholder="e.g. Cold outreach to founders of SaaS companies who are struggling with manual lead routing. Offer a 15-minute walkthrough..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateTemplate}
                    disabled={generateState.isLoading}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-purple-700 bg-purple-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-800 disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" />
                    {generateState.isLoading ? 'Generating...' : 'Generate Template'}
                  </button>
                </div>
                <div className="rounded-lg bg-surface-muted p-3 text-[11px] text-ink-muted">
                  Tip: After generating, switch back to Preview to review the styled email and edit any merge tags.
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-3 pb-2">
            <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/50 px-3 py-2">
              <p className="text-xs text-ink-muted">Need help writing this email?</p>
              <button
                type="button"
                onClick={() => setExtendedTab('ai')}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-purple-700 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors duration-150 hover:bg-purple-700 hover:text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ask AI
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Template Name</span>
              <input
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="e.g. Cold outreach v2"
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Subject</span>
              <input
                ref={subjectRef}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="e.g. Quick update on {{company}} — {{first_name}}"
                value={draft.subject}
                onChange={(e) => setDraft((p) => ({ ...p, subject: e.target.value }))}
                onInput={handleSubjectInput}
                onKeyUp={handleSubjectKeyUp}
                onClick={handleSubjectClick}
                onBlur={() => setTimeout(closeMention, 150)}
              />
              <p className="mt-1 text-[11px] text-ink-faint">Type @ to insert lead fields like @first_name.</p>
            </label>

            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Body</span>
              <TemplateRichEditor
                ref={bodyEditorRef}
                value={draft.bodyHtml}
                onChange={(html) => setDraft((p) => ({ ...p, bodyHtml: html }))}
                onCaretChange={handleBodyCaretChange}
              />
              <p className="mt-1 flex items-center justify-between text-[11px] text-ink-faint">
                <span>Type @ to insert lead fields like @first_name.</span>
                <span>Words: {(draft.bodyHtml || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length}</span>
              </p>
            </div>

            <div className="rounded-xl border border-surface-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Attachments</p>
                <span className="text-[11px] text-ink-muted">{(draft.attachments || []).length}/{MAX_ATTACHMENTS}</span>
              </div>
              {draft.attachments?.length ? (
                <ul className="mb-2 space-y-1.5">
                  {draft.attachments.map((a, i) => (
                    <li
                      key={`${a.url}-${i}`}
                      className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-orange-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink">{a.filename}</p>
                        {a.size ? (
                          <p className="truncate text-[10px] text-ink-muted">
                            {a.size >= 1024 * 1024
                              ? `${(a.size / 1024 / 1024).toFixed(2)} MB`
                              : `${Math.max(1, Math.round(a.size / 1024))} KB`}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(i)}
                        className="rounded p-1 text-ink-muted hover:bg-white hover:text-rose-600"
                        aria-label={`Remove ${a.filename}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAttachmentModalOpen(true)}
                  disabled={(draft.attachments?.length || 0) >= MAX_ATTACHMENTS}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Add Attachment
                </button>
                <button
                  type="button"
                  onClick={() => setExtendedTab('preview')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500 bg-white px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview Email
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-ink">Skip if already sent</p>
                <p className="text-[11px] text-ink-muted">Avoid sending this template to leads who already received it.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 accent-orange-500"
                checked={draft.skipIfAlreadySent}
                onChange={(e) => setDraft((p) => ({ ...p, skipIfAlreadySent: e.target.checked }))}
              />
            </div>
        </div>
      </RightDrawer>

      <MentionPopover
        open={mention.open}
        anchor={mention.anchor}
        options={mentionOptions}
        query={mention.query}
        onPick={handlePickMention}
        onClose={closeMention}
      />

      <AttachmentPickerModal
        open={attachmentModalOpen}
        onClose={() => setAttachmentModalOpen(false)}
        onConfirm={handleAddAttachments}
        existing={draft.attachments}
        maxAttachments={MAX_ATTACHMENTS}
      />
    </PageShell>
  )
}
