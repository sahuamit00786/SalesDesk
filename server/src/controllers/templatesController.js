import { Op } from 'sequelize'
import {
  sequelize,
  EmailSuppression,
  EmailTemplate,
  Lead,
  LeadEmailLog,
} from '../models/index.js'
import {
  createTemplateSchema,
  previewSendSchema,
  sendTemplateSchema,
  updateTemplateSchema,
} from '../validations/emailTemplates.js'
import { enqueueTemplateSendJob, getEmailTemplateQueue, runTemplateSendJobInline } from '../queues/emailTemplateQueue.js'
import { generateLeadEmailTemplate, OpenAiServiceError } from '../services/openAiService.js'

function currentScope(req) {
  return {
    companyId: req.company?.id || req.user?.companyId,
    workspaceId: req.headers['x-workspace-id'],
  }
}

function serializeTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    category: template.category,
    tags: Array.isArray(template.tags) ? template.tags : [],
    attachments: Array.isArray(template.attachments) ? template.attachments : [],
    throttlePerHour: template.throttlePerHour,
    scheduleAt: template.scheduleAt,
    autoUnsubscribeLink: Boolean(template.autoUnsubscribeLink),
    skipIfAlreadySent: Boolean(template.skipIfAlreadySent),
    version: template.version,
    isArchived: Boolean(template.isArchived),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

async function buildPreviewSummary({ template, leadIds, companyId }) {
  const leads = await Lead.findAll({
    where: { companyId, id: leadIds },
    attributes: ['id', 'email'],
  })
  const emailList = leads.map((l) => l.email).filter(Boolean)
  const suppressions = emailList.length
    ? await EmailSuppression.findAll({
        where: {
          companyId,
          [Op.or]: [{ leadId: leadIds }, { email: emailList }],
        },
        attributes: ['leadId', 'email'],
      })
    : []
  const suppressedLeadIds = new Set(
    suppressions.flatMap((s) => (s.leadId ? [s.leadId] : leads.filter((l) => l.email === s.email).map((l) => l.id))),
  )

  const existingLogs = await LeadEmailLog.findAll({
    where: {
      companyId,
      templateId: template.id,
      templateVersion: template.version,
      leadId: leadIds,
    },
    attributes: ['leadId'],
  })
  const sentLeadIds = new Set(existingLogs.map((log) => log.leadId))

  const willSend = []
  const skippedAlreadySent = []
  const skippedUnsubscribed = []

  for (const leadId of leadIds) {
    if (suppressedLeadIds.has(leadId)) {
      skippedUnsubscribed.push(leadId)
      continue
    }
    if (template.skipIfAlreadySent && sentLeadIds.has(leadId)) {
      skippedAlreadySent.push(leadId)
      continue
    }
    willSend.push(leadId)
  }
  return { willSend, skippedAlreadySent, skippedUnsubscribed }
}

export async function createTemplate(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const { value, error } = createTemplateSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ message: error.message })
    const created = await EmailTemplate.create({
      ...value,
      companyId,
      workspaceId,
      createdBy: req.user.id,
      version: 1,
    })
    return res.status(201).json({ data: serializeTemplate(created) })
  } catch (err) {
    return next(err)
  }
}

export async function listTemplates(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const search = String(req.query.search || '').trim()
    const category = String(req.query.category || '').trim()
    const where = { companyId, workspaceId, isArchived: false }
    if (category && category !== 'all') where.category = category
    if (search) {
      where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { subject: { [Op.like]: `%${search}%` } }]
    }

    const templates = await EmailTemplate.findAll({
      where,
      order: [['updatedAt', 'DESC']],
    })
    return res.json({ data: templates.map(serializeTemplate) })
  } catch (err) {
    return next(err)
  }
}

export async function getTemplate(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const template = await EmailTemplate.findOne({
      where: { id: req.params.id, companyId, workspaceId, isArchived: false },
    })
    if (!template) return res.status(404).json({ message: 'Template not found' })
    return res.json({ data: serializeTemplate(template) })
  } catch (err) {
    return next(err)
  }
}

export async function updateTemplate(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const { value, error } = updateTemplateSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ message: error.message })
    const template = await EmailTemplate.findOne({
      where: { id: req.params.id, companyId, workspaceId, isArchived: false },
    })
    if (!template) return res.status(404).json({ message: 'Template not found' })

    const contentChanged =
      (value.subject !== undefined && value.subject !== template.subject) ||
      (value.bodyHtml !== undefined && value.bodyHtml !== template.bodyHtml)

    const updates = { ...value }
    if (contentChanged) updates.version = Number(template.version || 1) + 1
    await template.update(updates)
    return res.json({ data: serializeTemplate(template), contentChanged })
  } catch (err) {
    return next(err)
  }
}

export async function archiveTemplate(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const template = await EmailTemplate.findOne({
      where: { id: req.params.id, companyId, workspaceId, isArchived: false },
    })
    if (!template) return res.status(404).json({ message: 'Template not found' })
    await template.update({ isArchived: true, archivedAt: new Date() })
    return res.json({ success: true })
  } catch (err) {
    return next(err)
  }
}

export async function previewSend(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const { value, error } = previewSendSchema.validate(req.body, { abortEarly: false })
    if (error) return res.status(400).json({ message: error.message })

    const template = await EmailTemplate.findOne({
      where: { id: req.params.id, companyId, workspaceId, isArchived: false },
    })
    if (!template) return res.status(404).json({ message: 'Template not found' })

    const summary = await buildPreviewSummary({
      template,
      leadIds: value.leadIds,
      companyId,
    })
    return res.json({ data: summary })
  } catch (err) {
    return next(err)
  }
}

export async function sendTemplate(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const { value, error } = sendTemplateSchema.validate(req.body, { abortEarly: false })
    if (error) return res.status(400).json({ message: error.message })

    const template = await EmailTemplate.findOne({
      where: { id: req.params.id, companyId, workspaceId, isArchived: false },
    })
    if (!template) return res.status(404).json({ message: 'Template not found' })
    if (!value.confirmed) return res.status(400).json({ message: 'Send confirmation required' })

    const summary = await buildPreviewSummary({
      template,
      leadIds: value.leadIds,
      companyId,
    })
    const payload = {
      templateId: template.id,
      companyId,
      workspaceId,
      leadIds: summary.willSend,
      requestedBy: req.user.id,
      scheduleAt: template.scheduleAt,
      source: 'bulk',
    }

    const q = getEmailTemplateQueue()
    if (q) {
      const job = await enqueueTemplateSendJob(payload)
      return res.json({ data: { jobId: job.id, queued: true, ...summary } })
    }

    // Dev / no-Redis: send immediately (same path as workflow automation fallback)
    const result = await runTemplateSendJobInline(payload)
    return res.json({ data: { jobId: null, queued: false, inline: true, result, ...summary } })
  } catch (err) {
    return next(err)
  }
}

export async function templateSendHistory(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const page = Math.max(Number(req.query.page || 1), 1)
    const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100)
    const offset = (page - 1) * limit
    const where = { companyId, workspaceId, templateId: req.params.id }

    const { rows, count } = await LeadEmailLog.findAndCountAll({
      where,
      include: [{ model: Lead, as: 'lead', attributes: ['id', 'contactName', 'company', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    })
    return res.json({
      data: rows,
      meta: { page, limit, total: count, pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    return next(err)
  }
}

export async function leadEmailHistory(req, res, next) {
  try {
    const { companyId, workspaceId } = currentScope(req)
    const logs = await LeadEmailLog.findAll({
      where: { companyId, workspaceId, leadId: req.params.id },
      include: [{ model: EmailTemplate, as: 'template', attributes: ['id', 'name', 'version'] }],
      order: [['createdAt', 'DESC']],
    })
    return res.json({ data: logs })
  } catch (err) {
    return next(err)
  }
}

export async function getTemplateListWithStats(req, res, next) {
  // helper endpoint used by UI to avoid many round-trips
  try {
    const { companyId, workspaceId } = currentScope(req)
    const templates = await EmailTemplate.findAll({
      where: { companyId, workspaceId, isArchived: false },
      order: [['updatedAt', 'DESC']],
    })
    const templateIds = templates.map((t) => t.id)
    const logs = templateIds.length
      ? await LeadEmailLog.findAll({
          where: { companyId, workspaceId, templateId: templateIds },
          attributes: [
            'templateId',
            'status',
            'bounced',
            'unsubscribed',
            'openedAt',
            'clickedAt',
            'repliedAt',
            'sentAt',
            'leadId',
          ],
        })
      : []

    const metrics = new Map()
    for (const template of templates) {
      metrics.set(template.id, {
        sentCount: 0,
        openedCount: 0,
        clickedCount: 0,
        repliedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
        uniqueLeadCount: 0,
        lastSentAt: null,
      })
    }
    const seenLead = new Map()
    for (const log of logs) {
      const m = metrics.get(log.templateId)
      if (!m) continue
      if (log.sentAt) m.sentCount += 1
      if (log.openedAt) m.openedCount += 1
      if (log.clickedAt) m.clickedCount += 1
      if (log.repliedAt) m.repliedCount += 1
      if (log.bounced) m.bouncedCount += 1
      if (log.unsubscribed) m.unsubscribedCount += 1
      if (!m.lastSentAt || (log.sentAt && new Date(log.sentAt) > new Date(m.lastSentAt))) m.lastSentAt = log.sentAt
      if (!seenLead.has(log.templateId)) seenLead.set(log.templateId, new Set())
      seenLead.get(log.templateId).add(log.leadId)
    }
    for (const [templateId, set] of seenLead.entries()) {
      metrics.get(templateId).uniqueLeadCount = set.size
    }

    const data = templates.map((template) => ({
      ...serializeTemplate(template),
      metrics: metrics.get(template.id),
    }))
    return res.json({ data })
  } catch (err) {
    const sqlMessage = String(err?.parent?.sqlMessage || err?.message || '')
    if (sqlMessage.includes('email_templates') && sqlMessage.includes("doesn't exist")) {
      return res.json({ data: [], meta: { tableMissing: true } })
    }
    return next(err)
  }
}

export async function generateTemplateContent(req, res, next) {
  try {
    const objective = String(req.body?.objective || '').trim()
    const tone = String(req.body?.tone || 'professional').trim()
    const customPrompt = String(req.body?.customPrompt || '').trim()
    if (!objective) {
      return res.status(400).json({ message: 'objective is required' })
    }
    const data = await generateLeadEmailTemplate({ objective, tone, customPrompt })
    return res.json({ data })
  } catch (err) {
    if (err instanceof OpenAiServiceError) {
      return res.status(err.status || 502).json({ message: err.message, code: err.code })
    }
    return next(err)
  }
}
