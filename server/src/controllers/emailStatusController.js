import { Op } from 'sequelize'
import { LeadEmail, LeadEmailLog, Lead, User, EmailTemplate } from '../models/index.js'
import { scopedWorkspaceIdsForRequest } from '../services/userWorkspaceService.js'

const ALLOWED_SOURCE = new Set(['all', 'direct', 'bulk', 'workflow'])
const ALLOWED_STATUS = new Set(['all', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed'])

function parseDate(str, fallback) {
  if (!str) return fallback
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? fallback : d
}

// LeadEmail has no opened/clicked status values (its `status` column only ever
// reaches 'sent'/'failed') — those states live in the separate openedAt/clickedAt
// columns, so the requested status filter has to be translated into a where clause
// rather than matched directly against one column.
function directStatusWhere(status) {
  if (status === 'replied' || status === 'bounced' || status === 'unsubscribed') return null
  if (status === 'clicked') return { clickedAt: { [Op.ne]: null } }
  if (status === 'opened') return { openedAt: { [Op.ne]: null }, clickedAt: null }
  if (status === 'sent') return { status: 'sent', openedAt: null, clickedAt: null }
  if (status === 'failed') return { status: 'failed' }
  return { status: { [Op.in]: ['sent', 'failed'] } }
}

function logStatusWhere(status) {
  if (status === 'failed') return null
  if (status === 'all') return { status: { [Op.ne]: 'drafted' } }
  return { status }
}

function buildDirectWhere({ companyId, workspaceIds, leadId, search, dateFrom, dateTo, status }) {
  const statusWhere = directStatusWhere(status)
  if (!statusWhere) return null
  return {
    companyId,
    workspaceId: { [Op.in]: workspaceIds },
    direction: 'outbound',
    sentAt: { [Op.between]: [dateFrom, dateTo] },
    ...(leadId ? { leadId } : {}),
    ...(search ? { subject: { [Op.like]: `%${search}%` } } : {}),
    ...statusWhere,
  }
}

function buildLogWhere({ companyId, workspaceIds, leadId, search, dateFrom, dateTo, status, source }) {
  const statusWhere = logStatusWhere(status)
  if (!statusWhere) return null
  return {
    companyId,
    workspaceId: { [Op.in]: workspaceIds },
    sentAt: { [Op.between]: [dateFrom, dateTo] },
    ...(leadId ? { leadId } : {}),
    ...(source === 'bulk' || source === 'workflow' ? { source } : {}),
    ...(search ? { [Op.or]: [{ subject: { [Op.like]: `%${search}%` } }, { toEmail: { [Op.like]: `%${search}%` } }] } : {}),
    ...statusWhere,
  }
}

function normalizeDirectRow(row) {
  let status = 'sent'
  if (row.clickedAt) status = 'clicked'
  else if (row.openedAt) status = 'opened'
  else if (row.status === 'failed') status = 'failed'
  return {
    id: row.id,
    source: 'direct',
    to: (row.toRecipients || [])[0] || '',
    subject: row.subject || '(No subject)',
    status,
    sentAt: row.sentAt || row.createdAt,
    openedAt: row.openedAt,
    clickedAt: row.clickedAt,
    openCount: row.openCount,
    clickCount: row.clickCount,
    leadId: row.leadId,
    leadLabel: row.lead ? (row.lead.title || row.lead.contactName || row.lead.email || null) : null,
    templateName: null,
    sentByName: row.creator?.name || null,
  }
}

function normalizeLogRow(row) {
  return {
    id: row.id,
    source: row.source,
    to: row.toEmail || '',
    subject: row.subject || '(No subject)',
    status: row.status,
    sentAt: row.sentAt || row.createdAt,
    openedAt: row.openedAt,
    clickedAt: row.clickedAt,
    openCount: row.openCount,
    clickCount: row.clickCount,
    leadId: row.leadId,
    leadLabel: row.lead ? (row.lead.title || row.lead.contactName || row.lead.email || null) : null,
    templateName: row.template?.name || null,
    sentByName: null,
  }
}

export async function listEmailStatus(req, res, next) {
  try {
    const companyId = req.user.companyId
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dateFrom = parseDate(req.query.dateFrom, thirtyDaysAgo)
    const dateTo = parseDate(req.query.dateTo, now)
    const source = ALLOWED_SOURCE.has(req.query.source) ? req.query.source : 'all'
    const status = ALLOWED_STATUS.has(req.query.status) ? req.query.status : 'all'
    const search = String(req.query.search || '').trim()
    const leadId = req.query.leadId || null
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100)

    const workspaceIds = await scopedWorkspaceIdsForRequest(req)
    if (!workspaceIds.length) {
      return res.json({ success: true, data: [], meta: { page, limit, total: 0, pages: 0 } })
    }

    const wantDirect = source === 'all' || source === 'direct'
    const wantLog = source === 'all' || source === 'bulk' || source === 'workflow'
    const filterArgs = { companyId, workspaceIds, leadId, search, dateFrom, dateTo, status, source }
    const directWhere = wantDirect ? buildDirectWhere(filterArgs) : null
    const logWhere = wantLog ? buildLogWhere(filterArgs) : null

    const fetchLimit = page * limit

    const [directRows, logRows, directTotal, logTotal] = await Promise.all([
      directWhere
        ? LeadEmail.findAll({
            where: directWhere,
            include: [
              { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName', 'email'], required: false },
              { model: User, as: 'creator', attributes: ['id', 'name'], required: false },
            ],
            order: [['sentAt', 'DESC']],
            limit: fetchLimit,
          })
        : [],
      logWhere
        ? LeadEmailLog.findAll({
            where: logWhere,
            include: [
              { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName', 'email'], required: false },
              { model: EmailTemplate, as: 'template', attributes: ['id', 'name'], required: false },
            ],
            order: [['sentAt', 'DESC']],
            limit: fetchLimit,
          })
        : [],
      directWhere ? LeadEmail.count({ where: directWhere }) : 0,
      logWhere ? LeadEmailLog.count({ where: logWhere }) : 0,
    ])

    const merged = [...directRows.map(normalizeDirectRow), ...logRows.map(normalizeLogRow)].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    )
    const start = (page - 1) * limit
    const pageRows = merged.slice(start, start + limit)
    const total = directTotal + logTotal

    return res.json({ success: true, data: pageRows, meta: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (e) {
    return next(e)
  }
}
