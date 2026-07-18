import Joi from 'joi'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { getCountries, getCountryCallingCode } from 'libphonenumber-js/min'
import { google } from 'googleapis'
import { getGoogleOAuthClient, readGoogleOAuthEnv } from '../services/google/googleEnv.js'
import { sequelize } from '../models/index.js'
import {
  Activity,
  AssignmentRule,
  CustomField,
  CustomFieldValue,
  Deal,
  Lead,
  LeadAssignment,
  LeadFile,
  LeadTask,
  LeadTaskSubtask,
  LeadTaskComment,
  LeadFollowup,
  LeadSource,
  PipelineStatus,
  DealStatus,
  CountryPhoneCode,
  CompanyGoogleToken,
  LeadEmail,
  Reminder,
  SavedView,
  Tag,
  User,
  UserWorkspace,
} from '../models/index.js'
import { getRedis } from '../config/redis.js'
import { autoAssignLead } from '../services/assignmentRulesService.js'
import { linkOrphanCallsToLead } from '../services/callService.js'
import { findDuplicates, saveDuplicateRecord } from '../services/duplicateDetectionService.js'
import { exportLeads, importLeads } from '../services/importExportService.js'
import { recalculateScore, recalculateLeadScore } from '../services/leadScoringService.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { allowedWorkspaceIdsForUser, scopedWorkspaceIdsForRequest, assertUsersMembersOfWorkspaces } from '../services/userWorkspaceService.js'
import { isElevated } from '../services/recordVisibility.js'
import { resolveListWorkspaceFilterId } from '../utils/resolveListWorkspaceFilter.js'
import { phoneDigitsKey } from '../utils/phoneDigits.js'
import { buildAdvancedListWhere, parseFiltersParam } from '../services/listFilterService.js'
import { LEAD_FILTER_FIELDS } from '../services/filterSchemas/leadFilterSchema.js'
import {
  maybePromotePendingTaskFromSubtasks,
  promotePendingTasksByDueOrStartMany,
} from '../services/leadTaskAutoStatusService.js'
import { createLeadSystemActivity as createSystemActivity } from '../services/leadSystemActivity.js'
import { logLeadFieldChanges, logLeadCollaboratorsChange, humanizeEnumLabel } from '../services/leadFieldChangeActivity.js'
import { emitLeadWorkflowTriggers, emitLeadWorkflowTriggersBulkImport } from '../services/workflowRunner.js'
import {
  enrichLeadPlainWithCustomFields,
  generateUniqueCustomFieldKey,
  reorderCustomFields,
  upsertLeadCustomFields,
  validateFieldDefinition,
} from '../services/customFieldService.js'
import { attachLeadListEngagement } from '../services/leadListEngagementService.js'
import {
  collectBulkAssignRecipients,
  collectRoundRobinRecipients,
  notifyLeadAssigned,
  notifyLeadAssignedBatch,
  notifyTaskAssigned,
  notifyLeadEmailReply,
  notifyLeadStatusChanged,
  notifyLeadReassignedAway,
  notifyLeadNoteAdded,
  notifyTaskCommentAdded,
} from '../services/notification/teamNotificationService.js'
import { htmlToText, parseGmailMessage } from '../services/gmail/gmailMessageParse.js'
import { registerGmailWatchForTokenRow, isGmailPushConfigured } from '../services/gmail/gmailPushService.js'
import { injectTrackingPixel } from '../services/emailTemplateService.js'

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
// Completed tasks older than this are hidden from the default task list
// (still reachable via an explicit status=completed filter).
const COMPLETED_TASKS_VISIBLE_DAYS = 7

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
  const assignedOnly = ['true', '1', 'yes'].includes(String(query.assignedOnly ?? '').trim().toLowerCase())
  if (status.length) where.status = { [Op.in]: status }
  if (source.length) where.source = { [Op.in]: source }
  if (unassignedOnly && !assignedTo.length) {
    where.assignedTo = { [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }] }
  } else if (assignedTo.length) {
    where.assignedTo = { [Op.in]: assignedTo }
  } else if (assignedOnly) {
    where.assignedTo = { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
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
  const stages = parseCsvList(query.stage).filter(Boolean)
  if (stages.length === 1) where.pipelineStatus = stages[0]
  else if (stages.length > 1) where.pipelineStatus = { [Op.in]: stages }

  const iso = String(query.isOpportunity ?? '').toLowerCase()
  if (iso === 'true' || iso === '1') where.isOpportunity = true
  if (iso === 'false' || iso === '0') where.isOpportunity = false

  const emails = parseCsvList(query.emails).map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (emails.length) {
    where[Op.and] = (where[Op.and] || []).concat([sqlWhere(fn('LOWER', col('Lead.email')), { [Op.in]: emails })])
  }

  const createdFrom = query.createdFrom ? String(query.createdFrom).slice(0, 10) : null
  const createdTo = query.createdTo ? String(query.createdTo).slice(0, 10) : null
  if (createdFrom || createdTo) {
    where.createdAt = {}
    if (createdFrom) where.createdAt[Op.gte] = new Date(`${createdFrom}T00:00:00.000Z`)
    if (createdTo) where.createdAt[Op.lte] = new Date(`${createdTo}T23:59:59.999Z`)
  }

  const closingFrom = query.closingFrom ? String(query.closingFrom).slice(0, 10) : null
  const closingTo = query.closingTo ? String(query.closingTo).slice(0, 10) : null
  if (closingFrom || closingTo) {
    where.closingDate = {}
    if (closingFrom) where.closingDate[Op.gte] = closingFrom
    if (closingTo) where.closingDate[Op.lte] = closingTo
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

/** Lead's assignee + owner, excluding whoever performed the action. */
function leadRecipients(lead, actorUserId) {
  const ids = new Set()
  if (lead.assignedTo) ids.add(String(lead.assignedTo))
  if (lead.ownerUserId) ids.add(String(lead.ownerUserId))
  ids.delete(String(actorUserId || ''))
  return [...ids]
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

/**
 * List/detail/bulk scope: company + workspace header (same rules as GET /leads).
 * leadAccessWhere now auto-narrows non-company-admins to their allowed
 * workspaces when no single workspace is selected, so this wrapper only needs
 * to validate + apply an explicitly selected workspace.
 */
async function buildLeadListAccessWhere(req) {
  const selectedWorkspaceId = resolveListWorkspaceFilterId(req)
  if (selectedWorkspaceId) {
    if (!req.user.isCompanyAdmin) {
      const allowedWorkspaceIds = await allowedWorkspaceIdsForUser(req.user)
      if (!allowedWorkspaceIds.map(String).includes(String(selectedWorkspaceId))) {
        const err = new Error('You do not have access to this workspace')
        err.status = 403
        err.code = 'FORBIDDEN'
        err.publicMessage = 'You do not have access to this workspace'
        throw err
      }
    }
    return leadAccessWhere(req.user, { workspaceId: String(selectedWorkspaceId) })
  }
  return leadAccessWhere(req.user)
}

async function findCompanyLead(req, id) {
  const accessWhere = await buildLeadListAccessWhere(req)
  return Lead.findOne({ where: { ...accessWhere, id, isDeleted: false } })
}

function normalizeRecipients(value) {
  if (!value) return []
  const list = Array.isArray(value) ? value : String(value).split(',')
  return list
    .map((x) => String(x || '').trim())
    .filter(Boolean)
}

const GOOGLE_OAUTH_RETURN_PATHS = new Set(['/onboarding', '/integrations'])

function sanitizeGoogleOAuthReturnTo(raw) {
  const path = String(raw || '').trim()
  if (!path.startsWith('/') || path.includes('://') || path.includes('//')) return null
  const base = path.split('?')[0].split('#')[0]
  return GOOGLE_OAUTH_RETURN_PATHS.has(base) ? base : null
}

function parseGoogleOAuthState(rawState) {
  try {
    const decoded = Buffer.from(String(rawState || ''), 'base64url').toString('utf8')
    const state = JSON.parse(decoded)
    if (!state?.companyId || !state?.userId || !state?.t) return null
    const ageMs = Date.now() - Number(state.t)
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 1000 * 60 * 30) return null
    if (state.returnTo) {
      state.returnTo = sanitizeGoogleOAuthReturnTo(state.returnTo)
    }
    return state
  } catch {
    return null
  }
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
  // A lead sharing the connected mailbox's own address has no counterpart to sync —
  // matching degenerates to "every message in the mailbox" (from===to===lead).
  if (leadEmail && mailboxEmail && leadEmail === mailboxEmail) return { created: 0 }
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
    const direction = mailboxEmail && fromEmail === mailboxEmail ? 'outbound' : 'inbound'
    await LeadEmail.create({
      leadId: lead.id,
      workspaceId: lead.workspaceId,
      companyId: lead.companyId,
      createdBy: userId,
      fromEmail: parsed.from?.email || fromEmail || null,
      direction,
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

    if (direction === 'inbound' && lead.assignedTo) {
      notifyLeadEmailReply({
        companyId: lead.companyId,
        workspaceId: lead.workspaceId,
        recipientUserId: lead.assignedTo,
        leadId: lead.id,
        leadName: lead.contactName || lead.name || lead.title || 'Lead',
        senderEmail: fromEmail,
      }).catch(() => {})
    }
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
}).custom((value, helpers) => {
  const phone = normalizePhone(value.phone)
  const altPhone = normalizePhone(value.altPhone)
  const sameCode = String(value.phoneCountryCode || '') === String(value.altPhoneCountryCode || '')
  if (phone && altPhone && sameCode && phone === altPhone) {
    return helpers.error('any.invalid', { message: 'Phone and alternate phone cannot be the same' })
  }
  return value
}, 'Phone/alternate phone uniqueness')

export async function list(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const requestedEmails = parseCsvList(req.query.emails).filter(Boolean)
    const limit = requestedEmails.length
      ? Math.min(200, requestedEmails.length)
      : Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit

    let accessWhere
    try {
      accessWhere = await buildLeadListAccessWhere(req)
    } catch (e) {
      if (e.status === 403) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: e.publicMessage || e.message },
        })
      }
      throw e
    }

    const flatWhere = buildListWhere(req.query)
    const advancedWhere = buildAdvancedListWhere(parseFiltersParam(req.query.filters), LEAD_FILTER_FIELDS)
    let where = { ...accessWhere, ...flatWhere }
    if (advancedWhere) {
      where = { [Op.and]: [where, advancedWhere] }
    }

    const sort = [
      'createdAt',
      'updatedAt',
      'title',
      'status',
      'score',
      'value',
      'assignedTo',
      'source',
      'contactName',
      'company',
    ].includes(req.query.sort)
      ? req.query.sort
      : 'updatedAt'
    const order = String(req.query.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const include = [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
      { model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] }, required: false },
      { model: PipelineStatus, as: 'pipelineStatusInfo', attributes: ['id', 'name'], required: false },
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

    // Batch-load lead assignments (with avatar) to avoid N+1 queries
    if (rows.length && (await hasLeadAssignmentsTable())) {
      const leadIds = rows.map((l) => l.id)
      const allAssignments = await LeadAssignment.findAll({
        where: { leadId: { [Op.in]: leadIds } },
        include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'], required: false }],
      })
      const assignmentMap = new Map()
      for (const a of allAssignments) {
        if (!assignmentMap.has(a.leadId)) assignmentMap.set(a.leadId, [])
        assignmentMap.get(a.leadId).push(a)
      }
      for (const lead of rows) {
        lead.dataValues.assignments = assignmentMap.get(lead.id) || []
      }
    }

    const data = await attachLeadListEngagement(rows, req.user.companyId)

    return res.json({
      success: true,
      data,
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
    include.push({ model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false })
    if (await hasLeadAssignmentsTable()) {
      include.unshift({ model: User, as: 'assignedUsers', attributes: ['id', 'name', 'email'], through: { attributes: [] }, required: false })
    }

    const scoped = await findCompanyLead(req, req.params.id)
    if (!scoped) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    }
    const lead = await Lead.findOne({
      where: { id: scoped.id },
      include,
    })
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const [openTasks, completedTasks, lastContactAt] = await Promise.all([
      LeadTask.count({ where: { leadId: lead.id, companyId: req.user.companyId, status: { [Op.in]: ['pending', 'in_progress'] } } }),
      LeadTask.count({ where: { leadId: lead.id, companyId: req.user.companyId, status: 'completed' } }),
      Activity.max('createdAt', {
        where: {
          leadId: lead.id,
          type: { [Op.in]: ['call', 'email', 'meeting', 'note'] },
        },
      }),
    ])
    const leadPlain = enrichLeadPlainWithCustomFields(lead.get({ plain: true }))
    return res.json({ success: true, data: leadPlain, meta: { summary: { openTasks, completedTasks, lastContactAt } } })
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
      await saveDuplicateRecord({
        leadData: { ...value, isOpportunity: value.isOpportunity || false },
        dupes,
        source: 'manual',
        workspaceId,
        companyId: req.user.companyId,
        createdByUserId: req.user.id,
      })
      return res.status(202).json({
        success: true,
        queued: true,
        message: 'Potential duplicate detected. Lead saved to duplicate review queue.',
        duplicates: dupes,
        meta: {},
      })
    }

    const legacy = extractLegacyProfile(value.notes)
    const customFieldsPayload = value.customFields || {}
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
      phoneDigits: phoneDigitsKey(value.phone) || null,
      altPhoneDigits: phoneDigitsKey(value.altPhone) || null,
    }
    delete payload.customFields
    delete payload.tags
    delete payload.assignedUserIds
    delete payload.force
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

    await upsertLeadCustomFields({
      leadId: lead.id,
      workspaceId,
      companyId: req.user.companyId,
      customFields: customFieldsPayload,
    })

    await autoAssignLead(lead, { suppressNotification: true })
    // Attach any previously synced orphan calls that match this lead's number.
    await linkOrphanCallsToLead(lead).catch(() => {})
    await lead.reload()
    if (lead.assignedTo && String(lead.assignedTo) !== String(req.user.id)) {
      notifyLeadAssigned({
        companyId: req.user.companyId,
        workspaceId: lead.workspaceId,
        recipientUserId: lead.assignedTo,
        actorUserId: req.user.id,
        leadCount: 1,
        immediate: true,
      }).catch(() => {})
    }
    if (value.assignedUserIds?.length && (await hasLeadAssignmentsTable())) {
      for (const uid of value.assignedUserIds) {
        if (String(uid) === String(req.user.id) || String(uid) === String(lead.assignedTo)) continue
        notifyLeadAssigned({
          companyId: req.user.companyId,
          workspaceId: lead.workspaceId,
          recipientUserId: uid,
          actorUserId: req.user.id,
          leadCount: 1,
          immediate: true,
        }).catch(() => {})
      }
    }
    await createSystemActivity({
      leadId: lead.id,
      userId: req.user.id,
      body: `Lead created (source: ${lead.source})`,
      metadata: { action: 'lead_created' },
    })
    await recalculateScore(lead.id)
    recalculateLeadScore(lead, req.user.companyId).catch(console.error)
    await clearLeadListCache(workspaceId)
    // Fire-and-forget: workflow execution must not block the create response
    emitLeadWorkflowTriggers({
      eventType: 'lead_created',
      lead: lead.get({ plain: true }),
      before: null,
      companyId: req.user.companyId,
      workspaceId: String(workspaceId),
      actorUserId: req.user.id,
    }).catch((e) => console.error('[workflow] lead_created trigger emit failed:', e?.message || e))
    await lead.reload({
      include: [
        {
          model: CustomFieldValue,
          as: 'customFieldValues',
          include: [{ model: CustomField, as: 'customField', attributes: ['id', 'label', 'key', 'type', 'options'] }],
          required: false,
        },
      ],
    })
    const createdPlain = enrichLeadPlainWithCustomFields(lead.get({ plain: true }))
    return res.status(201).json({ success: true, data: createdPlain, meta: {} })
  } catch (e) {
    if (e?.status === 400) {
      return res.status(400).json({ success: false, error: { code: e.code || 'VALIDATION', message: e.message } })
    }
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })

    // Phase 3: optimistic concurrency (opt-in via header). If the client tells us
    // which version it edited and the row moved on, reject instead of clobbering.
    const ifUnmodifiedSince = req.headers['if-unmodified-since']
    if (ifUnmodifiedSince) {
      const clientSeen = new Date(ifUnmodifiedSince).getTime()
      const current = new Date(lead.updatedAt).getTime()
      if (Number.isFinite(clientSeen) && current > clientSeen) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'STALE_WRITE',
            message: 'This lead was changed by someone else. Refresh to see the latest, then retry.',
            details: { currentUpdatedAt: lead.updatedAt },
          },
        })
      }
    }

    const rawBody = { ...(req.body || {}) }
    if (rawBody.company == null && rawBody.companyName != null) rawBody.company = rawBody.companyName
    const { error, value } = leadSchema.fork(['title', 'source'], (x) => x.optional()).validate(rawBody, {
      abortEarly: false,
      stripUnknown: true,
    })
    if (error) {
      const message = error.details?.[0]?.context?.message || error.message
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message } })
    }

    // Reassignment guard (elevated-only reassign + workspace membership):
    //  - rank-3 users may keep/clear/self-claim their lead, but not hand it to
    //    a third party (that's a management action for admins/managers);
    //  - any new assignee must be a member of THIS lead's workspace.
    if (Object.prototype.hasOwnProperty.call(value, 'assignedTo')) {
      const nextAssignee = value.assignedTo ? String(value.assignedTo) : null
      const currentAssignee = lead.assignedTo ? String(lead.assignedTo) : null
      if (nextAssignee !== currentAssignee) {
        if (!isElevated(req.user) && nextAssignee && nextAssignee !== String(req.user.id)) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only admins and managers can reassign leads to other users' },
          })
        }
        if (nextAssignee) {
          await assertUsersMembersOfWorkspaces([nextAssignee], [String(lead.workspaceId)])
        }
      }
    }

    const emailChanged =
      Object.prototype.hasOwnProperty.call(value, 'email') &&
      String(value.email || '').trim().toLowerCase() !== String(lead.email || '').trim().toLowerCase()
    const phoneChanged =
      Object.prototype.hasOwnProperty.call(value, 'phone') &&
      String(value.phone || '').trim() !== String(lead.phone || '').trim()
    const dupes = (emailChanged || phoneChanged)
      ? await findDuplicates(lead.workspaceId, { email: value.email, phone: value.phone }, lead.id)
      : []
    if (dupes.length) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_LEAD', message: 'A lead with this phone or email already exists. You cannot create a duplicate.' },
        duplicates: dupes,
        meta: {},
      })
    }

    const hasTagsField = Object.prototype.hasOwnProperty.call(req.body || {}, 'tags')
    const hasAssignedUserIdsField = Object.prototype.hasOwnProperty.call(req.body || {}, 'assignedUserIds')
    const before = lead.get({ plain: true })
    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    let collaboratorIdsBefore = []
    if (hasAssignedUserIdsField && (await hasLeadAssignmentsTable())) {
      const asgRows = await LeadAssignment.findAll({ where: { leadId: lead.id }, attributes: ['userId'] })
      collaboratorIdsBefore = asgRows.map((r) => String(r.userId))
    }
    const legacy = extractLegacyProfile(value.notes || before.notes)
    const hasCustomFieldsField = Object.prototype.hasOwnProperty.call(req.body || {}, 'customFields')
    const customFieldsPayload = hasCustomFieldsField ? value.customFields || {} : null
    const leadScalars = { ...value }
    delete leadScalars.tags
    delete leadScalars.assignedUserIds
    delete leadScalars.customFields
    delete leadScalars.force
    const payload = {
      ...leadScalars,
      designation: value.designation ?? before.designation ?? legacy.designation ?? null,
      city: value.city ?? before.city ?? legacy.city ?? null,
      state: value.state ?? before.state ?? legacy.state ?? null,
    }
    if (Object.prototype.hasOwnProperty.call(rawBody, 'company') || Object.prototype.hasOwnProperty.call(rawBody, 'companyName')) {
      payload.company = value.company == null || value.company === '' ? null : String(value.company).trim()
    }
    const nextPhoneForDigits = Object.prototype.hasOwnProperty.call(payload, 'phone') ? payload.phone : before.phone
    const nextAltPhoneForDigits = Object.prototype.hasOwnProperty.call(payload, 'altPhone') ? payload.altPhone : before.altPhone
    payload.phoneDigits = phoneDigitsKey(nextPhoneForDigits) || null
    payload.altPhoneDigits = phoneDigitsKey(nextAltPhoneForDigits) || null
    await lead.update(payload)
    await lead.reload()
    if (before.phone !== lead.phone || before.altPhone !== lead.altPhone) {
      await linkOrphanCallsToLead(lead).catch(() => {})
    }
    if (hasAssignedUserIdsField && (await hasLeadAssignmentsTable())) {
      await LeadAssignment.destroy({ where: { leadId: lead.id } })
      if (value.assignedUserIds.length) {
        await LeadAssignment.bulkCreate(value.assignedUserIds.map((userId) => ({ leadId: lead.id, userId })))
      }
      const afterCollab = (value.assignedUserIds || []).map((id) => String(id))
      await logLeadCollaboratorsChange({
        leadId: lead.id,
        userId: req.user.id,
        actorName,
        beforeUserIds: collaboratorIdsBefore,
        afterUserIds: afterCollab,
      })
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
    if (hasCustomFieldsField) {
      await upsertLeadCustomFields({
        leadId: lead.id,
        workspaceId: lead.workspaceId,
        companyId: lead.companyId,
        customFields: customFieldsPayload,
      })
    }
    await logLeadFieldChanges({
      before,
      after: lead.get({ plain: true }),
      leadId: lead.id,
      userId: req.user.id,
      actorName,
    })
    const afterPlain = lead.get({ plain: true })
    const beforePrimary = before.assignedTo ? String(before.assignedTo) : null
    const afterPrimary = afterPlain.assignedTo ? String(afterPlain.assignedTo) : null
    if (afterPrimary && afterPrimary !== beforePrimary && afterPrimary !== String(req.user.id)) {
      notifyLeadAssigned({
        companyId: req.user.companyId,
        workspaceId: lead.workspaceId,
        recipientUserId: afterPrimary,
        actorUserId: req.user.id,
        leadCount: 1,
        immediate: true,
      }).catch(() => {})
    }
    if (beforePrimary && beforePrimary !== afterPrimary && beforePrimary !== String(req.user.id)) {
      ;(afterPrimary ? resolveActorDisplayName(afterPrimary).catch(() => null) : Promise.resolve(null)).then(
        (newOwnerName) =>
          notifyLeadReassignedAway({
            companyId: req.user.companyId,
            workspaceId: lead.workspaceId,
            previousUserId: beforePrimary,
            actorUserId: req.user.id,
            leadId: lead.id,
            leadName: lead.title || lead.contactName,
            newOwnerName,
          }),
      ).catch(() => {})
    }
    if (hasAssignedUserIdsField) {
      const beforeSet = new Set(collaboratorIdsBefore)
      for (const uid of (value.assignedUserIds || []).map(String)) {
        if (!beforeSet.has(uid) && uid !== String(req.user.id) && uid !== afterPrimary) {
          notifyLeadAssigned({
            companyId: req.user.companyId,
            workspaceId: lead.workspaceId,
            recipientUserId: uid,
            actorUserId: req.user.id,
            leadCount: 1,
            immediate: true,
          }).catch(() => {})
        }
      }
    }
    await recalculateScore(lead.id)
    recalculateLeadScore(lead, req.user.companyId).catch(console.error)
    await clearLeadListCache(lead.workspaceId)
    // Fire-and-forget: workflow execution must not block the update response
    emitLeadWorkflowTriggers({
      eventType: 'lead_updated',
      lead: lead.get({ plain: true }),
      before,
      companyId: req.user.companyId,
      workspaceId: String(lead.workspaceId),
      actorUserId: req.user.id,
    }).catch((e) => console.error('[workflow] lead_updated trigger emit failed:', e?.message || e))
    await lead.reload({
      include: [
        {
          model: CustomFieldValue,
          as: 'customFieldValues',
          include: [{ model: CustomField, as: 'customField', attributes: ['id', 'label', 'key', 'type', 'options', 'isRequired', 'order'] }],
          required: false,
        },
      ],
    })
    const updatedPlain = enrichLeadPlainWithCustomFields(lead.get({ plain: true }))
    return res.json({ success: true, data: updatedPlain, meta: {} })
  } catch (e) {
    if (e?.status === 400) {
      return res.status(400).json({ success: false, error: { code: e.code || 'VALIDATION', message: e.message } })
    }
    return next(e)
  }
}

export async function formMeta(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const [sourceCount, dealStatusCount, pipelineStatusCount] = await Promise.all([
      LeadSource.count({ where: { workspaceId, companyId: req.user.companyId } }),
      DealStatus.count({ where: { workspaceId, companyId: req.user.companyId } }),
      PipelineStatus.count({ where: { workspaceId, companyId: req.user.companyId } }),
    ])
    if (sourceCount === 0) {
      await LeadSource.bulkCreate([
        { name: 'Web Form', workspaceId, companyId: req.user.companyId },
        { name: 'Manual', workspaceId, companyId: req.user.companyId },
        { name: 'Referral', workspaceId, companyId: req.user.companyId },
      ])
    }
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
    if (pipelineStatusCount === 0) {
      await PipelineStatus.bulkCreate([
        { name: 'New', isInitial: true, sortOrder: 0, workspaceId, companyId: req.user.companyId },
        { name: 'Qualified', isInitial: false, sortOrder: 1, workspaceId, companyId: req.user.companyId },
        { name: 'Proposal Sent', isInitial: false, sortOrder: 2, workspaceId, companyId: req.user.companyId },
        { name: 'Negotiation', isInitial: false, sortOrder: 3, workspaceId, companyId: req.user.companyId },
        { name: 'Won', isInitial: false, sortOrder: 4, workspaceId, companyId: req.user.companyId },
        { name: 'Lost', isInitial: false, sortOrder: 5, workspaceId, companyId: req.user.companyId },
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

    // Assignee dropdowns must not leak the whole company's user list: scope to
    // members of the CURRENT workspace (company admin included — assigning a
    // lead to someone outside its workspace is never right).
    const workspaceUserWhere = { companyId: req.user.companyId, isActive: true }
    {
      const memberRows = await UserWorkspace.findAll({
        where: { workspaceId },
        attributes: ['userId'],
        raw: true,
      })
      const memberIds = [...new Set(memberRows.map((r) => r.userId))]
      workspaceUserWhere.id = memberIds.length ? { [Op.in]: memberIds } : { [Op.eq]: null }
    }
    const [sources, users, phoneCodes, dealStatuses, tags, customFields, pipelineStatuses] = await Promise.all([
      LeadSource.findAll({ where: { workspaceId, companyId: req.user.companyId, isActive: true }, order: [['name', 'ASC']] }),
      User.findAll({ where: workspaceUserWhere, attributes: ['id', 'name', 'email'], order: [['name', 'ASC']] }),
      CountryPhoneCode.findAll({ where: { isActive: true }, order: [['isDefault', 'DESC'], ['countryName', 'ASC']] }),
      DealStatus.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      }),
      Tag.findAll({ where: { companyId: req.user.companyId }, order: [['name', 'ASC'], ['createdAt', 'ASC']] }),
      CustomField.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [['order', 'ASC'], ['createdAt', 'ASC']],
      }),
      PipelineStatus.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      }),
    ])
    return res.json({
      success: true,
      data: { sources, users, phoneCodes, dealStatuses, tags, customFields, pipelineStatuses },
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
    const before = lead.get({ plain: true })
    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    await lead.update({ status, lostReason: lostReason || null, notes: notes || lead.notes })
    await lead.reload()
    await logLeadFieldChanges({
      before,
      after: lead.get({ plain: true }),
      leadId: lead.id,
      userId: req.user.id,
      actorName,
      skipFields: ['status'],
    })
    if (before.status !== status) {
      await Activity.create({
        type: 'status_change',
        body: `Lead status changed from ${humanizeEnumLabel(before.status)} to ${humanizeEnumLabel(status)} by ${actorName}`,
        metadata: {
          action: 'lead_status_changed',
          leadId: lead.id,
          from: before.status || null,
          to: status,
          actorUserId: req.user.id,
          actorName,
        },
        leadId: lead.id,
        userId: req.user.id,
      })
    }
    // Phase 1: notify owner/assignee (not the actor) that status changed.
    if (before.status !== status) {
      for (const uid of leadRecipients(lead, req.user.id)) {
        notifyLeadStatusChanged({
          companyId: req.user.companyId,
          workspaceId: lead.workspaceId,
          recipientUserId: uid,
          actorUserId: req.user.id,
          leadId: lead.id,
          leadName: lead.title || lead.contactName,
          status,
        }).catch(() => {})
      }
    }
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

async function findArchivedCompanyLead(req, id) {
  const accessWhere = await buildLeadListAccessWhere(req)
  return Lead.findOne({ where: { ...accessWhere, id, isDeleted: true }, paranoid: false })
}

/** List soft-deleted (archived) leads for the current company/workspace scope. */
export async function listArchived(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit

    let accessWhere
    try {
      accessWhere = await buildLeadListAccessWhere(req)
    } catch (e) {
      if (e.status === 403) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: e.publicMessage || e.message },
        })
      }
      throw e
    }

    const where = { ...accessWhere, isDeleted: true }
    if (req.query.isOpportunity === 'true') where.isOpportunity = true
    else if (req.query.isOpportunity === 'false') where.isOpportunity = false

    const { count, rows } = await Lead.findAndCountAll({
      where,
      paranoid: false,
      limit,
      offset,
      order: [['deletedAt', 'DESC']],
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false }],
    })

    return res.json({
      success: true,
      data: rows,
      meta: { page, limit, total: count },
    })
  } catch (e) {
    return next(e)
  }
}

/** Bulk restore or permanently delete archived (soft-deleted) leads. */
export async function bulkArchived(req, res, next) {
  try {
    const { ids, action } = req.body || {}
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids required' } })
    }
    if (action !== 'restore' && action !== 'permanentDelete') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid action' } })
    }

    const accessWhere = await buildLeadListAccessWhere(req)
    const rows = await Lead.findAll({
      where: { ...accessWhere, id: { [Op.in]: ids }, isDeleted: true },
      paranoid: false,
    })
    if (!rows.length) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No archived leads found' } })
    }
    const foundIds = rows.map((r) => r.id)
    const workspaceIds = [...new Set(rows.map((r) => r.workspaceId))]

    if (action === 'restore') {
      await Lead.restore({ where: { id: { [Op.in]: foundIds } } })
      await Lead.update({ isDeleted: false }, { where: { id: { [Op.in]: foundIds } } })
    } else {
      await Lead.destroy({ where: { id: { [Op.in]: foundIds } }, force: true })
    }

    await Promise.all(workspaceIds.map((wsId) => clearLeadListCache(wsId)))

    return res.json({ success: true, data: { ids: foundIds }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/** Restore an archived (soft-deleted) lead back to the active list. */
export async function restoreLead(req, res, next) {
  try {
    const lead = await findArchivedCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Archived lead not found' } })
    await lead.restore()
    await lead.update({ isDeleted: false })
    await clearLeadListCache(lead.workspaceId)
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/** Permanently delete an archived (soft-deleted) lead. Irreversible. */
export async function destroyLeadPermanently(req, res, next) {
  try {
    const lead = await findArchivedCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Archived lead not found' } })
    const workspaceId = lead.workspaceId
    await lead.destroy({ force: true })
    await clearLeadListCache(workspaceId)
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/** Fetch leads by id for bulk actions (same access rules as list). */
export async function resolveByIds(req, res, next) {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String).filter(Boolean) : []
    if (!ids.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids required' } })
    }

    const accessWhere = await buildLeadListAccessWhere(req)
    const include = [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
    ]
    if (await hasLeadAssignmentsTable()) {
      include.push({
        model: User,
        as: 'assignedUsers',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] },
        required: false,
      })
    }

    const rows = await Lead.findAll({
      where: { ...accessWhere, id: { [Op.in]: ids }, isDeleted: false },
      include,
    })
    const data = await attachLeadListEngagement(rows, req.user.companyId)
    return res.json({ success: true, data })
  } catch (e) {
    return next(e)
  }
}

export async function bulk(req, res, next) {
  try {
    const { ids, action, payload = {} } = req.body || {}
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids required' } })
    const accessWhere = await buildLeadListAccessWhere(req)
    const leads = await Lead.findAll({ where: { ...accessWhere, id: { [Op.in]: ids }, isDeleted: false } })
    if (!leads.length) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No leads found' } })

    let revertSkippedCount = 0
    const needsFieldHistory = action === 'assign' || action === 'status'
    const beforePlainById = needsFieldHistory ? new Map(leads.map((l) => [String(l.id), l.get({ plain: true })])) : null

    let bulkCollabBeforeByLeadId = null
    if (action === 'assign' && Array.isArray(payload.assignedUserIds) && (await hasLeadAssignmentsTable())) {
      bulkCollabBeforeByLeadId = new Map()
      const rows = await LeadAssignment.findAll({
        where: { leadId: { [Op.in]: ids } },
        attributes: ['leadId', 'userId'],
      })
      for (const r of rows) {
        const lid = String(r.leadId)
        if (!bulkCollabBeforeByLeadId.has(lid)) bulkCollabBeforeByLeadId.set(lid, [])
        bulkCollabBeforeByLeadId.get(lid).push(String(r.userId))
      }
    }

    if (action === 'assign') {
      // Assignment guard: primary assignee and every collaborator must be a
      // member of EVERY affected lead's workspace — otherwise a lead ends up
      // pointing at a user who can't even open the workspace it lives in.
      const wsRows = await Lead.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['workspaceId'],
        group: ['workspaceId'],
        raw: true,
      })
      const affectedWorkspaceIds = wsRows.map((r) => r.workspaceId).filter(Boolean)
      const assigneeIds = [
        ...(payload.assignedTo ? [payload.assignedTo] : []),
        ...(Array.isArray(payload.assignedUserIds) ? payload.assignedUserIds : []),
      ]
      await assertUsersMembersOfWorkspaces(assigneeIds, affectedWorkspaceIds)
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
    if (action === 'delete') {
      await Lead.update({ isDeleted: true }, { where: { id: { [Op.in]: ids } } })
      await Lead.destroy({ where: { id: { [Op.in]: ids } } })
    }
    if (action === 'update') {
      const ALLOWED = ['status', 'pipelineStatus', 'sourceId', 'value', 'country', 'city', 'state']
      const patch = {}
      for (const key of ALLOWED) {
        if (Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== undefined && payload[key] !== '') {
          patch[key] = payload[key]
        }
      }
      if (payload.isOpportunity === true) {
        await Lead.update({ isOpportunity: true }, { where: { id: { [Op.in]: ids }, isOpportunity: false } })
        if (!Object.prototype.hasOwnProperty.call(patch, 'pipelineStatus')) {
          const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId
          const initialStatus = await PipelineStatus.findOne({
            where: { workspaceId, companyId: req.user.companyId, isInitial: true },
          })
          if (initialStatus) {
            await Lead.update(
              { pipelineStatus: initialStatus.id },
              { where: { id: { [Op.in]: ids }, isOpportunity: true, pipelineStatus: null } },
            )
          }
        }
      }
      if (payload.isOpportunity === false) {
        const linkedDeals = await Deal.findAll({
          where: { opportunityLeadId: { [Op.in]: ids }, isDeleted: false },
          attributes: ['opportunityLeadId'],
          raw: true,
        })
        const blockedIds = new Set(linkedDeals.map((d) => String(d.opportunityLeadId)))
        const revertIds = ids.filter((leadId) => !blockedIds.has(String(leadId)))
        revertSkippedCount = blockedIds.size
        if (revertIds.length) {
          await Lead.update(
            { isOpportunity: false, pipelineStatus: null },
            { where: { id: { [Op.in]: revertIds }, isOpportunity: true } },
          )
        }
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'pipelineStatus')) {
        await Lead.update(
          { pipelineStatus: patch.pipelineStatus },
          { where: { id: { [Op.in]: ids }, isOpportunity: true } },
        )
        delete patch.pipelineStatus
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
        await Lead.update({ status: patch.status }, { where: { id: { [Op.in]: ids }, isOpportunity: false } })
        delete patch.status
      }
      if (Object.keys(patch).length) {
        await Lead.update(patch, { where: { id: { [Op.in]: ids } } })
      }
      if (payload.customFields && typeof payload.customFields === 'object' && Object.keys(payload.customFields).length) {
        for (const lead of leads) {
          await upsertLeadCustomFields({
            leadId: lead.id,
            workspaceId: lead.workspaceId,
            companyId: lead.companyId,
            customFields: payload.customFields,
            validateRequired: false,
          })
        }
      }
    }
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
      const workspaceKeys = [...new Set(leads.map((l) => String(l.workspaceId || '')))]
      let exportWorkspaceId = leads[0].workspaceId
      let exportCompanyId = null
      if (workspaceKeys.length > 1) {
        if (!req.user.isCompanyAdmin) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION', message: 'Bulk export selection must be from a single workspace' },
          })
        }
        exportWorkspaceId = null
        exportCompanyId = req.user.companyId
      }
      const rows = await exportLeads(exportWorkspaceId, {}, ids, exportCompanyId)
      return res.json({ success: true, data: { rows }, meta: {} })
    }

    if ((action === 'assign' || action === 'status') && beforePlainById?.size) {
      const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
      if (action === 'assign' && bulkCollabBeforeByLeadId) {
        const afterCollab = (payload.assignedUserIds || []).map((id) => String(id))
        for (const lead of leads) {
          const beforeIds = bulkCollabBeforeByLeadId.get(String(lead.id)) || []
          await logLeadCollaboratorsChange({
            leadId: lead.id,
            userId: req.user.id,
            actorName,
            beforeUserIds: beforeIds,
            afterUserIds: afterCollab,
          })
        }
      }
      const refreshed = await Lead.findAll({ where: { id: { [Op.in]: leads.map((l) => l.id) } } })
      for (const row of refreshed) {
        await logLeadFieldChanges({
          before: beforePlainById.get(String(row.id)),
          after: row.get({ plain: true }),
          leadId: row.id,
          userId: req.user.id,
          actorName,
        })
      }
      if (action === 'assign') {
        const counts = collectBulkAssignRecipients(
          payload,
          beforePlainById,
          leads,
          bulkCollabBeforeByLeadId,
          req.user.id,
        )
        notifyLeadAssignedBatch({
          companyId: req.user.companyId,
          workspaceId: leads[0]?.workspaceId,
          actorUserId: req.user.id,
          countByUserId: counts,
        }).catch(() => {})
      }
    }

    await clearLeadListCache(leads[0].workspaceId)
    return res.json({
      success: true,
      data: { updated: leads.length - revertSkippedCount },
      meta: revertSkippedCount ? { skippedHasDeals: revertSkippedCount } : {},
    })
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
    // Every pool member must belong to the workspace being distributed.
    await assertUsersMembersOfWorkspaces(orderedUserIds, [String(workspaceId)],
      'All selected users must be members of this workspace')

    const accessWhere = await leadAccessWhere(req.user, { workspaceId: String(workspaceId) })

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
    const rrCounts = collectRoundRobinRecipients(assignments, req.user.id)
    notifyLeadAssignedBatch({
      companyId: req.user.companyId,
      workspaceId: String(workspaceId),
      actorUserId: req.user.id,
      countByUserId: rrCounts,
    }).catch(() => {})
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
    const noteActorName = await resolveActorDisplayName(req.user.id, req.user.email)
    for (const uid of leadRecipients(lead, req.user.id)) {
      notifyLeadNoteAdded({
        companyId: req.user.companyId,
        workspaceId: lead.workspaceId,
        recipientUserId: uid,
        actorUserId: req.user.id,
        actorName: noteActorName,
        leadId: lead.id,
        leadName: lead.title || lead.contactName,
      }).catch(() => {})
    }
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

async function companyGoogleEmailToken(companyId) {
  return CompanyGoogleToken.findOne({
    where: { companyId },
    order: [['updatedAt', 'DESC']],
  })
}

function hasGoogleMailboxRefreshToken(tokenRow) {
  return Boolean(tokenRow?.refreshToken)
}

function googleTokenAllowsCalendar(scopeStr) {
  if (!scopeStr || typeof scopeStr !== 'string') return false
  const s = scopeStr.toLowerCase()
  return s.includes('calendar.events') || s.includes('/auth/calendar')
}

/** Inbox / threads.list need read (or metadata/modify/full), not gmail.send alone. */
function googleTokenAllowsMailboxRead(scopeStr) {
  if (!scopeStr || typeof scopeStr !== 'string') return null
  const s = scopeStr.toLowerCase()
  if (
    s.includes('gmail.readonly') ||
    s.includes('gmail.modify') ||
    s.includes('gmail.metadata') ||
    s.includes('https://mail.google.com/')
  ) {
    return true
  }
  if (s.includes('gmail.')) return false
  return null
}

function mergeGoogleOAuthScopes(existing, incoming) {
  const set = new Set()
  for (const part of String(existing || '').split(/[\s+,]+/)) {
    if (part.trim()) set.add(part.trim())
  }
  for (const part of String(incoming || '').split(/[\s+,]+/)) {
    if (part.trim()) set.add(part.trim())
  }
  return [...set].join(' ')
}

function isInvalidGrant(err) {
  const msg = String(err?.message || err?.error || '').toLowerCase()
  const code = String(err?.response?.data?.error || err?.code || '').toLowerCase()
  return msg.includes('invalid_grant') || code === 'invalid_grant'
}

export async function getGoogleEmailAuthStatus(req, res, next) {
  try {
    const token = await companyGoogleEmailToken(req.user.companyId)
    const connected = hasGoogleMailboxRefreshToken(token)
    const readMailbox = connected ? googleTokenAllowsMailboxRead(token?.scope) : null
    const calendarConnected = connected ? googleTokenAllowsCalendar(token?.scope) : false

    if (connected) {
      try {
        const oauth2Client = getGoogleOAuthClient()
        oauth2Client.setCredentials({
          access_token: token.accessToken || undefined,
          refresh_token: token.refreshToken,
          expiry_date: token.expiryDate || undefined,
        })
        await oauth2Client.getAccessToken()
      } catch (verifyErr) {
        if (isInvalidGrant(verifyErr)) {
          return res.json({
            success: true,
            data: { connected: false, tokenExpired: true, email: token?.email || null, gmailPushConfigured: isGmailPushConfigured() },
            meta: {},
          })
        }
      }
    }

    return res.json({
      success: true,
      data: {
        connected,
        readMailbox,
        calendarConnected,
        email: token?.email || null,
        updatedAt: token?.updatedAt || null,
        gmailPushConfigured: isGmailPushConfigured(),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

function emailOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `http://localhost:${process.env.PORT || 4000}/api/v1/leads/email/google/callback`
  if (!clientId || !clientSecret || !redirectUri) {
    const err = new Error('Google OAuth is not configured')
    err.status = 500
    err.code = 'GOOGLE_OAUTH_NOT_CONFIGURED'
    throw err
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export async function getGoogleEmailConnectUrl(req, res, next) {
  try {
    const oauth2Client = emailOAuthClient()
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      /** Read + label changes (mark read, archive, etc.); readonly is insufficient for threads.modify. */
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
      'https://www.googleapis.com/auth/calendar.events',
    ]
    const returnTo = sanitizeGoogleOAuthReturnTo(req.query.returnTo)
    const state = Buffer.from(
      JSON.stringify({
        companyId: req.user.companyId,
        userId: req.user.id,
        t: Date.now(),
        ...(returnTo ? { returnTo } : {}),
      }),
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
    const oauth2Client = emailOAuthClient()
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
      scope: mergeGoogleOAuthScopes(existing?.scope, tokens.scope) || tokens.scope || existing?.scope || null,
      tokenType: tokens.token_type || null,
      expiryDate: tokens.expiry_date || null,
    }
    if (existing) await existing.update(payload)
    else await CompanyGoogleToken.create(payload)
    const row = await CompanyGoogleToken.findOne({ where: { companyId: state.companyId }, order: [['updatedAt', 'DESC']] })
    if (row) {
      registerGmailWatchForTokenRow(row).catch(() => {})
    }
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
    const base = clientOrigin.replace(/\/$/, '')
    const returnPath = state.returnTo || '/integrations'
    const query = returnPath === '/integrations' ? 'tab=google&connected=1' : 'connected=1'
    const redirectUrl = `${base}${returnPath}?${query}`
    return res.redirect(302, redirectUrl)
  } catch (e) {
    return next(e)
  }
}

export async function listLeadEmails(req, res, next) {
  try {
    const lead = await findCompanyLead(req, req.params.id)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const tokenRow = await companyGoogleEmailToken(req.user.companyId)
    if (!hasGoogleMailboxRefreshToken(tokenRow)) {
      return res.json({ success: true, data: [], meta: { googleEmailConnected: false } })
    }
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
    const tokenRow = await companyGoogleEmailToken(req.user.companyId)
    if (!hasGoogleMailboxRefreshToken(tokenRow)) {
      return res.json({ success: true, data: [], meta: { googleEmailConnected: false } })
    }
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
        threadsMap.set(threadKey, { threadId: row.threadId || null, subject: row.subject || '(No subject)', lastMessageAt: row.sentAt || row.createdAt, lastFromEmail: row.fromEmail || null, lastDirection: row.direction, count: 0, preview: row.bodyText || row.bodyHtml || '', status: row.status, hasInbound: false, messages: [] })
      }
      const current = threadsMap.get(threadKey)
      current.count += 1
      current.messages.push(row)
      if (row.direction === 'inbound') current.hasInbound = true
      if (new Date(row.sentAt || row.createdAt).getTime() > new Date(current.lastMessageAt).getTime()) {
        current.lastMessageAt = row.sentAt || row.createdAt
        current.lastFromEmail = row.fromEmail || null
        current.lastDirection = row.direction
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
    const tokenRow = await companyGoogleEmailToken(req.user.companyId)
    if (!hasGoogleMailboxRefreshToken(tokenRow)) {
      return res.json({ success: true, data: [], meta: { googleEmailConnected: false } })
    }
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

    const trackingId = randomUUID()
    const emailRow = await LeadEmail.create({
      leadId: lead.id,
      workspaceId: lead.workspaceId,
      companyId: lead.companyId,
      createdBy: req.user.id,
      fromEmail: tokenRow.email || req.user.email || null,
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
      trackingId,
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
      const apiBase = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api/v1`
      const rawBodyHtml = (value.bodyHtml || '') + attachmentFooter
      const clickPfx = `${apiBase}/track/click?id=${encodeURIComponent(trackingId)}&t=d&url=`
      let trackedBodyHtml = rawBodyHtml.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m, q, url) => `href=${q}${clickPfx}${encodeURIComponent(url)}${q}`)
      trackedBodyHtml = injectTrackingPixel(trackedBodyHtml, `${apiBase}/track/open?id=${encodeURIComponent(trackingId)}&t=d`)
      const raw = buildRawEmail({
        from: fromEmail,
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject: value.subject || '',
        bodyHtml: trackedBodyHtml,
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
      if (isInvalidGrant(sendError)) {
        return res.status(401).json({
          success: false,
          error: { code: 'GOOGLE_TOKEN_INVALID', message: 'Google account token expired. Please reconnect your Google account.' },
        })
      }
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

    try {
      const { created } = await syncRepliesForLead({ lead, tokenRow, userId: req.user.id })
      return res.json({ success: true, data: { created }, meta: {} })
    } catch (syncErr) {
      if (isInvalidGrant(syncErr)) {
        return res.status(401).json({
          success: false,
          error: { code: 'GOOGLE_TOKEN_INVALID', message: 'Google account token expired. Please reconnect your Google account.' },
        })
      }
      throw syncErr
    }
  } catch (e) {
    return next(e)
  }
}

export async function listEmailThreads(req, res, next) {
  try {
    const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
    if (!workspaceIds.length) return res.json({ success: true, data: [], meta: { total: 0 } })
    const tokenRow = await companyGoogleEmailToken(req.user.companyId)
    if (!hasGoogleMailboxRefreshToken(tokenRow)) {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
      return res.json({
        success: true,
        data: [],
        meta: { page: 1, limit, total: 0, googleEmailConnected: false },
      })
    }
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
      ...(await leadAccessWhere(req.user, { workspaceIds })),
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
    const tokenRow = await companyGoogleEmailToken(req.user.companyId)
    if (!hasGoogleMailboxRefreshToken(tokenRow)) {
      return res.json({ success: true, data: [], meta: { googleEmailConnected: false } })
    }
    const threadId = String(req.params.threadId || '')
    if (!threadId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'threadId is required' } })
    const where = threadId.startsWith('single:')
      ? { id: threadId.replace('single:', ''), companyId: req.user.companyId, workspaceId: { [Op.in]: workspaceIds } }
      : { threadId, companyId: req.user.companyId, workspaceId: { [Op.in]: workspaceIds } }
    const leadWhere = {
      ...(await leadAccessWhere(req.user, { workspaceIds })),
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
        ...(await leadAccessWhere(req.user, { workspaceIds })),
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
    const workspaceIds = await scopedWorkspaceIdsForRequest(req)
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50))
    const offset = (page - 1) * limit
    const SORTABLE = ['dueAt', 'createdAt', 'title', 'status', 'priority']
    const sortField = SORTABLE.includes(req.query.sort) ? req.query.sort : 'dueAt'
    const sortDir = req.query.sortDir === 'desc' ? 'DESC' : 'ASC'
    if (!workspaceIds.length) return res.json({ success: true, data: [], meta: { page, limit, total: 0 } })
    const statusFilters = parseCsvList(req.query.status)
      .map((v) => String(v || '').trim().toLowerCase())
      .map((v) => (v === 'open' ? 'pending' : v))
    const priorityFilters = parseCsvList(req.query.priority).map((v) => String(v || '').trim().toLowerCase())
    const taskTypeFilters = parseCsvList(req.query.taskType).map((v) => String(v || '').trim().toLowerCase())
    const overdueParam = String(req.query.overdue || '').trim().toLowerCase()
    const wantsOverdue =
      statusFilters.includes('overdue') || overdueParam === 'true' || overdueParam === 'yes' || overdueParam === '1'
    const wantsNotOverdue =
      overdueParam === 'false' || overdueParam === 'no' || overdueParam === '0' || statusFilters.includes('not_overdue')
    const realStatuses = statusFilters.filter((v) => LEAD_TASK_STATUSES.includes(v))
    const q = String(req.query.search || '').trim()
    const horizon = String(req.query.horizon || '').trim().toLowerCase()
    const createdFrom = req.query.createdFrom ? new Date(req.query.createdFrom) : null
    const createdTo = req.query.createdTo ? new Date(req.query.createdTo) : null
    const dueFrom = req.query.dueFrom ? new Date(req.query.dueFrom) : null
    const dueTo = req.query.dueTo ? new Date(req.query.dueTo) : null
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    const startOfTomorrow = new Date(now)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
    startOfTomorrow.setHours(0, 0, 0, 0)

    const leadWhere = {
      ...(await leadAccessWhere(req.user, { workspaceIds })),
      isDeleted: false,
    }
    const taskWhere = {
      companyId: req.user.companyId,
      workspaceId: { [Op.in]: workspaceIds },
    }
    const isSalesOnlyTask = !isElevated(req.user)
    if (isSalesOnlyTask) {
      // Include unassigned tasks the user created — otherwise they vanish from this
      // list (still visible on the lead's Tasks tab) the moment nobody claims them.
      const ownVisibilityClause = {
        [Op.or]: [{ assignedTo: req.user.id }, { assignedTo: null, createdBy: req.user.id }],
      }
      taskWhere[Op.and] = taskWhere[Op.and]
        ? [...(Array.isArray(taskWhere[Op.and]) ? taskWhere[Op.and] : [taskWhere[Op.and]]), ownVisibilityClause]
        : [ownVisibilityClause]
    }
    if (realStatuses.length) {
      taskWhere.status = realStatuses.length === 1 ? realStatuses[0] : { [Op.in]: realStatuses }
    } else if (wantsOverdue) {
      taskWhere.status = { [Op.in]: ['pending', 'in_progress'] }
    } else {
      const completedCutoff = new Date(now)
      completedCutoff.setDate(completedCutoff.getDate() - COMPLETED_TASKS_VISIBLE_DAYS)
      const recentCompletedClause = {
        [Op.or]: [
          { status: { [Op.ne]: 'completed' } },
          { completedAt: { [Op.gte]: completedCutoff } },
          // legacy completed rows without completedAt: fall back to updatedAt
          { [Op.and]: [{ completedAt: null }, { updatedAt: { [Op.gte]: completedCutoff } }] },
        ],
      }
      taskWhere[Op.and] = taskWhere[Op.and]
        ? [...(Array.isArray(taskWhere[Op.and]) ? taskWhere[Op.and] : [taskWhere[Op.and]]), recentCompletedClause]
        : [recentCompletedClause]
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
    const leadIdParam = req.query.leadId ? String(req.query.leadId).trim() : ''
    if (/^[0-9a-fA-F-]{36}$/.test(leadIdParam)) taskWhere.leadId = leadIdParam
    if (horizon === 'today') {
      taskWhere.dueAt = { [Op.ne]: null, [Op.gte]: startOfToday, [Op.lte]: endOfToday }
    } else if (horizon === 'upcoming') {
      taskWhere.dueAt = { [Op.ne]: null, [Op.gte]: startOfTomorrow }
    }
    if (wantsOverdue && !wantsNotOverdue) {
      taskWhere.dueAt = { ...(taskWhere.dueAt || {}), [Op.ne]: null, [Op.lt]: now }
    } else if (wantsNotOverdue && !wantsOverdue) {
      const notOverdueClause = {
        [Op.or]: [
          { status: { [Op.in]: ['completed', 'cancelled'] } },
          { dueAt: null },
          { dueAt: { [Op.gte]: now } },
        ],
      }
      taskWhere[Op.and] = taskWhere[Op.and]
        ? [...(Array.isArray(taskWhere[Op.and]) ? taskWhere[Op.and] : [taskWhere[Op.and]]), notOverdueClause]
        : [notOverdueClause]
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

    if (q) {
      taskWhere[Op.and] = taskWhere[Op.and] ? [...(Array.isArray(taskWhere[Op.and]) ? taskWhere[Op.and] : [taskWhere[Op.and]]), { [Op.or]: [{ title: { [Op.like]: `%${q}%` } }, { description: { [Op.like]: `%${q}%` } }] }] : [{ [Op.or]: [{ title: { [Op.like]: `%${q}%` } }, { description: { [Op.like]: `%${q}%` } }] }]
    }

    const { count, rows } = await LeadTask.findAndCountAll({
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
          order: [['position', 'ASC'], ['createdAt', 'ASC']],
        },
      ],
      // Active tasks (pending/in_progress) always outrank completed/cancelled ones
      // in the shared page window. Without this, a due-date-ascending sort lets old
      // completed rows (small dueAt) fill the whole `limit` and starve active tasks
      // out of the response entirely — the Board/List views bucket this one page by
      // status client-side, so a starved page renders empty Pending/In-progress
      // columns even though matching rows exist.
      order: [
        [sequelize.literal(`CASE WHEN \`LeadTask\`.\`status\` IN ('completed','cancelled') THEN 1 ELSE 0 END`), 'ASC'],
        [sortField, sortDir],
        ['createdAt', 'DESC'],
      ],
      limit,
      offset,
      distinct: true,
    })

    await promotePendingTasksByDueOrStartMany(rows)
    const decorated = rows.map((row) => decorateTaskRow(row))
    return res.json({ success: true, data: decorated, meta: { page, limit, total: count } })
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

    if (!req.body?.startAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Start date is required' } })
    if (!req.body?.dueAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date is required' } })
    const startAt = new Date(req.body.startAt)
    const dueAt = new Date(req.body.dueAt)
    if (Number.isNaN(startAt.getTime())) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid start date' } })
    if (Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid end date' } })
    if (dueAt < startAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date must be on or after the start date' } })

    const status = normalizeLeadTaskStatus(req.body?.status) || 'pending'
    const priority = normalizeLeadTaskPriority(req.body?.priority) || 'medium'
    const recurrenceRule = sanitizeRecurrenceRule(req.body?.recurrenceRule)
    const attachments = sanitizeAttachmentsInput(req.body?.attachments)
    if (req.body?.assignedTo) {
      await assertUsersMembersOfWorkspaces([String(req.body.assignedTo)], [String(lead.workspaceId)],
        'Task assignee must be a member of this lead\'s workspace')
    }

    const row = await LeadTask.create({
      leadId: lead.id,
      workspaceId: lead.workspaceId,
      companyId: lead.companyId,
      title,
      taskType: normalizeLeadTaskType(req.body?.taskType),
      description: req.body?.description || null,
      startAt,
      dueAt,
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
    if (row.assignedTo && String(row.assignedTo) !== String(req.user.id)) {
      notifyTaskAssigned({
        companyId: lead.companyId,
        workspaceId: lead.workspaceId,
        recipientUserId: row.assignedTo,
        actorUserId: req.user.id,
        tasks: [{ title: row.title }],
      }).catch(() => {})
    }
    return res.status(201).json({ success: true, data: decorateTaskRow(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchTaskById(req, res, next) {
  try {
    const row = await LeadTask.findOne({
      where: { id: req.params.taskId, companyId: req.user.companyId },
    })
    if (!row) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })
    }
    req.params.id = row.leadId
    return patchTask(req, res, next)
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
    if ('startAt' in req.body) {
      if (!req.body.startAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Start date is required' } })
      const startAt = new Date(req.body.startAt)
      if (Number.isNaN(startAt.getTime())) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid start date' } })
      payload.startAt = startAt
    }
    if ('dueAt' in req.body) {
      if (!req.body.dueAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date is required' } })
      const dueAt = new Date(req.body.dueAt)
      if (Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid end date' } })
      payload.dueAt = dueAt
    }
    {
      const effectiveStart = payload.startAt ?? row.startAt
      const effectiveDue = payload.dueAt ?? row.dueAt
      if (effectiveStart && effectiveDue && new Date(effectiveDue) < new Date(effectiveStart)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date must be on or after the start date' } })
      }
    }
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
    if ('assignedTo' in req.body) {
      if (req.body.assignedTo) {
        await assertUsersMembersOfWorkspaces([String(req.body.assignedTo)], [String(lead.workspaceId)],
          'Task assignee must be a member of this lead\'s workspace')
      }
      payload.assignedTo = req.body.assignedTo || null
    }
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
      if (after.assignedTo && String(after.assignedTo) !== String(req.user.id)) {
        notifyTaskAssigned({
          companyId: row.companyId,
          workspaceId: row.workspaceId,
          recipientUserId: after.assignedTo,
          actorUserId: req.user.id,
          tasks: [{ title: row.title }],
        }).catch(() => {})
      }
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

export async function listAllFollowups(req, res, next) {
  try {
    const workspaceIds = await scopedWorkspaceIdsForRequest(req)
    if (!workspaceIds.length) return res.json({ success: true, data: [], meta: {} })

    const where = {
      companyId: req.user.companyId,
      workspaceId: { [Op.in]: workspaceIds },
    }

    const isSales = !isElevated(req.user)
    if (isSales) {
      where.createdBy = req.user.id
    } else {
      const userIdParam = req.query.userId ? String(req.query.userId).trim() : ''
      if (/^[0-9a-fA-F-]{36}$/.test(userIdParam)) where.createdBy = userIdParam
    }

    const statusParam = String(req.query.status || '').trim().toLowerCase()
    if (['pending', 'done', 'cancelled'].includes(statusParam)) where.status = statusParam

    const rowsRaw = await LeadFollowup.findAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName'], required: true },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
      ],
      order: [['scheduledAt', 'ASC']],
      limit: 1000,
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
    const commentTargets = new Set()
    if (task.assignedTo) commentTargets.add(String(task.assignedTo))
    if (task.createdBy) commentTargets.add(String(task.createdBy))
    commentTargets.delete(String(req.user.id))
    for (const uid of commentTargets) {
      notifyTaskCommentAdded({
        companyId: req.user.companyId,
        workspaceId: task.workspaceId,
        recipientUserId: uid,
        actorUserId: req.user.id,
        taskId: task.id,
        taskTitle: task.title,
        leadId: task.leadId,
      }).catch(() => {})
    }
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
    const uploaded = Array.isArray(req.files) ? req.files : []
    if (uploaded.length) {
      const wsSegment = String(req.workspaceId || 'unscoped').replace(/[^\w-]+/g, '_')
      const rows = await LeadFile.bulkCreate(
        uploaded.map((file) => ({
          leadId: req.params.id,
          userId: req.user.id,
          fileName: file.originalname || 'attachment',
          fileUrl: `/uploads/leads/${wsSegment}/${file.filename}`,
          mimeType: file.mimetype || null,
          sizeBytes: file.size || null,
        })),
      )
      return res.status(201).json({ success: true, data: uploaded.length === 1 ? rows[0] : rows, meta: {} })
    }
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
  const perCompanyLeadLimit = Number(process.env.EMAIL_AUTOSYNC_LEADS_PER_COMPANY || 25)
  for (const token of tokens) {
    const leads = await Lead.findAll({
      where: {
        companyId: token.companyId,
        isDeleted: false,
        email: { [Op.ne]: null },
      },
      order: [['updatedAt', 'DESC']],
      limit: perCompanyLeadLimit,
    })
    for (const lead of leads) {
      try {
        await syncRepliesForLead({ lead, tokenRow: token, userId: token.userId })
      } catch {
        // keep job resilient; individual lead sync failures are best-effort
      }
    }
  }
}

export async function sourceAnalytics(req, res, next) {
  try {
    const selectedWorkspaceId = resolveListWorkspaceFilterId(req)
    const allowedWorkspaceIds = await allowedWorkspaceIdsForUser(req.user)
    const where = { isDeleted: false, companyId: req.user.companyId }
    if (selectedWorkspaceId) {
      if (!allowedWorkspaceIds.includes(String(selectedWorkspaceId))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this workspace' },
        })
      }
      where.workspaceId = String(selectedWorkspaceId)
    } else if (!req.user.isCompanyAdmin) {
      if (!allowedWorkspaceIds.length) {
        return res.json({ success: true, data: [], meta: {} })
      }
      where.workspaceId = { [Op.in]: allowedWorkspaceIds }
    }
    const rows = await Lead.findAll({
      attributes: ['source', [fn('COUNT', col('Lead.id')), 'count']],
      where,
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
    const rows = await AssignmentRule.findAll({ where: { workspaceId, companyId: req.user.companyId }, order: [['priority', 'ASC']] })
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
    const row = await AssignmentRule.findOne({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } })
    const payload = { ...(req.body || {}) }
    if ('type' in payload) delete payload.type
    await row.update(payload)
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteAssignmentRule(req, res, next) {
  try {
    const deleted = await AssignmentRule.destroy({ where: { id: req.params.id, companyId: req.user.companyId } })
    if (!deleted) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } })
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listCustomFields(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const rows = await CustomField.findAll({ where: { workspaceId, companyId: req.user.companyId }, order: [['order', 'ASC'], ['createdAt', 'ASC']] })
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createCustomField(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const { error, value } = validateFieldDefinition(req.body || {})
    if (error) {
      const message = error.details?.[0]?.context?.message || error.details?.[0]?.message || error.message
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message } })
    }
    const maxOrder = await CustomField.max('order', { where: { workspaceId, companyId: req.user.companyId } })
    const key = await generateUniqueCustomFieldKey(workspaceId, value.label)
    const row = await CustomField.create({
      label: value.label,
      key,
      type: value.type,
      options: value.options,
      isRequired: value.isRequired,
      order: value.order ?? (Number.isFinite(maxOrder) ? Number(maxOrder) + 1 : 0),
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
    const workspaceId = req.headers['x-workspace-id']
    const row = await CustomField.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Field not found' } })
    const { error, value } = validateFieldDefinition(req.body || {}, { isPatch: true })
    if (error) {
      const message = error.details?.[0]?.context?.message || error.details?.[0]?.message || error.message
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message } })
    }
    const patch = { ...value }
    if (value.label !== undefined) {
      patch.key = await generateUniqueCustomFieldKey(workspaceId, value.label, row.id)
    }
    if (value.type !== undefined && !['dropdown', 'multiselect', 'radio'].includes(value.type)) {
      patch.options = null
    }
    await row.update(patch)
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteCustomField(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await CustomField.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Field not found' } })
    const valueCount = await CustomFieldValue.count({ where: { customFieldId: row.id } })
    if (valueCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'FIELD_IN_USE',
          message: `This field has ${valueCount} saved value(s). Remove values from leads first, or keep the field.`,
        },
      })
    }
    await row.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function reorderCustomFieldsHandler(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => String(x)) : []
    if (!ids.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids are required' } })
    }
    const count = await reorderCustomFields(workspaceId, req.user.companyId, ids)
    return res.json({ success: true, data: { reordered: count }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function importRows(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const companyId = req.user.companyId
    const parsedRows = req.body?.rows || []

    // Duplicate pre-check: bulk email check before importing
    const skipDuplicates = Boolean(req.body?.skipDuplicates)
    const updateExisting = Boolean(req.body?.updateExisting)

    const emails = parsedRows.filter((r) => r.email).map((r) => String(r.email).toLowerCase().trim()).filter(Boolean)
    if (emails.length > 0) {
      const existing = await Lead.findAll({
        where: { email: { [Op.in]: emails }, companyId, isDeleted: false },
        attributes: ['email', 'id', 'title', 'contactName'],
      })
      const duplicateSet = new Set(existing.map((e) => String(e.email || '').toLowerCase()))
      const duplicates = parsedRows
        .filter((r) => r.email && duplicateSet.has(String(r.email).toLowerCase().trim()))
        .map((r) => ({ csvRow: r, existingEmail: r.email }))

      if (duplicates.length > 0 && !skipDuplicates && !updateExisting) {
        return res.json({
          success: true,
          requiresDeduplication: true,
          total: parsedRows.length,
          newCount: parsedRows.length - duplicates.length,
          duplicateCount: duplicates.length,
          duplicates: duplicates.slice(0, 50), // return first 50 for preview
        })
      }

      if (skipDuplicates && !updateExisting) {
        // Filter out duplicate rows
        const filteredRows = parsedRows.filter((r) => !r.email || !duplicateSet.has(String(r.email).toLowerCase().trim()))
        req.body.rows = filteredRows
      }
    }

    const results = await importLeads(workspaceId, companyId, req.user.id, req.body?.rows || [])
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
    const bodyWs =
      req.body?.filters?.workspaceId != null && String(req.body.filters.workspaceId).trim() !== ''
        ? String(req.body.filters.workspaceId).trim()
        : ''
    const workspaceId = bodyWs || resolveListWorkspaceFilterId(req)
    const companyScope = req.user.isCompanyAdmin && !workspaceId ? req.user.companyId : null
    if (!workspaceId && !companyScope) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'workspaceId is required (select a workspace or set x-workspace-id)' },
      })
    }
    const rows = await exportLeads(workspaceId, req.body?.filters || {}, req.body?.ids || null, companyScope)
    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getLeadSetup(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const [dealStatusCount, pipelineStatusCount] = await Promise.all([
      DealStatus.count({ where: { workspaceId, companyId: req.user.companyId } }),
      PipelineStatus.count({ where: { workspaceId, companyId: req.user.companyId } }),
    ])
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
    if (pipelineStatusCount === 0) {
      await PipelineStatus.bulkCreate([
        { name: 'New', isInitial: true, sortOrder: 0, workspaceId, companyId: req.user.companyId },
        { name: 'Qualified', isInitial: false, sortOrder: 1, workspaceId, companyId: req.user.companyId },
        { name: 'Proposal Sent', isInitial: false, sortOrder: 2, workspaceId, companyId: req.user.companyId },
        { name: 'Negotiation', isInitial: false, sortOrder: 3, workspaceId, companyId: req.user.companyId },
        { name: 'Won', isInitial: false, sortOrder: 4, workspaceId, companyId: req.user.companyId },
        { name: 'Lost', isInitial: false, sortOrder: 5, workspaceId, companyId: req.user.companyId },
      ])
    }
    const [sources, tags, dealStatuses, pipelineStatuses] = await Promise.all([
      LeadSource.findAll({ where: { workspaceId, companyId: req.user.companyId }, order: [['createdAt', 'ASC']] }),
      Tag.findAll({ where: { companyId: req.user.companyId }, order: [['name', 'ASC'], ['createdAt', 'ASC']] }),
      DealStatus.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      }),
      PipelineStatus.findAll({
        where: { workspaceId, companyId: req.user.companyId },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      }),
    ])
    return res.json({ success: true, data: { sources, tags, dealStatuses, pipelineStatuses }, meta: {} })
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

// ─── Pipeline Status CRUD ──────────────────────────────────────────────────

async function normalizePipelineStatusOrder(workspaceId, companyId, transaction) {
  const rows = await PipelineStatus.findAll({
    where: { workspaceId, companyId },
    order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    transaction,
  })
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].sortOrder !== i) await rows[i].update({ sortOrder: i }, { transaction })
  }
  // first row is always isInitial
  for (let i = 0; i < rows.length; i++) {
    const shouldBeInitial = i === 0
    if (Boolean(rows[i].isInitial) !== shouldBeInitial) {
      await rows[i].update({ isInitial: shouldBeInitial }, { transaction })
    }
  }
}

export async function createPipelineStatus(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const name = String(req.body?.name || '').trim()
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Name is required' } })
    const row = await sequelize.transaction(async (t) => {
      const maxOrder = await PipelineStatus.max('sortOrder', { where: { workspaceId, companyId: req.user.companyId }, transaction: t })
      const sortOrder = Number.isFinite(Number(maxOrder)) ? Number(maxOrder) + 1 : 0
      return PipelineStatus.create({ name, isInitial: false, sortOrder, workspaceId, companyId: req.user.companyId }, { transaction: t })
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) { return next(e) }
}

export async function updatePipelineStatus(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await PipelineStatus.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pipeline status not found' } })
    const name = String(req.body?.name ?? row.name).trim()
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Name is required' } })
    await row.update({ name })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) { return next(e) }
}

export async function deletePipelineStatus(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const row = await PipelineStatus.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pipeline status not found' } })
    await row.destroy()
    await sequelize.transaction(async (t) => normalizePipelineStatusOrder(workspaceId, req.user.companyId, t))
    return res.json({ success: true, data: {}, meta: {} })
  } catch (e) { return next(e) }
}

export async function reorderPipelineStatuses(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const { ids } = req.body || {}
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'ids required' } })
    await sequelize.transaction(async (t) => {
      for (let i = 0; i < ids.length; i++) {
        await PipelineStatus.update(
          { sortOrder: i, isInitial: i === 0 },
          { where: { id: ids[i], workspaceId, companyId: req.user.companyId }, transaction: t },
        )
      }
    })
    return res.json({ success: true, data: { reordered: ids.length }, meta: {} })
  } catch (e) { return next(e) }
}
