import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  Mail,
  Send,
  User,
} from '@/components/ui/icons'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { EmailPreviewCard } from '@/features/templates/components/EmailPreviewCard'
import { useGetTemplatesQuery, usePreviewTemplateSendMutation, useSendTemplateMutation } from '@/features/templates/templatesApi'
import {
  buildLeadMergeValues,
  leadDisplayName,
  mergeFieldLabel,
  missingMergeKeysForLead,
} from '@/features/leads/utils/mergeLeadValues'
import { coerceToLeadArray } from '@/features/leads/utils/leadAssignee'
import { cn } from '@/utils/cn'

function classifyLeads(leads, template, senderName) {
  const noEmail = []
  const blocked = []
  const ready = []

  for (const lead of leads) {
    const email = String(lead.email || '').trim()
    if (!email) {
      noEmail.push(lead)
      continue
    }
    const missing = missingMergeKeysForLead(template, lead, senderName)
    if (missing.length) {
      blocked.push({ lead, missing })
      continue
    }
    ready.push(lead)
  }

  return { noEmail, blocked, ready }
}

export function BulkEmailModal({ open, onClose, leads, onSent }) {
  const leadRows = coerceToLeadArray(leads)
  const user = useSelector((s) => s.auth.user)
  const senderName = user?.name || user?.email || 'Sales team'
  const [templateId, setTemplateId] = useState('')
  const [sending, setSending] = useState(false)

  const { data: templatesRes, isLoading: templatesLoading } = useGetTemplatesQuery(undefined, { skip: !open })
  const templates = templatesRes?.data || []
  const selectedTemplate = templates.find((t) => String(t.id) === String(templateId))

  const [previewSend] = usePreviewTemplateSendMutation()
  const [sendTemplate] = useSendTemplateMutation()

  const { noEmail, blocked, ready } = useMemo(
    () => classifyLeads(leadRows, selectedTemplate, senderName),
    [leadRows, selectedTemplate, senderName],
  )

  const previewLead = ready[0] || leadRows[0]
  const previewValues = previewLead ? buildLeadMergeValues(previewLead, senderName) : {}

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast.error('Select an email template')
      return
    }
    if (!ready.length) {
      toast.error('No leads are ready to send')
      return
    }
    setSending(true)
    try {
      const ids = ready.map((l) => l.id)
      await previewSend({ id: selectedTemplate.id, leadIds: ids }).unwrap()
      const result = await sendTemplate({ id: selectedTemplate.id, leadIds: ids }).unwrap()
      const data = result?.data || {}
      const sent = data.result?.sent?.length ?? data.willSend?.length ?? ids.length
      if (data.queued) {
        toast.success(`Queued ${sent} email${sent === 1 ? '' : 's'} — sending individually`)
      } else {
        const failed = data.result?.failed?.length ?? 0
        if (failed > 0) {
          toast.success(`Sent ${sent} email${sent === 1 ? '' : 's'}; ${failed} failed (check SMTP / lead emails)`)
        } else {
          toast.success(`Sent ${sent} email${sent === 1 ? '' : 's'}`)
        }
      }
      onSent?.()
      onClose()
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.data?.message || 'Could not send emails')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk email"
      description="Each lead receives their own email. Recipients below are for review only."
      maxWidthClassName="max-w-4xl"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-muted">
            <span className="font-semibold text-emerald-700">{ready.length}</span> ready
            {blocked.length ? (
              <>
                {' · '}
                <span className="font-semibold text-amber-700">{blocked.length}</span> blocked
              </>
            ) : null}
            {noEmail.length ? (
              <>
                {' · '}
                <span className="font-semibold text-red-600">{noEmail.length}</span> no email
              </>
            ) : null}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || !ready.length || !selectedTemplate}>
              <Send className="h-3.5 w-3.5" />
              Send {ready.length ? `(${ready.length})` : ''}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex min-h-0 flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Email template</label>
            {templatesLoading ? (
              <p className="text-xs text-ink-muted">Loading templates…</p>
            ) : (
              <select
                className="h-9 w-full rounded-lg border border-surface-border bg-white px-3 text-sm text-ink"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-surface-border bg-surface-subtle/50">
            <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
              <Inbox className="h-4 w-4 text-brand-600" />
              <span className="text-xs font-semibold text-ink">Outbox ({leadRows.length})</span>
              <span className="text-[10px] text-ink-muted">— individual sends</span>
            </div>
            <ul className="max-h-[calc(90vh-260px)] flex-1 overflow-y-auto px-2 py-2 scrollbar-subtle">
              {leadRows.map((lead) => {
                const missing = selectedTemplate
                  ? missingMergeKeysForLead(selectedTemplate, lead, senderName)
                  : []
                const hasEmail = Boolean(String(lead.email || '').trim())
                const status =
                  !hasEmail ? 'no-email' : missing.length ? 'blocked' : 'ready'

                return (
                  <li
                    key={lead.id}
                    className={cn(
                      'mb-1 flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs',
                      status === 'ready' && 'border-emerald-100 bg-emerald-50/80',
                      status === 'blocked' && 'border-amber-100 bg-amber-50/90',
                      status === 'no-email' && 'border-red-100 bg-red-50/80',
                    )}
                  >
                    <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{leadDisplayName(lead)}</p>
                      <p className="truncate text-[10px] text-ink-muted">
                        {hasEmail ? lead.email : 'No email on file'}
                      </p>
                      {missing.length ? (
                        <p className="mt-0.5 text-[10px] text-amber-800">
                          Missing: {missing.map(mergeFieldLabel).join(', ')}
                        </p>
                      ) : null}
                    </div>
                    {status === 'ready' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {blocked.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              <p className="font-semibold">Cannot reach {blocked.length} lead(s)</p>
              <p className="mt-0.5 text-amber-800/90">
                Template uses fields that are empty on those records. Update the lead or pick another template.
              </p>
            </div>
          ) : null}
        </div>

        <div className="min-h-0">
          {selectedTemplate ? (
            <EmailPreviewCard
              subject={selectedTemplate.subject}
              bodyHtml={selectedTemplate.bodyHtml}
              sampleValues={previewValues}
            />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-subtle/40 px-6 text-center">
              <Mail className="h-8 w-8 text-ink-faint" />
              <p className="mt-2 text-sm font-medium text-ink">Choose a template</p>
              <p className="mt-1 text-xs text-ink-muted">Preview updates when you select one.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
