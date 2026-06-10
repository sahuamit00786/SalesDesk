import { Activity, CustomField, CustomFieldValue, Lead, OpportunityStage, Tag, Workspace } from '../models/index.js'
import { autoAssignLead } from './assignmentRulesService.js'
import { recalculateScore } from './leadScoringService.js'
import { emitLeadWorkflowTriggers } from './workflowRunner.js'

const STRUCTURAL_TYPES = new Set(['heading', 'paragraph', 'divider', 'hidden', 'file'])

function toCustomKey(label, fieldId) {
  const base = (label || fieldId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120)
  return base || fieldId || 'field'
}

function displayValue(raw) {
  if (Array.isArray(raw)) return raw.join(', ')
  return String(raw ?? '')
}

export async function createLeadFromSubmission(submission, form, workspaceId, companyId, meta = {}) {
  const leadData = {}
  const mappedCustomFields = {}
  const submissionFields = []

  for (const field of form.fields || []) {
    if (STRUCTURAL_TYPES.has(field.type)) continue
    const raw = submission?.data?.[field.id]
    const hasValue = raw !== undefined && raw !== null && raw !== ''
    if (!hasValue) continue

    const dv = displayValue(raw)

    if (field.crmField) {
      const [entity, key] = String(field.crmField).split('.')
      if (entity === 'lead') leadData[key] = raw
      if (entity === 'custom') mappedCustomFields[key] = dv
    }

    submissionFields.push({ label: field.label || field.id, value: dv, fieldId: field.id })
  }

  leadData.title = leadData.title || leadData.name || leadData.contactName || 'Web form lead'
  leadData.contactName = leadData.contactName || leadData.name || null
  leadData.status = form.defaultStatus || 'new'
  leadData.source = meta.utmSource || 'web_form'
  leadData.assignedTo = form.defaultAssignedTo || null
  leadData.workspaceId = workspaceId
  if (!companyId) {
    const workspace = await Workspace.findByPk(workspaceId, { attributes: ['companyId'] })
    companyId = workspace?.companyId || null
  }
  leadData.companyId = companyId
  if (meta?.landingUrl && !leadData.notes) {
    leadData.notes = `Landing URL: ${meta.landingUrl}`
  }

  if (workspaceId && companyId && (!leadData.opportunityStage || !String(leadData.opportunityStage).trim())) {
    const def = await OpportunityStage.findOne({
      where: { workspaceId, companyId, isDefault: true },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    })
    const first =
      def ||
      (await OpportunityStage.findOne({
        where: { workspaceId, companyId },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      }))
    leadData.opportunityStage = first?.name || 'Lead Inbound'
  }

  const lead = await Lead.create(leadData)

  // Apply CRM-mapped custom fields (crmField: 'custom.key')
  for (const [key, value] of Object.entries(mappedCustomFields)) {
    const customField = await CustomField.findOne({ where: { key, workspaceId } })
    if (customField) {
      await CustomFieldValue.create({ customFieldId: customField.id, leadId: lead.id, value })
    }
  }

  // Auto-create custom fields for unmapped form fields
  if (companyId) {
    const mappedFieldIds = new Set(
      (form.fields || []).filter((f) => f.crmField).map((f) => f.id),
    )
    for (const field of form.fields || []) {
      if (STRUCTURAL_TYPES.has(field.type)) continue
      if (mappedFieldIds.has(field.id)) continue
      const raw = submission?.data?.[field.id]
      if (raw === undefined || raw === null || raw === '') continue
      const key = toCustomKey(field.label, field.id)
      const [customField] = await CustomField.findOrCreate({
        where: { key, workspaceId },
        defaults: {
          key,
          label: field.label || key,
          type: field.type === 'number' ? 'number' : 'text',
          workspaceId,
          companyId,
        },
      })
      const existing = await CustomFieldValue.findOne({ where: { customFieldId: customField.id, leadId: lead.id } })
      if (!existing) {
        await CustomFieldValue.create({ customFieldId: customField.id, leadId: lead.id, value: displayValue(raw) })
      }
    }
  }

  if (Array.isArray(form.autoTags) && form.autoTags.length) {
    const tags = await Tag.findAll({ where: { id: form.autoTags, companyId } })
    if (tags.length) await lead.addTags(tags)
  }

  await Activity.create({
    type: 'system',
    body: `Web form submission: "${form.name}"`,
    metadata: {
      source: 'web_form',
      formId: form.id,
      formName: form.name,
      fields: submissionFields,
    },
    leadId: lead.id,
  })

  if (form.autoAssign) await autoAssignLead(lead)
  await recalculateScore(lead.id)
  await emitLeadWorkflowTriggers({
    eventType: 'lead_created',
    lead,
    before: null,
    companyId,
    workspaceId,
    actorUserId: meta.actorUserId || lead.ownerUserId || null,
  }).catch(() => {})
  return lead
}
