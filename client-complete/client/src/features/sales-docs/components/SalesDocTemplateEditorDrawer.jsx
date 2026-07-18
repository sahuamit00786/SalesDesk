import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { inputFieldClassName } from '@/components/ui/Input'
import { RightDrawer } from '@/components/ui/RightDrawer'
import {
  useCreateSalesDocTemplateMutation,
  usePatchSalesDocTemplateMutation,
} from '@/features/sales-docs/salesDocTemplatesApi'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import { QUOTATION_PRESET_LABELS, INVOICE_PRESET_LABELS } from '@/features/sales-docs/presetLabels'

const fieldLabel = 'text-xs font-medium text-ink-muted'

function emptyForm(docType) {
  return docType === 'invoice'
    ? {
        name: '',
        code: '',
        layoutPreset: 1,
        templateType: 'general',
        numberPrefix: 'INV',
        nextNumber: 1001,
        autoNumbering: true,
        defaultCurrency: 'USD',
        status: 'active',
        sectionSettings: {},
        showBankDetails: true,
      }
    : {
        name: '',
        code: '',
        layoutPreset: 1,
        defaultCurrency: 'USD',
        defaultValidityDays: 30,
        status: 'active',
      }
}

function formFromRow(docType, row) {
  if (docType === 'invoice') {
    const sec = row.sectionSettings && typeof row.sectionSettings === 'object' ? { ...row.sectionSettings } : {}
    return {
      name: row.name || '',
      code: row.code || '',
      layoutPreset: row.layoutPreset || 1,
      templateType: row.templateType || 'general',
      numberPrefix: row.numberPrefix || 'INV',
      nextNumber: row.nextNumber ?? 1001,
      autoNumbering: Boolean(row.autoNumbering),
      defaultCurrency: row.defaultCurrency || 'USD',
      status: row.status || 'active',
      sectionSettings: sec,
      showBankDetails: sec.showBankDetails !== false,
    }
  }
  return {
    name: row.name || '',
    code: row.code || '',
    layoutPreset: row.layoutPreset || 1,
    defaultCurrency: row.defaultCurrency || 'USD',
    defaultValidityDays: row.defaultValidityDays ?? 30,
    status: row.status || 'active',
  }
}

/**
 * Shared create/edit drawer for the unified sales-doc template pool.
 * editingRow null → create mode (doc type choosable); editing → doc type locked to the row's.
 */
export function SalesDocTemplateEditorDrawer({ open, editingRow, onClose, onSaved }) {
  const [docType, setDocType] = useState(editingRow?.docType || 'quotation')
  const isInvoice = docType === 'invoice'
  const presetLabels = isInvoice ? INVOICE_PRESET_LABELS : QUOTATION_PRESET_LABELS

  const [createTpl] = useCreateSalesDocTemplateMutation()
  const [patchTpl] = usePatchSalesDocTemplateMutation()
  const { data: billRes } = useGetBillingProfileQuery(undefined, { skip: !isInvoice || !open })
  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  const [form, setForm] = useState(() => emptyForm(docType))

  useEffect(() => {
    if (!open) return
    const nextDocType = editingRow?.docType || 'quotation'
    setDocType(nextDocType)
    setForm(editingRow ? formFromRow(nextDocType, editingRow) : emptyForm(nextDocType))
  }, [open, editingRow])

  function switchDocType(nextDocType) {
    if (editingRow) return
    setDocType(nextDocType)
    setForm(emptyForm(nextDocType))
  }

  const fieldInput = cn(inputFieldClassName, 'mt-1')

  async function save() {
    try {
      if (!form.name.trim() || !form.code.trim()) {
        toast.error('Name and code are required')
        return
      }
      if (isInvoice) {
        const sectionSettings = { ...form.sectionSettings, showBankDetails: form.showBankDetails }
        const payload = {
          docType: 'invoice',
          name: form.name.trim(),
          code: form.code.trim(),
          layoutPreset: form.layoutPreset,
          templateType: form.templateType,
          numberPrefix: form.numberPrefix,
          nextNumber: form.nextNumber,
          autoNumbering: form.autoNumbering,
          defaultCurrency: form.defaultCurrency,
          status: form.status,
          sectionSettings,
        }
        if (editingRow) await patchTpl({ id: editingRow.id, ...payload }).unwrap()
        else await createTpl(payload).unwrap()
      } else {
        const payload = {
          docType: 'quotation',
          name: form.name.trim(),
          code: form.code.trim(),
          layoutPreset: form.layoutPreset,
          defaultCurrency: form.defaultCurrency,
          defaultValidityDays: form.defaultValidityDays,
          status: form.status,
        }
        if (editingRow) await patchTpl({ id: editingRow.id, ...payload }).unwrap()
        else await createTpl(payload).unwrap()
      }
      toast.success(editingRow ? 'Template updated' : 'Template created')
      onClose()
      onSaved?.()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Save failed')
    }
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={editingRow ? `Edit ${docType} template` : `New ${docType} template`}
    >
      <div className="flex flex-col gap-3 px-1 pb-8 pt-2">
        <label className={fieldLabel}>
          Document type
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-surface-border bg-surface-subtle/50 p-1">
            {['quotation', 'invoice'].map((dt) => (
              <button
                key={dt}
                type="button"
                disabled={Boolean(editingRow)}
                onClick={() => switchDocType(dt)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition',
                  docType === dt
                    ? 'bg-white text-ink shadow-sm ring-1 ring-surface-border'
                    : 'text-ink-muted hover:text-ink',
                  editingRow && 'cursor-not-allowed opacity-70',
                )}
              >
                {dt}
              </button>
            ))}
          </div>
        </label>

        <label className={fieldLabel}>
          Name
          <input
            className={fieldInput}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className={fieldLabel}>
          Code (unique per workspace)
          <input
            className={fieldInput}
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            disabled={Boolean(editingRow)}
          />
        </label>
        <label className={fieldLabel}>
          Status
          <select
            className={fieldInput}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </label>

        {isInvoice && (
          <label className={fieldLabel}>
            Template type
            <select
              className={fieldInput}
              value={form.templateType}
              onChange={(e) => setForm((f) => ({ ...f, templateType: e.target.value }))}
            >
              <option value="general">General</option>
              <option value="gst">GST</option>
              <option value="vat">VAT</option>
              <option value="proforma">Proforma</option>
            </select>
          </label>
        )}

        <label className={fieldLabel}>
          Layout preset
          <select
            className={fieldInput}
            value={form.layoutPreset}
            onChange={(e) => setForm((f) => ({ ...f, layoutPreset: Number(e.target.value) }))}
          >
            {presetLabels.map((label, i) => (
              <option key={label} value={i + 1}>
                {i + 1}. {label}
              </option>
            ))}
          </select>
        </label>

        {isInvoice ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className={fieldLabel}>
                Number prefix
                <input
                  className={fieldInput}
                  value={form.numberPrefix}
                  onChange={(e) => setForm((f) => ({ ...f, numberPrefix: e.target.value }))}
                />
              </label>
              <label className={fieldLabel}>
                Next #
                <input
                  type="number"
                  className={fieldInput}
                  value={form.nextNumber}
                  onChange={(e) => setForm((f) => ({ ...f, nextNumber: Number(e.target.value) }))}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
              <input
                type="checkbox"
                checked={form.autoNumbering}
                onChange={(e) => setForm((f) => ({ ...f, autoNumbering: e.target.checked }))}
              />
              <span>
                Use template numbering — otherwise the workspace sequence from{' '}
                <Link to="/document-settings" className="font-medium text-brand-700 hover:underline">
                  Document settings
                </Link>{' '}
                applies
              </span>
            </label>

            <div className="rounded-xl border border-surface-border bg-brand-50/30 p-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={form.showBankDetails}
                  onChange={(e) => setForm((f) => ({ ...f, showBankDetails: e.target.checked }))}
                />
                <span className="min-w-0">
                  <span className="text-sm font-semibold text-ink">Show bank & payment details on invoices</span>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    When enabled, printed and on-screen invoices include payment details from this workspace’s company
                    profile (Workspace settings → Company → Bank & documents). Each workspace has its own profile;
                    nothing is typed here.
                  </p>
                </span>
              </label>
              <div className="mt-3 border-t border-surface-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Live preview — this workspace
                </p>
                <div className="mt-2 space-y-1 text-xs text-ink">
                  {!billing?.bankName &&
                  !billing?.bankBranch &&
                  !billing?.bankAccountHolderName &&
                  !billing?.bankAccountNumber &&
                  !billing?.bankIfsc &&
                  !billing?.micrCode &&
                  !billing?.upiId &&
                  !billing?.paymentLinkUrl &&
                  !billing?.bankSwift &&
                  !billing?.paymentInstructions ? (
                    <p className="text-ink-muted">
                      No bank or payment fields saved yet. Add them under Company → Bank & documents.
                    </p>
                  ) : (
                    <>
                      {billing.bankName ? (
                        <p>
                          <span className="font-medium text-ink">Bank:</span> {billing.bankName}
                        </p>
                      ) : null}
                      {billing.bankBranch ? (
                        <p>
                          <span className="font-medium text-ink">Branch:</span> {billing.bankBranch}
                        </p>
                      ) : null}
                      {billing.bankAccountHolderName ? (
                        <p>
                          <span className="font-medium text-ink">Account:</span> {billing.bankAccountHolderName}
                        </p>
                      ) : null}
                      {billing.bankAccountType ? (
                        <p>
                          <span className="font-medium text-ink">Type:</span> {billing.bankAccountType}
                        </p>
                      ) : null}
                      {billing.bankAccountNumber ? (
                        <p className="tabular-nums">
                          <span className="font-medium text-ink">A/c no.:</span> {billing.bankAccountNumber}
                        </p>
                      ) : null}
                      {billing.bankIfsc ? (
                        <p className="font-mono tabular-nums">
                          <span className="font-medium text-ink">IFSC:</span> {billing.bankIfsc}
                        </p>
                      ) : null}
                      {billing.micrCode ? (
                        <p className="tabular-nums">
                          <span className="font-medium text-ink">MICR:</span> {billing.micrCode}
                        </p>
                      ) : null}
                      {billing.upiId ? (
                        <p className="font-mono">
                          <span className="font-medium text-ink">UPI:</span> {billing.upiId}
                        </p>
                      ) : null}
                      {billing.paymentLinkUrl ? (
                        <p className="break-all">
                          <span className="font-medium text-ink">Pay link:</span> {billing.paymentLinkUrl}
                        </p>
                      ) : null}
                      {billing.bankSwift ? (
                        <p className="font-mono text-[11px]">
                          <span className="font-medium text-ink">SWIFT:</span> {billing.bankSwift}
                        </p>
                      ) : null}
                      {billing.paymentInstructions ? (
                        <p className="mt-1 whitespace-pre-wrap text-[11px] text-ink-muted">
                          {billing.paymentInstructions}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            <label className={fieldLabel}>
              Currency
              <input
                className={cn(fieldInput, 'uppercase')}
                maxLength={3}
                value={form.defaultCurrency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultCurrency: e.target.value.toUpperCase().slice(0, 3) }))
                }
              />
            </label>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className={fieldLabel}>
              Currency
              <input
                className={cn(fieldInput, 'uppercase')}
                maxLength={3}
                value={form.defaultCurrency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultCurrency: e.target.value.toUpperCase().slice(0, 3) }))
                }
              />
            </label>
            <label className={fieldLabel}>
              Validity (days)
              <input
                type="number"
                className={fieldInput}
                value={form.defaultValidityDays}
                onChange={(e) => setForm((f) => ({ ...f, defaultValidityDays: Number(e.target.value) }))}
              />
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </RightDrawer>
  )
}
