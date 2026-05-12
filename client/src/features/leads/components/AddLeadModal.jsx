import { useEffect, useMemo, useState } from 'react'
import { parsePhoneNumber } from 'libphonenumber-js/min'
import {
  Briefcase,
  Building2,
  CircleDollarSign,
  Flag,
  Hash,
  Mail,
  MapPin,
  ScanLine,
  Search,
  Tag,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Input } from '@/components/ui/Input'
import { PhoneField } from '@/components/ui/PhoneField'
import { LeadTagsInput } from '@/features/leads/components/LeadTagsInput'
import { useCreateLeadSourceMutation, useCreateLeadTagMutation, useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
import { mergePartsToE164 } from '@/utils/phoneNumbers'

const initialForm = {
  contactName: '',
  company: '',
  email: '',
  phone: '',
  whatsappNumber: '',
  phoneCountryCode: '+91',
  altPhone: '',
  altPhoneCountryCode: '+91',
  designation: '',
  street: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  value: 0,
  sourceId: '',
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
    whatsappNumber: lead.profileMeta?.whatsappNumber || '',
    phoneCountryCode: lead.phoneCountryCode || '+91',
    altPhone: lead.altPhone || '',
    altPhoneCountryCode: lead.altPhoneCountryCode || '+91',
    designation: lead.designation || parsedNotes.designation || '',
    street: lead.street || parsedNotes.street || '',
    city: lead.city || parsedNotes.city || '',
    state: lead.state || parsedNotes.state || '',
    country: lead.country || parsedNotes.country || '',
    postalCode: lead.postalCode || parsedNotes.postalCode || '',
    value: Number(lead.value || 0),
    sourceId: lead.sourceId || '',
    requirement: lead.requirement || '',
    tags: Array.isArray(lead.tags) ? lead.tags.map((tag) => tag.name).filter(Boolean) : [],
    assignedUserIds: Array.isArray(lead.assignedUsers) ? lead.assignedUsers.map((user) => user.id) : [],
    customFields: lead.customFields || {},
  }
}

export function AddLeadModal({
  open,
  onClose,
  onSubmit,
  onBulkImport,
  initialLead = null,
  /** When true, new rows default to Lead `is_opportunity` (pipeline / opportunities views). */
  defaultIsOpportunity = false,
}) {
  const { data: formMetaData } = useGetLeadFormMetaQuery(undefined, { skip: !open })
  const [createLeadSource, { isLoading: creatingSource }] = useCreateLeadSourceMutation()
  const [createLeadTag] = useCreateLeadTagMutation()
  const formMeta = formMetaData?.data || {}
  const sources = formMeta.sources || []
  const opportunityStages = useMemo(() => formMeta.opportunityStages || [], [formMeta.opportunityStages])
  const users = formMeta.users || []
  const availableTags = useMemo(() => formMeta.tags || [], [formMeta.tags])
  const [form, setForm] = useState(initialForm)
  const [asOpportunity, setAsOpportunity] = useState(false)
  const [opportunityStage, setOpportunityStage] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState('single')
  const [csvText, setCsvText] = useState('')
  const parsed = useMemo(() => parseCsv(csvText), [csvText])
  const [mapping, setMapping] = useState({})
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const phoneDefaultCountry = useMemo(() => {
    const c = String(form.country || '')
      .trim()
      .toUpperCase()
    return c.length === 2 ? c : 'IN'
  }, [form.country])

  const isSamePhone = useMemo(() => {
    const a = mergePartsToE164(form.phoneCountryCode, form.phone)
    const b = mergePartsToE164(form.altPhoneCountryCode, form.altPhone)
    if (!a || !b) return false
    try {
      return parsePhoneNumber(a).number === parsePhoneNumber(b).number
    } catch {
      return false
    }
  }, [form.phoneCountryCode, form.phone, form.altPhoneCountryCode, form.altPhone])
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
    const fromLead = Boolean(initialLead?.isOpportunity)
    setAsOpportunity(fromLead || Boolean(defaultIsOpportunity))
    setOpportunityStage(String(initialLead?.opportunityStage || '').trim())
  }, [open, initialLead, defaultIsOpportunity])

  const opportunityStageOptionsKey = useMemo(
    () => opportunityStages.map((s) => s.name).join('\u0001'),
    [opportunityStages],
  )

  useEffect(() => {
    if (!open) return
    if (!opportunityStages.length) {
      setOpportunityStage('')
      return
    }
    const fromLead = String(initialLead?.opportunityStage || '').trim()
    if (fromLead && opportunityStages.some((s) => s.name === fromLead)) {
      setOpportunityStage(fromLead)
      return
    }
    setOpportunityStage((prev) => {
      if (prev && opportunityStages.some((s) => s.name === prev)) return prev
      return opportunityStages.find((s) => s.isDefault)?.name || opportunityStages[0]?.name || ''
    })
  }, [open, initialLead?.id, initialLead?.opportunityStage, opportunityStageOptionsKey])

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
      await onSubmit?.({
        ...form,
        title: form.contactName || initialLead?.title || '',
        source: 'manual',
        designation: form.designation || null,
        street: form.street || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        postalCode: form.postalCode || null,
        isOpportunity: asOpportunity,
        opportunityStage: String(opportunityStage || '').trim() || null,
        profileMeta: {
          ...(initialLead?.profileMeta || {}),
          whatsappNumber: form.whatsappNumber || null,
        },
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

  async function submitNewSource(e) {
    e?.preventDefault()
    const name = newSourceName.trim()
    if (!name) return
    try {
      const res = await createLeadSource({ name }).unwrap()
      const createdId = res?.data?.id
      if (createdId) setForm((f) => ({ ...f, sourceId: createdId }))
      setNewSourceName('')
      setAddSourceOpen(false)
      toast.success('Source added')
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not add source')
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
      {!initialLead ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-surface-border bg-white/90 p-2">
          <button type="button" onClick={() => setActiveTab('single')} className={`h-8 rounded-lg px-3 text-xs ${activeTab === 'single' ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-ink-muted'}`}>Add Single Lead</button>
          <button type="button" onClick={() => setActiveTab('bulk')} className={`h-8 rounded-lg px-3 text-xs ${activeTab === 'bulk' ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-ink-muted'}`}>Bulk Lead Upload</button>
        </div>
      ) : null}

      {activeTab === 'single' ? (
        <form id="add-lead-form" className="space-y-4" onSubmit={submit}>
          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Contact Information</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="Name*" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div className="min-w-0">
                <PhoneField
                  label="Phone*"
                  mode="split"
                  defaultCountry={phoneDefaultCountry}
                  countryCallingCode={form.phoneCountryCode}
                  nationalNumber={form.phone}
                  onSplitChange={({ countryCallingCode, nationalNumber }) =>
                    setForm((f) => ({ ...f, phoneCountryCode: countryCallingCode, phone: nationalNumber }))
                  }
                />
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="min-w-0">
                <PhoneField
                  label="WhatsApp"
                  mode="e164"
                  defaultCountry={phoneDefaultCountry}
                  value={form.whatsappNumber}
                  onChange={(v) => setForm((f) => ({ ...f, whatsappNumber: v || '' }))}
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <PhoneField
                  label="Alternate phone"
                  mode="split"
                  defaultCountry={phoneDefaultCountry}
                  countryCallingCode={form.altPhoneCountryCode}
                  nationalNumber={form.altPhone}
                  onSplitChange={({ countryCallingCode, nationalNumber }) =>
                    setForm((f) => ({ ...f, altPhoneCountryCode: countryCallingCode, altPhone: nationalNumber }))
                  }
                />
              </div>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="Company name" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="Designation / role" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
              </div>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="Address" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
              </div>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="relative">
                <Flag className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <Input className="pl-9" placeholder="Pin code" value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} />
              </div>
            </div>
            {isSamePhone ? (
              <p className="col-span-2 text-xs font-medium text-danger">Phone and alternate phone cannot be the same.</p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lead Classification</p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <select className="h-10 rounded-xl border border-surface-border px-3.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" value={form.sourceId} onChange={(e) => setForm((f) => ({ ...f, sourceId: e.target.value }))}>
                  <option value="">Select source*</option>
                  {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setAddSourceOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-xl font-semibold text-white hover:bg-brand-700"
                  aria-label="Add source"
                  title="Add source"
                >
                  +
                </button>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Pipeline stage</p>
                <select
                  className="h-10 w-full rounded-xl border border-surface-border px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                  value={opportunityStage}
                  onChange={(e) => setOpportunityStage(e.target.value)}
                >
                  {!opportunityStages.length ? <option value="">Default (workspace)</option> : null}
                  {opportunityStages.map((s) => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {!opportunityStages.length ? (
                  <p className="mt-1 text-xs text-ink-muted">Configure stages under Lead configuration → Opportunity stages.</p>
                ) : null}
              </div>
            </div>
            <LeadTagsInput
              value={form.tags}
              availableTags={availableTags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
              onCreateTag={({ name, color }) => createLeadTag({ name, color }).unwrap()}
            />
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-surface-border bg-brand-50/40 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                checked={asOpportunity}
                onChange={(e) => setAsOpportunity(e.target.checked)}
              />
              <span>
                <span className="text-sm font-semibold text-ink">Save as sales opportunity</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                  Creates or updates this row in the Leads table with <code className="rounded bg-white/80 px-1">is_opportunity</code> so it appears in Pipeline and Opportunities.
                </span>
              </span>
            </label>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Deal & Budget</p>
            <div className="relative">
              <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
              <Input className="pl-9" placeholder="Budget" type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value || 0) }))} />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Notes & Requirement</p>
            <div className="relative">
              <ScanLine className="pointer-events-none absolute left-3 top-3.5 h-3 w-3 text-ink-faint" />
              <textarea className="min-h-24 w-full rounded-xl border border-surface-border px-3.5 py-2.5 pl-9 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" placeholder="Requirement" value={form.requirement} onChange={(e) => setForm((f) => ({ ...f, requirement: e.target.value }))} />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Assignment</p>
            <div className="space-y-2">
              <p className="text-xs text-ink-muted">Assign to one or more users</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAssigneeDropdownOpen((openState) => !openState)}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-surface-border bg-white px-3.5 pl-9 text-left text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <User className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                  <span className={selectedAssigneeLabel ? 'text-ink' : 'text-ink-faint'}>
                    {selectedAssigneeLabel || 'Select users'}
                  </span>
                  <span className="text-ink-faint">▾</span>
                </button>

                {assigneeDropdownOpen ? (
                  <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-surface-border bg-white shadow-xl">
                    <div className="border-b border-surface-border p-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                        <input
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          placeholder="Search users..."
                          className="h-9 w-full rounded-lg border border-surface-border px-3 pl-9 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                        />
                      </div>
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
      {addSourceOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-4 shadow-2xl">
            <p className="text-base font-semibold text-ink">Add Source</p>
            <p className="mt-1 text-xs text-ink-muted">Create a source without leaving this form.</p>
            <form className="mt-4 space-y-3" onSubmit={submitNewSource}>
              <Input
                placeholder="Source name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="h-9 rounded-lg border border-surface-border px-4 text-sm"
                  onClick={() => {
                    setAddSourceOpen(false)
                    setNewSourceName('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={!newSourceName.trim() || creatingSource}
                >
                  {creatingSource ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </RightDrawer>
  )
}
