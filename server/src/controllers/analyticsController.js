import { Op, fn, col, literal } from 'sequelize'
import { getRedis } from '../config/redis.js'
import {
  Lead, LeadFollowup, Meeting, Reminder, Campaign, UserWorkspace,
  Activity, LeadTask, User, LeadSource, OpportunityStatus,
  Deal, DealPayment, DealActivity,
} from '../models/index.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function parseRange(q) {
  const now = new Date()
  const to = q.to ? new Date(q.to) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const from = q.from ? new Date(q.from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return { from, to }
}

function getContext(req) {
  const companyId = req.user.companyId
  const workspaceId = req.headers['x-workspace-id']
  const kind = req.user.userRoleKind
  const isSales = !req.user.isCompanyAdmin && kind !== 'workspace_admin' && kind !== 'manager'
  const userId = req.user.id
  return { companyId, workspaceId, isSales, userId }
}

function leadScope(ctx, extra = {}) {
  const base = { companyId: ctx.companyId, workspaceId: ctx.workspaceId, isDeleted: false, ...extra }
  return ctx.isSales
    ? { ...base, [Op.or]: [{ assignedTo: ctx.userId }, { ownerUserId: ctx.userId }] }
    : base
}

async function enrichWithUserNames(rows, idField = 'ownerUserId') {
  const ids = [...new Set(rows.map((r) => r[idField]).filter(Boolean))]
  if (!ids.length) return rows
  const users = await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'name'], raw: true })
  const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name]))
  return rows.map((r) => ({ ...r, name: nameMap[r[idField]] || 'Unknown' }))
}

function capitalize(s) {
  return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function applyLeadFilters(scope, query) {
  const out = { ...scope }
  if (query.userId) {
    out[Op.or] = [{ assignedTo: query.userId }, { ownerUserId: query.userId }]
  }
  if (query.status) out.status = query.status
  if (query.source) out.source = query.source
  if (query.stage) out.opportunityStage = query.stage
  return out
}

function getPreviousRange(from, to) {
  const duration = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - duration)
  return { from: prevFrom, to: prevTo }
}

async function buildUntouchedLeadsTable(scope, staleThreshold, limit = 100) {
  const openLeads = await Lead.findAll({
    where: { ...scope, status: { [Op.notIn]: ['won', 'lost', 'junk'] } },
    attributes: ['id', 'title', 'company', 'status', 'assignedTo', 'ownerUserId', 'updatedAt', 'createdAt'],
    raw: true,
  })
  if (!openLeads.length) return []
  const openIds = openLeads.map((r) => r.id)
  const recentIds = await Activity.findAll({
    where: { leadId: { [Op.in]: openIds }, createdAt: { [Op.gte]: staleThreshold } },
    attributes: [[fn('DISTINCT', col('lead_id')), 'leadId']],
    raw: true,
  }).then((rows) => new Set(rows.map((r) => r.leadId)))
  const stale = openLeads.filter((l) => !recentIds.has(l.id))
  const userIds = [...new Set(stale.flatMap((l) => [l.assignedTo, l.ownerUserId]).filter(Boolean))]
  const users = userIds.length
    ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name'], raw: true })
    : []
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))
  const now = new Date()
  return stale
    .map((l) => ({
      id: l.id,
      title: l.title,
      company: l.company,
      status: l.status,
      owner: userMap[l.ownerUserId] || '—',
      assignee: userMap[l.assignedTo] || 'Unassigned',
      daysSinceActivity: Math.floor((now - new Date(l.updatedAt || l.createdAt)) / 86400000),
      createdAt: l.createdAt,
    }))
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
    .slice(0, limit)
}

function serializeAnalyticsTask(task, now = new Date()) {
  const plain = task.get ? task.get({ plain: true }) : task
  const status = String(plain.status || '').toLowerCase()
  const due = plain.dueAt ? new Date(plain.dueAt) : null
  const isOpen = status === 'pending' || status === 'in_progress'
  const isOverdue = isOpen && due && !Number.isNaN(due.getTime()) && due < now
  return {
    id: plain.id,
    title: plain.title,
    status: plain.status,
    priority: plain.priority,
    taskType: plain.taskType,
    assignee: plain.assignee?.name || plain.assignee?.email || null,
    assigneeEmail: plain.assignee?.email || null,
    lead: plain.lead?.title || plain.lead?.contactName || null,
    leadId: plain.leadId,
    dueAt: plain.dueAt,
    createdAt: plain.createdAt,
    completedAt: plain.completedAt,
    isOverdue,
  }
}

async function buildAssigneeWorkload({ allScope, periodScope, now }) {
  const openRows = await LeadTask.findAll({
    where: { ...allScope, status: { [Op.notIn]: ['completed', 'cancelled'] } },
    attributes: ['assignedTo', 'status', 'dueAt'],
    raw: true,
  })
  const [assignedInPeriod, completedInPeriod] = await Promise.all([
    LeadTask.findAll({
      where: { ...periodScope, assignedTo: { [Op.ne]: null } },
      attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']],
      group: ['assignedTo'],
      raw: true,
    }),
    LeadTask.findAll({
      where: { ...periodScope, status: 'completed', assignedTo: { [Op.ne]: null } },
      attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']],
      group: ['assignedTo'],
      raw: true,
    }),
  ])
  const periodAssignedMap = Object.fromEntries(assignedInPeriod.map((r) => [r.assignedTo, Number(r.count)]))
  const periodCompletedMap = Object.fromEntries(completedInPeriod.map((r) => [r.assignedTo, Number(r.count)]))

  const stats = new Map()
  const ensure = (uid) => {
    const key = uid || '__unassigned__'
    if (!stats.has(key)) {
      stats.set(key, {
        userId: uid,
        open: 0,
        pending: 0,
        inProgress: 0,
        overdue: 0,
        assignedInPeriod: periodAssignedMap[uid] || 0,
        completedInPeriod: periodCompletedMap[uid] || 0,
      })
    }
    return stats.get(key)
  }
  for (const uid of [...new Set([...Object.keys(periodAssignedMap), ...Object.keys(periodCompletedMap)])]) {
    ensure(uid)
  }
  for (const row of openRows) {
    const s = ensure(row.assignedTo)
    s.open += 1
    if (row.status === 'pending') s.pending += 1
    if (row.status === 'in_progress') s.inProgress += 1
    const due = row.dueAt ? new Date(row.dueAt) : null
    if (due && !Number.isNaN(due.getTime()) && due < now) s.overdue += 1
  }

  const userIds = [...stats.keys()].filter((k) => k !== '__unassigned__')
  const users = userIds.length
    ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'email'], raw: true })
    : []
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  return [...stats.entries()]
    .map(([key, s]) => ({
      userId: s.userId,
      name: key === '__unassigned__' ? 'Unassigned' : userMap[s.userId]?.name || 'Unknown',
      email: key === '__unassigned__' ? null : userMap[s.userId]?.email || null,
      open: s.open,
      pending: s.pending,
      inProgress: s.inProgress,
      overdue: s.overdue,
      assignedInPeriod: s.assignedInPeriod,
      completedInPeriod: s.completedInPeriod,
    }))
    .sort((a, b) => b.open - a.open || b.overdue - a.overdue)
}

// ─── existing ────────────────────────────────────────────────────────────────

export async function dashboardStats(req, res, next) {
  try {
    const redis = getRedis()
    const cacheKey = `stats:${req.user.id}`

    if (redis) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          try {
            return res.json({ success: true, data: JSON.parse(cached), meta: { cached: true } })
          } catch { /* corrupt cache */ }
        }
      } catch { /* fall through */ }
    }

    const data = { openLeads: 0, pipelineValue: '$0', tasksDue: 0 }

    if (redis) {
      try { await redis.set(cacheKey, JSON.stringify(data), 'EX', 300) } catch { /* ignore */ }
    }

    return res.json({ success: true, data, meta: { cached: false } })
  } catch (e) {
    return next(e)
  }
}

export async function navBadges(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const companyId = req.user.companyId
    if (!workspaceId || !companyId) return res.json({ success: true, data: {} })

    const kind = req.user.userRoleKind
    const isSales = !req.user.isCompanyAdmin && kind !== 'workspace_admin' && kind !== 'manager'
    const userId = req.user.id
    const leadBase = { companyId, workspaceId, isDeleted: false }
    const leadWhere = isSales
      ? { ...leadBase, [Op.or]: [{ assignedTo: userId }, { ownerUserId: userId }] }
      : leadBase

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const assignedLeadWhere = isSales
      ? leadWhere
      : { ...leadBase, assignedTo: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } }

    const [
      leadsCount, opportunitiesCount, unassignedCount,
      followupsToday, remindersToday, meetingsToday, activeCampaigns, teamCount,
    ] = await Promise.all([
      Lead.count({ where: { ...assignedLeadWhere, isOpportunity: false } }),
      Lead.count({ where: { ...leadWhere, isOpportunity: true } }),
      Lead.count({ where: { companyId, workspaceId, isDeleted: false, assignedTo: { [Op.is]: null } } }),
      LeadFollowup.count({
        where: { companyId, workspaceId, status: 'pending', scheduledAt: { [Op.gte]: todayStart, [Op.lte]: todayEnd }, ...(isSales ? { createdBy: userId } : {}) },
      }),
      Reminder.count({
        where: { companyId, workspaceId, status: 'pending', remindAt: { [Op.gte]: todayStart, [Op.lte]: todayEnd }, ...(isSales ? { ownerUserId: userId } : {}) },
      }),
      Meeting.count({
        where: { workspaceId, scheduledStart: { [Op.gte]: todayStart, [Op.lte]: todayEnd }, ...(isSales ? { ownerUserId: userId } : {}) },
      }),
      Campaign.count({ where: { companyId, workspaceId, status: 'active', ...(isSales ? { createdBy: userId } : {}) } }),
      UserWorkspace.count({ where: { workspaceId } }),
    ])

    return res.json({
      success: true,
      data: {
        leads: leadsCount, opportunities: opportunitiesCount, leadDistribution: unassignedCount,
        calendar: followupsToday + remindersToday, meetings: meetingsToday,
        campaigns: activeCampaigns, team: teamCount,
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── leads report ─────────────────────────────────────────────────────────────

export async function leadsReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const scope = applyLeadFilters(leadScope(ctx, { isOpportunity: false }), req.query)
    const allLeadScope = leadScope(ctx, {}) // all leads incl opps for funnel
    const periodScope = { ...scope, createdAt: { [Op.between]: [from, to] } }
    const comparePrevious = req.query.comparePrevious === 'true'
    const prevRange = comparePrevious ? getPreviousRange(from, to) : null
    const now = new Date()
    const staleThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [
      total, newInPeriod, won, lost, junk,
      totalOpps, totalDeals, totalDealsWon,
      assigned, unassigned,
      statusDist, sourceDist, stageDist, trend, byCountry, byOwnerRaw, top10,
      staleLeadIds,
    ] = await Promise.all([
      Lead.count({ where: scope }),
      Lead.count({ where: periodScope }),
      Lead.count({ where: { ...scope, status: 'won' } }),
      Lead.count({ where: { ...scope, status: 'lost' } }),
      Lead.count({ where: { ...scope, status: 'junk' } }),
      Lead.count({ where: { ...allLeadScope, isOpportunity: true } }),
      Deal.count({ where: { workspaceId: ctx.workspaceId, companyId: ctx.companyId, isDeleted: false } }),
      Deal.count({ where: { workspaceId: ctx.workspaceId, companyId: ctx.companyId, isDeleted: false, stage: { [Op.in]: ['Won', 'won'] } } }),
      Lead.count({ where: { ...scope, assignedTo: { [Op.ne]: null } } }),
      Lead.count({ where: { ...scope, assignedTo: null } }),
      Lead.findAll({ where: scope, attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true }),
      Lead.findAll({ where: scope, attributes: ['source', [fn('COUNT', col('id')), 'count']], group: ['source'], order: [[literal('count'), 'DESC']], raw: true }),
      Lead.findAll({
        where: { ...allLeadScope, isOpportunity: true, opportunityStage: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } },
        attributes: ['opportunityStage', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
        group: ['opportunityStage'], order: [[literal('count'), 'DESC']], raw: true,
      }),
      Lead.findAll({ where: periodScope, attributes: [[fn('DATE', col('created_at')), 'date'], [fn('COUNT', col('id')), 'count']], group: [fn('DATE', col('created_at'))], order: [[fn('DATE', col('created_at')), 'ASC']], raw: true }),
      Lead.findAll({ where: { ...scope, country: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } }, attributes: ['country', [fn('COUNT', col('id')), 'count']], group: ['country'], order: [[literal('count'), 'DESC']], limit: 10, raw: true }),
      Lead.findAll({ where: { ...scope, ownerUserId: { [Op.ne]: null } }, attributes: ['ownerUserId', [fn('COUNT', col('id')), 'count']], group: ['ownerUserId'], order: [[literal('count'), 'DESC']], limit: 10, raw: true }),
      Lead.findAll({ where: { ...scope, value: { [Op.ne]: null, [Op.gt]: 0 } }, include: [{ model: User, as: 'owner', attributes: ['name'], required: false }, { model: LeadSource, as: 'leadSource', attributes: ['name'], required: false }], order: [['value', 'DESC']], limit: 10 }),
      // stale = open leads with no activity in last 14 days
      Lead.findAll({ where: { ...scope, status: { [Op.notIn]: ['won', 'lost', 'junk'] } }, attributes: ['id'], raw: true }),
    ])

    // Score distribution buckets
    const scoreRows = await Lead.findAll({
      where: scope,
      attributes: [
        [literal('CASE WHEN score IS NULL OR score = 0 THEN \'0\' WHEN score <= 20 THEN \'1-20\' WHEN score <= 40 THEN \'21-40\' WHEN score <= 60 THEN \'41-60\' WHEN score <= 80 THEN \'61-80\' ELSE \'81-100\' END'), 'bucket'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: [literal('bucket')],
      raw: true,
    })
    const scoreDist = ['0', '1-20', '21-40', '41-60', '61-80', '81-100'].map((b) => {
      const row = scoreRows.find((r) => r.bucket === b)
      return { range: b, count: Number(row?.count || 0) }
    })

    // Stale leads — check recent activity
    const openLeadIds = staleLeadIds.map((r) => r.id)
    let staleCount = 0
    if (openLeadIds.length) {
      const recentActivityLeadIds = await Activity.findAll({
        where: { leadId: { [Op.in]: openLeadIds }, createdAt: { [Op.gte]: staleThreshold } },
        attributes: [[fn('DISTINCT', col('lead_id')), 'leadId']],
        raw: true,
      }).then((rows) => new Set(rows.map((r) => r.leadId)))
      staleCount = openLeadIds.filter((id) => !recentActivityLeadIds.has(id)).length
    }

    const byOwner = await enrichWithUserNames(byOwnerRaw, 'ownerUserId')
    const untouchedLeads = await buildUntouchedLeadsTable(scope, staleThreshold)

    let previousKpis = null
    if (prevRange) {
      const prevScope = { ...scope, createdAt: { [Op.between]: [prevRange.from, prevRange.to] } }
      const [prevNew, prevWon] = await Promise.all([
        Lead.count({ where: prevScope }),
        Lead.count({ where: { ...scope, status: 'won', updatedAt: { [Op.between]: [prevRange.from, prevRange.to] } } }),
      ])
      previousKpis = { newInPeriod: prevNew, won: prevWon, total, staleLeads: staleCount }
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          total, newInPeriod, won, lost, junk, assigned, unassigned, staleLeads: staleCount,
          conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
          previous: previousKpis,
        },
        charts: {
          statusDist: statusDist.map((r) => ({ name: capitalize(r.status), value: Number(r.count) })),
          sourceDist: sourceDist.map((r) => ({ name: capitalize(r.source || 'Unknown'), value: Number(r.count) })),
          stageDist: stageDist.map((r) => ({ name: capitalize(r.opportunityStage), count: Number(r.count), value: Number(r.totalValue) })),
          trend: trend.map((r) => ({ date: r.date, count: Number(r.count) })),
          byCountry: byCountry.map((r) => ({ country: r.country, count: Number(r.count) })),
          byOwner: byOwner.map((r) => ({ name: r.name, count: Number(r.count) })),
          scoreDist,
          conversionFunnel: [
            { stage: 'Total Leads', count: total },
            { stage: 'Opportunities', count: totalOpps },
            { stage: 'Deals', count: totalDeals },
            { stage: 'Won', count: totalDealsWon },
          ],
        },
        tables: {
          top10: top10.map((l) => ({
            id: l.id, title: l.title, company: l.company, status: l.status,
            source: l.leadSource?.name || capitalize(l.source || ''),
            value: l.value, valueCurrency: l.valueCurrency,
            owner: l.owner?.name || '—', createdAt: l.createdAt,
          })),
          untouchedLeads,
        },
      },
    })
  } catch (e) { return next(e) }
}

// ─── pipeline report ──────────────────────────────────────────────────────────

export async function pipelineReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const scope = leadScope(ctx, { isOpportunity: true })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [allOpps, wonOpps, lostOpps, stageDistRaw, wonLostTrendRaw, closingForecastRaw, top10] =
      await Promise.all([
        Lead.findAll({
          where: scope,
          attributes: [[fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
          raw: true,
        }),
        Lead.findAll({
          where: { ...scope, status: 'won' },
          attributes: [[fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
          raw: true,
        }),
        Lead.findAll({
          where: { ...scope, status: 'lost' },
          attributes: [[fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
          raw: true,
        }),
        Lead.findAll({
          where: scope,
          attributes: ['opportunityStage', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
          group: ['opportunityStage'],
          order: [[literal('count'), 'DESC']],
          raw: true,
        }),
        Lead.findAll({
          where: { ...scope, status: { [Op.in]: ['won', 'lost'] }, createdAt: { [Op.between]: [from, to] } },
          attributes: [
            [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
            'status',
            [fn('COUNT', col('id')), 'count'],
          ],
          group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'status'],
          order: [[literal('month'), 'ASC']],
          raw: true,
        }),
        Lead.findAll({
          where: {
            ...scope,
            closingDate: { [Op.between]: [now, new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)] },
          },
          attributes: [
            [fn('DATE_FORMAT', col('closing_date'), '%Y-%m-%d'), 'week'],
            [fn('COUNT', col('id')), 'count'],
            [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue'],
          ],
          group: [fn('DATE_FORMAT', col('closing_date'), '%Y-%m-%d')],
          order: [[fn('DATE_FORMAT', col('closing_date'), '%Y-%m-%d'), 'ASC']],
          raw: true,
        }),
        Lead.findAll({
          where: { ...scope, value: { [Op.ne]: null, [Op.gt]: 0 } },
          include: [{ model: User, as: 'owner', attributes: ['name'], required: false }],
          order: [['value', 'DESC']],
          limit: 10,
        }),
      ])

    const total = Number(allOpps[0]?.count || 0)
    const totalValue = Number(allOpps[0]?.totalValue || 0)
    const wonCount = Number(wonOpps[0]?.count || 0)
    const wonValue = Number(wonOpps[0]?.totalValue || 0)
    const lostValue = Number(lostOpps[0]?.totalValue || 0)

    // Build won vs lost monthly trend
    const wonLostMap = {}
    for (const r of wonLostTrendRaw) {
      if (!wonLostMap[r.month]) wonLostMap[r.month] = { month: r.month, won: 0, lost: 0 }
      wonLostMap[r.month][r.status] = Number(r.count)
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          totalValue,
          avgDealSize: total > 0 ? Math.round(totalValue / total) : 0,
          wonValue,
          lostValue,
          winRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
          closingThisMonth: await Lead.count({
            where: { ...scope, closingDate: { [Op.between]: [monthStart, monthEnd] } },
          }),
        },
        charts: {
          stageDist: stageDistRaw
            .filter((r) => r.opportunityStage)
            .map((r) => ({
              name: capitalize(r.opportunityStage),
              count: Number(r.count),
              value: Number(r.totalValue),
            })),
          wonVsLost: Object.values(wonLostMap),
          closingForecast: closingForecastRaw.map((r) => ({
            week: r.week,
            count: Number(r.count),
            value: Number(r.totalValue),
          })),
        },
        tables: {
          top10: top10.map((l) => ({
            id: l.id,
            title: l.title,
            company: l.company,
            stage: capitalize(l.opportunityStage || ''),
            status: l.status,
            value: l.value,
            valueCurrency: l.valueCurrency,
            owner: l.owner?.name || '—',
            closingDate: l.closingDate,
          })),
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── deals report ────────────────────────────────────────────────────────────

export async function dealsReport(req, res, next) {
  try {
    const { companyId } = getContext(req)
    const { from, to } = parseRange(req.query)
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const base = { workspaceId, companyId, isDeleted: false }
    if (req.query.userId) base.assignedTo = req.query.userId
    if (req.query.stage) base.stage = req.query.stage
    const periodBase = { ...base, created_at: { [Op.between]: [from, to] } }
    const now = new Date()

    const dealIncludes = [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false }]

    const [
      totalDeals, openDeals, stageDist,
      wonLostTrend, dealsByOwnerRaw,
      paymentSummary, paymentsByMode, paymentsTrend,
      recentDeals, wonInPeriod, createdInPeriod, dealValueDist,
    ] = await Promise.all([
      Deal.count({ where: base }),
      Deal.count({ where: { ...base, stage: { [Op.notIn]: ['Won', 'Lost', 'won', 'lost'] } } }),
      Deal.findAll({
        where: base,
        attributes: ['stage', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
        group: ['stage'], order: [[literal('count'), 'DESC']], raw: true,
      }),
      Deal.findAll({
        where: periodBase,
        attributes: [
          [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
          'stage',
          [fn('COUNT', col('id')), 'count'],
          [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue'],
        ],
        group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'stage'],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      Deal.findAll({
        where: { ...base, assignedTo: { [Op.ne]: null } },
        attributes: ['assignedTo', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
        group: ['assignedTo'], order: [[literal('totalValue'), 'DESC']], limit: 15, raw: true,
      }),
      DealPayment.findAll({
        where: { workspaceId, companyId },
        attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('amount')), 0), 'totalAmount']],
        group: ['status'], raw: true,
      }),
      DealPayment.findAll({
        where: { workspaceId, companyId, status: 'received' },
        attributes: ['mode', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('amount')), 0), 'totalAmount']],
        group: ['mode'], order: [[literal('totalAmount'), 'DESC']], raw: true,
      }),
      DealPayment.findAll({
        where: { workspaceId, companyId, created_at: { [Op.between]: [from, to] } },
        attributes: [
          [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
          'status',
          [fn('COALESCE', fn('SUM', col('amount')), 0), 'totalAmount'],
        ],
        group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'status'],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      Deal.findAll({
        where: base,
        include: dealIncludes,
        order: [['updated_at', 'DESC']],
        limit: 20,
      }),
      Deal.findAll({
        where: { ...base, stage: { [Op.in]: ['Won', 'won'] }, updated_at: { [Op.between]: [from, to] } },
        include: dealIncludes,
        order: [['updated_at', 'DESC']],
        limit: 100,
      }),
      Deal.findAll({
        where: { ...periodBase },
        include: dealIncludes,
        order: [['created_at', 'DESC']],
        limit: 100,
      }),
      // value distribution buckets
      Deal.findAll({
        where: base,
        attributes: [
          [literal('CASE WHEN value IS NULL OR value = 0 THEN \'0\' WHEN value <= 10000 THEN \'0–10K\' WHEN value <= 50000 THEN \'10K–50K\' WHEN value <= 100000 THEN \'50K–100K\' WHEN value <= 500000 THEN \'100K–500K\' ELSE \'500K+\' END'), 'bucket'],
          [fn('COUNT', col('id')), 'count'],
          [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue'],
        ],
        group: [literal('bucket')],
        raw: true,
      }),
    ])

    // total pipeline value
    const pipelineValue = await Deal.findAll({ where: base, attributes: [[fn('COALESCE', fn('SUM', col('value')), 0), 'total']], raw: true })
    const wonValue = await Deal.findAll({
      where: { ...base, stage: { [Op.in]: ['Won', 'won'] } },
      attributes: [[fn('COALESCE', fn('SUM', col('value')), 0), 'total']], raw: true,
    })

    // Build monthly trend map
    const trendMap = {}
    for (const r of wonLostTrend) {
      if (!trendMap[r.month]) trendMap[r.month] = { month: r.month, created: 0, createdValue: 0 }
      trendMap[r.month].created += Number(r.count)
      trendMap[r.month].createdValue += Number(r.totalValue)
    }
    const monthlyTrend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month))

    // Payment trend map
    const payTrendMap = {}
    for (const r of paymentsTrend) {
      if (!payTrendMap[r.month]) payTrendMap[r.month] = { month: r.month, received: 0, pending: 0 }
      if (r.status === 'received') payTrendMap[r.month].received = Number(r.totalAmount)
      if (r.status === 'pending') payTrendMap[r.month].pending = Number(r.totalAmount)
    }

    // Owner enrichment
    const ownerIds = [...new Set(dealsByOwnerRaw.map((r) => r.assignedTo).filter(Boolean))]
    const owners = ownerIds.length ? await User.findAll({ where: { id: { [Op.in]: ownerIds } }, attributes: ['id', 'name', 'email'], raw: true }) : []
    const ownerMap = Object.fromEntries(owners.map((u) => [u.id, u]))

    const payMap = Object.fromEntries(paymentSummary.map((r) => [r.status, { count: Number(r.count), total: Number(r.totalAmount) }]))

    const BUCKET_ORDER = ['0', '0–10K', '10K–50K', '50K–100K', '100K–500K', '500K+']
    const valueDist = BUCKET_ORDER.map((b) => {
      const row = dealValueDist.find((r) => r.bucket === b)
      return { range: b, count: Number(row?.count || 0), value: Number(row?.totalValue || 0) }
    })

    return res.json({
      success: true,
      data: {
        kpis: {
          totalDeals,
          openDeals,
          pipelineValue: Number(pipelineValue[0]?.total || 0),
          wonValue: Number(wonValue[0]?.total || 0),
          paymentsReceived: payMap.received?.total || 0,
          paymentsPending: payMap.pending?.total || 0,
          winRate: totalDeals > 0 ? Math.round(((stageDist.find((s) => /won/i.test(s.stage))?.count || 0) / totalDeals) * 100) : 0,
        },
        charts: {
          stageDist: stageDist.map((r) => ({ name: r.stage || 'Uncategorised', count: Number(r.count), value: Number(r.totalValue) })),
          monthlyTrend,
          dealsByOwner: dealsByOwnerRaw.map((r) => ({ name: ownerMap[r.assignedTo]?.name || 'Unknown', count: Number(r.count), value: Number(r.totalValue) })),
          paymentsByMode: paymentsByMode.map((r) => ({ mode: (r.mode || '').replace(/_/g, ' '), count: Number(r.count), value: Number(r.totalAmount) })),
          paymentsByStatus: paymentSummary.map((r) => ({ status: r.status, count: Number(r.count), value: Number(r.totalAmount) })),
          paymentsTrend: Object.values(payTrendMap).sort((a, b) => a.month.localeCompare(b.month)),
          valueDist,
        },
        tables: {
          recentDeals: recentDeals.map((d) => ({
            id: d.id,
            name: d.name,
            stage: d.stage,
            value: Number(d.value || 0),
            currency: d.valueCurrency,
            owner: d.assignee?.name || d.assignee?.email || '—',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          })),
          wonInPeriod: wonInPeriod.map((d) => ({
            id: d.id,
            name: d.name,
            stage: d.stage,
            value: Number(d.value || 0),
            currency: d.valueCurrency,
            owner: d.assignee?.name || d.assignee?.email || '—',
            wonAt: d.updatedAt,
          })),
          createdInPeriod: createdInPeriod.map((d) => ({
            id: d.id,
            name: d.name,
            stage: d.stage,
            value: Number(d.value || 0),
            currency: d.valueCurrency,
            owner: d.assignee?.name || d.assignee?.email || '—',
            createdAt: d.createdAt,
          })),
          dealsByOwner: dealsByOwnerRaw.map((r) => ({
            name: ownerMap[r.assignedTo]?.name || 'Unknown',
            email: ownerMap[r.assignedTo]?.email || '',
            deals: Number(r.count),
            value: Number(r.totalValue),
          })),
        },
      },
    })
  } catch (e) { return next(e) }
}

// ─── activities report ────────────────────────────────────────────────────────

export async function activitiesReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId, workspaceId, isSales, userId } = ctx

    // Scope activities via lead workspace
    const leadIds = await Lead.findAll({
      where: {
        companyId,
        workspaceId,
        isDeleted: false,
        ...(isSales ? { [Op.or]: [{ assignedTo: userId }, { ownerUserId: userId }] } : {}),
      },
      attributes: ['id'],
      raw: true,
    }).then((rows) => rows.map((r) => r.id))

    if (!leadIds.length) {
      return res.json({
        success: true,
        data: { kpis: { total: 0, calls: 0, emails: 0, meetings: 0, notes: 0, tasks: 0 }, charts: {}, tables: {} },
      })
    }

    const actWhere = { leadId: { [Op.in]: leadIds }, createdAt: { [Op.between]: [from, to] } }

    const followupWhere = { companyId, workspaceId, createdAt: { [Op.between]: [from, to] } }

    const [typeDist, trend, byUserRaw, byLeadRaw, heatmapRaw, followupTotal, followupDone] = await Promise.all([
      Activity.findAll({
        where: actWhere,
        attributes: ['type', [fn('COUNT', col('id')), 'count']],
        group: ['type'],
        raw: true,
      }),
      Activity.findAll({
        where: actWhere,
        attributes: [[fn('DATE', col('created_at')), 'date'], [fn('COUNT', col('id')), 'count']],
        group: [fn('DATE', col('created_at'))],
        order: [[fn('DATE', col('created_at')), 'ASC']],
        raw: true,
      }),
      Activity.findAll({
        where: { ...actWhere, userId: { [Op.ne]: null } },
        attributes: ['userId', [fn('COUNT', col('id')), 'count']],
        group: ['userId'],
        order: [[literal('count'), 'DESC']],
        limit: 10,
        raw: true,
      }),
      Activity.findAll({
        where: { ...actWhere, leadId: { [Op.ne]: null } },
        attributes: ['leadId', [fn('COUNT', col('id')), 'count']],
        group: ['leadId'],
        order: [[literal('count'), 'DESC']],
        limit: 10,
        raw: true,
      }),
      // Heatmap: count per WEEKDAY (0=Sun) × HOUR
      Activity.findAll({
        where: actWhere,
        attributes: [
          [fn('DAYOFWEEK', col('created_at')), 'dow'],
          [fn('HOUR', col('created_at')), 'hour'],
          [fn('COUNT', col('id')), 'count'],
        ],
        group: [fn('DAYOFWEEK', col('created_at')), fn('HOUR', col('created_at'))],
        raw: true,
      }),
      LeadFollowup.count({ where: followupWhere }),
      LeadFollowup.count({ where: { ...followupWhere, status: 'completed' } }),
    ])

    const typeMap = Object.fromEntries(typeDist.map((r) => [r.type, Number(r.count)]))
    const total = Object.values(typeMap).reduce((s, n) => s + n, 0)

    const byUser = await enrichWithUserNames(byUserRaw, 'userId')

    // Enrich lead names
    const topLeadIds = byLeadRaw.map((r) => r.leadId).filter(Boolean)
    const topLeads = topLeadIds.length
      ? await Lead.findAll({ where: { id: { [Op.in]: topLeadIds } }, attributes: ['id', 'title'], raw: true })
      : []
    const leadNameMap = Object.fromEntries(topLeads.map((l) => [l.id, l.title]))
    const byLead = byLeadRaw.map((r) => ({ name: leadNameMap[r.leadId] || 'Unknown', count: Number(r.count) }))

    // Build heatmap matrix (7 days × 24 hours)
    const heatmap = []
    for (let d = 1; d <= 7; d++) {
      for (let h = 0; h < 24; h++) {
        const row = heatmapRaw.find((r) => Number(r.dow) === d && Number(r.hour) === h)
        heatmap.push({ dow: d, hour: h, count: Number(row?.count || 0) })
      }
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          total,
          calls: typeMap.call || 0,
          emails: typeMap.email || 0,
          meetings: typeMap.meeting || 0,
          notes: typeMap.note || 0,
          tasks: typeMap.task || 0,
          followupsCreated: followupTotal,
          followupsDone: followupDone,
          followupRate: followupTotal > 0 ? Math.round((followupDone / followupTotal) * 100) : 0,
        },
        charts: {
          typeDist: typeDist.map((r) => ({ name: capitalize(r.type), value: Number(r.count) })),
          trend: trend.map((r) => ({ date: r.date, count: Number(r.count) })),
          byUser: byUser.map((r) => ({ name: r.name, count: Number(r.count) })),
          byLead,
          heatmap,
        },
        tables: {},
      },
    })
  } catch (e) { return next(e) }
}

// ─── meetings report ──────────────────────────────────────────────────────────

export async function meetingsReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId, workspaceId, isSales, userId } = ctx

    const view = req.query.view || 'all'
    const filterUserId = req.query.userId || (isSales ? userId : null)
    const now = new Date()

    let dateFilter
    if (view === 'upcoming') {
      dateFilter = { [Op.gte]: now, [Op.lte]: new Date(now.getTime() + 30 * 86400000) }
    } else if (view === 'past') {
      dateFilter = { [Op.and]: [{ [Op.between]: [from, to] }, { [Op.lt]: now }] }
    } else {
      dateFilter = { [Op.between]: [from, to] }
    }

    const scope = {
      workspaceId,
      scheduledStart: dateFilter,
      ...(filterUserId ? { ownerUserId: filterUserId } : {}),
    }

    const [total, completed, cancelled, missed, recorded, withSummary, videoCount, phoneCount,
      typeDist, statusDist, trend, byOwnerRaw, recent, durationDist] =
      await Promise.all([
        Meeting.count({ where: scope }),
        Meeting.count({ where: { ...scope, status: 'completed' } }),
        Meeting.count({ where: { ...scope, status: 'cancelled' } }),
        Meeting.count({ where: { ...scope, status: 'missed' } }),
        Meeting.count({ where: { ...scope, recordingStatus: 'completed' } }),
        Meeting.count({ where: { ...scope, status: 'completed', transcriptionStatus: { [Op.in]: ['completed', 'done'] } } }),
        Meeting.count({ where: { ...scope, channel: { [Op.in]: ['video', 'google_meet'] } } }),
        Meeting.count({ where: { ...scope, channel: { [Op.in]: ['phone', 'call', 'offline'] } } }),
        Meeting.findAll({ where: scope, attributes: ['meetingType', [fn('COUNT', col('id')), 'count']], group: ['meetingType'], raw: true }),
        Meeting.findAll({ where: scope, attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true }),
        Meeting.findAll({
          where: scope,
          attributes: [[fn('DATE', col('scheduled_start')), 'date'], [fn('COUNT', col('id')), 'count']],
          group: [fn('DATE', col('scheduled_start'))],
          order: [[fn('DATE', col('scheduled_start')), 'ASC']],
          raw: true,
        }),
        Meeting.findAll({
          where: { ...scope, ownerUserId: { [Op.ne]: null } },
          attributes: ['ownerUserId', [fn('COUNT', col('id')), 'count'], [fn('SUM', literal('CASE WHEN status=\'completed\' THEN 1 ELSE 0 END')), 'completedCount'], [fn('SUM', literal('CASE WHEN status=\'cancelled\' THEN 1 ELSE 0 END')), 'cancelledCount'], [fn('SUM', literal('CASE WHEN status=\'missed\' THEN 1 ELSE 0 END')), 'missedCount']],
          group: ['ownerUserId'],
          order: [[literal('count'), 'DESC']],
          limit: 15,
          raw: true,
        }),
        Meeting.findAll({
          where: scope,
          attributes: ['id', 'title', 'meetingType', 'status', 'durationMinutes', 'scheduledStart', 'ownerUserId', 'channel'],
          order: view === 'upcoming' ? [['scheduledStart', 'ASC']] : [['scheduledStart', 'DESC']],
          limit: view === 'upcoming' ? 50 : 20,
          raw: true,
        }),
        // Duration buckets
        Meeting.findAll({
          where: { ...scope, durationMinutes: { [Op.ne]: null } },
          attributes: [
            [literal('CASE WHEN duration_minutes < 15 THEN \'<15 min\' WHEN duration_minutes < 30 THEN \'15-30 min\' WHEN duration_minutes < 60 THEN \'30-60 min\' WHEN duration_minutes < 90 THEN \'60-90 min\' ELSE \'90+ min\' END'), 'bucket'],
            [fn('COUNT', col('id')), 'count'],
          ],
          group: [literal('bucket')],
          raw: true,
        }),
      ])

    const [byOwner, avgDurationRows] = await Promise.all([
      enrichWithUserNames(byOwnerRaw, 'ownerUserId'),
      Meeting.findAll({
        where: { ...scope, durationMinutes: { [Op.ne]: null } },
        attributes: [[fn('AVG', col('duration_minutes')), 'avg']],
        raw: true,
      }),
    ])

    const avgDuration = Math.round(Number(avgDurationRows[0]?.avg || 0))

    // Enrich recent meetings with owner names
    const recentOwnerIds = [...new Set(recent.map((m) => m.ownerUserId).filter(Boolean))]
    const recentOwners = recentOwnerIds.length
      ? await User.findAll({ where: { id: { [Op.in]: recentOwnerIds } }, attributes: ['id', 'name'], raw: true })
      : []
    const ownerNameMap = Object.fromEntries(recentOwners.map((u) => [u.id, u.name]))

    const DURATION_ORDER = ['<15 min', '15-30 min', '30-60 min', '60-90 min', '90+ min']
    const durationDistSorted = DURATION_ORDER.map((b) => {
      const row = durationDist.find((r) => r.bucket === b)
      return { range: b, count: Number(row?.count || 0) }
    })

    const showUpRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const channelData = []
    const videoTotal = videoCount || (total - phoneCount)
    if (videoTotal > 0) channelData.push({ name: 'Video (Meet)', value: videoTotal })
    if (phoneCount > 0) channelData.push({ name: 'Phone / Offline', value: phoneCount })

    return res.json({
      success: true,
      data: {
        kpis: { total, completed, cancelled, missed, avgDuration, recorded, withSummary, showUpRate, videoCount, phoneCount },
        charts: {
          typeDist: typeDist.map((r) => ({ name: capitalize(String(r.meetingType || '').replace(/_/g, ' ')), value: Number(r.count) })),
          statusDist: statusDist.map((r) => ({ name: capitalize(r.status), count: Number(r.count) })),
          trend: trend.map((r) => ({ date: r.date, count: Number(r.count) })),
          byOwner: byOwnerRaw.map((r) => ({
            name: ownerNameMap[r.ownerUserId] || '—',
            total: Number(r.count),
            completed: Number(r.completedCount || 0),
            cancelled: Number(r.cancelledCount || 0),
            missed: Number(r.missedCount || 0),
            showUpRate: Number(r.count) > 0 ? Math.round((Number(r.completedCount || 0) / Number(r.count)) * 100) : 0,
          })),
          channelDist: channelData,
          durationDist: durationDistSorted,
        },
        tables: {
          recent: recent.map((m) => ({
            id: m.id,
            title: m.title,
            type: capitalize(String(m.meetingType || '').replace(/_/g, ' ')),
            status: m.status,
            duration: m.durationMinutes,
            owner: ownerNameMap[m.ownerUserId] || '—',
            date: m.scheduledStart,
            channel: m.channel,
            isUpcoming: new Date(m.scheduledStart) >= now,
          })),
          upcoming: view === 'upcoming' || view === 'all'
            ? recent.filter((m) => new Date(m.scheduledStart) >= now).map((m) => ({
              id: m.id,
              title: m.title,
              type: capitalize(String(m.meetingType || '').replace(/_/g, ' ')),
              status: m.status,
              owner: ownerNameMap[m.ownerUserId] || '—',
              date: m.scheduledStart,
              channel: m.channel,
            }))
            : [],
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── tasks report ─────────────────────────────────────────────────────────────

export async function tasksReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId, workspaceId, isSales, userId } = ctx
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    const filterUserId = req.query.userId || (isSales ? userId : null)
    const scope = {
      companyId,
      workspaceId,
      createdAt: { [Op.between]: [from, to] },
      ...(filterUserId ? { assignedTo: filterUserId } : {}),
    }
    const allScope = { companyId, workspaceId, ...(filterUserId ? { assignedTo: filterUserId } : {}) }
    const openWhere = { ...allScope, status: { [Op.notIn]: ['completed', 'cancelled'] } }
    const taskIncludes = [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
      { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName'], required: false },
    ]

    const [
      total,
      completed,
      inProgress,
      pending,
      overdue,
      openTotal,
      unassignedOpen,
      dueToday,
      statusDist,
      priorityDist,
      createdTrend,
      completedTrend,
      byAssigneeRaw,
      overdueTasks,
      openTaskRows,
      periodTaskRows,
      recentCompletedRows,
      assigneeWorkload,
    ] = await Promise.all([
      LeadTask.count({ where: scope }),
      LeadTask.count({ where: { ...scope, status: 'completed' } }),
      LeadTask.count({ where: { ...scope, status: 'in_progress' } }),
      LeadTask.count({ where: { ...scope, status: 'pending' } }),
      LeadTask.count({
        where: { ...openWhere, dueAt: { [Op.ne]: null, [Op.lt]: now } },
      }),
      LeadTask.count({ where: openWhere }),
      LeadTask.count({ where: { ...openWhere, assignedTo: null } }),
      LeadTask.count({
        where: { ...openWhere, dueAt: { [Op.ne]: null, [Op.gte]: startOfToday, [Op.lte]: endOfToday } },
      }),
      LeadTask.findAll({
        where: scope,
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      LeadTask.findAll({
        where: scope,
        attributes: ['priority', [fn('COUNT', col('id')), 'count']],
        group: ['priority'],
        raw: true,
      }),
      LeadTask.findAll({
        where: scope,
        attributes: [[fn('DATE', col('created_at')), 'date'], [fn('COUNT', col('id')), 'count']],
        group: [fn('DATE', col('created_at'))],
        order: [[fn('DATE', col('created_at')), 'ASC']],
        raw: true,
      }),
      LeadTask.findAll({
        where: { ...scope, completedAt: { [Op.between]: [from, to] }, status: 'completed' },
        attributes: [[fn('DATE', col('completed_at')), 'date'], [fn('COUNT', col('id')), 'count']],
        group: [fn('DATE', col('completed_at'))],
        order: [[fn('DATE', col('completed_at')), 'ASC']],
        raw: true,
      }),
      LeadTask.findAll({
        where: { ...scope, assignedTo: { [Op.ne]: null } },
        attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']],
        group: ['assignedTo'],
        order: [[literal('count'), 'DESC']],
        limit: 15,
        raw: true,
      }),
      LeadTask.findAll({
        where: { ...openWhere, dueAt: { [Op.ne]: null, [Op.lt]: now } },
        include: taskIncludes,
        order: [['dueAt', 'ASC']],
        limit: 50,
      }),
      LeadTask.findAll({
        where: openWhere,
        include: taskIncludes,
        order: [
          [literal('due_at IS NULL'), 'ASC'],
          ['dueAt', 'ASC'],
          ['createdAt', 'DESC'],
        ],
        limit: 200,
      }),
      LeadTask.findAll({
        where: scope,
        include: taskIncludes,
        order: [['createdAt', 'DESC']],
        limit: 100,
      }),
      LeadTask.findAll({
        where: { ...scope, status: 'completed' },
        include: taskIncludes,
        order: [['completedAt', 'DESC']],
        limit: 50,
      }),
      buildAssigneeWorkload({ allScope, periodScope: scope, now }),
    ])

    const byAssignee = await enrichWithUserNames(byAssigneeRaw, 'assignedTo')

    const mapOverdueExtra = (t) => {
      const row = serializeAnalyticsTask(t, now)
      return {
        ...row,
        assignee: row.assignee || 'Unassigned',
        daysOverdue: row.dueAt ? Math.floor((now - new Date(row.dueAt)) / (1000 * 60 * 60 * 24)) : 0,
      }
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          total,
          completed,
          inProgress,
          pending,
          overdue,
          openTotal,
          unassignedOpen,
          dueToday,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          workspacePendingTotal: pending + inProgress,
        },
        charts: {
          statusDist: statusDist.map((r) => ({ name: capitalize(String(r.status || '').replace(/_/g, ' ')), value: Number(r.count) })),
          priorityDist: priorityDist.map((r) => ({ name: capitalize(r.priority || ''), count: Number(r.count) })),
          trend: createdTrend.map((r) => {
            const completedRow = completedTrend.find((c) => c.date === r.date)
            return { date: r.date, created: Number(r.count), completed: Number(completedRow?.count || 0) }
          }),
          byAssignee: byAssignee.map((r) => ({ name: r.name, count: Number(r.count) })),
          byAssigneeOpen: assigneeWorkload.map((r) => ({
            name: r.name,
            open: r.open,
            overdue: r.overdue,
          })),
        },
        tables: {
          assigneeWorkload,
          overdue: overdueTasks.map(mapOverdueExtra),
          openTasks: openTaskRows.map((t) => serializeAnalyticsTask(t, now)),
          createdInPeriod: periodTaskRows.map((t) => serializeAnalyticsTask(t, now)),
          recentCompleted: recentCompletedRows.map((t) => serializeAnalyticsTask(t, now)),
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── team report ──────────────────────────────────────────────────────────────

export async function teamReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId, workspaceId } = ctx

    const members = await UserWorkspace.findAll({
      where: { workspaceId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'isActive', 'isCompanyAdmin', 'lastLoginAt'], required: true }],
    })

    const userIds = members.map((m) => m.user.id)
    if (!userIds.length) {
      return res.json({ success: true, data: { kpis: { total: 0, active: 0, admins: 0 }, charts: {}, tables: { team: [] } } })
    }

    const now = new Date()
    const openTaskWhere = {
      companyId,
      workspaceId,
      assignedTo: { [Op.in]: userIds },
      status: { [Op.notIn]: ['completed', 'cancelled'] },
    }

    const [leadsByUser, leadsAssignedByUser, tasksByUser, tasksOpenByUser, tasksOverdueByUser, meetingsByUser, activitiesByUser] =
      await Promise.all([
        Lead.findAll({
          where: { companyId, workspaceId, isDeleted: false, ownerUserId: { [Op.in]: userIds } },
          attributes: ['ownerUserId', [fn('COUNT', col('id')), 'count']],
          group: ['ownerUserId'],
          raw: true,
        }),
        Lead.findAll({
          where: { companyId, workspaceId, isDeleted: false, assignedTo: { [Op.in]: userIds } },
          attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']],
          group: ['assignedTo'],
          raw: true,
        }),
        LeadTask.findAll({
          where: { companyId, workspaceId, assignedTo: { [Op.in]: userIds }, createdAt: { [Op.between]: [from, to] } },
          attributes: ['assignedTo', 'status', [fn('COUNT', col('id')), 'count']],
          group: ['assignedTo', 'status'],
          raw: true,
        }),
        LeadTask.findAll({
          where: openTaskWhere,
          attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']],
          group: ['assignedTo'],
          raw: true,
        }),
        LeadTask.findAll({
          where: {
            ...openTaskWhere,
            dueAt: { [Op.ne]: null, [Op.lt]: now },
          },
          attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']],
          group: ['assignedTo'],
          raw: true,
        }),
        Meeting.findAll({
          where: { workspaceId, ownerUserId: { [Op.in]: userIds }, scheduledStart: { [Op.between]: [from, to] } },
          attributes: ['ownerUserId', [fn('COUNT', col('id')), 'count']],
          group: ['ownerUserId'],
          raw: true,
        }),
        Activity.findAll({
          where: { userId: { [Op.in]: userIds }, createdAt: { [Op.between]: [from, to] } },
          attributes: ['userId', [fn('COUNT', col('id')), 'count']],
          group: ['userId'],
          raw: true,
        }),
      ])

    const leadsMap = Object.fromEntries(leadsByUser.map((r) => [r.ownerUserId, Number(r.count)]))
    const leadsAssignedMap = Object.fromEntries(leadsAssignedByUser.map((r) => [r.assignedTo, Number(r.count)]))
    const meetingsMap = Object.fromEntries(meetingsByUser.map((r) => [r.ownerUserId, Number(r.count)]))
    const activitiesMap = Object.fromEntries(activitiesByUser.map((r) => [r.userId, Number(r.count)]))
    const tasksOpenMap = Object.fromEntries(tasksOpenByUser.map((r) => [r.assignedTo, Number(r.count)]))
    const tasksOverdueMap = Object.fromEntries(tasksOverdueByUser.map((r) => [r.assignedTo, Number(r.count)]))
    const tasksCompletedMap = {}
    const tasksTotalMap = {}
    const tasksPendingMap = {}
    const tasksInProgressMap = {}
    for (const r of tasksByUser) {
      const uid = r.assignedTo
      tasksTotalMap[uid] = (tasksTotalMap[uid] || 0) + Number(r.count)
      if (r.status === 'completed') tasksCompletedMap[uid] = (tasksCompletedMap[uid] || 0) + Number(r.count)
      if (r.status === 'pending') tasksPendingMap[uid] = (tasksPendingMap[uid] || 0) + Number(r.count)
      if (r.status === 'in_progress') tasksInProgressMap[uid] = (tasksInProgressMap[uid] || 0) + Number(r.count)
    }

    // Add deal stats per member
    const [dealsByUser, dealValueByUser, wonDealValueByUser] = await Promise.all([
      Deal.findAll({ where: { companyId, workspaceId, isDeleted: false, assignedTo: { [Op.in]: userIds } }, attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']], group: ['assignedTo'], raw: true }),
      Deal.findAll({ where: { companyId, workspaceId, isDeleted: false, assignedTo: { [Op.in]: userIds } }, attributes: ['assignedTo', [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']], group: ['assignedTo'], raw: true }),
      Deal.findAll({ where: { companyId, workspaceId, isDeleted: false, assignedTo: { [Op.in]: userIds }, stage: { [Op.in]: ['Won', 'won'] } }, attributes: ['assignedTo', [fn('COALESCE', fn('SUM', col('value')), 0), 'wonValue']], group: ['assignedTo'], raw: true }),
    ])
    const dealsMap = Object.fromEntries(dealsByUser.map((r) => [r.assignedTo, Number(r.count)]))
    const dealValueMap = Object.fromEntries(dealValueByUser.map((r) => [r.assignedTo, Number(r.totalValue)]))
    const wonValueMap = Object.fromEntries(wonDealValueByUser.map((r) => [r.assignedTo, Number(r.wonValue)]))

    const teamRows = members.map((m) => {
      const u = m.user
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        isAdmin: u.isCompanyAdmin,
        isActive: u.isActive,
        lastActive: u.lastLoginAt,
        leadsOwned: leadsMap[u.id] || 0,
        leadsAssigned: leadsAssignedMap[u.id] || 0,
        tasksOpen: tasksOpenMap[u.id] || 0,
        tasksOverdue: tasksOverdueMap[u.id] || 0,
        tasksPending: tasksPendingMap[u.id] || 0,
        tasksInProgress: tasksInProgressMap[u.id] || 0,
        tasksCompleted: tasksCompletedMap[u.id] || 0,
        taskTotal: tasksTotalMap[u.id] || 0,
        meetings: meetingsMap[u.id] || 0,
        activities: activitiesMap[u.id] || 0,
        deals: dealsMap[u.id] || 0,
        pipelineValue: dealValueMap[u.id] || 0,
        wonValue: wonValueMap[u.id] || 0,
        winRate: (dealsMap[u.id] || 0) > 0 ? Math.round(((wonValueMap[u.id] || 0) > 0 ? 1 : 0) * 100) : 0,
      }
    }).sort((a, b) => b.tasksOpen - a.tasksOpen || b.leadsOwned - a.leadsOwned)

    const totalUsers = members.length
    const activeUsers = members.filter((m) => m.user.isActive).length
    const admins = members.filter((m) => m.user.isCompanyAdmin).length
    const totalLeads = teamRows.reduce((s, r) => s + r.leadsOwned, 0)

    return res.json({
      success: true,
      data: {
        kpis: {
          total: totalUsers,
          active: activeUsers,
          admins,
          avgLeadsPerUser: totalUsers > 0 ? Math.round(totalLeads / totalUsers) : 0,
        },
        charts: {
          leadsByMember: teamRows.map((r) => ({ name: r.name, count: r.leadsOwned })),
          tasksByMember: teamRows.map((r) => ({ name: r.name, count: r.tasksCompleted })),
          tasksOpenByMember: teamRows.map((r) => ({ name: r.name, count: r.tasksOpen })),
          tasksOverdueByMember: teamRows.map((r) => ({ name: r.name, count: r.tasksOverdue })),
          meetingsByMember: teamRows.map((r) => ({ name: r.name, count: r.meetings })),
          activitiesByMember: teamRows.map((r) => ({ name: r.name, count: r.activities })),
          revenueByMember: teamRows.filter((r) => r.wonValue > 0).map((r) => ({ name: r.name, value: r.wonValue })).sort((a, b) => b.value - a.value),
          dealsByMember: teamRows.map((r) => ({ name: r.name, deals: r.deals, pipelineValue: r.pipelineValue, wonValue: r.wonValue })),
        },
        tables: { team: teamRows },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── dashboard charts ─────────────────────────────────────────────────────────

export async function dashboardCharts(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId, workspaceId, userId } = ctx
    const now = new Date()

    // scope=mine forces per-user filtering regardless of role
    const forceMine = req.query.scope === 'mine'
    const isSales = ctx.isSales || forceMine

    const leadBase = {
      companyId,
      workspaceId,
      isDeleted: false,
      ...(isSales ? { [Op.or]: [{ assignedTo: userId }, { ownerUserId: userId }] } : {}),
    }
    const taskBase = {
      companyId,
      workspaceId,
      ...(isSales ? { assignedTo: userId } : {}),
    }

    // Phase 1 — get all lead IDs for activity scoping
    const allLeadIds = await Lead.findAll({
      where: leadBase,
      attributes: ['id'],
      raw: true,
    }).then((rows) => rows.map((r) => r.id))

    const periodLeadBase = { ...leadBase, createdAt: { [Op.between]: [from, to] } }
    const actBase = allLeadIds.length
      ? { leadId: { [Op.in]: allLeadIds }, createdAt: { [Op.between]: [from, to] } }
      : { leadId: null }

    // Phase 2 — parallel aggregate queries
    const [
      leadStatusDist,
      oppStatusDistRaw,
      oppStatusByLeadStatus,
      pipelineByStatusRaw,
      pipelineCreatedTrend,
      pipelineWonTrend,
      activitiesByType,
      tasksCreatedTrend,
      tasksCompletedTrend,
      kpiLeadsTotal,
      kpiOppsTotal,
      kpiPipelineValue,
      kpiWonValue,
      kpiOpenTasks,
      kpiOverdueTasks,
      workspaceMembers,
    ] = await Promise.all([
      // Lead status distribution
      Lead.findAll({
        where: { ...leadBase, isOpportunity: false },
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),

      // Opportunity status (configurable UUID FK)
      Lead.findAll({
        where: { ...leadBase, isOpportunity: true, opportunityStatus: { [Op.ne]: null } },
        attributes: ['opportunityStatus', [fn('COUNT', col('id')), 'count']],
        group: ['opportunityStatus'],
        order: [[literal('count'), 'DESC']],
        raw: true,
      }),

      // Fallback: opportunity breakdown by inherited lead status field (count + value)
      Lead.findAll({
        where: { ...leadBase, isOpportunity: true },
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count'],
          [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue'],
        ],
        group: ['status'],
        order: [[literal('count'), 'DESC']],
        raw: true,
      }),

      // Pipeline by opportunity status (configured UUID FK, with value)
      Lead.findAll({
        where: { ...leadBase, isOpportunity: true, opportunityStatus: { [Op.ne]: null } },
        attributes: [
          'opportunityStatus',
          [fn('COUNT', col('id')), 'count'],
          [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue'],
        ],
        group: ['opportunityStatus'],
        order: [[literal('count'), 'DESC']],
        raw: true,
      }),

      // Pipeline trend — created per month
      Lead.findAll({
        where: { ...periodLeadBase, isOpportunity: true },
        attributes: [
          [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
          [fn('COUNT', col('id')), 'created'],
          [fn('COALESCE', fn('SUM', col('value')), 0), 'createdValue'],
        ],
        group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m')],
        order: [[fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'ASC']],
        raw: true,
      }),

      // Pipeline trend — won per month
      Lead.findAll({
        where: { ...periodLeadBase, isOpportunity: true, status: 'won' },
        attributes: [
          [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
          [fn('COUNT', col('id')), 'won'],
          [fn('COALESCE', fn('SUM', col('value')), 0), 'wonValue'],
        ],
        group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m')],
        order: [[fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'ASC']],
        raw: true,
      }),

      // Activities by type
      allLeadIds.length
        ? Activity.findAll({
            where: actBase,
            attributes: ['type', [fn('COUNT', col('id')), 'count']],
            group: ['type'],
            raw: true,
          })
        : Promise.resolve([]),

      // Tasks throughput — created per day
      LeadTask.findAll({
        where: { ...taskBase, createdAt: { [Op.between]: [from, to] } },
        attributes: [
          [fn('DATE', col('created_at')), 'date'],
          [fn('COUNT', col('id')), 'count'],
        ],
        group: [fn('DATE', col('created_at'))],
        order: [[fn('DATE', col('created_at')), 'ASC']],
        raw: true,
      }),

      // Tasks throughput — completed per day
      LeadTask.findAll({
        where: { ...taskBase, status: 'completed', completedAt: { [Op.between]: [from, to] } },
        attributes: [
          [fn('DATE', col('completed_at')), 'date'],
          [fn('COUNT', col('id')), 'count'],
        ],
        group: [fn('DATE', col('completed_at'))],
        order: [[fn('DATE', col('completed_at')), 'ASC']],
        raw: true,
      }),

      // KPIs
      Lead.count({ where: { ...leadBase, isOpportunity: false } }),
      Lead.count({ where: { ...leadBase, isOpportunity: true } }),
      Lead.findAll({
        where: { ...leadBase, isOpportunity: true },
        attributes: [[fn('COALESCE', fn('SUM', col('value')), 0), 'total']],
        raw: true,
      }),
      Lead.findAll({
        where: { ...leadBase, isOpportunity: true, status: 'won' },
        attributes: [[fn('COALESCE', fn('SUM', col('value')), 0), 'total']],
        raw: true,
      }),
      LeadTask.count({ where: { ...taskBase, status: { [Op.in]: ['pending', 'in_progress'] } } }),
      LeadTask.count({
        where: { ...taskBase, status: { [Op.notIn]: ['completed', 'cancelled'] }, dueAt: { [Op.lt]: now } },
      }),

      // Workspace members for top performers
      UserWorkspace.findAll({
        where: { workspaceId },
        include: [{ model: User, as: 'user', attributes: ['id', 'name'], required: true }],
      }),
    ])

    // Enrich oppStatusDist with names from OpportunityStatus table
    const oppStatusIds = oppStatusDistRaw.map((r) => r.opportunityStatus).filter(Boolean)
    let oppStatusNameMap = {}
    if (oppStatusIds.length) {
      const statuses = await OpportunityStatus.findAll({
        where: { id: { [Op.in]: oppStatusIds } },
        attributes: ['id', 'name'],
        raw: true,
      })
      oppStatusNameMap = Object.fromEntries(statuses.map((s) => [s.id, s.name]))
    }

    // Merge pipeline trend (created + won per month)
    const trendMap = {}
    for (const r of pipelineCreatedTrend) {
      trendMap[r.month] = {
        month: r.month,
        created: Number(r.created),
        createdValue: Number(r.createdValue),
        won: 0,
        wonValue: 0,
      }
    }
    for (const r of pipelineWonTrend) {
      if (!trendMap[r.month]) trendMap[r.month] = { month: r.month, created: 0, createdValue: 0, won: 0, wonValue: 0 }
      trendMap[r.month].won = Number(r.won)
      trendMap[r.month].wonValue = Number(r.wonValue)
    }
    const pipelineTrend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month))

    // Merge tasks throughput (created + completed per day)
    const throughputMap = {}
    for (const r of tasksCreatedTrend) {
      throughputMap[r.date] = { date: r.date, created: Number(r.count), completed: 0 }
    }
    for (const r of tasksCompletedTrend) {
      if (!throughputMap[r.date]) throughputMap[r.date] = { date: r.date, created: 0, completed: 0 }
      throughputMap[r.date].completed = Number(r.count)
    }
    const tasksThroughput = Object.values(throughputMap).sort((a, b) => a.date.localeCompare(b.date))

    // Top 4 performers
    const memberIds = workspaceMembers.map((m) => m.user.id)
    let topMembers = []
    if (memberIds.length) {
      const [memberLeads, memberTasksDone, memberActivities] = await Promise.all([
        Lead.findAll({
          where: { companyId, workspaceId, isDeleted: false, ownerUserId: { [Op.in]: memberIds } },
          attributes: ['ownerUserId', [fn('COUNT', col('id')), 'count']],
          group: ['ownerUserId'],
          raw: true,
        }),
        LeadTask.findAll({
          where: { companyId, workspaceId, assignedTo: { [Op.in]: memberIds }, status: 'completed', completedAt: { [Op.between]: [from, to] } },
          attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']],
          group: ['assignedTo'],
          raw: true,
        }),
        allLeadIds.length
          ? Activity.findAll({
              where: { ...actBase, userId: { [Op.in]: memberIds } },
              attributes: ['userId', [fn('COUNT', col('id')), 'count']],
              group: ['userId'],
              raw: true,
            })
          : Promise.resolve([]),
      ])

      const leadsMap = Object.fromEntries(memberLeads.map((r) => [r.ownerUserId, Number(r.count)]))
      const doneMap = Object.fromEntries(memberTasksDone.map((r) => [r.assignedTo, Number(r.count)]))
      const actMap = Object.fromEntries(memberActivities.map((r) => [r.userId, Number(r.count)]))

      topMembers = workspaceMembers
        .map((m) => {
          const uid = m.user.id
          const leads = leadsMap[uid] || 0
          const tasks = doneMap[uid] || 0
          const activities = actMap[uid] || 0
          return { name: m.user.name, leadsOwned: leads, tasksCompleted: tasks, activities, score: leads * 3 + tasks * 2 + activities }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          totalLeads: kpiLeadsTotal,
          totalOpps: kpiOppsTotal,
          pipelineValue: Number(kpiPipelineValue[0]?.total || 0),
          wonValue: Number(kpiWonValue[0]?.total || 0),
          openTasks: kpiOpenTasks,
          overdueTasks: kpiOverdueTasks,
        },
        charts: {
          leadStatusDist: leadStatusDist.map((r) => ({ name: capitalize(r.status), value: Number(r.count) })),
          oppStatusDist: (() => {
            const configured = oppStatusDistRaw
              .filter((r) => oppStatusNameMap[r.opportunityStatus])
              .map((r) => ({ name: oppStatusNameMap[r.opportunityStatus], value: Number(r.count) }))
            if (configured.length) return configured
            return oppStatusByLeadStatus.map((r) => ({ name: capitalize(r.status || 'new'), value: Number(r.count) }))
          })(),
          pipelineByStage: (() => {
            const configured = pipelineByStatusRaw
              .filter((r) => oppStatusNameMap[r.opportunityStatus])
              .map((r) => ({ name: oppStatusNameMap[r.opportunityStatus], count: Number(r.count), value: Number(r.totalValue) }))
            if (configured.length) return configured
            return oppStatusByLeadStatus.map((r) => ({ name: capitalize(r.status || 'new'), count: Number(r.count), value: Number(r.totalValue) }))
          })(),
          pipelineTrend,
          activitiesByType: activitiesByType.map((r) => ({ name: capitalize(r.type), value: Number(r.count) })),
          tasksThroughput,
        },
        topMembers,
      },
    })
  } catch (e) {
    return next(e)
  }
}
