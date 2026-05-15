import { User } from '../models/index.js'
import { createLeadSystemActivity } from './leadSystemActivity.js'

/** Keys we never emit generic field rows for (handled elsewhere or internal). */
const SKIP_FIELDS = new Set([
  'id',
  'companyId',
  'workspaceId',
  'ownerUserId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'isDeleted',
  'opportunityStage',
])

const FIELD_LABELS = {
  title: 'Title',
  contactName: 'Contact name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  phoneCountryCode: 'Phone country code',
  altPhone: 'Alternate phone',
  altPhoneCountryCode: 'Alt. phone country code',
  value: 'Deal value',
  valueCurrency: 'Value currency',
  score: 'Lead score',
  status: 'Lead status',
  source: 'Source',
  sourceId: 'Source link',
  assignedTo: 'Assignee',
  closingDate: 'Closing date',
  notes: 'Notes',
  requirement: 'Requirements',
  designation: 'Job title',
  street: 'Street',
  city: 'City',
  state: 'State',
  country: 'Country',
  postalCode: 'Postal code',
  profileMeta: 'Profile',
  lostReason: 'Lost reason',
  isOpportunity: 'Opportunity',
  customFields: 'Custom fields',
}

function stableJson(obj) {
  if (obj === undefined || obj === null) return null
  if (typeof obj !== 'object') return JSON.stringify(obj)
  try {
    return JSON.stringify(obj, Object.keys(obj).sort())
  } catch {
    return String(obj)
  }
}

/** Plain text columns: compare as trimmed strings first (avoids object/Buffer shapes from the driver breaking diffs). */
const TEXT_SCALAR_FIELDS = new Set([
  'title',
  'contactName',
  'company',
  'email',
  'phone',
  'phoneCountryCode',
  'altPhone',
  'altPhoneCountryCode',
  'designation',
  'street',
  'city',
  'state',
  'country',
  'postalCode',
  'lostReason',
])

function normForCompare(field, v) {
  if (v === undefined || v === null) return null
  if (Buffer.isBuffer(v)) {
    const s = v.toString('utf8').trim()
    return s === '' ? null : s
  }
  if (TEXT_SCALAR_FIELDS.has(field)) {
    const s = String(v ?? '')
      .trim()
      .replace(/\u00a0/g, ' ')
    return s === '' ? null : s
  }
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (field === 'value' || field === 'score') {
    const n = Number(v)
    return Number.isFinite(n) ? String(n) : null
  }
  if (field === 'closingDate') {
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    const s = String(v).trim().slice(0, 10)
    return s || null
  }
  if (field === 'customFields' || field === 'profileMeta') return stableJson(v)
  if (typeof v === 'object' && v !== null) return stableJson(v)
  const s = String(v).trim()
  return s === '' ? null : s
}

function humanizeEnumLabel(value) {
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function displayFieldValue(field, raw) {
  const n = normForCompare(field, raw)
  if (n === null) return '—'
  if (field === 'source' || field === 'status') return humanizeEnumLabel(raw)
  if (field === 'isOpportunity') return raw ? 'Yes' : 'No'
  if (field === 'customFields' || field === 'profileMeta') return 'Updated'
  if (field === 'notes' || field === 'requirement') {
    const t = String(raw ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!t) return '—'
    return t.length > 120 ? `${t.slice(0, 117)}…` : t
  }
  if (field === 'sourceId') return String(raw)
  return String(raw)
}

/**
 * Writes one system activity per changed lead column (pipeline stage excluded — logged separately).
 * @param {{ before: object, after: object, leadId: string, userId: string, actorName: string }} args
 */
export async function logLeadFieldChanges({ before, after, leadId, userId, actorName }) {
  const assigneeIds = new Set()
  for (const id of [before?.assignedTo, after?.assignedTo]) {
    if (id) assigneeIds.add(String(id))
  }
  let assigneeNames = {}
  if (assigneeIds.size) {
    const rows = await User.findAll({
      where: { id: [...assigneeIds] },
      attributes: ['id', 'name', 'email'],
    })
    assigneeNames = Object.fromEntries(
      rows.map((u) => [String(u.id), (u.name && String(u.name).trim()) || u.email?.trim() || String(u.id)]),
    )
  }

  for (const field of Object.keys(FIELD_LABELS)) {
    if (SKIP_FIELDS.has(field)) continue
    const prevRaw = before?.[field]
    const nextRaw = after?.[field]
    if (normForCompare(field, prevRaw) === normForCompare(field, nextRaw)) continue

    const label = FIELD_LABELS[field]
    let fromLabel = displayFieldValue(field, prevRaw)
    let toLabel = displayFieldValue(field, nextRaw)
    if (field === 'assignedTo') {
      fromLabel = prevRaw ? assigneeNames[String(prevRaw)] || '—' : '—'
      toLabel = nextRaw ? assigneeNames[String(nextRaw)] || '—' : '—'
    }

    const body = `${label} changed from "${fromLabel}" to "${toLabel}" by ${actorName}`
    await createLeadSystemActivity({
      leadId,
      userId,
      body,
      metadata: {
        action: 'lead_field_changed',
        activityTypeKey: 'system',
        field,
        from: prevRaw ?? null,
        to: nextRaw ?? null,
        fromLabel,
        toLabel,
        actorName,
      },
    })
  }
}

function sortedUserIdKey(ids) {
  return [...(ids || [])]
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .sort()
    .join('\u0001')
}

async function displayNamesForUserIds(userIds) {
  const ids = [...new Set((userIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) return {}
  const rows = await User.findAll({
    where: { id: ids },
    attributes: ['id', 'name', 'email'],
  })
  return Object.fromEntries(
    rows.map((u) => [String(u.id), (u.name && String(u.name).trim()) || u.email?.trim() || String(u.id)]),
  )
}

/**
 * When `lead_assignments` differs, log a single system activity (primary assignee is still `assignedTo` on the lead row).
 */
export async function logLeadCollaboratorsChange({ leadId, userId, actorName, beforeUserIds, afterUserIds }) {
  if (sortedUserIdKey(beforeUserIds) === sortedUserIdKey(afterUserIds)) return
  const merged = [...new Set([...(beforeUserIds || []), ...(afterUserIds || [])].map((x) => String(x || '').trim()).filter(Boolean))]
  const names = await displayNamesForUserIds(merged)
  const fmt = (arr) => {
    const list = (arr || []).map((id) => names[String(id)] || String(id)).filter(Boolean)
    return list.length ? list.join(', ') : '—'
  }
  const fromLabel = fmt(beforeUserIds)
  const toLabel = fmt(afterUserIds)
  const body = `Collaborators changed from "${fromLabel}" to "${toLabel}" by ${actorName}`
  await createLeadSystemActivity({
    leadId,
    userId,
    body,
    metadata: {
      action: 'lead_collaborators_changed',
      activityTypeKey: 'system',
      fromUserIds: beforeUserIds?.length ? [...beforeUserIds] : [],
      toUserIds: afterUserIds?.length ? [...afterUserIds] : [],
      fromLabel,
      toLabel,
      actorName,
    },
  })
}
