import { Activity, CustomField, CustomFieldValue, Lead, OpportunityStage, Tag, Workspace } from '../models/index.js'
import { autoAssignLead } from './assignmentRulesService.js'
import { recalculateScore } from './leadScoringService.js'
import { emitLeadWorkflowTriggers } from './workflowRunner.js'

export async function createLeadFromSubmission(submission, form, workspaceId, companyId, meta = {}) {
  const leadData = {}
  const customFields = {}

  for (const field of form.fields || []) {
    if (!field.crmField) continue
    const value = submission?.data?.[field.id]
    if (!value) continue
    const [entity, key] = String(field.crmField).split('.')
    if (entity === 'lead') leadData[key] = value
    if (entity === 'custom') customFields[key] = value
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
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    })
    const first =
      def ||
      (await OpportunityStage.findOne({
        where: { workspaceId, companyId },
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      }))
    leadData.opportunityStage = first?.name || 'Lead Inbound'
  }

  const lead = await Lead.create(leadData)

  for (const [key, value] of Object.entries(customFields)) {
    const customField = await CustomField.findOne({ where: { key, workspaceId } })
    if (customField) {
      await CustomFieldValue.create({ customFieldId: customField.id, leadId: lead.id, value: String(value) })
    }
  }

  if (Array.isArray(form.autoTags) && form.autoTags.length) {
    const tags = await Tag.findAll({ where: { id: form.autoTags, companyId } })
    if (tags.length) await lead.addTags(tags)
  }

  await Activity.create({
    type: 'system',
    body: `Lead created via web form: ${form.name}`,
    metadata: { formId: form.id, submissionId: submission.id, source: 'web_form' },
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
