import { Op } from 'sequelize'
import { CallLog, Lead } from '../models/index.js'

async function assertLeadAccess(user, leadId) {
  const lead = await Lead.findOne({
    where: { id: leadId, companyId: user.companyId, isDeleted: false },
    attributes: ['id'],
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

async function companyLeadIds(user, leadId) {
  if (leadId) {
    await assertLeadAccess(user, leadId)
    return [leadId]
  }
  const rows = await Lead.findAll({
    where: { companyId: user.companyId, isDeleted: false },
    attributes: ['id'],
    raw: true,
  })
  return rows.map((r) => r.id)
}

async function assertCallAccess(user, id) {
  const call = await CallLog.findByPk(id)
  if (!call) {
    const err = new Error('Call not found')
    err.status = 404
    err.code = 'NOT_FOUND'
    err.publicMessage = 'Call not found'
    throw err
  }
  await assertLeadAccess(user, call.leadId)
  return call
}

export async function createCall(user, payload) {
  if (!payload?.leadId) {
    const err = new Error('leadId is required')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'leadId is required'
    throw err
  }
  await assertLeadAccess(user, payload.leadId)
  return CallLog.create({
    ...payload,
    ownerUserId: user.id,
  })
}

export async function getCalls(user, filters = {}) {
  const leadIds = await companyLeadIds(user, filters.leadId)
  if (!leadIds.length) return []
  return CallLog.findAll({
    where: { leadId: { [Op.in]: leadIds } },
    order: [['createdAt', 'DESC']],
  })
}

export async function getCallById(user, id) {
  return assertCallAccess(user, id)
}

export async function updateCall(user, id, payload) {
  const call = await assertCallAccess(user, id)
  await call.update(payload)
  return call
}

export async function deleteCall(user, id) {
  const call = await assertCallAccess(user, id)
  await call.destroy()
}
