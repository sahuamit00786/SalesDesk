import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useIsElevated } from '@/hooks/useRoleRank'
import { parsePhoneNumber } from 'libphonenumber-js/min'
import {
  Briefcase,
  Building2,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Flag,
  Hash,
  Mail,
  MapPin,
  ScanLine,
  Search,
  Tag,
  Upload,
  User,
} from '@/components/ui/icons'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Select } from '@/components/ui/Select'
import { IconInput, IconTextarea } from '@/components/ui/IconInput'
import { PhoneField } from '@/components/ui/PhoneField'
import { LeadTagsInput } from '@/features/leads/components/LeadTagsInput'
import { STATUS_OPTIONS } from '@/features/leads/constants'
import { useCreateLeadSourceMutation, useCreateLeadTagMutation, useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
import { DuplicateLeadsTab } from '@/features/leads/components/DuplicateLeadsTab'
import { CustomFieldsForm, mapCustomFieldValuesFromLead, validateCustomFieldsForm } from '@/features/leads/components/CustomFieldsForm'
import { mergePartsToE164 } from '@/utils/phoneNumbers'
import { cn } from '@/utils/cn'
import { useEffectiveCurrency } from '@/hooks/useEffectiveCurrency'
import { DEAL_CURRENCY_OPTIONS } from '@/features/deals/dealCurrencies'

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
  valueCurrency: 'USD',
  sourceId: '',
  status: 'new',
  requirement: '',
  tags: [],
  assignedUserIds: [],
  customFields: {},
}

/** Official bulk template — same core fields as “Add single lead” (source and assignees are chosen in the UI, not per column). */
const BULK_IMPORT_TEMPLATE = `contact_name,company,email,phone,phone_country_code,whatsapp_number,alt_phone,alt_phone_country_code,designation,street,city,state,country,postal_code,value,value_currency,requirement,notes
Jane Doe,Acme Inc.,jane@example.com,+919876543210,+91,+919876543211,,,Sales Manager,12 MG Road,Bengaluru,Karnataka,India,560001,50000,INR,CRM rollout by Q3,Met at expo
John Smith,Widgets Ltd,john@widgets.com,+919988776655,+91,,+919900000001,+91,Director,1 High Street,Mumbai,Maharashtra,India,400001,12000,INR,,
`

/** Column headers that are always silently skipped — removed from the import flow (handled via UI pickers instead). */
const SKIP_COLUMN_HEADERS = new Set(['tags', 'assigned_user_ids', 'assigneduserids', 'is_opportunity', 'isopportunity'])

function isDeprecatedColumn(col) {
  const norm = String(col.raw || col.label).trim().toLowerCase().replace(/[\s-]+/g, '_')
  return SKIP_COLUMN_HEADERS.has(norm)
}

/** Default workspace lead sources (seeded on first load). Bulk import only offers these, not arbitrary sheet columns. */
const SYSTEM_LEAD_SOURCE_NAMES = new Set(['web form', 'manual', 'referral'])

/** Map each file column → lead field (POST /leads/import — aligned with single-lead form + server import). */
const IMPORT_FIELD_TARGETS = [
  { value: 'skip', label: '— Skip this column —' },
  { value: 'contactName', label: 'Contact name' },
  { value: 'title', label: 'Lead record title' },
  { value: 'company', label: 'Company' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone (national or E.164)' },
  { value: 'phoneCountryCode', label: 'Phone country code (e.g. +91)' },
  { value: 'whatsappNumber', label: 'WhatsApp number' },
  { value: 'altPhone', label: 'Alternate phone' },
  { value: 'altPhoneCountryCode', label: 'Alternate phone country code' },
  { value: 'designation', label: 'Designation / job title' },
  { value: 'street', label: 'Street / address line' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State / region' },
  { value: 'country', label: 'Country' },
  { value: 'postalCode', label: 'Postal / ZIP code' },
  { value: 'value', label: 'Deal value (number)' },
  { value: 'valueCurrency', label: 'Value currency (ISO, e.g. INR)' },
  { value: 'requirement', label: 'Requirement / notes (long)' },
  { value: 'notes', label: 'Notes' },
  { value: 'sourceId', label: 'Lead source (UUID)' },
  { value: 'status', label: 'Lead status (new, contacted, …)' },
  { value: 'assignedTo', label: 'Primary assignee (user UUID)' },
]

const BULK_IMPORT_FIELD_TARGETS = IMPORT_FIELD_TARGETS.filter((o) => {
  if (o.value === 'sourceId' || o.value === 'status') return false
  return true
})

function formatStatusLabel(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let i = 0
  let inQ = false
  while (i < line.length) {
    const c = line[i]
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        }
        inQ = false
        i += 1
        continue
      }
      cur += c
      i += 1
      continue
    }
    if (c === '"') {
      inQ = true
      i += 1
      continue
    }
    if (c === ',') {
      out.push(cur.trim())
      cur = ''
      i += 1
      continue
    }
    cur += c
    i += 1
  }
  out.push(cur.trim())
  return out.map((s) => s.replace(/^"|"$/g, ''))
}

function normalizeColumnsFromHeaderCells(headerCells) {
  const seen = {}
  return headerCells.map((raw, i) => {
    const s = String(raw ?? '').trim()
    const base = s || `Column ${i + 1}`
    const k = base.toLowerCase()
    seen[k] = (seen[k] || 0) + 1
    const n = seen[k]
    return {
      key: `c${i}`,
      raw: s,
      label: n > 1 ? `${base} (${n})` : base,
    }
  })
}

function tableFromAoA(aoa) {
  if (!aoa?.length) return { columns: [], rows: [] }
  const headerCells = (aoa[0] || []).map((cell) => (cell == null ? '' : cell))
  const columns = normalizeColumnsFromHeaderCells(headerCells)
  const rows = []
  for (let r = 1; r < aoa.length; r++) {
    const line = aoa[r] || []
    const cells = line.map((c) => (c == null ? '' : String(c).trim()))
    const row = {}
    let any = false
    columns.forEach((col, j) => {
      const v = cells[j] ?? ''
      if (v) any = true
      row[col.key] = v
    })
    if (any) rows.push(row)
  }
  return { columns, rows }
}

function parseCsvText(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = raw.split('\n').map((l) => l.trimEnd()).filter((l) => l.length)
  if (!lines.length) return { columns: [], rows: [] }
  const headerCells = splitCsvLine(lines[0])
  const columns = normalizeColumnsFromHeaderCells(headerCells)
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const row = {}
    let any = false
    columns.forEach((col, j) => {
      const v = String(cells[j] ?? '').trim()
      if (v) any = true
      row[col.key] = v
    })
    if (any) rows.push(row)
  }
  return { columns, rows }
}

function guessImportTarget(headerLabel) {
  const s = String(headerLabel || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
  if (/whatsapp/.test(s)) return 'whatsappNumber'
  if (/alt|secondary|alternate|backup/.test(s) && /phone|tel|mobile/.test(s)) {
    if (/code|country|dial/.test(s)) return 'altPhoneCountryCode'
    return 'altPhone'
  }
  if (/country\s?code|dial|phone\s?cc/.test(s) && /phone|tel|mobile/.test(s)) return 'phoneCountryCode'
  if (/e\s?mail|email\s?address/.test(s)) return 'email'
  if (/mobile|phone|cell|tel/.test(s)) return 'phone'
  if (/company|organisation|organization|\borg\b/.test(s)) return 'company'
  if (/\bname\b/.test(s) && /company|org/.test(s)) return 'skip'
  if (/lead\s*title|record\s*title/.test(s)) return 'title'
  if (/\btitle\b|designation|position|job|role/.test(s)) return 'designation'
  if (/full\s?name|^name$|contact|first|last/.test(s) || (/\bname\b/.test(s) && !/user|file/.test(s))) return 'contactName'
  if (/street|address\s*1|^address$/.test(s)) return 'street'
  if (/\bcity\b|town/.test(s)) return 'city'
  if (/state|province|region/.test(s)) return 'state'
  if (/country|nation/.test(s) && !/code/.test(s)) return 'country'
  if (/postal|zip|pin\s?code/.test(s)) return 'postalCode'
  if (/currency|curr\b/.test(s)) return 'valueCurrency'
  if (/value|amount|deal|revenue|price|budget/.test(s)) return 'value'
  if (/requirement|needs|brief/.test(s)) return 'requirement'
  if (/notes?\b|comment/.test(s)) return 'notes'
  if (/source\s?id/.test(s)) return 'skip'
  if (/assign|owner/.test(s)) return 'assignedTo'
  if (/^status$|lead\s?status/.test(s)) return 'status'
  return 'skip'
}

function buildAutoMapping(columns, { defaultIsOpportunity = false } = {}) {
  const m = {}
  for (const col of columns) {
    let target = guessImportTarget(col.raw || col.label)
    if (target === 'status') target = 'skip'
    m[col.key] = target
  }
  return m
}

function downloadBulkTemplate() {
  const blob = new Blob([BULK_IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lead-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
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
    valueCurrency: lead.valueCurrency || lead.value_currency || 'USD',
    sourceId: lead.sourceId || '',
    status: lead.status || 'new',
    requirement: lead.requirement || '',
    tags: Array.isArray(lead.tags) ? lead.tags.map((tag) => tag.name).filter(Boolean) : [],
    assignedUserIds: Array.isArray(lead.assignedUsers) ? lead.assignedUsers.map((user) => user.id) : [],
    customFields: mapCustomFieldValuesFromLead(lead),
  }
}

/** Label + control stack so grid rows align; avoids stretched `IconInput` wrappers next to taller `PhoneField`. */
function LeadFieldGroup({ label, children, className }) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      {children}
    </div>
  )
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
  const effectiveCurrency = useEffectiveCurrency()
  const { data: formMetaData } = useGetLeadFormMetaQuery(undefined, { skip: !open })
  const [createLeadSource, { isLoading: creatingSource }] = useCreateLeadSourceMutation()
  const [createLeadTag] = useCreateLeadTagMutation()
  const formMeta = formMetaData?.data || {}
  const sources = formMeta.sources || []
  /** Seeded defaults (Web Form, Manual, Referral). If none match (renamed), fall back to all workspace sources so import still works. */
  const bulkImportSources = useMemo(() => {
    const sys = sources.filter((s) => SYSTEM_LEAD_SOURCE_NAMES.has(String(s.name || '').trim().toLowerCase()))
    return sys.length ? sys : sources
  }, [sources])
  // Rank-3 users can only assign leads to themselves — the server rejects
  // third-party reassignment for them anyway; the dropdown just tells the truth.
  const isElevatedRank = useIsElevated()
  const currentUserId = useSelector((s) => s.auth.user?.id)
  const allWorkspaceUsers = formMeta.users || []
  const users = isElevatedRank ? allWorkspaceUsers : allWorkspaceUsers.filter((u) => String(u.id) === String(currentUserId))
  const availableTags = useMemo(() => formMeta.tags || [], [formMeta.tags])
  const customFieldDefs = useMemo(() => formMeta.customFields || [], [formMeta.customFields])
  const bulkImportFieldTargets = useMemo(() => {
    const customTargets = customFieldDefs.map((f) => ({ value: `cf:${f.key}`, label: `Custom: ${f.label}` }))
    return [...BULK_IMPORT_FIELD_TARGETS, ...customTargets]
  }, [customFieldDefs])
  const [form, setForm] = useState(initialForm)
  const [asOpportunity, setAsOpportunity] = useState(false)
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState('single')
  const [parsed, setParsed] = useState({ columns: [], rows: [] })
  const [bulkFileName, setBulkFileName] = useState('')
  const [bulkDragOver, setBulkDragOver] = useState(false)
  const [importWorkbook, setImportWorkbook] = useState(null)
  const [importSheetNames, setImportSheetNames] = useState([])
  const [importActiveSheet, setImportActiveSheet] = useState('')
  const bulkPasteSigRef = useRef('')
  const fileInputRef = useRef(null)
  const [mapping, setMapping] = useState({})
  const [bulkImportSourceId, setBulkImportSourceId] = useState('')
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [bulkAssigneeIds, setBulkAssigneeIds] = useState([])
  const [bulkAssigneeDropdownOpen, setBulkAssigneeDropdownOpen] = useState(false)
  const [bulkAssigneeSearch, setBulkAssigneeSearch] = useState('')
  const [customFieldErrors, setCustomFieldErrors] = useState({})
  const showPipelineFields = asOpportunity || defaultIsOpportunity
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

  const filteredBulkUsers = useMemo(() => {
    const q = bulkAssigneeSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q))
  }, [users, bulkAssigneeSearch])

  const selectedBulkAssigneeLabel = useMemo(() => {
    if (!bulkAssigneeIds.length) return ''
    const selected = users.filter((u) => bulkAssigneeIds.includes(u.id))
    if (!selected.length) return ''
    if (selected.length === 1) return selected[0].name || selected[0].email
    return `${selected[0].name || selected[0].email} +${selected.length - 1} more`
  }, [bulkAssigneeIds, users])

  useEffect(() => {
    if (!open) return
    if (!importWorkbook || !importActiveSheet) return
    const ws = importWorkbook.Sheets[importActiveSheet]
    if (!ws) {
      setParsed({ columns: [], rows: [] })
      setMapping({})
      return
    }
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    const table = tableFromAoA(aoa)
    setParsed(table)
    setMapping(buildAutoMapping(table.columns, { defaultIsOpportunity }))
    bulkPasteSigRef.current = table.columns.map((c) => `${c.key}:${c.label}`).join('|')
  }, [open, importWorkbook, importActiveSheet, defaultIsOpportunity])

  useEffect(() => {
    if (!open) return
    setActiveTab('single')
    setAssigneeDropdownOpen(false)
    setAssigneeSearch('')
    setBulkAssigneeIds([])
    setBulkAssigneeDropdownOpen(false)
    setBulkAssigneeSearch('')
    setForm(
      initialLead
        ? toEditForm(initialLead)
        : { ...initialForm, valueCurrency: effectiveCurrency },
    )
    const fromLead = Boolean(initialLead?.isOpportunity)
    setAsOpportunity(fromLead || Boolean(defaultIsOpportunity))
    setParsed({ columns: [], rows: [] })
    setMapping({})
    setBulkFileName('')
    setImportWorkbook(null)
    setImportSheetNames([])
    setImportActiveSheet('')
    bulkPasteSigRef.current = ''
    setBulkImportSourceId('')
  }, [open, initialLead, defaultIsOpportunity, effectiveCurrency])

  useEffect(() => {
    if (!open || activeTab !== 'bulk') return
    if (!bulkImportSources.length) return
    setBulkImportSourceId((prev) => {
      if (prev && bulkImportSources.some((s) => s.id === prev)) return prev
      const manual = bulkImportSources.find((s) => String(s.name || '').trim().toLowerCase() === 'manual')
      return manual?.id || bulkImportSources[0]?.id || ''
    })
  }, [open, activeTab, bulkImportSources])

  async function submit(e) {
    e?.preventDefault()
    if (!form.contactName.trim()) return toast.error('Name is required')
    if (!form.phone.trim()) return toast.error('Phone is required')
    if (!form.sourceId) return toast.error('Source is required')
    if (isSamePhone) {
      return toast.error('Phone and alternate phone cannot be the same')
    }
    const cfErrors = validateCustomFieldsForm(customFieldDefs, form.customFields)
    if (Object.keys(cfErrors).length) {
      setCustomFieldErrors(cfErrors)
      return toast.error('Please fill in all required custom fields')
    }
    setCustomFieldErrors({})
    setBusy(true)
    try {
      const payload = {
        ...form,
        title: form.contactName || initialLead?.title || '',
        source: 'manual',
        designation: form.designation || null,
        street: form.street || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        postalCode: form.postalCode || null,
        isOpportunity: showPipelineFields,
        profileMeta: {
          ...(initialLead?.profileMeta || {}),
          whatsappNumber: form.whatsappNumber || null,
        },
      }
      if (!showPipelineFields) {
        payload.status = form.status || 'new'
      }
      const result = await onSubmit?.(payload)
      if (result?.queued) {
        toast('Duplicate detected — saved to review queue', { icon: '⚠️' })
        setForm(initialForm)
        setActiveTab('duplicates')
        return
      }
      setForm(initialForm)
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  function clearBulkImport() {
    setParsed({ columns: [], rows: [] })
    setMapping({})
    setBulkFileName('')
    setImportWorkbook(null)
    setImportSheetNames([])
    setImportActiveSheet('')
    bulkPasteSigRef.current = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function processImportFile(file) {
    if (!file) return
    setBulkFileName(file.name)
    const lower = file.name.toLowerCase()
    try {
      if (lower.endsWith('.csv')) {
        setImportWorkbook(null)
        setImportSheetNames([])
        setImportActiveSheet('')
        const text = await file.text()
        const table = parseCsvText(text)
        setParsed(table)
        setMapping(buildAutoMapping(table.columns, { defaultIsOpportunity }))
        bulkPasteSigRef.current = table.columns.map((c) => `${c.key}:${c.label}`).join('|')
        return
      }
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const names = wb.SheetNames || []
        if (!names.length) {
          toast.error('This workbook has no sheets.')
          setBulkFileName('')
          return
        }
        setImportWorkbook(wb)
        setImportSheetNames(names)
        setImportActiveSheet(names[0])
        return
      }
      toast.error('Use a .csv, .xls, or .xlsx file.')
      setBulkFileName('')
    } catch (err) {
      toast.error(err?.message || 'Could not read file')
      setBulkFileName('')
    }
  }

  async function handleBulkFile(ev) {
    const file = ev.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    await processImportFile(file)
  }

  async function handleBulkDrop(ev) {
    ev.preventDefault()
    setBulkDragOver(false)
    const file = ev.dataTransfer.files?.[0]
    await processImportFile(file)
  }

  async function submitBulk() {
    if (!parsed.rows.length) return toast.error('Upload a .csv or .xlsx file with a header row and at least one data row')
    if (!bulkImportSourceId) return toast.error('Select a lead source for this import')
    const mappedRows = parsed.rows.map((row, idx) => {
      const out = { source: 'csv_import' }
      for (const col of parsed.columns) {
        if (isDeprecatedColumn(col)) continue
        const targetField = mapping[col.key] || 'skip'
        if (targetField === 'skip' || targetField === 'sourceId') continue
        const raw = row[col.key]
        if (raw === undefined || raw === null || String(raw).trim() === '') continue
        if (targetField === 'valueCurrency') {
          const cur = String(raw).trim().toUpperCase().slice(0, 3)
          if (cur) out.valueCurrency = cur
          continue
        }
        if (targetField.startsWith('cf:')) {
          out.customFields = out.customFields || {}
          out.customFields[targetField.slice(3)] = raw
          continue
        }
        out[targetField] = raw
      }
      out.title = out.title || out.contactName || out.email || 'Untitled lead'
      out.value = Number(out.value ?? 0)
      out.source = 'csv_import'
      out.sourceId = bulkImportSourceId
      out.isOpportunity = defaultIsOpportunity
      if (!defaultIsOpportunity) {
        delete out.status
      }
      if (bulkAssigneeIds.length) {
        out.assignedTo = bulkAssigneeIds[idx % bulkAssigneeIds.length]
      }
      return out
    })
    setBusy(true)
    try {
      await onBulkImport?.(mappedRows)
      toast.success(`Imported ${mappedRows.length} leads`)
      clearBulkImport()
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
      description={
        initialLead
          ? 'Update lead details.'
          : 'Create one lead, or bulk-import from a CSV / Excel file: map columns to fields and choose a workspace source once for the whole file.'
      }
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="h-10 rounded-xl border border-surface-border px-5" onClick={onClose}>Cancel</button>
          {activeTab === 'single' ? (
            <button type="submit" form="add-lead-form" className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-white" disabled={busy}>{busy ? 'Saving...' : 'Save Lead'}</button>
          ) : activeTab === 'bulk' ? (
            <button type="button" className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-white" disabled={busy || !parsed.rows.length || !bulkImportSourceId} onClick={submitBulk}>
              {busy ? 'Importing...' : `Import ${parsed.rows.length || 0} Leads`}
            </button>
          ) : null}
        </div>
      }
    >
      {!initialLead ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-surface-border bg-white/90 p-2">
          <button type="button" onClick={() => setActiveTab('single')} className={`h-8 rounded-lg px-3 text-xs ${activeTab === 'single' ? 'bg-[var(--brand-primary)] text-white' : 'bg-surface-subtle text-ink-muted'}`}>Add Single Lead</button>
          <button type="button" onClick={() => setActiveTab('bulk')} className={`h-8 rounded-lg px-3 text-xs ${activeTab === 'bulk' ? 'bg-[var(--brand-primary)] text-white' : 'bg-surface-subtle text-ink-muted'}`}>Bulk Lead Upload</button>
          <button type="button" onClick={() => setActiveTab('duplicates')} className={`h-8 rounded-lg px-3 text-xs ${activeTab === 'duplicates' ? 'bg-amber-500 text-white' : 'bg-surface-subtle text-ink-muted'}`}>Duplicate Leads</button>
        </div>
      ) : null}

      {activeTab === 'duplicates' ? (
        <DuplicateLeadsTab />
      ) : activeTab === 'single' ? (
        <form id="add-lead-form" className="space-y-4" onSubmit={submit}>
          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Contact Information</p>
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
              <LeadFieldGroup label="Contact name*">
                <IconInput
                  wrapperClassName="w-full"
                  icon={User}
                  placeholder="Full name"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="Phone*">
                <PhoneField
                  mode="split"
                  defaultCountry={phoneDefaultCountry}
                  countryCallingCode={form.phoneCountryCode}
                  nationalNumber={form.phone}
                  onSplitChange={({ countryCallingCode, nationalNumber }) =>
                    setForm((f) => ({ ...f, phoneCountryCode: countryCallingCode, phone: nationalNumber }))
                  }
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="Email">
                <IconInput
                  wrapperClassName="w-full"
                  icon={Mail}
                  placeholder="you@company.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="WhatsApp">
                <PhoneField
                  mode="e164"
                  defaultCountry={phoneDefaultCountry}
                  value={form.whatsappNumber}
                  onChange={(v) => setForm((f) => ({ ...f, whatsappNumber: v || '' }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="Alternate phone" className="sm:col-span-2">
                <PhoneField
                  mode="split"
                  defaultCountry={phoneDefaultCountry}
                  countryCallingCode={form.altPhoneCountryCode}
                  nationalNumber={form.altPhone}
                  onSplitChange={({ countryCallingCode, nationalNumber }) =>
                    setForm((f) => ({ ...f, altPhoneCountryCode: countryCallingCode, altPhone: nationalNumber }))
                  }
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="Company">
                <IconInput
                  wrapperClassName="w-full"
                  icon={Building2}
                  placeholder="Organization"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="Designation / role">
                <IconInput
                  wrapperClassName="w-full"
                  icon={Briefcase}
                  placeholder="Job title"
                  value={form.designation}
                  onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="Street address">
                <IconInput
                  wrapperClassName="w-full"
                  icon={MapPin}
                  placeholder="Street, building, suite"
                  value={form.street}
                  onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="City">
                <IconInput
                  wrapperClassName="w-full"
                  icon={MapPin}
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="State / region">
                <IconInput
                  wrapperClassName="w-full"
                  icon={MapPin}
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="Country">
                <IconInput
                  wrapperClassName="w-full"
                  icon={Flag}
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                />
              </LeadFieldGroup>
              <LeadFieldGroup label="Postal code">
                <IconInput
                  wrapperClassName="w-full"
                  icon={Hash}
                  placeholder="PIN / ZIP"
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                />
              </LeadFieldGroup>
            </div>
            {isSamePhone ? (
              <p className="col-span-2 text-xs font-medium text-danger">Phone and alternate phone cannot be the same.</p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-3">
            <LeadFieldGroup label="Requirement">
              <IconTextarea
                wrapperClassName="w-full"
                icon={ScanLine}
                className="min-h-24"
                placeholder="What they need, timeline, constraints…"
                value={form.requirement}
                onChange={(e) => setForm((f) => ({ ...f, requirement: e.target.value }))}
              />
            </LeadFieldGroup>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-3">
            <LeadFieldGroup label="Budget">
              <div className="flex gap-2">
                <select
                  className="h-10 shrink-0 rounded-xl border border-surface-border bg-white px-2 text-xs font-semibold text-ink"
                  value={form.valueCurrency || effectiveCurrency}
                  onChange={(e) => setForm((f) => ({ ...f, valueCurrency: e.target.value }))}
                >
                  {DEAL_CURRENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
                <IconInput
                  wrapperClassName="min-w-0 flex-1"
                  icon={CircleDollarSign}
                  placeholder="0"
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value || 0) }))}
                />
              </div>
            </LeadFieldGroup>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lead Source</p>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Select value={form.sourceId} onChange={(e) => setForm((f) => ({ ...f, sourceId: e.target.value }))}>
                  <option value="">Select source*</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => setAddSourceOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-xl font-semibold text-white hover:bg-[var(--brand-primary-dark)]"
                  aria-label="Add source"
                  title="Add source"
                >
                  +
                </button>
              </div>
              {!showPipelineFields ? (
                <LeadFieldGroup label="Status">
                  <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                </LeadFieldGroup>
              ) : null}
            </div>
          </section>

          {customFieldDefs.length ? (
            <section className="space-y-3 rounded-2xl border border-surface-border p-4">
              <CustomFieldsForm
                fields={customFieldDefs}
                value={form.customFields}
                errors={customFieldErrors}
                showErrors={Object.keys(customFieldErrors).length > 0}
                embedded
                title={null}
                onChange={(customFields) => setForm((f) => ({ ...f, customFields }))}
              />
            </section>
          ) : null}

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Assignment</p>
            <div className="space-y-2">
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
                      <IconInput
                        icon={Search}
                        className="h-9 min-h-0 text-sm"
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Search users..."
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {filteredUsers.map((user) => {
                        const checked = form.assignedUserIds.includes(user.id)
                        return (
                          <label key={user.id} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
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

          <section className="space-y-3 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Tags</p>
            <LeadTagsInput
              value={form.tags}
              availableTags={availableTags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
              onCreateTag={({ name, color }) => createLeadTag({ name, color }).unwrap()}
            />
          </section>
        </form>
      ) : (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={handleBulkFile}
          />

          <div className="rounded-2xl border border-surface-border p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Template & file</p>
              <button
                type="button"
                onClick={downloadBulkTemplate}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-ink-muted shadow-sm hover:border-slate-400 hover:text-ink"
                title="Download CSV template"
                aria-label="Download CSV template"
              >
                <Download className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setBulkDragOver(true)
              }}
              onDragLeave={() => setBulkDragOver(false)}
              onDrop={handleBulkDrop}
              className={cn(
                'mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                bulkDragOver ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-slate-300 hover:border-slate-400',
              )}
            >
              <Upload className="h-5 w-5 text-ink-muted" aria-hidden />
              <p className="text-sm font-medium text-ink">Drop .csv or .xlsx here, or click to browse</p>
            </div>

            {bulkFileName ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate font-medium text-ink">{bulkFileName}</span>
                </p>
                <button type="button" onClick={clearBulkImport} className="shrink-0 text-xs text-ink-muted hover:text-ink">
                  Clear
                </button>
              </div>
            ) : null}
            {importSheetNames.length > 1 ? (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Worksheet</p>
                <Select
                  className="mt-1.5 h-10 rounded-lg text-sm"
                  value={importActiveSheet}
                  onChange={(e) => setImportActiveSheet(e.target.value)}
                >
                  {importSheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-surface-border p-4">
            <p className="text-sm font-semibold text-ink">Lead source</p>
            <Select
              className="mt-3 h-10 rounded-lg text-sm"
              value={bulkImportSourceId}
              onChange={(e) => setBulkImportSourceId(e.target.value)}
              disabled={!bulkImportSources.length}
            >
              {!bulkImportSources.length ? (
                <option value="">Add sources under Lead configuration</option>
              ) : (
                bulkImportSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </Select>
          </div>

          <div className="rounded-2xl border border-surface-border p-4">
            <p className="text-sm font-semibold text-ink">Assign to (round-robin)</p>
            <div className="relative mt-3">
              <button
                type="button"
                onClick={() => setBulkAssigneeDropdownOpen((v) => !v)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-surface-border bg-white px-3.5 pl-9 text-left text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <User className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                <span className={selectedBulkAssigneeLabel ? 'text-ink' : 'text-ink-faint'}>
                  {selectedBulkAssigneeLabel || 'Select sales team members'}
                </span>
                <span className="text-ink-faint">▾</span>
              </button>
              {bulkAssigneeDropdownOpen ? (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-surface-border bg-white shadow-xl">
                  <div className="border-b border-surface-border p-2">
                    <IconInput
                      icon={Search}
                      className="h-9 min-h-0 text-sm"
                      value={bulkAssigneeSearch}
                      onChange={(e) => setBulkAssigneeSearch(e.target.value)}
                      placeholder="Search users..."
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filteredBulkUsers.map((user) => {
                      const checked = bulkAssigneeIds.includes(user.id)
                      return (
                        <label key={user.id} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
                          <span className="min-w-0">
                            <p className="truncate text-sm text-ink">{user.name || 'Unnamed user'}</p>
                            <p className="truncate text-xs text-ink-muted">{user.email}</p>
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setBulkAssigneeIds((prev) =>
                                e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id),
                              )
                            }
                          />
                        </label>
                      )
                    })}
                    {filteredBulkUsers.length === 0 ? <p className="px-3 py-3 text-xs text-ink-muted">No users found.</p> : null}
                  </div>
                  {bulkAssigneeIds.length > 0 ? (
                    <div className="border-t border-surface-border px-3 py-2">
                      <p className="text-[11px] text-ink-muted">
                        {bulkAssigneeIds.length} selected · leads distributed round-robin
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {parsed.columns.filter((c) => !isDeprecatedColumn(c)).length ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Map columns → lead fields · {parsed.rows.length} row{parsed.rows.length === 1 ? '' : 's'}
              </p>
              <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
                {parsed.columns.filter((col) => !isDeprecatedColumn(col)).map((col) => (
                  <div key={col.key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-ink">{col.label}</p>
                        {parsed.rows[0] ? (
                          <p className="mt-0.5 truncate text-[11px] text-ink-muted" title={parsed.rows[0][col.key]}>
                            Sample: {parsed.rows[0][col.key] || '—'}
                          </p>
                        ) : null}
                      </div>
                      <Select
                        className="h-10 shrink-0 rounded-lg text-sm sm:w-[min(100%,280px)]"
                        value={mapping[col.key] || 'skip'}
                        onChange={(e) => setMapping((m) => ({ ...m, [col.key]: e.target.value }))}
                      >
                        {bulkImportFieldTargets.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {parsed.rows.length ? (
            <div className="rounded-2xl border border-surface-border p-4">
              <p className="text-sm font-semibold text-ink">Ready to import</p>
              <p className="mt-1 text-xs text-ink-muted">
                {parsed.rows.length} row{parsed.rows.length === 1 ? '' : 's'} will be sent using the mapping above. Duplicate emails/phones are queued for review in the Duplicate Leads tab.
              </p>
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
              <IconInput icon={Tag} placeholder="Source name" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} />
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
                  className="h-9 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
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
