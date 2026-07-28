import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, LayoutTemplate, User, X } from '@/components/ui/icons'
import { useGetWhatsAppTemplatesQuery, useSendWhatsAppTemplateMessageMutation } from '@/features/whatsapp/whatsappApi'
import { useGetLeadQuery } from '@/features/leads/leadsApi'
import { parseCustomFieldClientValue } from '@/features/leads/customFieldTypes'

function extractVariableIndices(text) {
  const matches = [...String(text || '').matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
  return [...new Set(matches)].sort((a, b) => a - b)
}

function substituteVariables(text, values) {
  return String(text || '').replace(/\{\{(\d+)\}\}/g, (_, i) => {
    const v = values?.[Number(i) - 1]
    return v ? v : `{{${i}}}`
  })
}

const STANDARD_LEAD_FIELDS = [
  { key: 'title', label: 'Lead name' },
  { key: 'contactName', label: 'Contact name' },
  { key: 'company', label: 'Company' },
  { key: 'designation', label: 'Designation' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'altPhone', label: 'Alt phone' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'status', label: 'Status' },
]

/** Resolves a "std:<key>" / "custom:<key>" dropdown token against a full lead record. */
function resolveLeadFieldValue(lead, token) {
  if (!lead || !token) return ''
  if (token.startsWith('std:')) {
    const raw = lead[token.slice(4)]
    return raw === null || raw === undefined ? '' : String(raw)
  }
  if (token.startsWith('custom:')) {
    const key = token.slice(7)
    const row = (lead.customFieldValues || []).find((r) => r.customField?.key === key)
    if (!row) return ''
    const parsed = parseCustomFieldClientValue(row.customField?.type, row.value)
    if (row.customField?.type === 'checkbox') return parsed ? 'Yes' : 'No'
    if (row.customField?.type === 'multiselect') return Array.isArray(parsed) ? parsed.join(', ') : ''
    return parsed === null || parsed === undefined ? '' : String(parsed)
  }
  return ''
}

/** Picker + variable form for sending an approved template — the only way to message
 * a customer outside the 24h window (see WhatsAppComposer). */
export function TemplatePickerModal({ conversationId, leadId, onClose, onSent }) {
  const navigate = useNavigate()
  const { data, isLoading } = useGetWhatsAppTemplatesQuery()
  const [sendTemplate, { isLoading: sending }] = useSendWhatsAppTemplateMessageMutation()
  const { data: leadRes, isFetching: leadLoading } = useGetLeadQuery(leadId, { skip: !leadId })
  const lead = leadRes?.data || null
  const [selected, setSelected] = useState(null)
  const [headerValues, setHeaderValues] = useState([])
  const [bodyValues, setBodyValues] = useState([])
  const [headerFieldSel, setHeaderFieldSel] = useState([])
  const [bodyFieldSel, setBodyFieldSel] = useState([])

  const approvedTemplates = useMemo(
    () => (Array.isArray(data?.data) ? data.data.filter((t) => t.status === 'approved') : []),
    [data?.data],
  )

  const customFieldOptions = useMemo(
    () =>
      (lead?.customFieldValues || [])
        .filter((r) => r.customField?.key)
        .map((r) => ({ key: r.customField.key, label: r.customField.label || r.customField.key })),
    [lead],
  )

  const headerVars = selected?.headerType === 'text' ? extractVariableIndices(selected.headerText) : []
  const bodyVars = selected ? extractVariableIndices(selected.bodyText) : []

  function selectTemplate(t) {
    setSelected(t)
    const bodyIdx = extractVariableIndices(t.bodyText)
    const headerIdx = t.headerType === 'text' ? extractVariableIndices(t.headerText) : []
    setBodyValues(bodyIdx.map(() => ''))
    setBodyFieldSel(bodyIdx.map(() => ''))
    setHeaderValues(headerIdx.map(() => ''))
    setHeaderFieldSel(headerIdx.map(() => ''))
  }

  function applyHeaderField(i, token) {
    setHeaderFieldSel((prev) => prev.map((v, idx) => (idx === i ? token : v)))
    if (token) setHeaderValues((prev) => prev.map((v, idx) => (idx === i ? resolveLeadFieldValue(lead, token) : v)))
  }

  function editHeaderValue(i, val) {
    setHeaderValues((prev) => prev.map((v, idx) => (idx === i ? val : v)))
    setHeaderFieldSel((prev) => prev.map((v, idx) => (idx === i ? '' : v)))
  }

  function applyBodyField(i, token) {
    setBodyFieldSel((prev) => prev.map((v, idx) => (idx === i ? token : v)))
    if (token) setBodyValues((prev) => prev.map((v, idx) => (idx === i ? resolveLeadFieldValue(lead, token) : v)))
  }

  function editBodyValue(i, val) {
    setBodyValues((prev) => prev.map((v, idx) => (idx === i ? val : v)))
    setBodyFieldSel((prev) => prev.map((v, idx) => (idx === i ? '' : v)))
  }

  async function handleSend() {
    if (bodyVars.some((_, i) => !bodyValues[i]?.trim()) || headerVars.some((_, i) => !headerValues[i]?.trim())) {
      toast.error('Fill in every variable before sending')
      return
    }
    try {
      const res = await sendTemplate({
        id: conversationId,
        templateId: selected.id,
        variableValues: { header: headerValues, body: bodyValues },
      }).unwrap()
      onSent?.()
      onClose()
      if (res?.data?.status === 'failed') toast.error(res.data.errorMessage || 'WhatsApp rejected this template')
      else toast.success('Template sent')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not send template')
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="flex h-[min(640px,85vh)] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 border-b border-surface-border px-4 py-3">
          {selected ? (
            <button type="button" className="rounded-full p-1 text-ink-muted hover:bg-surface-muted" onClick={() => setSelected(null)} aria-label="Back to list">
              <ArrowLeft size={16} />
            </button>
          ) : (
            <LayoutTemplate size={16} className="text-ink-muted" />
          )}
          <p className="flex-1 text-sm font-semibold text-ink">{selected ? selected.name : 'Send a template'}</p>
          <button type="button" className="rounded-full p-1 text-ink-muted hover:bg-surface-muted" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!selected ? (
            isLoading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-ink-muted">Loading…</p>
              </div>
            ) : approvedTemplates.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="rounded-lg border border-dashed border-surface-border p-4 text-center text-xs text-ink-muted">
                  No approved templates yet. Create one in Integrations → WhatsApp Templates and wait for Meta's review.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {approvedTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t)}
                    className="block w-full rounded-lg border border-surface-border px-3 py-2 text-left hover:bg-surface-muted"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-ink">{t.name}</p>
                      <span className="text-[10px] text-ink-muted">{t.category} · {t.language}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-muted">{t.bodyText}</p>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {leadId ? (
                <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <User size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {leadLoading ? (
                      <p className="text-xs text-ink-muted">Loading lead…</p>
                    ) : lead ? (
                      <>
                        <p className="truncate text-xs font-semibold text-ink">{lead.title || lead.contactName}</p>
                        <p className="truncate text-[11px] text-ink-muted">
                          {[lead.contactName, lead.company].filter(Boolean).join(' · ') || lead.email || lead.phone || '—'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-ink-muted">Lead not found</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-[11px] font-semibold text-emerald-700 hover:underline"
                    onClick={() => navigate(`/leads/${leadId}`)}
                  >
                    View
                  </button>
                </div>
              ) : null}

              {headerVars.map((v, i) => (
                <label key={`h${v}`} className="block">
                  <span className="text-[11px] font-medium text-ink-muted">Header {'{{' + v + '}}'}</span>
                  <div className="mt-1 flex gap-1.5">
                    {leadId ? (
                      <select
                        className="h-8 w-32 shrink-0 rounded-md border border-surface-border bg-surface-muted px-1.5 text-[11px] text-ink-muted"
                        value={headerFieldSel[i] || ''}
                        onChange={(e) => applyHeaderField(i, e.target.value)}
                      >
                        <option value="">Manual</option>
                        <optgroup label="Lead field">
                          {STANDARD_LEAD_FIELDS.map((f) => (
                            <option key={f.key} value={`std:${f.key}`}>{f.label}</option>
                          ))}
                        </optgroup>
                        {customFieldOptions.length ? (
                          <optgroup label="Custom field">
                            {customFieldOptions.map((f) => (
                              <option key={f.key} value={`custom:${f.key}`}>{f.label}</option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      className="h-8 min-w-0 flex-1 rounded-md border border-surface-border px-2 text-xs"
                      value={headerValues[i] || ''}
                      onChange={(e) => editHeaderValue(i, e.target.value)}
                    />
                  </div>
                </label>
              ))}
              {bodyVars.map((v, i) => (
                <label key={`b${v}`} className="block">
                  <span className="text-[11px] font-medium text-ink-muted">Body {'{{' + v + '}}'}</span>
                  <div className="mt-1 flex gap-1.5">
                    {leadId ? (
                      <select
                        className="h-8 w-32 shrink-0 rounded-md border border-surface-border bg-surface-muted px-1.5 text-[11px] text-ink-muted"
                        value={bodyFieldSel[i] || ''}
                        onChange={(e) => applyBodyField(i, e.target.value)}
                      >
                        <option value="">Manual</option>
                        <optgroup label="Lead field">
                          {STANDARD_LEAD_FIELDS.map((f) => (
                            <option key={f.key} value={`std:${f.key}`}>{f.label}</option>
                          ))}
                        </optgroup>
                        {customFieldOptions.length ? (
                          <optgroup label="Custom field">
                            {customFieldOptions.map((f) => (
                              <option key={f.key} value={`custom:${f.key}`}>{f.label}</option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                    ) : null}
                    <input
                      type="text"
                      className="h-8 min-w-0 flex-1 rounded-md border border-surface-border px-2 text-xs"
                      value={bodyValues[i] || ''}
                      onChange={(e) => editBodyValue(i, e.target.value)}
                    />
                  </div>
                </label>
              ))}

              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--wa-panel, #f0f2f5)' }}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Preview</p>
                <div className="rounded-lg bg-white p-2.5 shadow-sm" style={{ backgroundColor: 'var(--wa-bubble-out, #d9fdd3)' }}>
                  {selected.headerType === 'text' ? (
                    <p className="text-sm font-semibold text-ink">{substituteVariables(selected.headerText, headerValues)}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-ink">{substituteVariables(selected.bodyText, bodyValues)}</p>
                  {selected.footerText ? <p className="mt-1 text-xs text-ink-muted">{selected.footerText}</p> : null}
                </div>
              </div>

              <button
                type="button"
                className="h-9 w-full rounded-lg text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                style={{ backgroundColor: 'var(--wa-accent, #00a884)' }}
                disabled={sending}
                onClick={handleSend}
              >
                {sending ? 'Sending…' : 'Send template'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
