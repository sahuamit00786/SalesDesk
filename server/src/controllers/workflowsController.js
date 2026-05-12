import Joi from 'joi'
import { Op } from 'sequelize'
import { Workflow, WorkflowVersion, WorkflowRun, WorkflowRunStep, Lead } from '../models/index.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'
import { startWorkflowRun } from '../services/workflowRunner.js'

function assertWorkspace(req, workspaceId) {
  const wid = String(workspaceId || '').trim()
  if (!wid) {
    const err = new Error('workspaceId is required')
    err.status = 400
    err.code = 'VALIDATION'
    throw err
  }
  return wid
}

async function assertWorkspaceAccess(req, workspaceId) {
  const wid = assertWorkspace(req, workspaceId)
  const allowed = await allowedWorkspaceIdsForUser(req.user)
  if (allowed.length && !allowed.includes(wid) && !req.user.isCompanyAdmin) {
    const err = new Error('No access to workspace')
    err.status = 403
    err.code = 'FORBIDDEN'
    throw err
  }
  return wid
}

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
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const rows = await Workflow.findAll({
      where: { workspaceId, companyId: req.user.companyId },
      order: [['updatedAt', 'DESC']],
      limit: 200,
    })
    const ids = rows.map((r) => r.id)
    const lastByWf = new Map()
    if (ids.length) {
      const runs = await WorkflowRun.findAll({
        where: { workflowId: { [Op.in]: ids } },
        order: [['createdAt', 'DESC']],
      })
      for (const r of runs) {
        const wfId = String(r.workflowId)
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
      return { ...p, lastRun }
    })
    return res.json({ success: true, data, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
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
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
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
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
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
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
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

export async function publish(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const row = await Workflow.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } })
    const nextVersion = (row.publishedVersion || 1) + 1
    await WorkflowVersion.create({
      workflowId: row.id,
      version: nextVersion,
      definitionJson: row.definitionJson,
      createdBy: req.user.id,
    })
    await row.update({ publishedVersion: nextVersion })
    await row.reload()
    return res.json({ success: true, data: row.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function testRun(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
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
    const trigger =
      (def.nodes || []).find((n) => n.type === 'triggerLeadCreated') ||
      (def.nodes || []).find((n) => n.type === 'triggerLeadUpdated')
    if (!trigger) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Workflow has no lead trigger node' } })
    }
    const eventType = trigger.type === 'triggerLeadUpdated' ? 'lead_updated' : 'lead_created'
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
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
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
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
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
