import { useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Bold, Italic, Link2, List, ListOrdered, Trash2 } from '@/components/ui/icons'
import { RightDrawer } from '@/components/ui/RightDrawer'

const TEMPLATE_VARIABLES = ['{{name}}', '{{email}}', '{{form_name}}', '{{submission_date}}']

function applyPreview(template, formName) {
  const sample = {
    name: 'Alex Johnson',
    email: 'alex@example.com',
    form_name: formName || 'Website Form',
    submission_date: new Date().toLocaleString(),
  }
  let out = String(template || '')
  Object.entries(sample).forEach(([k, v]) => {
    out = out.replaceAll(`{{${k}}}`, v)
  })
  return out
}

export function EmailTemplateDrawer({
  open,
  onClose,
  formName,
  templates = [],
  onGenerate,
  generating,
  onSaveTemplate,
  saving,
  onUpdateTemplate,
  updating,
  onDeleteTemplate,
  deleting,
  onApplyTemplate,
}) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const editorRef = useRef(null)

  const selected = useMemo(() => templates.find((x) => x.id === selectedId) || null, [templates, selectedId])
  const previewSubject = applyPreview(selected?.subject || subject, formName)
  const previewBody = applyPreview(selected?.body || body, formName)

  function exec(cmd, value = null) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    setBody(editorRef.current?.innerHTML || '')
  }

  async function handleGenerate() {
    const generated = await onGenerate()
    setSubject(generated.subject || '')
    setBody(generated.bodyHtml || '')
    if (!name) setName('Generated template')
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error('Name, subject and body are required')
      return
    }
    await onSaveTemplate({ name: name.trim(), subject: subject.trim(), body: body.trim(), variables: ['name', 'email', 'form_name', 'submission_date'] })
    toast.success('Template saved')
  }

  async function handleUpdate() {
    if (!selectedId) return
    await onUpdateTemplate({ id: selectedId, name: name.trim(), subject: subject.trim(), body: body.trim(), variables: ['name', 'email', 'form_name', 'submission_date'] })
    toast.success('Template updated')
  }

  async function handleDelete() {
    if (!selectedId) return
    await onDeleteTemplate(selectedId)
    setSelectedId('')
    setName('')
    setSubject('')
    setBody('')
    toast.success('Template deleted')
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Lead email templates"
      description="Generate, save and apply workspace templates."
      footer={(
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-xl border border-surface-border px-4 text-sm">Close</button>
          <button
            type="button"
            onClick={() => {
              const payload = selected ? { subject: selected.subject, body: selected.body } : { subject, body }
              onApplyTemplate(payload)
              onClose()
            }}
            className="h-9 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white"
          >
            Apply template
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-surface-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Variables</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((v) => <code key={v} className="rounded bg-surface-muted px-2 py-1 text-xs">{v}</code>)}
          </div>
        </div>

        <div className="rounded-xl border border-surface-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Saved templates</p>
            <button type="button" onClick={handleGenerate} disabled={generating} className="h-8 rounded-lg border border-surface-border px-3 text-xs">
              {generating ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
          <select
            className="h-10 w-full rounded-xl border border-surface-border px-3 text-sm"
            value={selectedId}
            onChange={(e) => {
              const nextId = e.target.value
              setSelectedId(nextId)
              const row = templates.find((item) => item.id === nextId)
              if (row) {
                setName(row.name || '')
                setSubject(row.subject || '')
                setBody(row.body || '')
                setTimeout(() => {
                  if (editorRef.current) editorRef.current.innerHTML = row.body || ''
                }, 0)
              }
            }}
          >
            <option value="">Select a saved template</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <input className="h-10 w-full rounded-xl border border-surface-border px-3 text-sm" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="h-10 w-full rounded-xl border border-surface-border px-3 text-sm" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div className="rounded-xl border border-surface-border bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-surface-border p-2">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} className="h-8 w-8 rounded-lg border border-surface-border"><Bold className="mx-auto h-4 w-4" /></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} className="h-8 w-8 rounded-lg border border-surface-border"><Italic className="mx-auto h-4 w-4" /></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')} className="h-8 w-8 rounded-lg border border-surface-border"><List className="mx-auto h-4 w-4" /></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')} className="h-8 w-8 rounded-lg border border-surface-border"><ListOrdered className="mx-auto h-4 w-4" /></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                const url = window.prompt('Link URL')
                if (url?.trim()) exec('createLink', url.trim())
              }} className="h-8 w-8 rounded-lg border border-surface-border"><Link2 className="mx-auto h-4 w-4" /></button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[160px] max-h-[280px] overflow-auto px-3 py-2 text-sm outline-none"
              onInput={() => setBody(editorRef.current?.innerHTML || '')}
              dangerouslySetInnerHTML={{ __html: body || '<p><br/></p>' }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleSave} disabled={saving} className="h-9 rounded-xl border border-surface-border px-3 text-sm">
              {saving ? 'Saving...' : 'Save as template'}
            </button>
            <button type="button" onClick={handleUpdate} disabled={updating || !selectedId} className="h-9 rounded-xl border border-surface-border px-3 text-sm">
              {updating ? 'Updating...' : 'Update selected'}
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting || !selectedId} className="inline-flex h-9 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-danger">
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete selected'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-surface-border p-3">
          <p className="text-sm font-semibold text-ink">Preview</p>
          <p className="mt-2 text-xs text-ink-faint">Subject</p>
          <p className="text-sm text-ink">{previewSubject || '-'}</p>
          <p className="mt-3 text-xs text-ink-faint">Body</p>
          <div className="max-h-56 overflow-auto rounded-lg bg-surface-muted p-2 text-sm text-ink" dangerouslySetInnerHTML={{ __html: previewBody || '<p>-</p>' }} />
        </div>
      </div>
    </RightDrawer>
  )
}
