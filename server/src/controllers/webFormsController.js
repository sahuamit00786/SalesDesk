import { WebForm, WebFormEmailTemplate, WebFormField, WebFormSubmission } from '../models/index.js'
import { generateUniquePublicToken, listWorkspaceForms, replaceFormFields, sanitizeFormInput } from '../services/formBuilderService.js'
import { generateWebFormEmailTemplate } from '../services/openAiService.js'

function requireWorkspace(req) {
  const workspaceId = req.headers['x-workspace-id']
  if (!workspaceId) {
    const err = new Error('Workspace header is required')
    err.status = 400
    throw err
  }
  return workspaceId
}

export async function list(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const items = await listWorkspaceForms(workspaceId, req.query.search || '')
    return res.json({ success: true, data: { items }, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function getOne(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const form = await WebForm.findOne({
      where: { id: req.params.id, workspaceId },
      include: [{ model: WebFormField, as: 'fields', order: [['order', 'ASC']] }],
    })
    if (!form) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Form not found' } })
    const submissions = await WebFormSubmission.findAll({
      where: { formId: form.id },
      order: [['submittedAt', 'DESC']],
    })
    return res.json({ success: true, data: { form, submissions }, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function create(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const payload = sanitizeFormInput(req.body || {})
    if (!payload.name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Name is required' } })

    const form = await WebForm.create({
      ...payload,
      workspaceId,
      createdBy: req.user.id,
      publicToken: await generateUniquePublicToken(),
    })
    await replaceFormFields(form.id, req.body?.fields || [])
    const withFields = await WebForm.findByPk(form.id, { include: [{ model: WebFormField, as: 'fields' }] })
    return res.status(201).json({ success: true, data: withFields, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function update(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const form = await WebForm.findOne({ where: { id: req.params.id, workspaceId } })
    if (!form) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Form not found' } })
    const payload = sanitizeFormInput(req.body || {})
    await form.update(payload)
    if (Array.isArray(req.body?.fields)) {
      await replaceFormFields(form.id, req.body.fields)
    }
    const withFields = await WebForm.findByPk(form.id, { include: [{ model: WebFormField, as: 'fields' }] })
    return res.json({ success: true, data: withFields, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function remove(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const form = await WebForm.findOne({ where: { id: req.params.id, workspaceId } })
    if (!form) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Form not found' } })
    await form.destroy()
    return res.json({ success: true, data: { id: req.params.id }, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function generateEmailTemplate(req, res, next) {
  try {
    const result = await generateWebFormEmailTemplate({
      objective: req.body?.objective || 'confirmation email',
      formName: req.body?.formName || 'Web Form',
    })
    return res.json({ success: true, data: result, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function listEmailTemplates(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const items = await WebFormEmailTemplate.findAll({
      where: { workspaceId },
      order: [['createdAt', 'DESC']],
      limit: 100,
    })
    return res.json({ success: true, data: { items }, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function createEmailTemplate(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const name = String(req.body?.name || '').trim()
    const subject = String(req.body?.subject || '').trim()
    const body = String(req.body?.body || '').trim()
    if (!name || !subject || !body) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'name, subject and body are required' } })
    }
    const row = await WebFormEmailTemplate.create({
      workspaceId,
      createdBy: req.user.id,
      name,
      subject,
      body,
      variables: Array.isArray(req.body?.variables) ? req.body.variables : ['name', 'email', 'form_name', 'submission_date'],
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function updateEmailTemplate(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const row = await WebFormEmailTemplate.findOne({ where: { id: req.params.templateId, workspaceId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } })
    const patch = {}
    if (req.body?.name !== undefined) patch.name = String(req.body.name || '').trim()
    if (req.body?.subject !== undefined) patch.subject = String(req.body.subject || '').trim()
    if (req.body?.body !== undefined) patch.body = String(req.body.body || '').trim()
    if (req.body?.variables !== undefined) patch.variables = Array.isArray(req.body.variables) ? req.body.variables : row.variables
    await row.update(patch)
    return res.json({ success: true, data: row, meta: {} })
  } catch (error) {
    return next(error)
  }
}

export async function deleteEmailTemplate(req, res, next) {
  try {
    const workspaceId = requireWorkspace(req)
    const row = await WebFormEmailTemplate.findOne({ where: { id: req.params.templateId, workspaceId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } })
    await row.destroy()
    return res.json({ success: true, data: { id: req.params.templateId }, meta: {} })
  } catch (error) {
    return next(error)
  }
}
