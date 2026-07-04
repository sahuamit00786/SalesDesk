import { Op } from 'sequelize'
import { CallLog, Lead, User } from '../models/index.js'

const CALL_INCLUDE = [
  { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName', 'phone', 'isOpportunity'] },
  { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
]

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
  } else if (!String(payload.phoneNumber || '').trim()) {
    const err = new Error('leadId or phoneNumber is required')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'leadId or phoneNumber is required'
    throw err
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
  })
  return assertCallAccess(user, call.id)
}

export async function getCalls(user, filters = {}) {
  const where = { companyId: user.companyId }
  if (filters.leadId) where.leadId = filters.leadId
  if (String(filters.hasLead ?? '').toLowerCase() === 'true') where.leadId = { [Op.ne]: null }
  else if (String(filters.hasLead ?? '').toLowerCase() === 'false') where.leadId = null
  if (filters.workspaceId) where.workspaceId = filters.workspaceId

  return CallLog.findAll({ where, include: CALL_INCLUDE, order: [['createdAt', 'DESC']] })
}

export async function getCallById(user, id) {
  return assertCallAccess(user, id)
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

  let lead = await Lead.findOne({ where: { companyId: user.companyId, phone, isDeleted: false } })
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
    })
  }

  call.leadId = lead.id
  if (!call.workspaceId) call.workspaceId = lead.workspaceId
  await call.save()

  return { call: await assertCallAccess(user, call.id), lead }
}
