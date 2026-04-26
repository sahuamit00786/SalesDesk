import { Op } from 'sequelize'
import { Activity, Lead } from '../models/index.js'
import { recalculateScore } from './leadScoringService.js'

function getFieldValue(submissionData, fields, key) {
  const mapped = fields.find((f) => f.crmField === key)
  if (!mapped) return ''
  return String(submissionData?.[mapped.id] ?? '').trim()
}

export async function checkAndHandleDuplicate(submissionData, form, workspaceId) {
  const email = getFieldValue(submissionData, form.fields || [], 'lead.email').toLowerCase()
  const phone = getFieldValue(submissionData, form.fields || [], 'lead.phone')
  if (!email && !phone) return { isDuplicate: false, existingLead: null }

  const conditions = []
  if (email) conditions.push({ email: { [Op.like]: email } })
  if (phone) conditions.push({ phone })

  const existing = await Lead.findOne({
    where: {
      workspaceId,
      isDeleted: false,
      [Op.or]: conditions,
    },
  })
  if (!existing) return { isDuplicate: false, existingLead: null }

  const updates = {}
  for (const field of form.fields || []) {
    if (!field.crmField?.startsWith('lead.')) continue
    const key = field.crmField.split('.')[1]
    const value = submissionData?.[field.id]
    if (value && !existing[key]) updates[key] = String(value)
  }
  if (Object.keys(updates).length) await existing.update(updates)

  await Activity.create({
    type: 'system',
    body: `Re-submitted web form: ${form.name}. Existing lead updated.`,
    metadata: { formId: form.id, updates },
    leadId: existing.id,
  })
  await recalculateScore(existing.id)
  return { isDuplicate: true, existingLead: existing }
}
