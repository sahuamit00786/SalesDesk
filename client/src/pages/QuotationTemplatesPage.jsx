import { useState } from 'react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { SalesDocTemplateGallery } from '@/features/sales-docs/components/SalesDocTemplateGallery'
import {
  useCreateQuotationTemplateMutation,
  useDeleteQuotationTemplateMutation,
  useGetQuotationTemplatesQuery,
  usePatchQuotationTemplateMutation,
} from '@/features/sales-docs/quotationsApi'
import { QUOTATION_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { isLibraryQuotationCode } from '@/features/sales-docs/libraryCodes'

export function QuotationTemplatesPage() {
  const { data, refetch } = useGetQuotationTemplatesQuery()
  const [createTpl] = useCreateQuotationTemplateMutation()
  const [patchTpl] = usePatchQuotationTemplateMutation()
  const [deleteTpl] = useDeleteQuotationTemplateMutation()

  const rows = data?.data?.items ?? data?.items ?? []
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    code: '',
    layoutPreset: 1,
    defaultCurrency: 'USD',
    defaultValidityDays: 30,
    status: 'active',
  })

  function openNew() {
    setEditingId(null)
    setForm({
      name: '',
      code: '',
      layoutPreset: 1,
      defaultCurrency: 'USD',
      defaultValidityDays: 30,
      status: 'active',
    })
    setOpen(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      code: row.code || '',
      layoutPreset: row.layoutPreset || 1,
      defaultCurrency: row.defaultCurrency || 'USD',
      defaultValidityDays: row.defaultValidityDays ?? 30,
      status: row.status || 'active',
    })
    setOpen(true)
  }

  async function save() {
    try {
      if (!form.name.trim() || !form.code.trim()) {
        toast.error('Name and code are required')
        return
      }
      if (editingId) {
        await patchTpl({ id: editingId, ...form }).unwrap()
        toast.success('Template updated')
      } else {
        await createTpl(form).unwrap()
        toast.success('Template created')
      }
      setOpen(false)
      refetch()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Save failed')
    }
  }

  return (
    <PageShell fullWidth>
      <SalesDocTemplateGallery
        variant="quotation"
        items={rows}
        presetLabels={QUOTATION_PRESET_LABELS}
        isLibraryCode={isLibraryQuotationCode}
        createHref="/quotations/new"
        listHref="/quotations"
        listLabel="← Quotations list"
        title="Quotation template"
        subtitle={{
          lead: 'Create or re-use an existing quotation',
          hint: 'Select a quotation template to use — or start blank.',
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
          <button
            type="button"
            className="rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#483fa3]"
            onClick={openNew}
          >
            New template
          </button>
        }
      />

      <RightDrawer open={open} onClose={() => setOpen(false)} title={editingId ? 'Edit template' : 'New template'}>
        <div className="flex flex-col gap-3 px-1 pb-8 pt-2">
          <label className="text-xs font-medium text-neutral-600">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="text-xs font-medium text-neutral-600">
            Code (unique per workspace)
            <input
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              disabled={Boolean(editingId)}
            />
          </label>
          <label className="text-xs font-medium text-neutral-600">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <label className="text-xs font-medium text-neutral-600">
            Layout preset
            <select
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              value={form.layoutPreset}
              onChange={(e) => setForm((f) => ({ ...f, layoutPreset: Number(e.target.value) }))}
            >
              {QUOTATION_PRESET_LABELS.map((label, i) => (
                <option key={label} value={i + 1}>
                  {i + 1}. {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-neutral-600">
              Currency
              <input
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm uppercase"
                maxLength={3}
                value={form.defaultCurrency}
                onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value.toUpperCase().slice(0, 3) }))}
              />
            </label>
            <label className="text-xs font-medium text-neutral-600">
              Validity (days)
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                value={form.defaultValidityDays}
                onChange={(e) => setForm((f) => ({ ...f, defaultValidityDays: Number(e.target.value) }))}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white" onClick={save}>
              Save
            </button>
          </div>
        </div>
      </RightDrawer>
    </PageShell>
  )
}
