import { Activity, CustomField, Lead, OpportunityStage, Tag, Workspace } from '../models/index.js'
import { autoAssignLead } from './assignmentRulesService.js'
import { mapWebFormTypeToCustomFieldType, slugifyCustomFieldKey, upsertLeadCustomFields } from './customFieldService.js'
import { recalculateScore } from './leadScoringService.js'
import { emitLeadWorkflowTriggers } from './workflowRunner.js'

const STRUCTURAL_TYPES = new Set(['heading', 'paragraph', 'divider', 'hidden', 'file'])

function toCustomKey(label, fieldId) {
  return slugifyCustomFieldKey(label || fieldId) || fieldId || 'field'
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
      if (entity === 'custom') mappedCustomFields[key] = raw
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
  if (Object.keys(mappedCustomFields).length) {
    await upsertLeadCustomFields({
      leadId: lead.id,
      workspaceId,
      companyId,
      customFields: mappedCustomFields,
      validateRequired: false,
    })
  }

  // Auto-create custom fields for unmapped form fields
  if (companyId) {
    const mappedFieldIds = new Set(
      (form.fields || []).filter((f) => f.crmField).map((f) => f.id),
    )
    const autoCustomFields = {}
    for (const field of form.fields || []) {
      if (STRUCTURAL_TYPES.has(field.type)) continue
      if (mappedFieldIds.has(field.id)) continue
      const raw = submission?.data?.[field.id]
      if (raw === undefined || raw === null || raw === '') continue
      const key = toCustomKey(field.label, field.id)
      await CustomField.findOrCreate({
        where: { key, workspaceId },
        defaults: {
          key,
          label: field.label || key,
          type: mapWebFormTypeToCustomFieldType(field.type),
          workspaceId,
          companyId,
        },
      })
      autoCustomFields[key] = raw
    }
    if (Object.keys(autoCustomFields).length) {
      await upsertLeadCustomFields({
        leadId: lead.id,
        workspaceId,
        companyId,
        customFields: autoCustomFields,
        validateRequired: false,
      })
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
  // Fire-and-forget: workflow execution must not block the capture response
  emitLeadWorkflowTriggers({
    eventType: 'lead_created',
    lead: typeof lead.get === 'function' ? lead.get({ plain: true }) : lead,
    before: null,
    companyId,
    workspaceId,
    actorUserId: meta.actorUserId || lead.ownerUserId || null,
  }).catch((e) => console.error('[workflow] capture trigger emit failed:', e?.message || e))
  return lead
}
