import { Op } from 'sequelize'
import { CallLog, Lead, User } from '../models/index.js'
import { isElevated } from './recordVisibility.js'
import { forbidden } from '../utils/httpError.js'
import { phoneDigitsKey } from '../utils/phoneDigits.js'

const CALL_INCLUDE = [
  {
    model: Lead,
    as: 'lead',
    attributes: ['id', 'title', 'contactName', 'phone', 'isOpportunity', 'assignedTo', 'ownerUserId'],
  },
  { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
]

/**
 * Finds a company lead whose primary phone OR altPhone matches the number,
 * comparing on trailing digits since phones are stored as raw typed strings.
 */
async function findLeadByPhone(user, rawPhone) {
  const key = phoneDigitsKey(rawPhone)
  if (!key) return null
  return Lead.findOne({
    where: {
      companyId: user.companyId,
      isDeleted: false,
      [Op.or]: [{ phoneDigits: key }, { altPhoneDigits: key }],
    },
  })
}

/**
 * Attaches every orphan call in the company whose number matches the lead's
 * phone/altPhone. Called after lead create/convert so old synced calls show up
 * on the lead page. Returns count linked.
 */
export async function linkOrphanCallsToLead(lead) {
  const keys = [phoneDigitsKey(lead.phone), phoneDigitsKey(lead.altPhone)].filter(Boolean)
  if (!keys.length) return 0

  const orphans = await CallLog.findAll({
    where: { companyId: lead.companyId, leadId: null, phoneNumber: { [Op.ne]: null } },
    attributes: ['id', 'phoneNumber', 'workspaceId'],
  })
  const matched = orphans.filter((c) => keys.includes(phoneDigitsKey(c.phoneNumber)))
  if (!matched.length) return 0

  await CallLog.update({ leadId: lead.id }, { where: { id: { [Op.in]: matched.map((c) => c.id) } } })
  const missingWs = matched.filter((c) => !c.workspaceId).map((c) => c.id)
  if (missingWs.length && lead.workspaceId) {
    await CallLog.update({ workspaceId: lead.workspaceId }, { where: { id: { [Op.in]: missingWs } } })
  }
  return matched.length
}

async function assertLeadAccess(user, leadId) {
  const lead = await Lead.findOne({
    where: { id: leadId, companyId: user.companyId, isDeleted: false },
  })
  if (!lead) {
    const err = new Error('Lead not found')
    err.status = 404
    err.code = 'NOT_FOUND'
    err.publicMessage = 'Lead not found'
    throw err
  }
  return lead
}

async function assertCallAccess(user, id) {
  const call = await CallLog.findOne({ where: { id, companyId: user.companyId }, include: CALL_INCLUDE })
  if (!call) {
    const err = new Error('Call not found')
    err.status = 404
    err.code = 'NOT_FOUND'
    err.publicMessage = 'Call not found'
    throw err
  }
  return call
}

export async function createCall(user, payload, workspaceId) {
  const source = payload.source === 'device_sync' ? 'device_sync' : 'manual'
  let lead = null

  if (payload.leadId) {
    lead = await assertLeadAccess(user, payload.leadId)
  } else if (payload.phoneNumber) {
    // Client may miss a match (its lead index is capped) — re-match here on primary/altPhone.
    lead = await findLeadByPhone(user, payload.phoneNumber)
  } else if (source !== 'device_sync' && !String(payload.phoneNumber || '').trim()) {
    const err = new Error('leadId or phoneNumber is required')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'leadId or phoneNumber is required'
    throw err
  }

  if (payload.deviceCallKey) {
    const existing = await CallLog.findOne({
      where: { deviceCallKey: payload.deviceCallKey, companyId: user.companyId },
    })
    if (existing) return assertCallAccess(user, existing.id) // idempotent re-sync: reinstall / second device
  }

  const call = await CallLog.create({
    leadId: lead?.id || null,
    companyId: user.companyId,
    workspaceId: lead?.workspaceId || workspaceId || null,
    ownerUserId: user.id,
    callType: payload.callType,
    duration: payload.duration,
    outcome: payload.outcome,
    notes: payload.notes,
    recordingUrl: payload.recordingUrl,
    callerName: payload.callerName || null,
    phoneNumber: payload.phoneNumber || lead?.phone || null,
    source,
    deviceCallKey: payload.deviceCallKey || null,
  })
  return assertCallAccess(user, call.id)
}

/**
 * Idempotent batch ingest from the device call log. Per-row results so one bad
 * row never fails the batch — the mobile client re-queues only failed rows.
 */
export async function bulkSyncCalls(user, rows, workspaceId) {
  const results = []
  for (const row of rows) {
    try {
      const call = await createCall(user, { ...row, source: 'device_sync' }, workspaceId)
      results.push({ deviceCallKey: row.deviceCallKey || null, ok: true, id: call.id })
    } catch (err) {
      results.push({
        deviceCallKey: row.deviceCallKey || null,
        ok: false,
        error: err.publicMessage || err.message,
      })
    }
  }
  return {
    synced: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  }
}

export async function getCalls(user, filters = {}) {
  const where = { companyId: user.companyId }

  // Visibility: companyAdmin / workspace_admin / manager see all calls in scope;
  // everyone else sees only calls they own OR calls on leads assigned/owned by them.
  if (!isElevated(user)) {
    const visibleLeadIds = await Lead.findAll({
      where: {
        companyId: user.companyId,
        isDeleted: false,
        [Op.or]: [{ assignedTo: user.id }, { ownerUserId: user.id }],
      },
      attributes: ['id'],
      raw: true,
    }).then((rows) => rows.map((r) => r.id))

    where[Op.or] = [
      { ownerUserId: user.id }, // calls they logged/synced
      ...(visibleLeadIds.length ? [{ leadId: { [Op.in]: visibleLeadIds } }] : []),
    ]
  }

  // Lead association
  if (filters.leadId) where.leadId = filters.leadId
  if (String(filters.hasLead ?? '').toLowerCase() === 'true') where.leadId = { [Op.ne]: null }
  else if (String(filters.hasLead ?? '').toLowerCase() === 'false') where.leadId = null
  if (filters.workspaceId) where.workspaceId = filters.workspaceId

  // Call type and outcome
  if (filters.callType) where.callType = filters.callType
  if (filters.outcome) where.outcome = filters.outcome

  // Date range filtering
  if (filters.dateRange || filters.customDateStart || filters.customDateEnd) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let startDate, endDate

    if (filters.dateRange === 'today') {
      startDate = today
      endDate = new Date(today.getTime() + 86400000)
    } else if (filters.dateRange === 'yesterday') {
      startDate = new Date(today.getTime() - 86400000)
      endDate = today
    } else if (filters.dateRange === 'last7d') {
      startDate = new Date(today.getTime() - 7 * 86400000)
      endDate = new Date(today.getTime() + 86400000)
    } else if (filters.dateRange === 'last30d') {
      startDate = new Date(today.getTime() - 30 * 86400000)
      endDate = new Date(today.getTime() + 86400000)
    } else if (filters.dateRange === 'lastMonth') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate = first
      endDate = today
    } else if (filters.dateRange === 'last6m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      endDate = new Date(today.getTime() + 86400000)
    } else if (filters.dateRange === 'custom') {
      startDate = filters.customDateStart ? new Date(filters.customDateStart) : null
      endDate = filters.customDateEnd ? new Date(filters.customDateEnd) : null
      if (endDate) endDate.setHours(23, 59, 59, 999)
    }

    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [startDate, endDate] }
    }
  }

  // Duration filtering (in seconds)
  const durationMin = filters.durationMin ? parseInt(filters.durationMin) : null
  const durationMax = filters.durationMax ? parseInt(filters.durationMax) : null
  if (durationMin !== null || durationMax !== null) {
    where.duration = {}
    if (durationMin !== null) where.duration[Op.gte] = durationMin
    if (durationMax !== null) where.duration[Op.lte] = durationMax
  }

  // Sorting
  let order = [['createdAt', 'DESC']]
  if (filters.sortBy === 'duration') {
    order = [['duration', filters.sortOrder === 'asc' ? 'ASC' : 'DESC']]
  } else if (filters.sortBy === 'date') {
    order = [['createdAt', filters.sortOrder === 'asc' ? 'ASC' : 'DESC']]
  }

  // Pagination
  const page = Math.max(1, parseInt(filters.page) || 1)
  const limit = Math.max(1, Math.min(1000, parseInt(filters.limit) || 50))
  const offset = (page - 1) * limit

  const { count, rows } = await CallLog.findAndCountAll({
    where,
    include: CALL_INCLUDE,
    order,
    limit,
    offset,
  })

  return {
    data: rows,
    meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  }
}

export async function getCallById(user, id) {
  const call = await assertCallAccess(user, id)
  if (
    !isElevated(user) &&
    call.ownerUserId !== user.id &&
    !(call.lead && (call.lead.assignedTo === user.id || call.lead.ownerUserId === user.id))
  ) {
    throw forbidden('You do not have access to this call')
  }
  return call
}

export async function updateCall(user, id, payload) {
  const call = await assertCallAccess(user, id)
  await call.update(payload)
  return assertCallAccess(user, id)
}

export async function deleteCall(user, id) {
  const call = await assertCallAccess(user, id)
  await call.destroy()
}

/** Turns an orphan (no-lead) call into a Lead or Opportunity, reusing an existing lead with the same phone if one already exists. */
export async function convertCall(user, id, workspaceId, payload = {}) {
  const call = await assertCallAccess(user, id)
  if (call.leadId) {
    const err = new Error('Call is already linked to a lead')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'This call is already linked to a lead'
    throw err
  }

  const phone = String(payload.phone || call.phoneNumber || '').trim()
  if (!phone) {
    const err = new Error('phone is required to convert this call')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'This call has no phone number to convert'
    throw err
  }
  const contactName = payload.contactName || call.callerName || null
  const isOpportunity = payload.type === 'opportunity'

  let lead = await findLeadByPhone(user, phone)
  const created = !lead
  if (!lead) {
    lead = await Lead.create({
      companyId: user.companyId,
      workspaceId: workspaceId || call.workspaceId || null,
      ownerUserId: user.id,
      assignedTo: user.id,
      title: payload.title || contactName || phone,
      contactName,
      phone,
      source: 'call_log',
      status: 'new',
      isOpportunity,
      phoneDigits: phoneDigitsKey(phone) || null,
    })
  }

  call.leadId = lead.id
  if (!call.workspaceId) call.workspaceId = lead.workspaceId
  await call.save()

  // Sweep any other orphan calls from the same number onto this lead too.
  await linkOrphanCallsToLead(lead)

  return { call: await assertCallAccess(user, call.id), lead, created }
}
