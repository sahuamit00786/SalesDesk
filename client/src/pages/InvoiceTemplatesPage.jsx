import { useState } from 'react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { Button } from '@/components/ui/Button'
import { inputFieldClassName } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { SalesDocTemplateGallery } from '@/features/sales-docs/components/SalesDocTemplateGallery'
import {
  useCreateInvoiceTemplateMutation,
  useDeleteInvoiceTemplateMutation,
  useGetInvoiceTemplatesQuery,
  usePatchInvoiceTemplateMutation,
} from '@/features/sales-docs/invoicesApi'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import { INVOICE_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { isLibraryInvoiceCode } from '@/features/sales-docs/libraryCodes'

export function InvoiceTemplatesPage() {
  const { data, refetch } = useGetInvoiceTemplatesQuery()
  const { data: billRes } = useGetBillingProfileQuery()
  const [createTpl] = useCreateInvoiceTemplateMutation()
  const [patchTpl] = usePatchInvoiceTemplateMutation()
  const [deleteTpl] = useDeleteInvoiceTemplateMutation()

  const rows = data?.data?.items ?? data?.items ?? []
  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
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
  })

  function openNew() {
    setEditingId(null)
    setForm({
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
    })
    setOpen(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    const sec = row.sectionSettings && typeof row.sectionSettings === 'object' ? { ...row.sectionSettings } : {}
    setForm({
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
    })
    setOpen(true)
  }

  async function save() {
    try {
      if (!form.name.trim() || !form.code.trim()) {
        toast.error('Name and code are required')
        return
      }
      const sectionSettings = { ...form.sectionSettings, showBankDetails: form.showBankDetails }
      const payload = {
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
      if (editingId) {
        await patchTpl({ id: editingId, ...payload }).unwrap()
        toast.success('Template updated')
      } else {
        await createTpl(payload).unwrap()
        toast.success('Template created')
      }
      setOpen(false)
      refetch()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Save failed')
    }
  }

  const fieldLabel = 'text-xs font-medium text-ink-muted'
  const fieldInput = cn(inputFieldClassName, 'mt-1')

  return (
    <PageShell fullWidth>
      <PageStack>
        <SalesDocTemplateGallery
          variant="invoice"
          items={rows}
          presetLabels={INVOICE_PRESET_LABELS}
          isLibraryCode={isLibraryInvoiceCode}
          createHref="/invoices/new"
          listHref="/invoices"
          listLabel="Invoices list"
          title="Invoice templates"
          subtitle={{
            lead: 'Create or re-use an existing invoice',
            hint: 'Select a template to start, or create from scratch.',
          }}
          onEdit={openEdit}
          onDelete={(row) => {
            if (!confirm('Delete this template?')) return
            deleteTpl(row.id)
              .unwrap()
              .then(() => {
                toast.success('Deleted')
                refetch()
              })
              .catch(() => toast.error('Could not delete'))
          }}
          toolbarExtra={
            <Button type="button" className="shrink-0 whitespace-nowrap" onClick={openNew}>
              New template
            </Button>
          }
        />
      </PageStack>

      <RightDrawer open={open} onClose={() => setOpen(false)} title={editingId ? 'Edit template' : 'New template'}>
        <div className="flex flex-col gap-3 px-1 pb-8 pt-2">
          <label className={fieldLabel}>
            Name
            <input
              className={fieldInput}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className={fieldLabel}>
            Code
            <input
              className={fieldInput}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              disabled={Boolean(editingId)}
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
          <label className={fieldLabel}>
            Layout preset
            <select
              className={fieldInput}
              value={form.layoutPreset}
              onChange={(e) => setForm((f) => ({ ...f, layoutPreset: Number(e.target.value) }))}
            >
              {INVOICE_PRESET_LABELS.map((label, i) => (
                <option key={label} value={i + 1}>
                  {i + 1}. {label}
                </option>
              ))}
            </select>
          </label>
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
            Use template numbering (otherwise workspace billing sequence)
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
                  When enabled, printed and on-screen invoices include payment details from this workspace’s company profile
                  (Workspace settings → Company → Bank & documents). Each workspace has its own profile; nothing is typed here.
                </p>
              </span>
            </label>
            <div className="mt-3 border-t border-surface-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Live preview — this workspace</p>
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
                  <p className="text-ink-muted">No bank or payment fields saved yet. Add them under Company → Bank & documents.</p>
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
                      <p className="mt-1 whitespace-pre-wrap text-[11px] text-ink-muted">{billing.paymentInstructions}</p>
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
              onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value.toUpperCase().slice(0, 3) }))}
            />
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </RightDrawer>
    </PageShell>
  )
}
