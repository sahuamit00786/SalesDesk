import path from 'node:path'
import { WebForm, WebFormField, WebFormSubmission, LeadFile } from '../models/index.js'

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/ogg',
])
import { getRedis } from '../config/redis.js'
import { checkAndHandleDuplicate } from '../services/duplicateCheckService.js'
import { generateEmbedScript, serializePublicForm } from '../services/embedScriptService.js'
import { createLeadFromSubmission } from '../services/leadCaptureService.js'
import { checkSpam } from '../services/spamProtectionService.js'
import { sendWebFormEmails } from '../services/webFormEmailService.js'

function hostFromUrl(value) {
  if (!value) return ''
  try {
    return new URL(value).host.toLowerCase()
  } catch {
    return ''
  }
}

function isDomainAllowed(originOrReferrer, allowedDomains = []) {
  if (!Array.isArray(allowedDomains) || !allowedDomains.length) return true
  const originHost = hostFromUrl(originOrReferrer)
  if (!originHost) return false
  return allowedDomains.some((allowed) => originHost === String(allowed).toLowerCase())
}

function validateFields(fieldValues, fields, filesByField = {}) {
  const errors = []
  for (const field of fields || []) {
    if (field.type === 'file') {
      const files = filesByField[field.id] || []
      if (field.isRequired && !files.length) {
        errors.push({ fieldId: field.id, message: `${field.label || 'Field'} is required` })
        continue
      }
      const opts = field.options || {}
      if (opts.maxFiles && files.length > opts.maxFiles) {
        errors.push({ fieldId: field.id, message: `Max ${opts.maxFiles} file(s) allowed` })
      }
      if (opts.maxFileSizeMB) {
        const maxBytes = opts.maxFileSizeMB * 1024 * 1024
        for (const f of files) {
          if (f.size > maxBytes) {
            errors.push({ fieldId: field.id, message: `File too large — max ${opts.maxFileSizeMB} MB allowed` })
            break
          }
        }
      }
      continue
    }
    const raw = fieldValues?.[field.id]
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (field.isRequired && !value) {
      errors.push({ fieldId: field.id, message: `${field.label || 'Field'} is required` })
      continue
    }
    if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
      errors.push({ fieldId: field.id, message: `${field.label || 'Field'} must be ${field.maxLength} characters or less` })
    }
  }
  return errors
}

async function findActiveFormByToken(token) {
  return WebForm.findOne({
    where: { publicToken: token, status: 'active' },
    include: [{ model: WebFormField, as: 'fields', required: false }],
    order: [[{ model: WebFormField, as: 'fields' }, 'order', 'ASC']],
  })
}

export async function publicFormSchema(req, res, next) {
  try {
    const { token } = req.params
    const redis = getRedis()
    const cacheKey = `form:schema:public:${token}`
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) return res.json(JSON.parse(cached))
    }
    const form = await findActiveFormByToken(token)
    if (!form) return res.status(404).json({ success: false, error: 'Form not found' })
    const response = { success: true, data: serializePublicForm(form) }
    if (redis) await redis.set(cacheKey, JSON.stringify(response), 'EX', 300)
    return res.json(response)
  } catch (error) {
    return next(error)
  }
}

export async function submitForm(req, res, next) {
  try {
    const { token } = req.params
    const form = await findActiveFormByToken(token)
    if (!form) return res.status(404).json({ success: false, error: 'Form not found' })

    const origin = req.headers.origin || req.headers.referer
    if (!isDomainAllowed(origin, form.allowedDomains)) {
      return res.status(403).json({ success: false, error: 'Domain not allowed' })
    }

    const spamResult = await checkSpam(req, form)
    if (spamResult.isSpam) {
      if (spamResult.reason === 'honeypot') return res.json({ success: true })
      return res.status(429).json({ success: false, error: 'Submission rejected' })
    }

    let fieldValues = req.body?.fieldValues || {}
    if (typeof fieldValues === 'string') {
      try {
        fieldValues = JSON.parse(fieldValues || '{}')
      } catch {
        fieldValues = {}
      }
    }
    // Inject hidden field defaults so they appear in submission data
    for (const f of form.fields || []) {
      if (f.type === 'hidden' && f.defaultValue && fieldValues[f.id] === undefined) {
        fieldValues[f.id] = f.defaultValue
      }
    }
    const filesByField = {}
    for (const f of Array.isArray(req.files) ? req.files : []) {
      if (!filesByField[f.fieldname]) filesByField[f.fieldname] = []
      filesByField[f.fieldname].push(f)
    }

    // Validate MIME types for all uploaded files
    const allUploadedFiles = Array.isArray(req.files) ? req.files : req.file ? [req.file] : []
    for (const f of allUploadedFiles) {
      if (!ALLOWED_UPLOAD_MIME_TYPES.has(f.mimetype)) {
        return res.status(400).json({
          success: false,
          error: { message: `File type "${f.mimetype}" is not allowed. Supported: images, PDF, Word, Excel, CSV, audio, video.` },
        })
      }
    }

    const validationErrors = validateFields(fieldValues, form.fields, filesByField)
    if (validationErrors.length) return res.status(422).json({ success: false, errors: validationErrors })

    const { isDuplicate, existingLead } = await checkAndHandleDuplicate(fieldValues, form, form.workspaceId)
    let lead = existingLead
    if (!isDuplicate) {
      lead = await createLeadFromSubmission(
        { data: fieldValues },
        form,
        form.workspaceId,
        req.user?.companyId || null,
        {
          utmSource: req.body?.utm_source || null,
          landingUrl: req.body?.landing_url || null,
          actorUserId: form.createdBy || null,
        },
      )
    }

    const uploadedFiles = Array.isArray(req.files)
      ? req.files.map((f) => ({
          fieldId: f.fieldname,
          originalName: f.originalname,
          mimeType: f.mimetype,
          sizeBytes: f.size,
          fileUrl: `/uploads/webforms/${path.basename(f.path)}`,
        }))
      : []

    if (lead?.id && uploadedFiles.length) {
      const userId = form.createdBy || lead.assignedTo || lead.ownerUserId
      if (userId) {
        for (const file of uploadedFiles) {
          await LeadFile.create({
            leadId: lead.id,
            userId,
            fileName: file.originalName,
            fileUrl: file.fileUrl,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          })
        }
      }
    }

    await WebFormSubmission.create({
      formId: form.id,
      data: fieldValues,
      leadId: lead?.id || null,
      isDuplicate,
      duplicateLeadId: isDuplicate ? existingLead?.id || null : null,
      spamScore: spamResult.spamScore,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrerUrl: req.body?.referrerUrl || null,
      utmSource: req.body?.utm_source || null,
      utmMedium: req.body?.utm_medium || null,
      utmCampaign: req.body?.utm_campaign || null,
      landingUrl: req.body?.landing_url || null,
      files: uploadedFiles,
      workspaceId: form.workspaceId,
    })
    await form.increment('totalSubmissions')
    await sendWebFormEmails({ form, submissionData: fieldValues, lead })
    return res.json({
      success: true,
      message: form.thankyouMessage,
      redirectUrl: form.thankyouType === 'redirect' ? form.thankyouRedirectUrl : null,
    })
  } catch (error) {
    return next(error)
  }
}

export async function trackView(req, res, next) {
  try {
    const { token } = req.params
    const form = await findActiveFormByToken(token)
    if (!form) return res.status(404).json({ success: false, error: 'Form not found' })
    const redis = getRedis()
    const key = `form:view:${token}:${req.ip}`
    if (!redis) {
      await form.increment('totalViews')
      return res.json({ success: true })
    }
    const isNew = await redis.set(key, '1', 'EX', 1800, 'NX')
    if (isNew) await form.increment('totalViews')
    return res.json({ success: true })
  } catch (error) {
    return next(error)
  }
}

export async function embedScript(req, res, next) {
  try {
    const { token } = req.query
    if (!token) return res.status(400).send('Missing token')
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`
    const script = generateEmbedScript({ apiBaseUrl, token })
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    return res.send(script)
  } catch (error) {
    return next(error)
  }
}

export async function hostedFormPage(req, res, next) {
  try {
    const { token } = req.params
    const form = await findActiveFormByToken(token)
    if (!form) return res.status(404).send('Form not found')
    const safeToken = String(token).replace(/[^a-zA-Z0-9_-]/g, '')
    const scriptUrl = `${req.protocol}://${req.get('host')}/embed/form.js?token=${safeToken}`
    return res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${form.formTitle || form.name || 'Fynlo Form'}</title>
    <style>
      body { margin: 0; padding: 16px; background: #f7f8fc; font-family: "Plus Jakarta Sans", sans-serif; }
      #fynlo-form-${safeToken} { max-width: 760px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="fynlo-form-${safeToken}"></div>
    <script src="${scriptUrl}" async></script>
  </body>
</html>`)
  } catch (error) {
    return next(error)
  }
}
