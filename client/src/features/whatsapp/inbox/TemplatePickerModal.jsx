import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft, LayoutTemplate, X } from '@/components/ui/icons'
import { useGetWhatsAppTemplatesQuery, useSendWhatsAppTemplateMessageMutation } from '@/features/whatsapp/whatsappApi'

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

/** Picker + variable form for sending an approved template — the only way to message
 * a customer outside the 24h window (see WhatsAppComposer). */
export function TemplatePickerModal({ conversationId, onClose, onSent }) {
  const { data, isLoading } = useGetWhatsAppTemplatesQuery()
  const [sendTemplate, { isLoading: sending }] = useSendWhatsAppTemplateMessageMutation()
  const [selected, setSelected] = useState(null)
  const [headerValues, setHeaderValues] = useState([])
  const [bodyValues, setBodyValues] = useState([])

  const approvedTemplates = useMemo(
    () => (Array.isArray(data?.data) ? data.data.filter((t) => t.status === 'approved') : []),
    [data?.data],
  )

  const headerVars = selected?.headerType === 'text' ? extractVariableIndices(selected.headerText) : []
  const bodyVars = selected ? extractVariableIndices(selected.bodyText) : []

  function selectTemplate(t) {
    setSelected(t)
    setBodyValues(extractVariableIndices(t.bodyText).map(() => ''))
    setHeaderValues(t.headerType === 'text' ? extractVariableIndices(t.headerText).map(() => '') : [])
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
              {headerVars.map((v, i) => (
                <label key={`h${v}`} className="block">
                  <span className="text-[11px] font-medium text-ink-muted">Header {'{{' + v + '}}'}</span>
                  <input
                    type="text"
                    className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
                    value={headerValues[i] || ''}
                    onChange={(e) => setHeaderValues((prev) => prev.map((val, idx) => (idx === i ? e.target.value : val)))}
                  />
                </label>
              ))}
              {bodyVars.map((v, i) => (
                <label key={`b${v}`} className="block">
                  <span className="text-[11px] font-medium text-ink-muted">Body {'{{' + v + '}}'}</span>
                  <input
                    type="text"
                    className="mt-1 h-8 w-full rounded-md border border-surface-border px-2 text-xs"
                    value={bodyValues[i] || ''}
                    onChange={(e) => setBodyValues((prev) => prev.map((val, idx) => (idx === i ? e.target.value : val)))}
                  />
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
