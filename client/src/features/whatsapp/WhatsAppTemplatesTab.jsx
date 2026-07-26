import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Trash2 } from '@/components/ui/icons'
import {
  useGetWhatsAppTemplatesQuery,
  useCreateWhatsAppTemplateMutation,
  useSyncWhatsAppTemplatesMutation,
  useDeleteWhatsAppTemplateMutation,
} from '@/features/whatsapp/whatsappApi'

const STATUS_CLASS = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  disabled: 'bg-slate-100 text-slate-500',
}

function extractVariableIndices(text) {
  const matches = [...String(text || '').matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
  return [...new Set(matches)].sort((a, b) => a - b)
}

const EMPTY_FORM = {
  name: '',
  category: 'UTILITY',
  language: 'en_US',
  headerType: 'none',
  headerText: '',
  bodyText: '',
  footerText: '',
  buttons: [],
}

function TemplateForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [createTemplate, { isLoading: creating }] = useCreateWhatsAppTemplateMutation()

  const headerVars = form.headerType === 'text' ? extractVariableIndices(form.headerText) : []
  const bodyVars = extractVariableIndices(form.bodyText)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateSample(scope, index, value) {
    setForm((prev) => {
      const samples = { ...(prev.variableSamples || {}) }
      const arr = [...(samples[scope] || [])]
      arr[index - 1] = value
      samples[scope] = arr
      return { ...prev, variableSamples: samples }
    })
  }

  function addButton() {
    if (form.buttons.length >= 3) return
    update('buttons', [...form.buttons, { type: 'QUICK_REPLY', text: '' }])
  }
  function updateButton(index, patch) {
    update('buttons', form.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }
  function removeButton(index) {
    update('buttons', form.buttons.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!/^[a-z0-9_]+$/.test(form.name)) {
      toast.error('Template name must be lowercase letters, numbers, and underscores only')
      return
    }
    if (!form.bodyText.trim()) {
      toast.error('Body text is required')
      return
    }
    try {
      await createTemplate({
        ...form,
        headerText: form.headerType === 'text' ? form.headerText : undefined,
        footerText: form.footerText || undefined,
        buttons: form.buttons.length ? form.buttons : undefined,
      }).unwrap()
      toast.success('Template submitted to Meta for review')
      setForm(EMPTY_FORM)
      onCreated?.()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not submit template')
    }
  }

  return (
    <div className="w-full rounded-lg border border-surface-border bg-white p-3">
      <p className="text-xs font-semibold text-ink">New template</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">
        Submitted to Meta for review — approval can take from minutes to a couple of days. Only Marketing and Utility
        categories are supported here (Authentication templates use a different, fixed Meta format).
      </p>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium text-ink-muted">Name (lowercase_with_underscores)</span>
          <input
            type="text"
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
            value={form.name}
            onChange={(e) => update('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-muted">Category</span>
          <select
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            <option value="UTILITY">Utility</option>
            <option value="MARKETING">Marketing</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-muted">Language code</span>
          <input
            type="text"
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
            value={form.language}
            onChange={(e) => update('language', e.target.value)}
            placeholder="en_US"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-ink-muted">Header</span>
          <select
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
            value={form.headerType}
            onChange={(e) => update('headerType', e.target.value)}
          >
            <option value="none">None</option>
            <option value="text">Text</option>
          </select>
        </label>
      </div>

      {form.headerType === 'text' ? (
        <label className="mt-2 block">
          <span className="text-[11px] font-medium text-ink-muted">Header text (max 60 chars, use {'{{1}}'} for a variable)</span>
          <input
            type="text"
            maxLength={60}
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
            value={form.headerText}
            onChange={(e) => update('headerText', e.target.value)}
          />
        </label>
      ) : null}
      {headerVars.map((i) => (
        <label key={`h${i}`} className="mt-2 block">
          <span className="text-[11px] font-medium text-ink-muted">Example value for header {'{{' + i + '}}'}</span>
          <input
            type="text"
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
            onChange={(e) => updateSample('header', i, e.target.value)}
          />
        </label>
      ))}

      <label className="mt-2 block">
        <span className="text-[11px] font-medium text-ink-muted">Body text (max 1024 chars, use {'{{1}}'}, {'{{2}}'}… for variables)</span>
        <textarea
          rows={4}
          maxLength={1024}
          className="mt-1 w-full rounded-md border border-surface-border px-2 py-1.5 text-xs"
          value={form.bodyText}
          onChange={(e) => update('bodyText', e.target.value)}
          placeholder="Hi {{1}}, your order {{2}} has shipped."
        />
      </label>
      {bodyVars.map((i) => (
        <label key={`b${i}`} className="mt-2 block">
          <span className="text-[11px] font-medium text-ink-muted">Example value for body {'{{' + i + '}}'}</span>
          <input
            type="text"
            className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
            onChange={(e) => updateSample('body', i, e.target.value)}
          />
        </label>
      ))}

      <label className="mt-2 block">
        <span className="text-[11px] font-medium text-ink-muted">Footer (optional, max 60 chars, no variables)</span>
        <input
          type="text"
          maxLength={60}
          className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
          value={form.footerText}
          onChange={(e) => update('footerText', e.target.value)}
        />
      </label>

      <div className="mt-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink-muted">Buttons (up to 3)</span>
          <button type="button" className="text-[11px] font-semibold text-brand-700 hover:underline disabled:opacity-40" disabled={form.buttons.length >= 3} onClick={addButton}>
            + Add button
          </button>
        </div>
        {form.buttons.map((btn, i) => (
          <div key={i} className="mt-1.5 flex items-center gap-1.5">
            <select
              className="h-8 rounded-md border border-surface-border px-1.5 text-xs"
              value={btn.type}
              onChange={(e) => updateButton(i, { type: e.target.value, url: undefined, phone_number: undefined })}
            >
              <option value="QUICK_REPLY">Quick reply</option>
              <option value="URL">URL</option>
              <option value="PHONE_NUMBER">Phone number</option>
            </select>
            <input
              type="text"
              placeholder="Button text"
              maxLength={25}
              className="h-8 w-28 rounded-md border border-surface-border px-2 text-xs"
              value={btn.text}
              onChange={(e) => updateButton(i, { text: e.target.value })}
            />
            {btn.type === 'URL' ? (
              <input
                type="text"
                placeholder="https://…"
                className="h-8 flex-1 rounded-md border border-surface-border px-2 text-xs"
                value={btn.url || ''}
                onChange={(e) => updateButton(i, { url: e.target.value })}
              />
            ) : null}
            {btn.type === 'PHONE_NUMBER' ? (
              <input
                type="text"
                placeholder="+1..."
                className="h-8 flex-1 rounded-md border border-surface-border px-2 text-xs"
                value={btn.phone_number || ''}
                onChange={(e) => updateButton(i, { phone_number: e.target.value })}
              />
            ) : null}
            <button type="button" className="rounded-full p-1 text-ink-muted hover:bg-red-50 hover:text-red-600" onClick={() => removeButton(i)} aria-label="Remove button">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-3 h-8 rounded-lg px-3 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
        style={{ backgroundColor: 'var(--wa-accent, #00a884)' }}
        disabled={creating}
        onClick={handleSubmit}
      >
        {creating ? 'Submitting…' : 'Submit for approval'}
      </button>
    </div>
  )
}

export function WhatsAppTemplatesTab() {
  const { data, isLoading } = useGetWhatsAppTemplatesQuery()
  const [syncTemplates, { isLoading: syncing }] = useSyncWhatsAppTemplatesMutation()
  const [deleteTemplate] = useDeleteWhatsAppTemplateMutation()
  const [showForm, setShowForm] = useState(false)
  const templates = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data?.data])

  async function handleSync() {
    try {
      await syncTemplates().unwrap()
      toast.success('Synced template statuses from Meta')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Sync failed')
    }
  }

  async function handleDelete(template) {
    if (!window.confirm(`Delete template "${template.name}"?`)) return
    try {
      await deleteTemplate(template.id).unwrap()
      toast.success('Template deleted')
    } catch {
      toast.error('Could not delete template')
    }
  }

  return (
    <section className="w-full rounded-lg border border-surface-border bg-white shadow-sm">
      <div className="p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">Message templates</p>
            <p className="text-xs text-ink-muted">Required to message a customer who hasn't messaged you in the last 24 hours.</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" className="h-8 rounded-lg border border-surface-border px-2.5 text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-60" disabled={syncing} onClick={handleSync}>
              {syncing ? 'Syncing…' : 'Sync from Meta'}
            </button>
            <button type="button" className="h-8 rounded-lg bg-slate-800 px-2.5 text-xs font-semibold text-white" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : 'New template'}
            </button>
          </div>
        </div>

        {showForm ? <div className="mt-2.5"><TemplateForm onCreated={() => setShowForm(false)} /></div> : null}

        <div className="mt-2.5 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-center text-xs text-ink-muted">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-surface-border p-4 text-center text-xs text-ink-muted">
              No templates yet — create one above, or sync if you already have templates approved in Meta Business Manager.
            </p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border border-surface-border px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-ink">{t.name}</p>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_CLASS[t.status] || STATUS_CLASS.draft}`}>
                      {t.status}
                    </span>
                    <span className="shrink-0 text-[10px] text-ink-muted">{t.category} · {t.language}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-ink-muted">{t.bodyText}</p>
                  {t.rejectionReason ? <p className="mt-1 text-[11px] text-red-700">{t.rejectionReason}</p> : null}
                </div>
                <button type="button" className="shrink-0 rounded-full p-1 text-ink-muted hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(t)} aria-label="Delete template">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
