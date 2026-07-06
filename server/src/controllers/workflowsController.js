import Joi from 'joi'
import { Op } from 'sequelize'
import { Workflow, WorkflowVersion, WorkflowRun, WorkflowRunStep, Lead } from '../models/index.js'
import { startWorkflowRun } from '../services/workflowRunner.js'

const defaultDefinition = () => ({
  nodes: [
    {
      id: 'trigger-1',
      type: 'triggerLeadCreated',
      position: { x: 80, y: 140 },
      data: {},
    },
  ],
  edges: [],
})

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  status: Joi.string().valid('draft', 'active', 'paused').optional(),
}).required()

const patchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  status: Joi.string().valid('draft', 'active', 'paused').optional(),
  definitionJson: Joi.object().unknown(true).optional(),
}).min(1)

const testSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
}).required()

export async function list(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const rows = await Workflow.findAll({
      where: { workspaceId, companyId: req.user.companyId },
      order: [['updatedAt', 'DESC']],
      limit: 200,
    })
    const ids = rows.map((r) => r.id)
    const lastByWf = new Map()
    const countByWf = new Map()
    if (ids.length) {
      const runs = await WorkflowRun.findAll({
        where: { workflowId: { [Op.in]: ids } },
        order: [['createdAt', 'DESC']],
      })
      for (const r of runs) {
        const wfId = String(r.workflowId)
        countByWf.set(wfId, (countByWf.get(wfId) || 0) + 1)
        if (!lastByWf.has(wfId)) {
          const plain = r.get({ plain: true })
          lastByWf.set(wfId, plain)
        }
      }
    }
    const data = rows.map((r) => {
      const p = r.get({ plain: true })
      const lr = lastByWf.get(String(p.id))
      const lastRun = lr
        ? {
            id: lr.id,
            status: lr.status,
            startedAt: lr.startedAt,
            finishedAt: lr.finishedAt,
            triggerType: lr.triggerType,
          }
        : null
      const def = p.definitionJson || {}
      const nodes = Array.isArray(def.nodes) ? def.nodes : []
      const TRIGGER_NODE_TYPES = new Set([
        'triggerLeadCreated',
        'triggerLeadUpdated',
        'triggerCampaignStageChanged',
        'triggerCampaignPaymentReceived',
      ])
      const triggerNode = nodes.find((n) => TRIGGER_NODE_TYPES.has(n.type))
      const TRIGGER_LABELS = {
        triggerLeadCreated: 'Lead created',
        triggerLeadUpdated: 'Lead updated',
        triggerCampaignStageChanged: 'Campaign stage changed',
        triggerCampaignPaymentReceived: 'Campaign payment received',
      }
      const triggerLabel = TRIGGER_LABELS[triggerNode?.type] ?? null
      const stepCount = nodes.filter((n) => !TRIGGER_NODE_TYPES.has(n.type)).length
      return {
        ...p,
        definitionJson: undefined,
        runtimeStateJson: undefined,
        lastRun,
        runCount: countByWf.get(String(p.id)) || 0,
        triggerLabel,
        stepCount,
      }
    })
    return res.json({ success: true, data, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const { error, value } = createSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const row = await Workflow.create({
      workspaceId,
      companyId: req.user.companyId,
      name: value.name.trim(),
      status: value.status || 'draft',
      definitionJson: defaultDefinition(),
      publishedVersion: 1,
      createdBy: req.user.id,
    })
    return res.status(201).json({ success: true, data: row.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const row = await Workflow.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } })
    return res.json({ success: true, data: row.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patch(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const { error, value } = patchSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const row = await Workflow.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } })
    const patchBody = {}
    if (value.name != null) patchBody.name = value.name.trim()
    if (value.status != null) patchBody.status = value.status
    if (value.definitionJson != null) patchBody.definitionJson = value.definitionJson
    await row.update(patchBody)
    await row.reload()
    return res.json({ success: true, data: row.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const row = await Workflow.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } })
    await row.destroy()
    return res.json({ success: true, data: { id: req.params.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

const TRIGGER_NODE_TYPES_FOR_VALIDATION = [
  'triggerLeadCreated',
  'triggerLeadUpdated',
  'triggerCampaignStageChanged',
  'triggerCampaignPaymentReceived',
]

const KNOWN_NODE_TYPES = new Set([
  ...TRIGGER_NODE_TYPES_FOR_VALIDATION,
  'conditionField',
  'delayWait',
  'actionAssignOwner',
  'actionCreateTask',
  'actionCreateFollowup',
  'actionSendEmailTemplate',
])

function validateWorkflowDefinition(def) {
  const nodes = Array.isArray(def?.nodes) ? def.nodes : []
  const edges = Array.isArray(def?.edges) ? def.edges : []
  const errors = []
  const hasTrigger = nodes.some((n) => TRIGGER_NODE_TYPES_FOR_VALIDATION.includes(n.type))
  if (!hasTrigger) errors.push('Workflow must have a trigger node')
  const nodeIds = new Set(nodes.map((n) => n.id))
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) errors.push(`Edge "${edge.id || '?'}" points from a missing node ("${edge.source}")`)
    if (!nodeIds.has(edge.target)) errors.push(`Edge "${edge.id || '?'}" points to a missing node ("${edge.target}")`)
  }
  for (const node of nodes) {
    if (!KNOWN_NODE_TYPES.has(node.type)) {
      errors.push(`Node "${node.id}": unknown type "${node.type}"`)
      continue
    }
    if (node.type === 'actionAssignOwner') {
      const ids = Array.isArray(node.data?.userIds) ? node.data.userIds.filter(Boolean) : []
      const single = String(node.data?.userId || '').trim()
      if (!ids.length && !single) errors.push(`Node "${node.id}": Assign Owner must have at least one user selected`)
    }
    if (node.type === 'actionSendEmailTemplate') {
      if (!String(node.data?.templateId || '').trim()) errors.push(`Node "${node.id}": Send Email must have a template selected`)
    }
    if (node.type === 'conditionField') {
      if (!String(node.data?.field || '').trim()) errors.push(`Node "${node.id}": Condition must have a field selected`)
    }
    if (node.type === 'actionCreateTask') {
      if (!String(node.data?.title || '').trim()) errors.push(`Node "${node.id}": Create Task must have a title`)
    }
  }
  return errors
}

export async function publish(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const row = await Workflow.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } })
    const defErrors = validateWorkflowDefinition(row.definitionJson)
    if (defErrors.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: defErrors[0], details: defErrors } })
    }
    const nextVersion = (row.publishedVersion || 1) + 1
    await WorkflowVersion.create({
      workflowId: row.id,
      version: nextVersion,
      definitionJson: row.definitionJson,
      createdBy: req.user.id,
    })
    await row.update({ publishedVersion: nextVersion, status: 'active' })
    await row.reload()
    return res.json({ success: true, data: row.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function testRun(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const { error, value } = testSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const wf = await Workflow.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!wf) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } })
    const lead = await Lead.findOne({
      where: { id: value.leadId, companyId: req.user.companyId, workspaceId, isDeleted: false },
    })
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const def = wf.definitionJson || {}
    const trigger = (def.nodes || []).find((n) => TRIGGER_NODE_TYPES_FOR_VALIDATION.includes(n.type))
    if (!trigger) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Workflow has no trigger node' } })
    }
    const eventTypeByTriggerNode = {
      triggerLeadCreated: 'lead_created',
      triggerLeadUpdated: 'lead_updated',
      triggerCampaignStageChanged: 'campaign_lead_stage_changed',
      triggerCampaignPaymentReceived: 'campaign_payment_received',
    }
    const eventType = eventTypeByTriggerNode[trigger.type] || 'lead_created'
    await startWorkflowRun({
      workflow: wf,
      triggerNode: trigger,
      eventType,
      lead: lead.get({ plain: true }),
      before: null,
      actorUserId: req.user.id,
    })
    const lastRun = await WorkflowRun.findOne({
      where: { workflowId: wf.id },
      order: [['createdAt', 'DESC']],
    })
    return res.json({ success: true, data: { run: lastRun?.get({ plain: true }) || null }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listRuns(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const wf = await Workflow.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!wf) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } })
    const runs = await WorkflowRun.findAll({
      where: { workflowId: wf.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    })
    return res.json({ success: true, data: runs.map((r) => r.get({ plain: true })), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getRun(req, res, next) {
  try {
    const workspaceId = req.workspaceId
    const run = await WorkflowRun.findOne({
      where: { id: req.params.runId },
      include: [{ model: Workflow, as: 'workflow', where: { companyId: req.user.companyId, workspaceId }, required: true }],
    })
    if (!run) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Run not found' } })
    const steps = await WorkflowRunStep.findAll({
      where: { runId: run.id },
      order: [['createdAt', 'ASC']],
    })
    return res.json({
      success: true,
      data: { ...run.get({ plain: true }), steps: steps.map((s) => s.get({ plain: true })) },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}
