import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Input } from '@/components/ui/Input'
import { LeadTagsInput } from '@/features/leads/components/LeadTagsInput'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'

const initialForm = {
  contactName: '',
  company: '',
  email: '',
  phone: '',
  phoneCountryCode: '+91',
  altPhone: '',
  altPhoneCountryCode: '+91',
  designation: '',
  city: '',
  state: '',
  value: 0,
  sourceId: '',
  leadStageId: '',
  requirement: '',
  tags: [],
  assignedUserIds: [],
  customFields: {},
}

const CSV_FIELD_OPTIONS = [
  { value: 'skip', label: 'Skip' },
  { value: 'contactName', label: 'Contact Name' },
  { value: 'title', label: 'Lead Title' },
  { value: 'company', label: 'Company' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'value', label: 'Value' },
  { value: 'sourceId', label: 'Source' },
  { value: 'requirement', label: 'Requirement' },
]

function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map((h) => h.trim())
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    return Object.fromEntries(headers.map((h, idx) => [h, values[idx] ?? '']))
  })
  return { headers, rows }
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '')
}

function isoToFlag(iso2) {
  if (!iso2 || String(iso2).length !== 2) return '🌐'
  const codePoints = String(iso2)
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

function countryFlag(code) {
  if (code?.flagEmoji) return code.flagEmoji
  return isoToFlag(code?.iso2)
}

function CountryCodePicker({ value, options, onChange, label = 'Code' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (c) =>
        c.countryName?.toLowerCase().includes(q) ||
        c.iso2?.toLowerCase().includes(q) ||
        c.dialCode?.toLowerCase().includes(q),
    )
  }, [options, search])
  const selected = options.find((c) => c.dialCode === value) || options[0]

  return (
    <div className="relative">
      <button
        type="button"
        className="h-10 w-full rounded-xl border border-brand-200 bg-brand-50/60 px-2 text-left text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        onClick={() => setOpen((v) => !v)}
      >
        {selected ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-sm">{countryFlag(selected)}</span>
            <span className="text-sm font-semibold text-ink">{selected.dialCode}</span>
          </span>
        ) : (
          label
        )}
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-[290px] overflow-hidden rounded-xl border border-surface-border bg-white shadow-xl">
          <div className="border-b border-surface-border p-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries"
              className="h-9 w-full rounded-lg border border-surface-border px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((code) => (
              <button
                key={code.id}
                type="button"
                onClick={() => {
                  onChange(code.dialCode)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="text-base">{countryFlag(code)}</span>
                  <span>{code.countryName}</span>
                </span>
                <span className="rounded-full border border-surface-border bg-surface-subtle px-2 py-0.5 text-xs text-ink-muted">
                  {code.dialCode}
                </span>
              </button>
            ))}
            {filtered.length === 0 ? <p className="px-3 py-3 text-xs text-ink-muted">No countries found.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function toEditForm(lead) {
  if (!lead) return initialForm
  let parsedNotes = {}
  try {
    parsedNotes = lead.notes ? JSON.parse(lead.notes) : {}
  } catch {
    parsedNotes = {}
  }
  return {
    ...initialForm,
    contactName: lead.contactName || lead.title || '',
    company: lead.company || '',
    email: lead.email || '',
    phone: lead.phone || '',
    phoneCountryCode: lead.phoneCountryCode || '+91',
    altPhone: lead.altPhone || '',
    altPhoneCountryCode: lead.altPhoneCountryCode || '+91',
    designation: lead.designation || parsedNotes.designation || '',
    city: lead.city || parsedNotes.city || '',
    state: lead.state || parsedNotes.state || '',
    value: Number(lead.value || 0),
    sourceId: lead.sourceId || '',
    leadStageId: lead.leadStageId || '',
    requirement: lead.requirement || '',
    tags: Array.isArray(lead.tags) ? lead.tags.map((tag) => tag.name).filter(Boolean) : [],
    assignedUserIds: Array.isArray(lead.assignedUsers) ? lead.assignedUsers.map((user) => user.id) : [],
    customFields: lead.customFields || {},
  }
}

export function AddLeadModal({ open, onClose, onSubmit, onBulkImport, initialLead = null }) {
  const { data: formMetaData } = useGetLeadFormMetaQuery(undefined, { skip: !open })
  const formMeta = formMetaData?.data || {}
  const sources = formMeta.sources || []
  const stages = formMeta.stages || []
  const users = formMeta.users || []
  const phoneCodes = formMeta.phoneCodes || []
  const [form, setForm] = useState(initialForm)
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState('single')
  const [csvText, setCsvText] = useState('')
  const parsed = useMemo(() => parseCsv(csvText), [csvText])
  const [mapping, setMapping] = useState({})
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const isSamePhone =
    normalizePhone(form.phone).length > 0 &&
    normalizePhone(form.altPhone).length > 0 &&
    normalizePhone(form.phone) === normalizePhone(form.altPhone) &&
    String(form.phoneCountryCode || '') === String(form.altPhoneCountryCode || '')
  const filteredUsers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(q))
  }, [users, assigneeSearch])
  const selectedAssigneeLabel = useMemo(() => {
    if (!form.assignedUserIds.length) return ''
    const selectedUsers = users.filter((u) => form.assignedUserIds.includes(u.id))
    if (!selectedUsers.length) return ''
    if (selectedUsers.length === 1) return selectedUsers[0].name || selectedUsers[0].email
    return `${selectedUsers[0].name || selectedUsers[0].email} +${selectedUsers.length - 1} more`
  }, [form.assignedUserIds, users])

  useEffect(() => {
    if (!open) return
    setActiveTab('single')
    setAssigneeDropdownOpen(false)
    setAssigneeSearch('')
    setForm(toEditForm(initialLead))
  }, [open, initialLead])

  async function submit(e) {
    e?.preventDefault()
    if (!form.contactName.trim()) return toast.error('Name is required')
    if (!form.phone.trim()) return toast.error('Phone is required')
    if (!form.sourceId) return toast.error('Source is required')
    if (isSamePhone) {
      return toast.error('Phone and alternate phone cannot be the same')
    }
    setBusy(true)
    try {
      const defaultStageId = stages.find((s) => s.isDefault)?.id || stages[0]?.id || null
      await onSubmit?.({
        ...form,
        title: form.contactName || initialLead?.title || '',
        leadStageId: form.leadStageId || defaultStageId,
        source: 'manual',
        designation: form.designation || null,
        city: form.city || null,
        state: form.state || null,
      })
      setForm(initialForm)
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  async function submitBulk() {
    if (!parsed.rows.length) return toast.error('Paste CSV data with header + at least 1 row')
    const mappedRows = parsed.rows.map((row) => {
      const out = { source: 'csv_import' }
      for (const header of parsed.headers) {
        const targetField = mapping[header] || 'skip'
        if (targetField === 'skip') continue
        out[targetField] = row[header]
      }
      out.title = out.title || out.contactName || out.email || 'Untitled lead'
      out.value = Number(out.value || 0)
      out.source = 'csv_import'
      return out
    })
    setBusy(true)
    try {
      await onBulkImport?.(mappedRows)
      toast.success(`Imported ${mappedRows.length} leads`)
      setCsvText('')
      setMapping({})
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={initialLead ? 'Edit Lead' : 'Add Lead'}
      description={initialLead ? 'Update lead details.' : 'Create one lead or bulk upload from CSV with field mapping.'}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="h-10 rounded-xl border border-surface-border px-5" onClick={onClose}>Cancel</button>
          {activeTab === 'single' ? (
            <button type="submit" form="add-lead-form" className="h-10 rounded-xl bg-brand-600 px-5 text-white" disabled={busy}>{busy ? 'Saving...' : 'Save Lead'}</button>
          ) : (
            <button type="button" className="h-10 rounded-xl bg-brand-600 px-5 text-white" disabled={busy} onClick={submitBulk}>
              {busy ? 'Importing...' : `Import ${parsed.rows.length || 0} Leads`}
            </button>
          )}
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-surface-border bg-white/90 p-2">
        <button type="button" onClick={() => setActiveTab('single')} className={`h-8 rounded-lg px-3 text-xs ${activeTab === 'single' ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-ink-muted'}`}>Add Single Lead</button>
        {!initialLead ? (
          <button type="button" onClick={() => setActiveTab('bulk')} className={`h-8 rounded-lg px-3 text-xs ${activeTab === 'bulk' ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-ink-muted'}`}>Bulk Lead Upload</button>
        ) : null}
      </div>

      {activeTab === 'single' ? (
        <form id="add-lead-form" className="space-y-4" onSubmit={submit}>
          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Contact Information</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Name*" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
              <div className="grid grid-cols-[64px_1fr] gap-2">
                <CountryCodePicker
                  value={form.phoneCountryCode}
                  options={phoneCodes.length ? phoneCodes : [{ id: 'in', dialCode: '+91', iso2: 'IN', countryName: 'India' }]}
                  onChange={(dialCode) => setForm((f) => ({ ...f, phoneCountryCode: dialCode }))}
                  label="Code"
                />
                <Input placeholder="Phone*" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <div className="grid grid-cols-[64px_1fr] gap-2">
                <CountryCodePicker
                  value={form.altPhoneCountryCode}
                  options={phoneCodes.length ? phoneCodes : [{ id: 'in-alt', dialCode: '+91', iso2: 'IN', countryName: 'India' }]}
                  onChange={(dialCode) => setForm((f) => ({ ...f, altPhoneCountryCode: dialCode }))}
                  label="Code"
                />
                <Input placeholder="Alt phone" value={form.altPhone} onChange={(e) => setForm((f) => ({ ...f, altPhone: e.target.value }))} />
              </div>
              <Input placeholder="Company name" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
              <Input placeholder="Designation / role" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
              <Input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              <Input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            </div>
            {isSamePhone ? (
              <p className="col-span-2 text-xs font-medium text-danger">Phone and alternate phone cannot be the same.</p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lead Classification</p>
            <div className="grid grid-cols-2 gap-3">
              <select className="h-10 rounded-xl border border-surface-border px-3.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" value={form.sourceId} onChange={(e) => setForm((f) => ({ ...f, sourceId: e.target.value }))}>
                <option value="">Select source*</option>
                {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
              <div className="inline-flex h-10 items-center rounded-xl border border-surface-border bg-surface-muted px-3.5 text-sm text-ink-muted">
                Lead stage: {stages.find((s) => s.isDefault)?.name || 'Initial'}
              </div>
            </div>
            <LeadTagsInput value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Deal & Budget</p>
            <Input placeholder="Budget" type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value || 0) }))} />
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Notes & Requirement</p>
            <textarea className="min-h-24 w-full rounded-xl border border-surface-border px-3.5 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" placeholder="Requirement" value={form.requirement} onChange={(e) => setForm((f) => ({ ...f, requirement: e.target.value }))} />
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Assignment</p>
            <div className="space-y-2">
              <p className="text-xs text-ink-muted">Assign to one or more users</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAssigneeDropdownOpen((openState) => !openState)}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-surface-border bg-white px-3.5 text-left text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <span className={selectedAssigneeLabel ? 'text-ink' : 'text-ink-faint'}>
                    {selectedAssigneeLabel || 'Select users'}
                  </span>
                  <span className="text-ink-faint">▾</span>
                </button>

                {assigneeDropdownOpen ? (
                  <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-surface-border bg-white shadow-xl">
                    <div className="border-b border-surface-border p-2">
                      <input
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Search users..."
                        className="h-9 w-full rounded-lg border border-surface-border px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {filteredUsers.map((user) => {
                        const checked = form.assignedUserIds.includes(user.id)
                        return (
                          <label key={user.id} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 hover:bg-brand-50">
                            <span className="min-w-0">
                              <p className="truncate text-sm text-ink">{user.name || 'Unnamed user'}</p>
                              <p className="truncate text-xs text-ink-muted">{user.email}</p>
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  assignedUserIds: e.target.checked
                                    ? [...f.assignedUserIds, user.id]
                                    : f.assignedUserIds.filter((id) => id !== user.id),
                                }))
                              }
                            />
                          </label>
                        )
                      })}
                      {filteredUsers.length === 0 ? <p className="px-3 py-3 text-xs text-ink-muted">No users found.</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-border p-4">
            <p className="text-sm font-semibold text-ink">Step 1: Paste CSV</p>
            <p className="mt-1 text-xs text-ink-muted">First row should contain headers. Example: Full Name, Org, Email Address, Mobile, Deal Size</p>
            <textarea
              className="mt-3 min-h-36 w-full rounded-xl border border-surface-border p-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
              placeholder="Full Name,Org,Email Address,Mobile,Deal Size"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
          </div>
          <div className="rounded-2xl border border-surface-border p-4">
            <p className="text-sm font-semibold text-ink">Step 2: Field Mapping</p>
            {!parsed.headers.length ? (
              <p className="mt-2 text-xs text-ink-muted">Paste CSV data to configure mapping.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {parsed.headers.map((header) => (
                  <div key={header} className="grid grid-cols-2 items-center gap-3">
                    <p className="truncate text-sm text-ink">{header}</p>
                    <select
                      className="h-10 rounded-xl border border-surface-border px-3.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                      value={mapping[header] || 'skip'}
                      onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                    >
                      {CSV_FIELD_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
          {parsed.rows.length ? (
            <div className="rounded-2xl border border-surface-border p-4">
              <p className="text-sm font-semibold text-ink">Preview</p>
              <p className="mt-1 text-xs text-ink-muted">{parsed.rows.length} rows detected</p>
            </div>
          ) : null}
        </div>
      )}
    </RightDrawer>
  )
}
