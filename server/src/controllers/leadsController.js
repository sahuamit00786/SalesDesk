import Joi from 'joi'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { getCountries, getCountryCallingCode } from 'libphonenumber-js/min'
import { google } from 'googleapis'
import { sequelize } from '../models/index.js'
import {
  Activity,
  AssignmentRule,
  CustomField,
  CustomFieldValue,
  Lead,
  LeadAssignment,
  LeadFile,
  LeadTask,
  LeadTaskSubtask,
  LeadTaskComment,
  LeadFollowup,
  LeadSource,
  OpportunityStage,
  DealStatus,
  CountryPhoneCode,
  CompanyGoogleToken,
  LeadEmail,
  Reminder,
  SavedView,
  Tag,
  User,
} from '../models/index.js'
import { getRedis } from '../config/redis.js'
import { autoAssignLead } from '../services/assignmentRulesService.js'
import { findDuplicates } from '../services/duplicateDetectionService.js'
import { exportLeads, importLeads } from '../services/importExportService.js'
import { recalculateScore } from '../services/leadScoringService.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'
import {
  maybePromotePendingTaskFromSubtasks,
  promotePendingTasksByDueOrStartMany,
} from '../services/leadTaskAutoStatusService.js'
import { createLeadSystemActivity as createSystemActivity } from '../services/leadSystemActivity.js'
import { emitLeadWorkflowTriggers, emitLeadWorkflowTriggersBulkImport } from '../services/workflowRunner.js'

const LEAD_TASK_TYPES = [
  'call',
  'email',
  'meeting',
  'demo',
  'follow_up',
  'whatsapp',
  'site_visit',
  'internal',
  'document',
  'custom',
  'other',
]

const LEAD_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent']
const LEAD_TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled']

function normalizeLeadTaskType(value) {
  const t = String(value || '').trim()
  return LEAD_TASK_TYPES.includes(t) ? t : 'follow_up'
}

function normalizeLeadTaskStatus(value) {
  const t = String(value || '').trim().toLowerCase()
  if (t === 'open') return 'pending'
  if (LEAD_TASK_STATUSES.includes(t)) return t
  return null
}

function normalizeLeadTaskPriority(value) {
  const t = String(value || '').trim().toLowerCase()
  return LEAD_TASK_PRIORITIES.includes(t) ? t : null
}

function isOverdueTask(row) {
  if (!row) return false
  const status = String(row.status || '').toLowerCase()
  if (!['pending', 'in_progress'].includes(status)) return false
  if (!row.dueAt) return false
  const t = new Date(row.dueAt).getTime()
  if (Number.isNaN(t)) return false
  return t < Date.now()
}

function sanitizeAttachmentsInput(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (!Array.isArray(value)) return null
  const cleaned = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const filename = String(item.filename || item.fileName || '').trim().slice(0, 255)
    const url = String(item.url || item.fileUrl || '').trim().slice(0, 1024)
    if (!filename || !url) continue
    const sizeNum = Number(item.size ?? item.sizeBytes ?? 0)
    cleaned.push({
      filename,
      url,
      size: Number.isFinite(sizeNum) && sizeNum >= 0 ? sizeNum : 0,
    })
  }
  return cleaned
}

function attachmentsArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function attachmentsCountFor(row) {
  return attachmentsArray(row?.attachments).length
}

function commentsCountFor(row) {
  if (Array.isArray(row?.comments)) return row.comments.length
  return null
}

const RECURRENCE_FREQ = ['daily', 'weekly', 'monthly', 'custom']

function sanitizeRecurrenceRule(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'object') return null
  const freq = String(value.freq || '').trim().toLowerCase()
  if (!RECURRENCE_FREQ.includes(freq)) return null
  const intervalNum = Number(value.interval || 1)
  const interval = Number.isFinite(intervalNum) && intervalNum > 0 ? Math.min(Math.floor(intervalNum), 365) : 1
  const out = { freq, interval }
  if (value.until) {
    const u = new Date(value.until)
    if (!Number.isNaN(u.getTime())) out.until = u.toISOString()
  }
  if (Array.isArray(value.byweekday)) {
    const days = value.byweekday
      .map((d) => Number(d))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    if (days.length) out.byweekday = Array.from(new Set(days)).sort((a, b) => a - b)
  }
  return out
}

function describeRecurrence(rule) {
  if (!rule || typeof rule !== 'object') return null
  const freq = rule.freq
  const interval = rule.interval || 1
  if (freq === 'daily') return interval === 1 ? 'Daily' : `Every ${interval} days`
  if (freq === 'weekly') return interval === 1 ? 'Weekly' : `Every ${interval} weeks`
  if (freq === 'monthly') return interval === 1 ? 'Monthly' : `Every ${interval} months`
  if (freq === 'custom') return `Custom (${interval}x)`
  return null
}

function advanceDateByRule(date, rule) {
  if (!date) return null
  const rawDate = new Date(date)
  if (Number.isNaN(rawDate.getTime())) return null
  const interval = rule.interval || 1
  const next = new Date(rawDate.getTime())
  if (rule.freq === 'daily' || rule.freq === 'custom') {
    next.setDate(next.getDate() + interval)
  } else if (rule.freq === 'weekly') {
    if (Array.isArray(rule.byweekday) && rule.byweekday.length) {
      // Find the next byweekday after the current date.
      for (let i = 1; i <= 7 * Math.max(interval, 1); i += 1) {
        const candidate = new Date(rawDate.getTime())
        candidate.setDate(candidate.getDate() + i)
        if (rule.byweekday.includes(candidate.getDay())) {
          return candidate
        }
      }
      next.setDate(next.getDate() + 7 * interval)
    } else {
      next.setDate(next.getDate() + 7 * interval)
    }
  } else if (rule.freq === 'monthly') {
    next.setMonth(next.getMonth() + interval)
  } else {
    return null
  }
  return next
}

async function spawnNextRecurrence(parentTask, actorUserId) {
  if (!parentTask?.recurrenceRule) return null
  const rule = parentTask.recurrenceRule
  const baseDue = parentTask.dueAt ? new Date(parentTask.dueAt) : null
  if (!baseDue) return null
  const nextDue = advanceDateByRule(baseDue, rule)
  if (!nextDue) return null
  if (rule.until) {
    const until = new Date(rule.until)
    if (!Number.isNaN(until.getTime()) && nextDue.getTime() > until.getTime()) return null
  }
  let nextStart = null
  if (parentTask.startAt) {
    const baseStart = new Date(parentTask.startAt)
    if (!Number.isNaN(baseStart.getTime())) {
      nextStart = advanceDateByRule(baseStart, rule)
    }
  }
  const rootParentId = parentTask.recurrenceParentId || parentTask.id
  // Avoid duplicates: don't spawn if a child for this exact dueAt already exists.
  const existing = await LeadTask.findOne({
    where: {
      recurrenceParentId: rootParentId,
      dueAt: nextDue,
    },
  })
  if (existing) return existing
  const child = await LeadTask.create({
    leadId: parentTask.leadId,
    workspaceId: parentTask.workspaceId,
    companyId: parentTask.companyId,
    title: parentTask.title,
    taskType: parentTask.taskType,
    description: parentTask.description,
    startAt: nextStart,
    dueAt: nextDue,
    priority: parentTask.priority,
    status: 'pending',
    createdBy: actorUserId || parentTask.createdBy,
    assignedTo: parentTask.assignedTo,
    recurrenceRule: rule,
    recurrenceParentId: rootParentId,
    attachments: attachmentsArray(parentTask.attachments),
  })
  await createSystemActivity({
    leadId: parentTask.leadId,
    userId: actorUserId || parentTask.createdBy,
    body: `Recurring task spawned for ${nextDue.toISOString()}`,
    metadata: {
      action: 'task_recurrence_spawned',
      taskId: child.id,
      parentTaskId: parentTask.id,
      title: child.title,
      dueAt: nextDue.toISOString(),
    },
  })
  return child
}

function sanitizeReminderInput(item) {
  if (!item || typeof item !== 'object') return null
  const remindAtRaw = item.remindAt || item.remind_at || null
  if (!remindAtRaw) return null
  const remindAt = new Date(remindAtRaw)
  if (Number.isNaN(remindAt.getTime())) return null
  const channelPush = item.channelPush !== undefined ? Boolean(item.channelPush) : true
  const channelEmail = item.channelEmail !== undefined ? Boolean(item.channelEmail) : true
  if (!channelPush && !channelEmail) return null
  return {
    id: item.id ? String(item.id) : null,
    remindAt,
    channelPush,
    channelEmail,
  }
}

async function syncTaskReminders({ task, remindersInput, actorUserId, workspaceId, companyId }) {
  if (remindersInput === undefined) return
  const list = Array.isArray(remindersInput) ? remindersInput.map(sanitizeReminderInput).filter(Boolean) : []
  // Replace strategy: soft-delete all existing task reminders, then recreate.
  await Reminder.destroy({
    where: {
      companyId,
      targetType: 'task',
      targetId: task.id,
    },
  })
  for (const r of list) {
    await Reminder.create({
      companyId,
      workspaceId,
      ownerUserId: task.assignedTo || actorUserId || task.createdBy,
      createdBy: actorUserId || task.createdBy,
      title: task.title,
      notes: task.description || null,
      remindAt: r.remindAt,
      status: 'pending',
      targetType: 'task',
      targetId: task.id,
      channelPush: r.channelPush,
      channelEmail: r.channelEmail,
    })
  }
}

async function replaceLeadTaskSubtasks(leadTaskId, subtasksInput, transaction) {
  await LeadTaskSubtask.destroy({ where: { leadTaskId }, transaction })
  const list = Array.isArray(subtasksInput) ? subtasksInput : []
  const rows = list
    .map((s, i) => ({
      leadTaskId,
      title: String(s?.title || '').trim().slice(0, 500),
      done: Boolean(s?.done),
      position: i,
    }))
    .filter((r) => r.title)
  if (rows.length) await LeadTaskSubtask.bulkCreate(rows, { transaction })
}

const statusValues = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'junk']
const sourceValues = ['web_form', 'manual', 'csv_import', 'api', 'referral', 'campaign', 'linkedin', 'cold_email', 'other']
let hasLeadAssignmentsTableCache = null

async function hasLeadAssignmentsTable() {
  if (hasLeadAssignmentsTableCache !== null) return hasLeadAssignmentsTableCache
  try {
    const [rows] = await sequelize.query("SHOW TABLES LIKE 'lead_assignments'")
    hasLeadAssignmentsTableCache = Array.isArray(rows) && rows.length > 0
    return hasLeadAssignmentsTableCache
  } catch {
    hasLeadAssignmentsTableCache = false
    return false
  }
}

function parseCsvList(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '')
}

function isoToFlagEmoji(iso2) {
  if (!iso2 || String(iso2).length !== 2) return '🌐'
  const codePoints = String(iso2)
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

async function clearLeadListCache(workspaceId) {
  const redis = getRedis()
  if (!redis || !workspaceId) return
  try {
    const key = `leads:list:${workspaceId}:*`
    const keys = await redis.keys(key)
    if (keys.length) await redis.del(...keys)
  } catch {
    // best effort cache invalidation
  }
}

function buildListWhere(query) {
  const where = { isDeleted: false }
  const status = parseCsvList(query.status).filter((v) => statusValues.includes(v))
  const source = parseCsvList(query.source).filter((v) => sourceValues.includes(v))
  const assignedTo = parseCsvList(query.assignedTo)
  const unassignedOnly = ['true', '1', 'yes'].includes(String(query.unassignedOnly ?? '').trim().toLowerCase())
  if (status.length) where.status = { [Op.in]: status }
  if (source.length) where.source = { [Op.in]: source }
  if (unassignedOnly && !assignedTo.length) {
    where.assignedTo = { [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }] }
  } else if (assignedTo.length) {
    where.assignedTo = { [Op.in]: assignedTo }
  }
  const parseNumericQuery = (value) => {
    if (value === undefined || value === null) return null
    const raw = String(value).trim().toLowerCase()
    if (!raw || raw === 'null' || raw === 'undefined') return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }

  const scoreMin = parseNumericQuery(query.scoreMin)
  const scoreMax = parseNumericQuery(query.scoreMax)
  if (scoreMin !== null || scoreMax !== null) {
    where.score = {}
    if (scoreMin !== null) where.score[Op.gte] = scoreMin
    if (scoreMax !== null) where.score[Op.lte] = scoreMax
  }
  const valueMin = parseNumericQuery(query.valueMin)
  const valueMax = parseNumericQuery(query.valueMax)
  if (valueMin !== null || valueMax !== null) {
    where.value = {}
    if (valueMin !== null) where.value[Op.gte] = valueMin
    if (valueMax !== null) where.value[Op.lte] = valueMax
  }
  if (query.search) {
    const q = `%${String(query.search).trim().toLowerCase()}%`
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('Lead.title')), { [Op.like]: q }),
      sqlWhere(fn('LOWER', col('Lead.contact_name')), { [Op.like]: q }),
      sqlWhere(fn('LOWER', col('Lead.company')), { [Op.like]: q }),
      sqlWhere(fn('LOWER', col('Lead.email')), { [Op.like]: q }),
    ]
  }
  const iso = String(query.isOpportunity ?? '').toLowerCase()
  if (iso === 'true' || iso === '1') where.isOpportunity = true
  if (iso === 'false' || iso === '0') where.isOpportunity = false

  const oppStageFilter = parseCsvList(query.stage)
  if (oppStageFilter.length && (iso === 'true' || iso === '1')) {
    if (oppStageFilter.length === 1) where.opportunityStage = oppStageFilter[0]
    else where.opportunityStage = { [Op.in]: oppStageFilter }
  }

  return where
}

function ensureStatusReason(status, reason) {
  if ((status === 'lost' || status === 'junk') && !String(reason || '').trim()) {
    const err = new Error('Validation failed')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'Reason is required when marking lead as Lost or Junk'
    throw err
  }
}

function extractLegacyProfile(notesRaw) {
  try {
    const parsed = JSON.parse(String(notesRaw || '{}'))
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

async function resolveActorDisplayName(userId, emailFallback) {
  const u = await User.findByPk(userId, { attributes: ['name', 'email'] })
  const n = u?.name?.trim()
  if (n) return n
  return u?.email?.trim() || emailFallback || 'Someone'
}

function formatPipelineStageLabelForMessage(value) {
  const text = String(value || '').trim()
  if (!text) return '—'
  return text
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

async function normalizeOpportunityStageOrder(workspaceId, companyId, transaction) {
  const rows = await OpportunityStage.findAll({
    where: { workspaceId, companyId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    transaction,
  })
  for (let i = 0; i < rows.length; i += 1) {
    await rows[i].update({ sortOrder: i, isDefault: i === 0 }, { transaction })
  }
}

async function normalizeOpportunityStageDealStatusFlag(workspaceId, companyId, transaction, preferredId = null) {
  const rows = await OpportunityStage.findAll({
    where: { workspaceId, companyId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    transaction,
  })
  if (!rows.length) return

  let winnerId = preferredId ? String(preferredId) : null
  if (!winnerId) {
    const existing = rows.find((row) => row.isDealStatus)
    winnerId = existing ? String(existing.id) : null
  }
  if (!winnerId) {
    winnerId = String(rows[0].id)
  }

  for (const row of rows) {
    const shouldBeDealStage = winnerId ? String(row.id) === winnerId : false
    if (Boolean(row.isDealStatus) !== shouldBeDealStage) {
      await row.update({ isDealStatus: shouldBeDealStage }, { transaction })
    }
  }
}

async function normalizeDealStatusOrder(workspaceId, companyId, transaction) {
  const rows = await DealStatus.findAll({
    where: { workspaceId, companyId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    transaction,
  })
  for (let i = 0; i < rows.length; i += 1) {
    await rows[i].update({ sortOrder: i, isInitial: i === 0 }, { transaction })
  }
}

async function findCompanyLead(req, id) {
  return Lead.findOne({ where: { id, isDeleted: false, companyId: req.user.companyId } })
}

function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    const err = new Error('Google OAuth is not configured')
    err.status = 500
    err.code = 'GOOGLE_OAUTH_NOT_CONFIGURED'
    throw err
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

function normalizeRecipients(value) {
  if (!value) return []
  const list = Array.isArray(value) ? value : String(value).split(',')
  return list
    .map((x) => String(x || '').trim())
    .filter(Boolean)
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseGoogleOAuthState(rawState) {
  try {
    const decoded = Buffer.from(String(rawState || ''), 'base64url').toString('utf8')
    const state = JSON.parse(decoded)
    if (!state?.companyId || !state?.userId || !state?.t) return null
    const ageMs = Date.now() - Number(state.t)
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 1000 * 60 * 30) return null
    return state
  } catch {
    return null
  }
}

function decodeGmailBase64(data) {
  if (!data) return ''
  const normalized = String(data).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf8')
}

function parseHeader(headers, name) {
  const row = (headers || []).find((h) => String(h?.name || '').toLowerCase() === String(name).toLowerCase())
  return row?.value || ''
}

function parseAddressList(raw) {
  if (!raw) return []
  return String(raw)
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(.*?)<(.+?)>$/)
      if (!m) return { name: chunk, email: chunk.toLowerCase() }
      return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim().toLowerCase() }
    })
}

function normalizeEmail(value) {
  const str = String(value || '').trim().toLowerCase()
  if (!str) return ''
  const m = str.match(/<(.+?)>/)
  return (m ? m[1] : str).trim()
}

function rowBelongsToLeadConversation(row, leadEmail, mailboxEmail) {
  const lead = normalizeEmail(leadEmail)
  const me = normalizeEmail(mailboxEmail)
  if (!lead) return false
  const recipients = [
    ...(Array.isArray(row?.toRecipients) ? row.toRecipients : []),
    ...(Array.isArray(row?.ccRecipients) ? row.ccRecipients : []),
    ...(Array.isArray(row?.bccRecipients) ? row.bccRecipients : []),
  ]
    .map(normalizeEmail)
    .filter(Boolean)

  const hasLead = recipients.includes(lead)
  if (!me) return hasLead
  if (row?.direction === 'outbound') return hasLead
  if (row?.direction === 'inbound') return recipients.includes(me)
  return hasLead && recipients.includes(me)
}

function extractMimePart(payload, mimeType) {
  if (!payload) return null
  if (payload.mimeType === mimeType && payload.body?.data) return payload.body.data
  for (const part of payload.parts || []) {
    const found = extractMimePart(part, mimeType)
    if (found) return found
  }
  return null
}

function extractAttachmentMeta(payload, target = []) {
  if (!payload) return target
  if (payload.filename && payload.body?.attachmentId) {
    target.push({
      id: payload.body.attachmentId,
      fileName: payload.filename,
      mimeType: payload.mimeType || null,
      sizeBytes: payload.body?.size || null,
    })
  }
  for (const part of payload.parts || []) extractAttachmentMeta(part, target)
  return target
}

function parseGmailMessage(detail) {
  const payload = detail?.payload || {}
  const headers = payload.headers || []
  const from = parseAddressList(parseHeader(headers, 'From'))[0] || null
  const to = parseAddressList(parseHeader(headers, 'To'))
  const cc = parseAddressList(parseHeader(headers, 'Cc'))
  const subject = parseHeader(headers, 'Subject') || '(No subject)'
  const dateHeader = parseHeader(headers, 'Date')
  const rawHtml = extractMimePart(payload, 'text/html')
  const rawText = extractMimePart(payload, 'text/plain')
  const bodyHtml = decodeGmailBase64(rawHtml)
  const bodyText = decodeGmailBase64(rawText) || htmlToText(bodyHtml) || detail?.snippet || ''
  const sentAt = dateHeader ? new Date(dateHeader) : detail?.internalDate ? new Date(Number(detail.internalDate)) : new Date()
  return {
    subject,
    from,
    to,
    cc,
    bodyHtml,
    bodyText,
    snippet: detail?.snippet || '',
    sentAt: Number.isNaN(sentAt.getTime()) ? new Date() : sentAt,
    labels: detail?.labelIds || [],
    attachments: extractAttachmentMeta(payload, []),
    threadId: detail?.threadId || null,
    providerMessageId: detail?.id || null,
  }
}

function formatThreadSummary(row, mailboxEmail = '') {
  const isInbound = row.direction === 'inbound'
  const fromRaw = isInbound
    ? (Array.isArray(row.toRecipients) && row.toRecipients.length ? row.toRecipients[0] : row.creator?.email || 'Lead')
    : mailboxEmail || row.creator?.email || 'You'
  const fromName = isInbound ? 'Lead' : 'You'
  const when = row.sentAt || row.createdAt
  return {
    id: row.id,
    threadId: row.threadId || `single:${row.id}`,
    subject: row.subject || '(No subject)',
    snippet: row.bodyText || htmlToText(row.bodyHtml || '') || '',
    messageCount: 1,
    hasAttachments: Array.isArray(row.attachments) && row.attachments.length > 0,
    isUnread: false,
    lastMessageAt: when,
    lastDateFormatted: when ? new Date(when).toLocaleString() : '',
    status: row.status,
    lead: row.lead ? { id: row.lead.id, title: row.lead.title, contactName: row.lead.contactName, email: row.lead.email } : null,
    lastMessage: {
      from: {
        name: fromName,
        email: normalizeEmail(fromRaw) || '',
        initials: fromName.slice(0, 2).toUpperCase(),
      },
    },
  }
}

function mergeThreadRows(rows, mailboxEmail = '') {
  const map = new Map()
  for (const row of rows) {
    const key = row.threadId || `single:${row.id}`
    if (!map.has(key)) {
      map.set(key, {
        ...formatThreadSummary(row, mailboxEmail),
        messageCount: 0,
      })
    }
    const current = map.get(key)
    current.messageCount += 1
    const rowTime = new Date(row.sentAt || row.createdAt).getTime()
    const currentTime = new Date(current.lastMessageAt || 0).getTime()
    if (rowTime >= currentTime) {
      const next = formatThreadSummary(row, mailboxEmail)
      current.lastMessageAt = next.lastMessageAt
      current.lastDateFormatted = next.lastDateFormatted
      current.snippet = next.snippet
      current.status = next.status
      current.lastMessage = next.lastMessage
      current.lead = next.lead
      current.hasAttachments = next.hasAttachments || current.hasAttachments
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
}

function buildRawEmail({ from, to, cc = [], bcc = [], subject, bodyHtml }) {
  const lines = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []),
    ...(bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
    `Subject: ${subject || '(No subject)'}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    bodyHtml || '',
  ]
  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

const emailSendSchema = Joi.object({
  to: Joi.alternatives().try(Joi.array().items(Joi.string().email({ tlds: { allow: false } })), Joi.string()).required(),
  cc: Joi.alternatives().try(Joi.array().items(Joi.string().email({ tlds: { allow: false } })), Joi.string()).optional(),
  bcc: Joi.alternatives().try(Joi.array().items(Joi.string().email({ tlds: { allow: false } })), Joi.string()).optional(),
  subject: Joi.string().allow('', null),
  bodyHtml: Joi.string().allow('', null),
  attachments: Joi.array()
    .items(
      Joi.object({
        fileName: Joi.string().required(),
        fileUrl: Joi.string().allow('', null),
        mimeType: Joi.string().allow('', null),
        sizeBytes: Joi.number().integer().min(0).allow(null),
      }),
    )
    .default([]),
  threadId: Joi.string().allow('', null).optional(),
}).required()

const noteSchema = Joi.object({
  title: Joi.string().trim().allow('', null),
  body: Joi.string().trim().min(1).required(),
}).required()

async function syncRepliesForLead({ lead, tokenRow, userId }) {
  if (!lead?.email || !tokenRow?.refreshToken) return { created: 0 }
  const leadEmail = normalizeEmail(lead.email)
  const mailboxEmail = normalizeEmail(tokenRow.email)
  const oauth2Client = getGoogleOAuthClient()
  oauth2Client.setCredentials({
    access_token: tokenRow.accessToken || undefined,
    refresh_token: tokenRow.refreshToken || undefined,
    expiry_date: tokenRow.expiryDate || undefined,
  })
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const listResp = await gmail.users.messages.list({
    userId: 'me',
    q: `(from:${leadEmail} OR to:${leadEmail} OR cc:${leadEmail})`,
    maxResults: 40,
  })
  const messages = listResp.data.messages || []
  let created = 0
  for (const msg of messages) {
    const exists = await LeadEmail.findOne({
      where: { companyId: lead.companyId, providerMessageId: msg.id || null },
    })
    if (exists) continue
    const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' })
    const parsed = parseGmailMessage(detail.data || {})
    const fromEmail = normalizeEmail(parsed?.from?.email)
    const recipients = [...(parsed.to || []), ...(parsed.cc || [])]
      .map((x) => normalizeEmail(x?.email))
      .filter(Boolean)
    const hasLead = fromEmail === leadEmail || recipients.includes(leadEmail)
    const hasMailbox = mailboxEmail ? fromEmail === mailboxEmail || recipients.includes(mailboxEmail) : true
    if (!hasLead || !hasMailbox) continue
    await LeadEmail.create({
      leadId: lead.id,
      workspaceId: lead.workspaceId,
      companyId: lead.companyId,
      createdBy: userId,
      direction: 'inbound',
      status: 'sent',
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml || parsed.snippet || '',
      bodyText: parsed.bodyText || parsed.snippet || '',
      toRecipients: parsed.to.map((x) => x.email).filter(Boolean),
      ccRecipients: parsed.cc.map((x) => x.email).filter(Boolean),
      bccRecipients: [],
      attachments: parsed.attachments,
      provider: 'google',
      providerMessageId: parsed.providerMessageId,
      threadId: parsed.threadId,
      sentAt: parsed.sentAt,
    })
    created += 1
  }
  return { created }
}

const leadSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  contactName: Joi.string().trim().allow('', null),
  company: Joi.string().trim().allow('', null),
  email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
  phone: Joi.string().trim().max(32).allow('', null),
  phoneCountryCode: Joi.string().trim().max(8).allow('', null),
  altPhone: Joi.string().trim().max(32).allow('', null),
  altPhoneCountryCode: Joi.string().trim().max(8).allow('', null),
  value: Joi.number().min(0).default(0),
  status: Joi.string()
    .valid(...statusValues)
    .default('new'),
  source: Joi.string()
    .valid(...sourceValues)
    .required(),
  sourceId: Joi.string().uuid().allow(null, ''),
  assignedTo: Joi.string().uuid().allow(null, ''),
  assignedUserIds: Joi.array().items(Joi.string().uuid()).default([]),
  closingDate: Joi.date().iso().allow(null, ''),
  notes: Joi.string().allow('', null),
  requirement: Joi.string().allow('', null),
  designation: Joi.string().trim().max(160).allow('', null),
  street: Joi.string().trim().max(255).allow('', null),
  city: Joi.string().trim().max(120).allow('', null),
  state: Joi.string().trim().max(120).allow('', null),
  country: Joi.string().trim().max(120).allow('', null),
  postalCode: Joi.string().trim().max(32).allow('', null),
  profileMeta: Joi.object().allow(null),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  customFields: Joi.object().default({}),
  force: Joi.boolean().default(false),
  isOpportunity: Joi.boolean(),
  opportunityStage: Joi.string().trim().max(80).allow(null, ''),
}).custom((value, helpers) => {
  const phone = normalizePhone(value.phone)
  const altPhone = normalizePhone(value.altPhone)
  const sameCode = String(value.phoneCountryCode || '') === String(value.altPhoneCountryCode || '')
  if (phone && altPhone && sameCode && phone === altPhone) {
    return helpers.error('any.invalid', { message: 'Phone and alternate phone cannot be the same' })
  }
  return value
}, 'Phone/alternate phone uniqueness')

async function resolveInitialOpportunityStageForLead(workspaceId, companyId, requested) {
  const trimmed = requested !== undefined && requested !== null ? String(requested).trim() : ''
  if (trimmed) return trimmed
  const def = await OpportunityStage.findOne({
    where: { workspaceId, companyId, isDefault: true },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  })
  if (def) return def.name
  const first = await OpportunityStage.findOne({
    where: { workspaceId, companyId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  })
  if (first) return first.name
  return 'Lead Inbound'
}

export async function list(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit

    const accessWhere = await leadAccessWhere(req.user)
    const selectedWorkspaceId = req.query.workspaceId || req.headers['x-workspace-id']
    const allowedWorkspaceIds = await allowedWorkspaceIdsForUser(req.user)
    if (selectedWorkspaceId) {
      if (!allowedWorkspaceIds.includes(String(selectedWorkspaceId))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this workspace' },
        })
      }
      accessWhere.workspaceId = String(selectedWorkspaceId)
    } else if (allowedWorkspaceIds.length && !req.user.isCompanyAdmin) {
      accessWhere.workspaceId = allowedWorkspaceIds
    }

    const where = { ...accessWhere, ...buildListWhere(req.query) }

    const sort = [
      'createdAt',
      'updatedAt',
      'title',
      'status',
      'score',
      'value',
      'opportunityStage',
      'assignedTo',
      'source',
      'contactName',
      'company',
    ].includes(req.query.sort)
      ? req.query.sort
      : 'createdAt'
    const order = String(req.query.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const include = [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
      { model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] }, required: false },
    ]
    if (await hasLeadAssignmentsTable()) {
      include.push({ model: User, as: 'assignedUsers', attributes: ['id', 'name', 'email'], through: { attributes: [] }, required: false })
    }

    const { count, rows } = await Lead.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sort, order]],
      include,
    })

    return res.json({
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total: count,
      },
    })
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req, res, next) {
  try {
    const include = [
      { model: Tag, as: 'tags', through: { attributes: [] }, required: false },
      {
        model: Activity,
        as: 'activities',
        required: false,
        separate: true,
        order: [['createdAt', 'DESC']],
        limit: 50,
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
      },
      {
        model: LeadTask,
        as: 'tasks',
        required: false,
        separate: true,
        order: [['dueAt', 'ASC'], ['createdAt', 'DESC']],
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
        ],
      },
      {
        model: CustomFieldValue,
        as: 'customFieldValues',
        include: [{ model: CustomField, as: 'customField', attributes: ['id', 'label', 'key', 'type', 'options'] }],
        required: false,
      },
    ]
    if (await hasLeadAssignmentsTable()) {
      include.unshift({ model: User, as: 'assignedUsers', attributes: ['id', 'name', 'email'], through: { attributes: [] }, required: false })
    }

    const lead = await Lead.findOne({
      where: { id: req.params.id, isDeleted: false, companyId: req.user.companyId },
      include,
    })
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const [openTasks, completedTasks, lastContactAt] = await Promise.all([
      LeadTask.count({ where: { leadId: lead.id, companyId: req.user.companyId, status: 'open' } }),
      LeadTask.count({ where: { leadId: lead.id, companyId: req.user.companyId, status: 'completed' } }),
      Activity.max('createdAt', {
        where: {
          leadId: lead.id,
          type: { [Op.in]: ['call', 'email', 'meeting', 'note'] },
        },
      }),
    ])
    return res.json({ success: true, data: lead, meta: { summary: { openTasks, completedTasks, lastContactAt } } })
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { error, value } = leadSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      const message = error.details?.[0]?.context?.message || error.message
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message } })
    }
    const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })

    const dupes = await findDuplicates(workspaceId, { email: value.email, phone: value.phone })
    if (dupes.length) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_LEAD', message: 'A lead with this phone or email already exists. You cannot create a duplicate.' },
        duplicates: dupes,
        meta: {},
      })
    }

    const legacy = extractLegacyProfile(value.notes)
    const requestedOpp =
      value.opportunityStage !== undefined && value.opportunityStage !== null
        ? String(value.opportunityStage).trim()
        : ''
    const payload = {
      ...value,
      designation: value.designation || legacy.designation || null,
      city: value.city || legacy.city || null,
      state: value.state || legacy.state || null,
      profileMeta: value.profileMeta || null,
      assignedTo: value.assignedTo || null,
      closingDate: value.closingDate || null,
      ownerUserId: req.user.id,
      companyId: req.user.companyId,
      workspaceId,
      isDeleted: false,
    }
    payload.opportunityStage =
      requestedOpp || (await resolveInitialOpportunityStageForLead(String(workspaceId), req.user.companyId, null))
    const lead = await Lead.create(payload)
    if (value.assignedUserIds?.length && (await hasLeadAssignmentsTable())) {
      await LeadAssignment.bulkCreate(
        value.assignedUserIds.map((userId) => ({ leadId: lead.id, userId })),
        { ignoreDuplicates: true },
      )
    }

    if (value.tags?.length) {
      const tags = await Promise.all(
        value.tags.map(async (name) => {
          const existing = await Tag.findOne({ where: { companyId: req.user.companyId, name } })
          if (existing) return existing
          return Tag.create({ name, companyId: req.user.companyId, workspaceId })
        }),
      )
      await lead.setTags(tags)
    }

    await autoAssignLead(lead)
    await createSystemActivity({
      leadId: lead.id,
      userId: req.user.id,
      body: `Lead created (source: ${lead.source})`,
      metadata: { action: 'lead_created' },
    })
    await recalculateScore(lead.id)
    await clearLeadListCache(workspaceId)
    await emitLeadWorkflowTriggers({
      eventType: 'lead_created',
      lead,
      before: null,
      companyId: req.user.companyId,
      workspaceId: String(workspaceId),
      actorUserId: req.user.id,
    }).catch(() => {})
    return res.status(201).json({ success: true, data: lead, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const { error, value } = leadSchema.fork(['title', 'source'], (x) => x.optional()).validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
    })
    if (error) {
      const message = error.details?.[0]?.context?.message || error.message
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message } })
    }

    const dupes = await findDuplicates(lead.workspaceId, { email: value.email, phone: value.phone }, lead.id)
    if (dupes.length) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_LEAD', message: 'A lead with this phone or email already exists. You cannot create a duplicate.' },
        duplicates: dupes,
        meta: {},
      })
    }

    if (value.opportunityStage !== undefined) {
      const trimmed = String(value.opportunityStage ?? '').trim()
      if (trimmed) {
        const stageOk = await OpportunityStage.findOne({
          where: { name: trimmed, workspaceId: lead.workspaceId, companyId: req.user.companyId },
        })
        if (!stageOk) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION', message: 'Invalid pipeline stage for this workspace' },
          })
        }
      }
    }

    const hasTagsField = Object.prototype.hasOwnProperty.call(req.body || {}, 'tags')
    const before = lead.get({ plain: true })
    const legacy = extractLegacyProfile(value.notes || before.notes)
    const payload = {
      ...value,
      designation: value.designation ?? before.designation ?? legacy.designation ?? null,
      city: value.city ?? before.city ?? legacy.city ?? null,
      state: value.state ?? before.state ?? legacy.state ?? null,
    }
    await lead.update(payload)
    await lead.reload()
    const afterStage = lead.opportunityStage || ''
    if (
      value.opportunityStage !== undefined &&
      String(value.opportunityStage || '').trim() &&
      String(before.opportunityStage || '') !== String(afterStage)
    ) {
      const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
      await Activity.create({
        type: 'status_change',
        body: `Pipeline stage changed from ${formatPipelineStageLabelForMessage(before.opportunityStage)} to ${formatPipelineStageLabelForMessage(afterStage)} by ${actorName}`,
        metadata: {
          action: 'opportunity_stage_changed',
          from: before.opportunityStage || '',
          to: afterStage,
          actorUserId: req.user.id,
        },
        leadId: lead.id,
        userId: req.user.id,
      })
    }
    if (value.assignedUserIds && (await hasLeadAssignmentsTable())) {
      await LeadAssignment.destroy({ where: { leadId: lead.id } })
      if (value.assignedUserIds.length) {
        await LeadAssignment.bulkCreate(value.assignedUserIds.map((userId) => ({ leadId: lead.id, userId })))
      }
    }
    if (hasTagsField) {
      const existingTags = await lead.getTags({ attributes: ['name'] })
      const beforeTagNames = [...new Set(existingTags.map((t) => String(t.name || '').trim().toLowerCase()).filter(Boolean))]
      const nextTagNames = Array.isArray(value.tags) ? value.tags : []
      const tags = await Promise.all(
        nextTagNames.map(async (name) => {
          const existing = await Tag.findOne({ where: { companyId: lead.companyId, name } })
          if (existing) return existing
          return Tag.create({ name, companyId: lead.companyId, workspaceId: lead.workspaceId || null })
        }),
      )
      await lead.setTags(tags)
      const afterTagNames = [...new Set(nextTagNames.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean))]
      const added = afterTagNames.filter((tag) => !beforeTagNames.includes(tag))
      if (added.length) {
        const addedDetails = tags
          .filter((t) => added.includes(String(t.name || '').trim().toLowerCase()))
          .map((t) => ({ name: String(t.name || '').trim().toLowerCase(), color: t.color || '#3b73f5' }))
        const detailText = addedDetails.map((t) => `${t.name} (${t.color})`).join(', ')
        await createSystemActivity({
          leadId: lead.id,
          userId: req.user.id,
          body: `Tag added: ${detailText}`,
          metadata: { action: 'lead_tags_added', activityTypeKey: 'tag', added: addedDetails },
        })
      }
    }
    if (before.status !== lead.status) {
      await createSystemActivity({
        leadId: lead.id,
        userId: req.user.id,
        body: `Status changed from ${before.status || 'unknown'} to ${lead.status || 'unknown'}`,
        metadata: { action: 'status_changed', from: before.status, to: lead.status },
      })
    }
    if ((before.assignedTo || null) !== (lead.assignedTo || null)) {
      await createSystemActivity({
        leadId: lead.id,
        userId: req.user.id,
        body: 'Lead owner reassigned',
        metadata: { action: 'owner_reassigned', from: before.assignedTo || null, to: lead.assignedTo || null },
      })
    }
    await recalculateScore(lead.id)
    await clearLeadListCache(lead.workspaceId)
    await emitLeadWorkflowTriggers({
      eventType: 'lead_updated',
      lead,
      before,
      companyId: req.user.companyId,
      workspaceId: String(lead.workspaceId),
      actorUserId: req.user.id,
    }).catch(() => {})
    return res.json({ success: true, data: lead, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function formMeta(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const [sourceCount, opportunityStageCount, dealStatusCount] = await Promise.all([
      LeadSource.count({ where: { workspaceId, companyId: req.user.companyId } }),
      OpportunityStage.count({ where: { workspaceId, companyId: req.user.companyId } }),
      DealStatus.count({ where: { workspaceId, companyId: req.user.companyId } }),
    ])
    if (sourceCount === 0) {
      await LeadSource.bulkCreate([
        { name: 'Web Form', workspaceId, companyId: req.user.companyId },
        { name: 'Manual', workspaceId, companyId: req.user.companyId },
        { name: 'Referral', workspaceId, companyId: req.user.companyId },
      ])
    }
    if (opportunityStageCount === 0) {
      const seedStages = [
        { name: 'open', isDefault: true, isDealStatus: false, sortOrder: 0 },
        { name: 'discovery', sortOrder: 1 },
        { name: 'demo_scheduled', sortOrder: 2 },
        { name: 'demo_completed', sortOrder: 3 },
        { name: 'solution_fit_confirmed', sortOrder: 4 },
        { name: 'proposal_in_progress', sortOrder: 5 },
        { name: 'proposal_sent', isDealStatus: true, sortOrder: 6 },
        { name: 'on_hold', sortOrder: 7 },
      ]
      await OpportunityStage.bulkCreate(
        seedStages.map((s) => ({ ...s, workspaceId, companyId: req.user.companyId })),
      )
    }
    await sequelize.transaction(async (transaction) => {
      await normalizeOpportunityStageOrder(workspaceId, req.user.companyId, transaction)
      await normalizeOpportunityStageDealStatusFlag(workspaceId, req.user.companyId, transaction)
    })
    if (dealStatusCount === 0) {
      await DealStatus.bulkCreate([
        { name: 'qualification', isDealCompleteStatus: false, isInitial: true, sortOrder: 0, workspaceId, companyId: req.user.companyId },
        { name: 'proposal', isDealCompleteStatus: false, isInitial: false, sortOrder: 1, workspaceId, companyId: req.user.companyId },
        { name: 'negotiation', isDealCompleteStatus: false, isInitial: false, sortOrder: 2, workspaceId, companyId: req.user.companyId },
        { name: 'contract_sent', isDealCompleteStatus: false, isInitial: false, sortOrder: 3, workspaceId, companyId: req.user.companyId },
        { name: 'won', isDealCompleteStatus: true, isInitial: false, sortOrder: 4, workspaceId, companyId: req.user.companyId },
        { name: 'lost', isDealCompleteStatus: false, isInitial: false, sortOrder: 5, workspaceId, companyId: req.user.companyId },
      ])
    }
    const phoneCodeCount = await CountryPhoneCode.count()
    if (phoneCodeCount < 180) {
      const existing = await CountryPhoneCode.findAll({ attributes: ['iso2'] })
      const existingIso = new Set(existing.map((x) => String(x.iso2).toUpperCase()))
      const display = new Intl.DisplayNames(['en'], { type: 'region' })
      const payload = getCountries()
        .filter((iso2) => !existingIso.has(String(iso2).toUpperCase()))
        .map((iso2) => {
          let dialCode = null
          try {
            dialCode = `+${getCountryCallingCode(iso2)}`
          } catch {
            dialCode = null
          }
          if (!dialCode) return null
          return {
            countryName: display.of(iso2) || iso2,
            iso2,
            dialCode,
            flagEmoji: isoToFlagEmoji(iso2),
            leadingDigits: iso2 === 'IN' ? '6,7,8,9' : null,
            isDefault: iso2 === 'IN',
            isActive: true,
          }
        })
        .filter(Boolean)
      if (payload.length) {
        await CountryPhoneCode.bulkCreate(payload)
      }
    }

    const [sources, users, phoneCodes, opportunityStages, dealStatuses, tags] = await Promise.all([
      LeadSource.findAll({ where: { workspaceId, companyId: req.user.companyId, isActive: true }, order: [['name', 'ASC']] }),
      User.findAll({ where: { companyId: req.user.companyId, isActive: true }, attributes: ['id', 'name', 'email'], order: [['name', 'ASC']] }),
      CountryPhoneCode.findAll({ where: { isActive: true }, order: [['isDefault', 'DESC'], ['countryName', 'ASC']] }),
      OpportunityStage.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      }),
      DealStatus.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      }),
      Tag.findAll({ where: { companyId: req.user.companyId }, order: [['name', 'ASC'], ['createdAt', 'ASC']] }),
    ])
    return res.json({
      success: true,
      data: { sources, users, phoneCodes, opportunityStages, dealStatuses, tags },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function patchStatus(req, res, next) {
  try {
    const status = req.body?.status
    const lostReason = req.body?.lostReason
    const notes = req.body?.notes
    if (!statusValues.includes(status)) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid status' } })
    ensureStatusReason(status, lostReason)

    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const previousStatus = lead.status
    await lead.update({ status, lostReason: lostReason || null, notes: notes || lead.notes })
    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    await Activity.create({
      type: 'status_change',
      body: `Status changed from ${previousStatus} to ${status} by ${actorName}`,
      metadata: { from: previousStatus, to: status, reason: lostReason || null, actorUserId: req.user.id, action: 'status_changed' },
      leadId: lead.id,
      userId: req.user.id,
    })
    await clearLeadListCache(lead.workspaceId)
    return res.json({ success: true, data: lead, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    await lead.update({ isDeleted: true })
    await lead.destroy()
    await clearLeadListCache(lead.workspaceId)
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function bulk(req, res, next) {
  try {
    const { ids, action, payload = {} } = req.body || {}
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids required' } })
    const leads = await Lead.findAll({ where: { id: { [Op.in]: ids }, isDeleted: false } })
    if (!leads.length) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No leads found' } })
    if (action === 'assign') {
      await Lead.update({ assignedTo: payload.assignedTo || null }, { where: { id: { [Op.in]: ids } } })
      if (Array.isArray(payload.assignedUserIds) && (await hasLeadAssignmentsTable())) {
        await LeadAssignment.destroy({ where: { leadId: { [Op.in]: ids } } })
        if (payload.assignedUserIds.length) {
          const assignmentRows = ids.flatMap((leadId) => payload.assignedUserIds.map((userId) => ({ leadId, userId })))
          await LeadAssignment.bulkCreate(assignmentRows)
        }
      }
    }
    if (action === 'status') await Lead.update({ status: payload.status || 'new' }, { where: { id: { [Op.in]: ids } } })
    if (action === 'delete') await Lead.update({ isDeleted: true }, { where: { id: { [Op.in]: ids } } })
    if (action === 'tag') {
      for (const lead of leads) {
        const tags = await Promise.all(
          (payload.tags || []).map(async (name) => {
            const existing = await Tag.findOne({ where: { companyId: lead.companyId, name } })
            if (existing) return existing
            return Tag.create({ name, companyId: lead.companyId, workspaceId: lead.workspaceId })
          }),
        )
        await lead.addTags(tags)
      }
    }
    if (action === 'export') {
      const rows = await exportLeads(leads[0].workspaceId, {}, ids)
      return res.json({ success: true, data: { rows }, meta: {} })
    }
    await clearLeadListCache(leads[0].workspaceId)
    return res.json({ success: true, data: { updated: leads.length }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

const distributeRoundRobinSchema = Joi.object({
  leadIds: Joi.array().items(Joi.string().uuid()).min(1).max(500).required(),
  userIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
})

/** Assigns unassigned leads to callers in strict round-robin order (userIds[0], userIds[1], …, wrap). */
export async function distributeRoundRobin(req, res, next) {
  try {
    const { error, value } = distributeRoundRobinSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: error.details.map((d) => d.message).join(', ') },
      })
    }
    const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }
    const allowed = await allowedWorkspaceIdsForUser(req.user)
    if (allowed.length && !allowed.includes(String(workspaceId)) && !req.user.isCompanyAdmin) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No access to workspace' } })
    }

    const validUsers = await User.findAll({
      where: {
        id: { [Op.in]: value.userIds },
        companyId: req.user.companyId,
        isActive: true,
      },
      attributes: ['id'],
    })
    const validUserIdSet = new Set(validUsers.map((u) => String(u.id)))
    const orderedUserIds = value.userIds.filter((id) => validUserIdSet.has(String(id)))
    if (!orderedUserIds.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'No valid active callers selected' } })
    }
    if (orderedUserIds.length !== value.userIds.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'One or more selected users are invalid or inactive' },
      })
    }

    const accessWhere = await leadAccessWhere(req.user)
    accessWhere.workspaceId = String(workspaceId)

    const rows = await Lead.findAll({
      where: {
        ...accessWhere,
        id: { [Op.in]: value.leadIds },
        companyId: req.user.companyId,
        isDeleted: false,
        assignedTo: { [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }] },
      },
      attributes: ['id', 'workspaceId', 'assignedTo'],
    })
    const byId = new Map(rows.map((r) => [String(r.id), r]))
    const orderedLeads = []
    for (const id of value.leadIds) {
      const row = byId.get(String(id))
      if (row) orderedLeads.push(row)
    }
    if (!orderedLeads.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'No matching unassigned leads (check selection and permissions)' },
      })
    }

    const hasLA = await hasLeadAssignmentsTable()
    const assignments = await sequelize.transaction(async (transaction) => {
      const out = []
      for (let i = 0; i < orderedLeads.length; i++) {
        const lead = orderedLeads[i]
        const assigneeId = orderedUserIds[i % orderedUserIds.length]
        await lead.update({ assignedTo: assigneeId }, { transaction })
        if (hasLA) {
          await LeadAssignment.destroy({ where: { leadId: lead.id }, transaction })
          await LeadAssignment.create({ leadId: lead.id, userId: assigneeId }, { transaction })
        }
        await Activity.create(
          {
            type: 'system',
            body: 'Lead assigned via round-robin distribution',
            metadata: { action: 'owner_reassigned', from: null, to: assigneeId, via: 'round_robin', actorUserId: req.user.id },
            leadId: lead.id,
            userId: req.user.id,
          },
          { transaction },
        )
        out.push({ leadId: lead.id, assignedTo: assigneeId })
      }
      return out
    })

    await clearLeadListCache(String(workspaceId))
    const skipped = value.leadIds.length - orderedLeads.length
    return res.json({
      success: true,
      data: {
        assigned: orderedLeads.length,
        skipped,
        assignments,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function listActivities(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit
    const { count, rows } = await Activity.findAndCountAll({
      where: { leadId: lead.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    })
    return res.json({ success: true, data: rows, meta: { page, limit, total: count } })
  } catch (e) {
    return next(e)
  }
}

export async function createActivity(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const type = req.body?.type
    if (!['note', 'call', 'email', 'meeting', 'task'].includes(type)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid activity type' } })
    }
    const activity = await Activity.create({
      type,
      body: req.body?.body || '',
      metadata: req.body?.metadata || {},
      leadId: lead.id,
      userId: req.user.id,
    })
    await recalculateScore(lead.id)
    if (type === 'note') {
      await createSystemActivity({
        leadId: lead.id,
        userId: req.user.id,
        body: 'Note added',
        metadata: { action: 'note_added', activityId: activity.id },
      })
    }
    if (type === 'call' || type === 'email') {
      await createSystemActivity({
        leadId: lead.id,
        userId: req.user.id,
        body: `${type === 'call' ? 'Call' : 'Email'} logged`,
        metadata: { action: `${type}_logged`, activityId: activity.id },
      })
    }
    return res.status(201).json({ success: true, data: activity, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchActivity(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const row = await Activity.findOne({ where: { id: req.params.activityId, leadId: lead.id } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Activity not found' } })
    const body = String(req.body?.body || '').trim()
    const metadata = req.body?.metadata ?? row.metadata
    await row.update({ body: body || row.body, metadata })
    if (row.type === 'note') {
      await createSystemActivity({
        leadId: lead.id,
        userId: req.user.id,
        body: 'Note updated',
        metadata: { action: 'note_updated', activityId: row.id },
      })
    }
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteActivity(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const row = await Activity.findOne({ where: { id: req.params.activityId, leadId: lead.id } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Activity not found' } })
    const removedType = row.type
    await row.destroy()
    if (removedType === 'note') {
      await createSystemActivity({
        leadId: lead.id,
        userId: req.user.id,
        body: 'Note deleted',
        metadata: { action: 'note_deleted', activityId: req.params.activityId },
      })
    }
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listNotes(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const rows = await Activity.findAll({
      where: { leadId: lead.id, type: 'note' },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
      order: [['createdAt', 'DESC']],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createNote(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const { error, value } = noteSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    const row = await Activity.create({
      type: 'note',
      body: value.body,
      metadata: { title: value.title || null },
      leadId: lead.id,
      userId: req.user.id,
    })
    await createSystemActivity({
      leadId: lead.id,
      userId: req.user.id,
      body: 'Note added',
      metadata: { action: 'note_added', activityId: row.id, title: value.title || null },
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchNote(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const row = await Activity.findOne({ where: { id: req.params.noteId, leadId: lead.id, type: 'note' } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Note not found' } })
    const { error, value } = noteSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    await row.update({ body: value.body, metadata: { ...(row.metadata || {}), title: value.title || null } })
    await createSystemActivity({
      leadId: lead.id,
      userId: req.user.id,
      body: 'Note updated',
      metadata: { action: 'note_updated', activityId: row.id, title: value.title || null },
    })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteNote(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const row = await Activity.findOne({ where: { id: req.params.noteId, leadId: lead.id, type: 'note' } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Note not found' } })
    await row.destroy()
    await createSystemActivity({
      leadId: lead.id,
      userId: req.user.id,
      body: 'Note deleted',
      metadata: { action: 'note_deleted', activityId: req.params.noteId },
    })
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getGoogleEmailAuthStatus(req, res, next) {
  try {
    const token = await CompanyGoogleToken.findOne({
      where: { companyId: req.user.companyId },
      order: [['updatedAt', 'DESC']],
    })
    return res.json({
      success: true,
      data: {
        connected: Boolean(token?.refreshToken),
        email: token?.email || null,
        updatedAt: token?.updatedAt || null,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function getGoogleEmailConnectUrl(req, res, next) {
  try {
    const oauth2Client = getGoogleOAuthClient()
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ]
    const state = Buffer.from(
      JSON.stringify({ companyId: req.user.companyId, userId: req.user.id, t: Date.now() }),
      'utf8',
    ).toString('base64url')
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
      include_granted_scopes: true,
    })
    return res.json({ success: true, data: { url }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function connectGoogleEmailCallback(req, res, next) {
  try {
    const code = String(req.query.code || '')
    if (!code) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Missing OAuth code' } })
    const state = parseGoogleOAuthState(req.query.state)
    if (!state) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid or expired OAuth state' } })
    }
    const oauth2Client = getGoogleOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' })
    const profile = await oauth2.userinfo.get()
    const email = profile.data?.email || null
    const existing = await CompanyGoogleToken.findOne({ where: { companyId: state.companyId } })
    const payload = {
      companyId: state.companyId,
      userId: state.userId,
      email,
      accessToken: tokens.access_token || existing?.accessToken || null,
      refreshToken: tokens.refresh_token || existing?.refreshToken || null,
      scope: tokens.scope || null,
      tokenType: tokens.token_type || null,
      expiryDate: tokens.expiry_date || null,
    }
    if (existing) await existing.update(payload)
    else await CompanyGoogleToken.create(payload)
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
    const redirectUrl = `${clientOrigin.replace(/\/$/, '')}/integrations?tab=google&connected=1`
    return res.send(`<!doctype html>
<html>
  <body style="font-family:Arial;padding:24px;">
    <h3>Google email connected successfully.</h3>
    <p>Redirecting you back to Integrations...</p>
    <script>
      setTimeout(function () {
        window.location.href = ${JSON.stringify(redirectUrl)}
      }, 800)
    </script>
  </body>
</html>`)
  } catch (e) {
    return next(e)
  }
}

export async function listLeadEmails(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const tokenRow = await CompanyGoogleToken.findOne({ where: { companyId: req.user.companyId } })
    const mailboxEmail = tokenRow?.email || req.user.email || ''
    const rows = await LeadEmail.findAll({
      where: { leadId: lead.id, companyId: req.user.companyId },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }],
      order: [['sentAt', 'DESC'], ['createdAt', 'DESC']],
    })
    const filtered = rows.filter((row) => rowBelongsToLeadConversation(row, lead.email, mailboxEmail))
    return res.json({ success: true, data: filtered, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listLeadEmailThreads(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const tokenRow = await CompanyGoogleToken.findOne({ where: { companyId: req.user.companyId } })
    const mailboxEmail = tokenRow?.email || req.user.email || ''
    const rows = await LeadEmail.findAll({
      where: { leadId: lead.id, companyId: req.user.companyId },
      order: [['sentAt', 'DESC'], ['createdAt', 'DESC']],
    })
    const filteredRows = rows.filter((row) => rowBelongsToLeadConversation(row, lead.email, mailboxEmail))
    const threadsMap = new Map()
    for (const row of filteredRows) {
      const threadKey = row.threadId || `single:${row.id}`
      if (!threadsMap.has(threadKey)) {
        threadsMap.set(threadKey, { threadId: row.threadId || null, subject: row.subject || '(No subject)', lastMessageAt: row.sentAt || row.createdAt, count: 0, preview: row.bodyText || row.bodyHtml || '', status: row.status, messages: [] })
      }
      const current = threadsMap.get(threadKey)
      current.count += 1
      current.messages.push(row)
      if (new Date(row.sentAt || row.createdAt).getTime() > new Date(current.lastMessageAt).getTime()) {
        current.lastMessageAt = row.sentAt || row.createdAt
        current.preview = row.bodyText || row.bodyHtml || ''
        current.status = row.status
      }
    }
    const threads = Array.from(threadsMap.values()).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    return res.json({ success: true, data: threads, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getLeadEmailThread(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const tokenRow = await CompanyGoogleToken.findOne({ where: { companyId: req.user.companyId } })
    const mailboxEmail = tokenRow?.email || req.user.email || ''
    const threadId = req.params.threadId
    const where = threadId.startsWith('single:')
      ? { leadId: lead.id, companyId: req.user.companyId, id: threadId.replace('single:', '') }
      : { leadId: lead.id, companyId: req.user.companyId, threadId }
    const rows = await LeadEmail.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }],
      order: [['sentAt', 'ASC'], ['createdAt', 'ASC']],
    })
    const filtered = rows.filter((row) => rowBelongsToLeadConversation(row, lead.email, mailboxEmail))
    return res.json({ success: true, data: filtered, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function sendLeadEmail(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const { error, value } = emailSendSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })

    const toRecipients = normalizeRecipients(value.to)
    const ccRecipients = normalizeRecipients(value.cc)
    const bccRecipients = normalizeRecipients(value.bcc)
    if (!toRecipients.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'At least one recipient is required' } })
    }

    const tokenRow = await CompanyGoogleToken.findOne({ where: { companyId: req.user.companyId } })
    if (!tokenRow?.refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'GOOGLE_EMAIL_NOT_CONNECTED', message: 'Connect Google email before sending.' },
      })
    }

    const emailRow = await LeadEmail.create({
      leadId: lead.id,
      workspaceId: lead.workspaceId,
      companyId: lead.companyId,
      createdBy: req.user.id,
      direction: 'outbound',
      status: 'queued',
      subject: value.subject || '',
      bodyHtml: value.bodyHtml || '',
      bodyText: htmlToText(value.bodyHtml || ''),
      toRecipients,
      ccRecipients,
      bccRecipients,
      attachments: value.attachments || [],
      provider: 'google',
    })

    try {
      const oauth2Client = getGoogleOAuthClient()
      oauth2Client.setCredentials({
        access_token: tokenRow.accessToken || undefined,
        refresh_token: tokenRow.refreshToken || undefined,
        expiry_date: tokenRow.expiryDate || undefined,
      })
      oauth2Client.on('tokens', async (tokens) => {
        await tokenRow.update({
          accessToken: tokens.access_token || tokenRow.accessToken,
          refreshToken: tokens.refresh_token || tokenRow.refreshToken,
          expiryDate: tokens.expiry_date || tokenRow.expiryDate,
          scope: tokens.scope || tokenRow.scope,
          tokenType: tokens.token_type || tokenRow.tokenType,
        })
      })
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      const fromEmail = tokenRow.email || req.user.email || 'me'
      const attachmentFooter = (value.attachments || []).length
        ? `<hr /><p>Attachments:</p><ul>${value.attachments.map((a) => `<li>${a.fileName}${a.fileUrl ? ` - ${a.fileUrl}` : ''}</li>`).join('')}</ul>`
        : ''
      const raw = buildRawEmail({
        from: fromEmail,
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject: value.subject || '',
        bodyHtml: `${value.bodyHtml || ''}${attachmentFooter}`,
      })
      const requestBody = { raw }
      if (value.threadId) requestBody.threadId = value.threadId
      const sent = await gmail.users.messages.send({ userId: 'me', requestBody })
      await emailRow.update({
        status: 'sent',
        sentAt: new Date(),
        providerMessageId: sent.data.id || null,
        threadId: sent.data.threadId || null,
      })
      await Activity.create({
        type: 'email',
        body: `${value.subject || '(No subject)'} · sent to ${toRecipients.join(', ')}`,
        metadata: {
          action: 'email_sent',
          emailId: emailRow.id,
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: value.subject || '',
          attachments: value.attachments || [],
          providerMessageId: sent.data.id || null,
          threadId: sent.data.threadId || null,
        },
        leadId: lead.id,
        userId: req.user.id,
      })
      return res.status(201).json({ success: true, data: emailRow, meta: {} })
    } catch (sendError) {
      await emailRow.update({ status: 'failed', errorMessage: String(sendError?.message || sendError) })
      return res.status(502).json({
        success: false,
        error: { code: 'EMAIL_SEND_FAILED', message: 'Email could not be sent through Google.' },
      })
    }
  } catch (e) {
    return next(e)
  }
}

export async function syncLeadEmailReplies(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    if (!lead.email) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Lead email is required to sync replies' } })

    const tokenRow = await CompanyGoogleToken.findOne({ where: { companyId: req.user.companyId } })
    if (!tokenRow?.refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'GOOGLE_EMAIL_NOT_CONNECTED', message: 'Connect Google email before syncing replies.' },
      })
    }

    const { created } = await syncRepliesForLead({ lead, tokenRow, userId: req.user.id })
    return res.json({ success: true, data: { created }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listEmailThreads(req, res, next) {
  try {
    const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
    if (!workspaceIds.length) return res.json({ success: true, data: [], meta: { total: 0 } })
    const tokenRow = await CompanyGoogleToken.findOne({ where: { companyId: req.user.companyId } })
    const mailboxEmail = tokenRow?.email || req.user.email || ''
    const search = String(req.query.search || '').trim().toLowerCase()
    const leadId = String(req.query.leadId || '').trim()
    const direction = String(req.query.direction || '').trim().toLowerCase()
    const status = String(req.query.status || '').trim().toLowerCase()
    const unread = String(req.query.unread || '').trim().toLowerCase() === 'true'
    const hasAttachments = String(req.query.hasAttachments || '').trim().toLowerCase() === 'true'
    const from = req.query.from ? new Date(req.query.from) : null
    const to = req.query.to ? new Date(req.query.to) : null
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))

    const leadWhere = {
      companyId: req.user.companyId,
      workspaceId: { [Op.in]: workspaceIds },
      ...(await leadAccessWhere(req.user)),
      isDeleted: false,
    }
    if (leadId) leadWhere.id = leadId

    const rows = await LeadEmail.findAll({
      where: {
        companyId: req.user.companyId,
        workspaceId: { [Op.in]: workspaceIds },
      },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName', 'email'], required: true, where: leadWhere },
      ],
      order: [['sentAt', 'DESC'], ['createdAt', 'DESC']],
      limit: 1500,
    })

    let filtered = rows
    if (direction && ['inbound', 'outbound'].includes(direction)) filtered = filtered.filter((r) => r.direction === direction)
    if (status && ['draft', 'queued', 'sent', 'failed'].includes(status)) filtered = filtered.filter((r) => r.status === status)
    if (hasAttachments) filtered = filtered.filter((r) => Array.isArray(r.attachments) && r.attachments.length > 0)
    if (unread) filtered = []
    if (from && !Number.isNaN(from.getTime())) filtered = filtered.filter((r) => new Date(r.sentAt || r.createdAt).getTime() >= from.getTime())
    if (to && !Number.isNaN(to.getTime())) filtered = filtered.filter((r) => new Date(r.sentAt || r.createdAt).getTime() <= to.getTime())
    if (search) {
      filtered = filtered.filter((r) => {
        const hay = `${r.subject || ''} ${r.bodyText || ''} ${r.bodyHtml || ''} ${r.lead?.title || ''} ${r.lead?.contactName || ''}`.toLowerCase()
        return hay.includes(search)
      })
    }

    const threads = mergeThreadRows(filtered, mailboxEmail)
    const offset = (page - 1) * limit
    const paged = threads.slice(offset, offset + limit)
    return res.json({ success: true, data: paged, meta: { page, limit, total: threads.length } })
  } catch (e) {
    return next(e)
  }
}

export async function getEmailThread(req, res, next) {
  try {
    const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
    if (!workspaceIds.length) return res.json({ success: true, data: [], meta: {} })
    const threadId = String(req.params.threadId || '')
    if (!threadId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'threadId is required' } })
    const where = threadId.startsWith('single:')
      ? { id: threadId.replace('single:', ''), companyId: req.user.companyId, workspaceId: { [Op.in]: workspaceIds } }
      : { threadId, companyId: req.user.companyId, workspaceId: { [Op.in]: workspaceIds } }
    const leadWhere = {
      companyId: req.user.companyId,
      workspaceId: { [Op.in]: workspaceIds },
      ...(await leadAccessWhere(req.user)),
      isDeleted: false,
    }
    const rows = await LeadEmail.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName', 'email'], required: true, where: leadWhere },
      ],
      order: [['sentAt', 'ASC'], ['createdAt', 'ASC']],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function syncEmailReplies(req, res, next) {
  try {
    const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
    if (!workspaceIds.length) return res.json({ success: true, data: { created: 0 }, meta: {} })
    const tokenRow = await CompanyGoogleToken.findOne({ where: { companyId: req.user.companyId } })
    if (!tokenRow?.refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'GOOGLE_EMAIL_NOT_CONNECTED', message: 'Connect Google email before syncing replies.' },
      })
    }
    const leads = await Lead.findAll({
      where: {
        companyId: req.user.companyId,
        workspaceId: { [Op.in]: workspaceIds },
        ...(await leadAccessWhere(req.user)),
        isDeleted: false,
        email: { [Op.ne]: null },
      },
      order: [['updatedAt', 'DESC']],
      limit: 250,
    })
    let created = 0
    for (const lead of leads) {
      try {
        const out = await syncRepliesForLead({ lead, tokenRow, userId: req.user.id })
        created += out.created || 0
      } catch {
        // keep sync resilient
      }
    }
    return res.json({ success: true, data: { created }, meta: { scanned: leads.length } })
  } catch (e) {
    return next(e)
  }
}

export async function uploadEmailAttachments(req, res, next) {
  try {
    const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
    const workspaceId = workspaceIds[0]
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'No accessible workspace found' } })
    const files = Array.isArray(req.files) ? req.files : []
    if (!files.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'No files uploaded' } })
    const root = path.resolve(process.cwd(), 'uploads', 'email')
    const dir = path.join(root, workspaceId)
    await mkdir(dir, { recursive: true })
    const items = []
    for (const file of files) {
      const safeOriginal = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180)
      const storedName = `${Date.now()}_${randomUUID()}_${safeOriginal}`
      await writeFile(path.join(dir, storedName), file.buffer)
      items.push({
        fileName: file.originalname || safeOriginal,
        fileUrl: `/uploads/email/${workspaceId}/${storedName}`,
        mimeType: file.mimetype || null,
        sizeBytes: file.size || 0,
      })
    }
    return res.status(201).json({ success: true, data: items, meta: { count: items.length } })
  } catch (e) {
    return next(e)
  }
}

function decorateTaskRow(row) {
  if (!row) return row
  const json = typeof row.toJSON === 'function' ? row.toJSON() : { ...row }
  json.attachments = attachmentsArray(json.attachments)
  json.attachmentsCount = json.attachments.length
  json.commentsCount = commentsCountFor(json) ?? json.commentsCount ?? 0
  json.isOverdue = isOverdueTask(json)
  json.recurrenceLabel = describeRecurrence(json.recurrenceRule)
  return json
}

export async function listTasks(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const rows = await LeadTask.findAll({
      where: { leadId: lead.id, companyId: req.user.companyId },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
        {
          model: LeadTaskSubtask,
          as: 'subtasks',
          required: false,
          separate: true,
          order: [
            ['position', 'ASC'],
            ['createdAt', 'ASC'],
          ],
        },
        {
          model: LeadTaskComment,
          as: 'comments',
          required: false,
          include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'], required: false }],
          separate: true,
          order: [['createdAt', 'ASC']],
        },
      ],
      order: [['dueAt', 'ASC'], ['createdAt', 'DESC']],
    })
    await promotePendingTasksByDueOrStartMany(rows)
    const taskIds = rows.map((r) => r.id)
    const reminderRows = taskIds.length
      ? await Reminder.findAll({
          where: { companyId: req.user.companyId, targetType: 'task', targetId: { [Op.in]: taskIds } },
          attributes: ['id', 'targetId', 'remindAt', 'channelPush', 'channelEmail', 'status'],
          order: [['remindAt', 'ASC']],
        })
      : []
    const reminderByTask = new Map()
    for (const r of reminderRows) {
      const list = reminderByTask.get(r.targetId) || []
      list.push(r)
      reminderByTask.set(r.targetId, list)
    }
    const decorated = rows.map((row) => {
      const json = decorateTaskRow(row)
      json.reminders = reminderByTask.get(row.id) || []
      return json
    })
    return res.json({ success: true, data: decorated, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listAllTasks(req, res, next) {
  try {
    const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
    if (!workspaceIds.length) return res.json({ success: true, data: [], meta: {} })
    const statusFilters = parseCsvList(req.query.status)
      .map((v) => String(v || '').trim().toLowerCase())
      .map((v) => (v === 'open' ? 'pending' : v))
    const priorityFilters = parseCsvList(req.query.priority).map((v) => String(v || '').trim().toLowerCase())
    const taskTypeFilters = parseCsvList(req.query.taskType).map((v) => String(v || '').trim().toLowerCase())
    const wantsOverdue = statusFilters.includes('overdue')
    const realStatuses = statusFilters.filter((v) => LEAD_TASK_STATUSES.includes(v))
    const q = String(req.query.search || '').trim()
    const horizon = String(req.query.horizon || '').trim().toLowerCase()
    const createdFrom = req.query.createdFrom ? new Date(req.query.createdFrom) : null
    const createdTo = req.query.createdTo ? new Date(req.query.createdTo) : null
    const dueFrom = req.query.dueFrom ? new Date(req.query.dueFrom) : null
    const dueTo = req.query.dueTo ? new Date(req.query.dueTo) : null
    const now = new Date()
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    const endOfTomorrow = new Date(now)
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
    endOfTomorrow.setHours(23, 59, 59, 999)

    const leadWhere = {
      companyId: req.user.companyId,
      workspaceId: { [Op.in]: workspaceIds },
      ...(await leadAccessWhere(req.user)),
      isDeleted: false,
    }
    const taskWhere = {
      companyId: req.user.companyId,
      workspaceId: { [Op.in]: workspaceIds },
    }
    if (realStatuses.length) {
      taskWhere.status = realStatuses.length === 1 ? realStatuses[0] : { [Op.in]: realStatuses }
    } else if (wantsOverdue) {
      taskWhere.status = { [Op.in]: ['pending', 'in_progress'] }
    }
    const validPriorities = priorityFilters.filter((v) => LEAD_TASK_PRIORITIES.includes(v))
    if (validPriorities.length) {
      taskWhere.priority = validPriorities.length === 1 ? validPriorities[0] : { [Op.in]: validPriorities }
    }
    const validTaskTypes = taskTypeFilters.filter((v) => LEAD_TASK_TYPES.includes(v))
    if (validTaskTypes.length) {
      taskWhere.taskType = validTaskTypes.length === 1 ? validTaskTypes[0] : { [Op.in]: validTaskTypes }
    }
    const assignedToParam = req.query.assignedTo ? String(req.query.assignedTo).trim() : ''
    if (/^[0-9a-fA-F-]{36}$/.test(assignedToParam)) taskWhere.assignedTo = assignedToParam
    if (horizon === 'today') {
      taskWhere.dueAt = { [Op.ne]: null, [Op.lte]: endOfToday }
    } else if (horizon === 'upcoming') {
      taskWhere.dueAt = { [Op.ne]: null, [Op.gt]: endOfTomorrow }
    }
    if (wantsOverdue) {
      taskWhere.dueAt = { ...(taskWhere.dueAt || {}), [Op.ne]: null, [Op.lt]: now }
    }
    if ((createdFrom && !Number.isNaN(createdFrom.getTime())) || (createdTo && !Number.isNaN(createdTo.getTime()))) {
      taskWhere.createdAt = {}
      if (createdFrom && !Number.isNaN(createdFrom.getTime())) taskWhere.createdAt[Op.gte] = createdFrom
      if (createdTo && !Number.isNaN(createdTo.getTime())) taskWhere.createdAt[Op.lte] = createdTo
    }
    if ((dueFrom && !Number.isNaN(dueFrom.getTime())) || (dueTo && !Number.isNaN(dueTo.getTime()))) {
      taskWhere.dueAt = { ...(taskWhere.dueAt || {}), [Op.ne]: null }
      if (dueFrom && !Number.isNaN(dueFrom.getTime())) taskWhere.dueAt[Op.gte] = dueFrom
      if (dueTo && !Number.isNaN(dueTo.getTime())) taskWhere.dueAt[Op.lte] = dueTo
    }

    const rows = await LeadTask.findAll({
      where: taskWhere,
      include: [
        { model: Lead, as: 'lead', required: true, where: leadWhere, attributes: ['id', 'title', 'contactName', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
        {
          model: LeadTaskSubtask,
          as: 'subtasks',
          required: false,
          separate: true,
          order: [
            ['position', 'ASC'],
            ['createdAt', 'ASC'],
          ],
        },
      ],
      order: [['dueAt', 'ASC'], ['createdAt', 'DESC']],
    })

    const filtered = q
      ? rows.filter((row) => {
          const hay = `${row.title || ''} ${row.description || ''} ${row.lead?.title || ''} ${row.assignee?.name || ''} ${row.creator?.name || ''}`.toLowerCase()
          return hay.includes(q.toLowerCase())
        })
      : rows

    await promotePendingTasksByDueOrStartMany(filtered)
    const decorated = filtered.map((row) => decorateTaskRow(row))
    return res.json({ success: true, data: decorated, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createTask(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const title = String(req.body?.title || '').trim()
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Task title is required' } })

    const status = normalizeLeadTaskStatus(req.body?.status) || 'pending'
    const priority = normalizeLeadTaskPriority(req.body?.priority) || 'medium'
    const recurrenceRule = sanitizeRecurrenceRule(req.body?.recurrenceRule)
    const attachments = sanitizeAttachmentsInput(req.body?.attachments)

    const row = await LeadTask.create({
      leadId: lead.id,
      workspaceId: lead.workspaceId,
      companyId: lead.companyId,
      title,
      taskType: normalizeLeadTaskType(req.body?.taskType),
      description: req.body?.description || null,
      startAt: req.body?.startAt ? new Date(req.body.startAt) : null,
      dueAt: req.body?.dueAt ? new Date(req.body.dueAt) : null,
      priority,
      status,
      completedAt: status === 'completed' ? new Date() : null,
      createdBy: req.user.id,
      assignedTo: req.body?.assignedTo || null,
      recurrenceRule: recurrenceRule === undefined ? null : recurrenceRule,
      attachments: attachments === undefined ? [] : attachments || [],
    })
    await replaceLeadTaskSubtasks(row.id, req.body?.subtasks)
    await maybePromotePendingTaskFromSubtasks(row)
    await row.reload()
    await syncTaskReminders({
      task: row,
      remindersInput: req.body?.reminders,
      actorUserId: req.user.id,
      workspaceId: lead.workspaceId,
      companyId: lead.companyId,
    })
    await createSystemActivity({
      leadId: lead.id,
      userId: req.user.id,
      body: 'Task created',
      metadata: { action: 'task_created', taskId: row.id, title: row.title },
    })
    return res.status(201).json({ success: true, data: decorateTaskRow(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchTask(req, res, next) {
  try {
    const row = await LeadTask.findOne({
      where: { id: req.params.taskId, leadId: req.params.id, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })
    const before = {
      status: row.status,
      priority: row.priority,
      assignedTo: row.assignedTo,
      dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
      attachmentsCount: attachmentsCountFor(row),
    }
    const payload = {}
    if ('title' in req.body) {
      const nextTitle = String(req.body.title || '').trim()
      if (!nextTitle) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Task title is required' } })
      payload.title = nextTitle
    }
    if ('taskType' in req.body) payload.taskType = normalizeLeadTaskType(req.body.taskType)
    if ('description' in req.body) payload.description = req.body.description || null
    if ('startAt' in req.body) payload.startAt = req.body.startAt ? new Date(req.body.startAt) : null
    if ('dueAt' in req.body) payload.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null
    if ('priority' in req.body) {
      const p = normalizeLeadTaskPriority(req.body.priority)
      if (p) payload.priority = p
    }
    if ('status' in req.body) {
      const s = normalizeLeadTaskStatus(req.body.status)
      if (s) {
        payload.status = s
        payload.completedAt = s === 'completed' ? new Date() : null
        // Manual Pending = do not auto-move to in_progress when overdue; any other status re-enables time-based auto.
        if (s === 'pending') payload.skipTimeAutoInProgress = true
        else payload.skipTimeAutoInProgress = false
      }
    }
    if ('assignedTo' in req.body) payload.assignedTo = req.body.assignedTo || null
    if ('recurrenceRule' in req.body) {
      const sanitized = sanitizeRecurrenceRule(req.body.recurrenceRule)
      payload.recurrenceRule = sanitized === undefined ? null : sanitized
    }
    if ('attachments' in req.body) {
      const sanitized = sanitizeAttachmentsInput(req.body.attachments)
      payload.attachments = sanitized === undefined ? [] : sanitized || []
    }
    if (Object.keys(payload).length) await row.update(payload)
    if ('subtasks' in req.body) {
      await replaceLeadTaskSubtasks(row.id, req.body.subtasks)
      await maybePromotePendingTaskFromSubtasks(row)
    }
    await row.reload()
    if ('reminders' in req.body) {
      await syncTaskReminders({
        task: row,
        remindersInput: req.body.reminders,
        actorUserId: req.user.id,
        workspaceId: row.workspaceId,
        companyId: row.companyId,
      })
    }

    const after = {
      status: row.status,
      priority: row.priority,
      assignedTo: row.assignedTo,
      dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
      attachmentsCount: attachmentsCountFor(row),
    }
    if (before.status !== after.status) {
      await createSystemActivity({
        leadId: row.leadId,
        userId: req.user.id,
        body: after.status === 'completed' ? 'Task completed' : `Task status: ${after.status}`,
        metadata: {
          action: after.status === 'completed' ? 'task_completed' : 'task_status_changed',
          taskId: row.id,
          title: row.title,
          fromStatus: before.status,
          toStatus: after.status,
        },
      })
      if (after.status === 'completed') {
        try {
          await spawnNextRecurrence(row, req.user.id)
        } catch {
          // recurrence spawn is best-effort; don't fail the patch
        }
      }
    }
    if (before.priority !== after.priority) {
      await createSystemActivity({
        leadId: row.leadId,
        userId: req.user.id,
        body: `Priority changed to ${after.priority}`,
        metadata: { action: 'task_priority_changed', taskId: row.id, fromPriority: before.priority, toPriority: after.priority },
      })
    }
    if (before.assignedTo !== after.assignedTo) {
      await createSystemActivity({
        leadId: row.leadId,
        userId: req.user.id,
        body: after.assignedTo ? 'Task reassigned' : 'Task unassigned',
        metadata: { action: 'task_assigned', taskId: row.id, fromUserId: before.assignedTo, toUserId: after.assignedTo },
      })
    }
    if (before.dueAt !== after.dueAt) {
      await createSystemActivity({
        leadId: row.leadId,
        userId: req.user.id,
        body: 'Due date updated',
        metadata: { action: 'task_due_changed', taskId: row.id, fromDueAt: before.dueAt, toDueAt: after.dueAt },
      })
    }
    if (before.attachmentsCount !== after.attachmentsCount) {
      const added = after.attachmentsCount > before.attachmentsCount
      await createSystemActivity({
        leadId: row.leadId,
        userId: req.user.id,
        body: added ? 'Attachment added to task' : 'Attachment removed from task',
        metadata: {
          action: added ? 'task_attachment_added' : 'task_attachment_removed',
          taskId: row.id,
          fromCount: before.attachmentsCount,
          toCount: after.attachmentsCount,
        },
      })
    }
    return res.json({ success: true, data: decorateTaskRow(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteTask(req, res, next) {
  try {
    const row = await LeadTask.findOne({
      where: { id: req.params.taskId, leadId: req.params.id, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })
    await Reminder.destroy({
      where: { companyId: row.companyId, targetType: 'task', targetId: row.id },
    })
    await row.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listFollowups(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const rowsRaw = await LeadFollowup.findAll({
      where: { leadId: lead.id, companyId: req.user.companyId },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }],
      order: [['scheduledAt', 'ASC']],
    })
    const statusRank = { pending: 0, done: 1, cancelled: 2 }
    const rows = [...rowsRaw].sort((a, b) => {
      const d = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9)
      if (d !== 0) return d
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createFollowup(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const scheduledRaw = req.body?.scheduledAt
    const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : null
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'scheduledAt is required' } })
    }
    const now = Date.now()
    if (scheduledAt.getTime() <= now) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Follow-up time must be after the current time' },
      })
    }
    const qpm = req.body?.quickPickMinutes
    const quickPickMinutes = [5, 10, 15].includes(Number(qpm)) ? Number(qpm) : null
    const remark = req.body?.remark != null ? String(req.body.remark).trim().slice(0, 8000) : null
    const row = await LeadFollowup.create({
      leadId: lead.id,
      workspaceId: lead.workspaceId,
      companyId: lead.companyId,
      scheduledAt,
      remark: remark || null,
      quickPickMinutes,
      status: 'pending',
      createdBy: req.user.id,
    })
    const full = await LeadFollowup.findByPk(row.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }],
    })
    await createSystemActivity({
      leadId: lead.id,
      userId: req.user.id,
      body: `Follow-up scheduled for ${scheduledAt.toISOString()}`,
      metadata: { action: 'followup_created', followupId: row.id, scheduledAt: scheduledAt.toISOString() },
    })
    return res.status(201).json({ success: true, data: full, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchFollowup(req, res, next) {
  try {
    const row = await LeadFollowup.findOne({
      where: { id: req.params.followupId, leadId: req.params.id, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Follow-up not found' } })
    const payload = {}
    if ('remark' in req.body) payload.remark = req.body.remark != null ? String(req.body.remark).trim().slice(0, 8000) : null
    if ('scheduledAt' in req.body) {
      const nextAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null
      if (!nextAt || Number.isNaN(nextAt.getTime())) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'scheduledAt is invalid' } })
      }
      if (nextAt.getTime() <= Date.now()) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'Follow-up time must be after the current time' },
        })
      }
      payload.scheduledAt = nextAt
    }
    if ('status' in req.body && ['pending', 'done', 'cancelled'].includes(req.body.status)) {
      payload.status = req.body.status
      payload.completedAt = req.body.status === 'pending' ? null : new Date()
    }
    await row.update(payload)
    const full = await LeadFollowup.findByPk(row.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false }],
    })
    return res.json({ success: true, data: full, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteFollowup(req, res, next) {
  try {
    const row = await LeadFollowup.findOne({
      where: { id: req.params.followupId, leadId: req.params.id, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Follow-up not found' } })
    await row.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function addTaskComment(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const task = await LeadTask.findOne({
      where: { id: req.params.taskId, leadId: lead.id, companyId: req.user.companyId },
    })
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })
    const body = String(req.body?.body || '').trim()
    if (!body) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Comment cannot be empty' } })
    const isInternal = Boolean(req.body?.isInternal)
    const row = await LeadTaskComment.create({
      leadTaskId: task.id,
      userId: req.user.id,
      body: body.slice(0, 8000),
      isInternal,
    })
    const full = await LeadTaskComment.findByPk(row.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'], required: false }],
    })
    return res.status(201).json({ success: true, data: full, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getTaskTimeline(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const task = await LeadTask.findOne({
      where: { id: req.params.taskId, leadId: lead.id, companyId: req.user.companyId },
    })
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })

    const comments = await LeadTaskComment.findAll({
      where: { leadTaskId: task.id },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'], required: false }],
      order: [['createdAt', 'ASC']],
    })

    const activities = await Activity.findAll({
      where: {
        leadId: lead.id,
        type: 'system',
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
      order: [['createdAt', 'ASC']],
    })
    const taskActivities = activities.filter((a) => {
      const meta = a.metadata || {}
      return meta && (meta.taskId === task.id || meta.parentTaskId === task.id)
    })

    const items = []
    for (const c of comments) {
      items.push({
        id: c.id,
        kind: c.isInternal ? 'note' : 'comment',
        createdAt: c.createdAt,
        body: c.body,
        author: c.author ? { id: c.author.id, name: c.author.name, email: c.author.email } : null,
        isInternal: Boolean(c.isInternal),
      })
    }
    for (const a of taskActivities) {
      items.push({
        id: a.id,
        kind: 'event',
        createdAt: a.createdAt,
        body: a.body,
        author: a.user ? { id: a.user.id, name: a.user.name, email: a.user.email } : null,
        action: a.metadata?.action || null,
        metadata: a.metadata || null,
      })
    }
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return res.json({ success: true, data: items, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listFiles(req, res, next) {
  try {
    const rows = await LeadFile.findAll({ where: { leadId: req.params.id }, order: [['createdAt', 'DESC']] })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createFile(req, res, next) {
  try {
    const row = await LeadFile.create({
      leadId: req.params.id,
      userId: req.user.id,
      fileName: req.body?.fileName || 'attachment',
      fileUrl: req.body?.fileUrl || '',
      mimeType: req.body?.mimeType || null,
      sizeBytes: req.body?.sizeBytes || null,
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function runEmailAutoSyncJob() {
  const tokens = await CompanyGoogleToken.findAll({
    where: {
      refreshToken: { [Op.ne]: null },
    },
    order: [['updatedAt', 'DESC']],
    limit: 50,
  })
  for (const token of tokens) {
    const lead = await Lead.findOne({
      where: {
        companyId: token.companyId,
        isDeleted: false,
        email: { [Op.ne]: null },
      },
      order: [['updatedAt', 'DESC']],
    })
    if (!lead) continue
    try {
      await syncRepliesForLead({ lead, tokenRow: token, userId: token.userId })
    } catch {
      // keep job resilient; individual company sync failures are best-effort
    }
  }
}

export async function sourceAnalytics(req, res, next) {
  try {
    const selectedWorkspaceId = req.query.workspaceId || req.headers['x-workspace-id']
    const rows = await Lead.findAll({
      attributes: ['source', [fn('COUNT', col('id')), 'count']],
      where: { workspaceId: selectedWorkspaceId, isDeleted: false },
      group: ['source'],
    })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listSavedViews(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const rows = await SavedView.findAll({ where: { workspaceId, userId: req.user.id }, order: [['createdAt', 'ASC']] })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createSavedView(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await SavedView.create({
      name: req.body?.name || 'Untitled View',
      filters: req.body?.filters || {},
      isDefault: Boolean(req.body?.isDefault),
      userId: req.user.id,
      workspaceId,
      companyId: req.user.companyId,
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteSavedView(req, res, next) {
  try {
    await SavedView.destroy({ where: { id: req.params.id, userId: req.user.id } })
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listAssignmentRules(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const rows = await AssignmentRule.findAll({ where: { workspaceId }, order: [['priority', 'ASC']] })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createAssignmentRule(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await AssignmentRule.create({
      name: req.body?.name || 'Untitled Rule',
      type: 'round_robin',
      conditions: req.body?.conditions || {},
      assignees: req.body?.assignees || [],
      isActive: req.body?.isActive !== false,
      priority: Number(req.body?.priority || 100),
      workspaceId,
      companyId: req.user.companyId,
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchAssignmentRule(req, res, next) {
  try {
    const row = await AssignmentRule.findByPk(req.params.id)
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } })
    const payload = { ...(req.body || {}) }
    if ('type' in payload) delete payload.type
    await row.update(payload)
    if (row.type !== 'round_robin') await row.update({ type: 'round_robin' })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteAssignmentRule(req, res, next) {
  try {
    await AssignmentRule.destroy({ where: { id: req.params.id } })
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listCustomFields(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const rows = await CustomField.findAll({ where: { workspaceId }, order: [['order', 'ASC'], ['createdAt', 'ASC']] })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createCustomField(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const baseLabel = String(req.body?.label || 'Custom Field').trim()
    const row = await CustomField.create({
      label: baseLabel,
      key: baseLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      type: req.body?.type || 'text',
      options: req.body?.options || null,
      isRequired: Boolean(req.body?.isRequired),
      order: Number(req.body?.order || 0),
      workspaceId,
      companyId: req.user.companyId,
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchCustomField(req, res, next) {
  try {
    const row = await CustomField.findByPk(req.params.id)
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Field not found' } })
    await row.update(req.body || {})
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteCustomField(req, res, next) {
  try {
    await CustomField.destroy({ where: { id: req.params.id } })
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function importRows(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const results = await importLeads(workspaceId, req.user.companyId, req.user.id, req.body?.rows || [])
    await clearLeadListCache(workspaceId)
    if (results.createdLeadIds?.length) {
      await emitLeadWorkflowTriggersBulkImport({
        leadIds: results.createdLeadIds,
        companyId: req.user.companyId,
        workspaceId: String(workspaceId),
        actorUserId: req.user.id,
      }).catch(() => {})
    }
    return res.json({ success: true, data: results, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function exportRows(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const rows = await exportLeads(workspaceId, req.body?.filters || {}, req.body?.ids || null)
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getLeadSetup(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const [oppStageCount, dealStatusCount] = await Promise.all([
      OpportunityStage.count({ where: { workspaceId, companyId: req.user.companyId } }),
      DealStatus.count({ where: { workspaceId, companyId: req.user.companyId } }),
    ])
    if (oppStageCount === 0) {
      const seedStages = [
        { name: 'open', isDefault: true, isDealStatus: false, sortOrder: 0 },
        { name: 'discovery', sortOrder: 1 },
        { name: 'demo_scheduled', sortOrder: 2 },
        { name: 'demo_completed', sortOrder: 3 },
        { name: 'solution_fit_confirmed', sortOrder: 4 },
        { name: 'proposal_in_progress', sortOrder: 5 },
        { name: 'proposal_sent', isDealStatus: true, sortOrder: 6 },
        { name: 'on_hold', sortOrder: 7 },
      ]
      await OpportunityStage.bulkCreate(
        seedStages.map((s) => ({ ...s, workspaceId, companyId: req.user.companyId })),
      )
    }
    await sequelize.transaction(async (transaction) => {
      await normalizeOpportunityStageOrder(workspaceId, req.user.companyId, transaction)
      await normalizeOpportunityStageDealStatusFlag(workspaceId, req.user.companyId, transaction)
    })
    if (dealStatusCount === 0) {
      await DealStatus.bulkCreate([
        { name: 'qualification', isDealCompleteStatus: false, isInitial: true, sortOrder: 0, workspaceId, companyId: req.user.companyId },
        { name: 'proposal', isDealCompleteStatus: false, isInitial: false, sortOrder: 1, workspaceId, companyId: req.user.companyId },
        { name: 'negotiation', isDealCompleteStatus: false, isInitial: false, sortOrder: 2, workspaceId, companyId: req.user.companyId },
        { name: 'contract_sent', isDealCompleteStatus: false, isInitial: false, sortOrder: 3, workspaceId, companyId: req.user.companyId },
        { name: 'won', isDealCompleteStatus: true, isInitial: false, sortOrder: 4, workspaceId, companyId: req.user.companyId },
        { name: 'lost', isDealCompleteStatus: false, isInitial: false, sortOrder: 5, workspaceId, companyId: req.user.companyId },
      ])
    }
    const [sources, tags, opportunityStages, dealStatuses] = await Promise.all([
      LeadSource.findAll({ where: { workspaceId, companyId: req.user.companyId }, order: [['createdAt', 'ASC']] }),
      Tag.findAll({ where: { companyId: req.user.companyId }, order: [['name', 'ASC'], ['createdAt', 'ASC']] }),
      OpportunityStage.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      }),
      DealStatus.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      }),
    ])
    return res.json({ success: true, data: { sources, tags, opportunityStages, dealStatuses }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createDealStatus(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const name = String(req.body?.name || '').trim()
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Deal status name is required' } })
    const requestedComplete = Boolean(req.body?.isDealCompleteStatus)
    const row = await sequelize.transaction(async (transaction) => {
      const maxOrder = await DealStatus.max('sortOrder', { where: { workspaceId, companyId: req.user.companyId }, transaction })
      const sortOrder = Number.isFinite(Number(maxOrder)) ? Number(maxOrder) + 1 : 0
      if (requestedComplete) {
        await DealStatus.update(
          { isDealCompleteStatus: false },
          { where: { workspaceId, companyId: req.user.companyId, isDealCompleteStatus: true }, transaction },
        )
      }
      const created = await DealStatus.create(
        { name, isDealCompleteStatus: requestedComplete, isInitial: false, sortOrder, workspaceId, companyId: req.user.companyId },
        { transaction },
      )
      await normalizeDealStatusOrder(workspaceId, req.user.companyId, transaction)
      return created
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchDealStatus(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await DealStatus.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal status not found' } })
    const hasName = Object.prototype.hasOwnProperty.call(req.body || {}, 'name')
    const hasComplete = Object.prototype.hasOwnProperty.call(req.body || {}, 'isDealCompleteStatus')
    const name = hasName ? String(req.body?.name || '').trim() : row.name
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Deal status name is required' } })
    const makeComplete = hasComplete ? Boolean(req.body?.isDealCompleteStatus) : row.isDealCompleteStatus
    await sequelize.transaction(async (transaction) => {
      if (makeComplete) {
        await DealStatus.update(
          { isDealCompleteStatus: false },
          { where: { workspaceId, companyId: req.user.companyId, isDealCompleteStatus: true }, transaction },
        )
      }
      await row.update({ name, isDealCompleteStatus: makeComplete }, { transaction })
      await normalizeDealStatusOrder(workspaceId, req.user.companyId, transaction)
    })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteDealStatus(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await DealStatus.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal status not found' } })
    await sequelize.transaction(async (transaction) => {
      await row.destroy({ transaction })
      await normalizeDealStatusOrder(workspaceId, req.user.companyId, transaction)
    })
    return res.json({ success: true, data: { id: req.params.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function reorderDealStatuses(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => String(x)) : []
    if (!ids.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids are required' } })
    }
    const rows = await DealStatus.findAll({
      where: { workspaceId, companyId: req.user.companyId },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    })
    const byId = new Map(rows.map((r) => [String(r.id), r]))
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean)
    for (const row of rows) {
      if (!ids.includes(String(row.id))) ordered.push(row)
    }
    await sequelize.transaction(async (transaction) => {
      for (let i = 0; i < ordered.length; i += 1) {
        await ordered[i].update({ sortOrder: i, isInitial: i === 0 }, { transaction })
      }
    })
    return res.json({ success: true, data: { reordered: ordered.length }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createLeadSource(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const name = String(req.body?.name || '').trim()
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Source name is required' } })
    const row = await LeadSource.create({ name, workspaceId, companyId: req.user.companyId, isActive: true })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchLeadSource(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await LeadSource.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } })
    const name = String(req.body?.name || '').trim()
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Source name is required' } })
    await row.update({ name })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteLeadSource(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await LeadSource.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } })
    await row.destroy()
    return res.json({ success: true, data: { id: req.params.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createLeadTag(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const name = String(req.body?.name || '').trim()
    const colorInput = String(req.body?.color || '').trim()
    const color = /^#[0-9a-fA-F]{6}$/.test(colorInput) ? colorInput : '#3b73f5'
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Tag name is required' } })
    const [row] = await Tag.findOrCreate({
      where: { companyId: req.user.companyId, name },
      defaults: { companyId: req.user.companyId, workspaceId: workspaceId || null, name, color },
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchLeadTag(req, res, next) {
  try {
    const row = await Tag.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } })
    const name = String(req.body?.name || '').trim()
    const colorInput = String(req.body?.color || '').trim()
    const color = /^#[0-9a-fA-F]{6}$/.test(colorInput) ? colorInput : row.color
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Tag name is required' } })
    await row.update({ name, color })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteLeadTag(req, res, next) {
  try {
    const row = await Tag.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } })
    await row.destroy()
    return res.json({ success: true, data: { id: req.params.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createOpportunityStage(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const name = String(req.body?.name || '').trim()
    const requestedDealStatus = Boolean(req.body?.isDealStatus)
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Stage name is required' } })
    const maxOrder = await OpportunityStage.max('sortOrder', { where: { workspaceId, companyId: req.user.companyId } })
    const sortOrder = Number.isFinite(Number(maxOrder)) ? Number(maxOrder) + 1 : 0
    const row = await sequelize.transaction(async (t) => {
      const created = await OpportunityStage.create(
        { name, isDefault: false, isDealStatus: requestedDealStatus, sortOrder, workspaceId, companyId: req.user.companyId },
        { transaction: t },
      )
      await normalizeOpportunityStageOrder(workspaceId, req.user.companyId, t)
      await normalizeOpportunityStageDealStatusFlag(workspaceId, req.user.companyId, t, requestedDealStatus ? created.id : null)
      return created
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchOpportunityStage(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await OpportunityStage.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stage not found' } })
    const name = req.body?.name !== undefined ? String(req.body.name || '').trim() : undefined
    const hasDealStatus = Object.prototype.hasOwnProperty.call(req.body || {}, 'isDealStatus')
    const requestedDealStatus = hasDealStatus ? Boolean(req.body?.isDealStatus) : undefined
    if (name !== undefined && !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Stage name is required' } })
    }
    await sequelize.transaction(async (t) => {
      if (name !== undefined || requestedDealStatus !== undefined) {
        await row.update(
          {
            ...(name !== undefined ? { name } : {}),
            ...(requestedDealStatus !== undefined ? { isDealStatus: requestedDealStatus } : {}),
          },
          { transaction: t },
        )
      }
      await normalizeOpportunityStageOrder(workspaceId, req.user.companyId, t)
      await normalizeOpportunityStageDealStatusFlag(
        workspaceId,
        req.user.companyId,
        t,
        requestedDealStatus ? row.id : null,
      )
    })
    await row.reload()
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteOpportunityStage(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await OpportunityStage.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stage not found' } })
    await sequelize.transaction(async (transaction) => {
      await row.destroy({ transaction })
      await normalizeOpportunityStageOrder(workspaceId, req.user.companyId, transaction)
      await normalizeOpportunityStageDealStatusFlag(workspaceId, req.user.companyId, transaction)
    })
    return res.json({ success: true, data: { id: req.params.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function reorderOpportunityStages(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => String(x)) : []
    if (!ids.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids are required' } })
    }
    const rows = await OpportunityStage.findAll({
      where: { workspaceId, companyId: req.user.companyId },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    })
    const byId = new Map(rows.map((r) => [String(r.id), r]))
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean)
    for (const row of rows) {
      if (!ids.includes(String(row.id))) ordered.push(row)
    }
    await sequelize.transaction(async (transaction) => {
      for (let i = 0; i < ordered.length; i += 1) {
        await ordered[i].update({ sortOrder: i, isDefault: i === 0 }, { transaction })
      }
      await normalizeOpportunityStageDealStatusFlag(workspaceId, req.user.companyId, transaction)
    })
    return res.json({ success: true, data: { reordered: ordered.length }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
