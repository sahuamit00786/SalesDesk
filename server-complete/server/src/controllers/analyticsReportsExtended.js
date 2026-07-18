import { Op, fn, col, literal } from 'sequelize'
import {
  Lead, LeadFollowup, LeadTask, Activity, Meeting, Deal, DealPayment,
  User, UserWorkspace, Invoice, Quotation, InvoicePayment, LeaveRequest, LeaveType,
  DuplicateLead, Campaign, CampaignLead, PipelineStatus,
} from '../models/index.js'

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

function applyLeadFilters(scope, query) {
  const out = { ...scope }
  if (query.userId) {
    out[Op.or] = [{ assignedTo: query.userId }, { ownerUserId: query.userId }]
  }
  if (query.status) out.status = query.status
  if (query.source) out.source = query.source
  if (query.stage) out.pipelineStatus = query.stage
  return out
}

function capitalize(s) {
  return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// All configured pipeline stages for the workspace, with lead count/value per stage
// (zero-count stages included so charts show the full pipeline, not just populated ones)
async function getStageDist(scope, ctx) {
  const [statuses, counts] = await Promise.all([
    PipelineStatus.findAll({
      where: { workspaceId: ctx.workspaceId, companyId: ctx.companyId },
      order: [['sortOrder', 'ASC']],
      raw: true,
    }),
    Lead.findAll({
      where: { ...scope, pipelineStatus: { [Op.ne]: null } },
      attributes: ['pipelineStatus', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
      group: ['pipelineStatus'],
      raw: true,
    }),
  ])
  const countMap = Object.fromEntries(counts.map((r) => [r.pipelineStatus, r]))
  return statuses.map((s) => ({
    name: s.name,
    count: Number(countMap[s.id]?.count || 0),
    value: Number(countMap[s.id]?.totalValue || 0),
  }))
}

async function enrichWithUserNames(rows, idField = 'ownerUserId') {
  const ids = [...new Set(rows.map((r) => r[idField]).filter(Boolean))]
  if (!ids.length) return rows
  const users = await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'name', 'email'], raw: true })
  const nameMap = Object.fromEntries(users.map((u) => [u.id, u]))
  return rows.map((r) => ({
    ...r,
    name: nameMap[r[idField]]?.name || 'Unknown',
    email: nameMap[r[idField]]?.email || null,
  }))
}

// ─── opportunities report ───────────────────────────────────────────────────

export async function opportunitiesReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const scope = applyLeadFilters(leadScope(ctx, { isOpportunity: true }), req.query)
    const now = new Date()

    const [allOpps, valueByCurrencyRaw, stageDistRaw, allOpportunities, top10] = await Promise.all([
      Lead.findAll({
        where: scope,
        attributes: [[fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
        raw: true,
      }),
      Lead.findAll({
        where: { ...scope, value: { [Op.ne]: null, [Op.gt]: 0 } },
        attributes: ['valueCurrency', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'totalValue']],
        group: ['valueCurrency'],
        raw: true,
      }),
      getStageDist(scope, ctx),
      Lead.findAll({
        where: scope,
        include: [
          { model: User, as: 'owner', attributes: ['name'], required: false },
          { model: User, as: 'assignee', attributes: ['name'], required: false },
          { model: PipelineStatus, as: 'pipelineStatusInfo', attributes: ['name'], required: false },
        ],
        order: [['value', 'DESC']],
        limit: 200,
      }),
      Lead.findAll({
        where: { ...scope, value: { [Op.ne]: null, [Op.gt]: 0 } },
        include: [
          { model: User, as: 'owner', attributes: ['name'], required: false },
          { model: PipelineStatus, as: 'pipelineStatusInfo', attributes: ['name'], required: false },
        ],
        order: [['value', 'DESC']],
        limit: 10,
      }),
    ])

    const total = Number(allOpps[0]?.count || 0)
    const totalValue = Number(allOpps[0]?.totalValue || 0)
    const wonCount = await Lead.count({ where: { ...scope, status: 'won' } })
    const valueByCurrency = valueByCurrencyRaw.map((r) => ({
      currency: r.valueCurrency || 'USD',
      count: Number(r.count || 0),
      total: Number(r.totalValue || 0),
      avg: Number(r.count) > 0 ? Math.round(Number(r.totalValue || 0) / Number(r.count)) : 0,
    }))

    return res.json({
      success: true,
      data: {
        kpis: {
          total,
          totalValue,
          valueByCurrency,
          avgDealSize: total > 0 ? Math.round(totalValue / total) : 0,
          winRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
          closingThisMonth: await Lead.count({
            where: {
              ...scope,
              closingDate: {
                [Op.between]: [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)],
              },
            },
          }),
        },
        charts: {
          stageDist: stageDistRaw,
        },
        tables: {
          byStage: allOpportunities.map((l) => ({
            id: l.id,
            title: l.title,
            company: l.company,
            stage: capitalize(l.pipelineStatusInfo?.name || 'Uncategorised'),
            status: l.status,
            value: l.value,
            valueCurrency: l.valueCurrency,
            owner: l.owner?.name || '—',
            assignee: l.assignee?.name || '—',
            closingDate: l.closingDate,
          })),
          top10: top10.map((l) => ({
            id: l.id,
            title: l.title,
            company: l.company,
            stage: capitalize(l.pipelineStatusInfo?.name || ''),
            value: l.value,
            owner: l.owner?.name || '—',
          })),
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── followups report ─────────────────────────────────────────────────────────

export async function followupsReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const now = new Date()
    const view = req.query.view || 'all'

    const base = {
      companyId: ctx.companyId,
      workspaceId: ctx.workspaceId,
      ...(ctx.isSales ? { createdBy: ctx.userId } : {}),
      ...(req.query.userId ? { createdBy: req.query.userId } : {}),
    }

    const upcomingWhere = { ...base, status: 'pending', scheduledAt: { [Op.gte]: now } }
    const overdueWhere = { ...base, status: 'pending', scheduledAt: { [Op.lt]: now } }
    const periodWhere = { ...base, createdAt: { [Op.between]: [from, to] } }

    const followupIncludes = [
      { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName'], required: false },
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
    ]

    const [upcomingCount, overdueCount, completedInPeriod, totalInPeriod, upcomingRows, overdueRows, byAssigneeRaw] = await Promise.all([
      LeadFollowup.count({ where: upcomingWhere }),
      LeadFollowup.count({ where: overdueWhere }),
      LeadFollowup.count({ where: { ...periodWhere, status: 'done' } }),
      LeadFollowup.count({ where: periodWhere }),
      LeadFollowup.findAll({ where: upcomingWhere, include: followupIncludes, order: [['scheduledAt', 'ASC']], limit: 100 }),
      LeadFollowup.findAll({ where: overdueWhere, include: followupIncludes, order: [['scheduledAt', 'ASC']], limit: 100 }),
      LeadFollowup.findAll({
        where: periodWhere,
        attributes: ['createdBy', 'status', [fn('COUNT', col('id')), 'count']],
        group: ['createdBy', 'status'],
        raw: true,
      }),
    ])

    const byUserMap = {}
    for (const r of byAssigneeRaw) {
      if (!byUserMap[r.createdBy]) byUserMap[r.createdBy] = { userId: r.createdBy, created: 0, done: 0 }
      byUserMap[r.createdBy].created += Number(r.count)
      if (r.status === 'done') byUserMap[r.createdBy].done += Number(r.count)
    }
    const byAssignee = await enrichWithUserNames(Object.values(byUserMap), 'userId')

    const serialize = (f) => ({
      id: f.id,
      lead: f.lead?.title || f.lead?.contactName || '—',
      leadId: f.leadId,
      scheduledAt: f.scheduledAt,
      remark: f.remark,
      assignee: f.creator?.name || '—',
      status: f.status,
      daysOverdue: f.scheduledAt && new Date(f.scheduledAt) < now
        ? Math.floor((now - new Date(f.scheduledAt)) / 86400000)
        : 0,
    })

    let tables = {
      upcoming: upcomingRows.map(serialize),
      overdue: overdueRows.map(serialize),
    }
    if (view === 'upcoming') tables = { upcoming: tables.upcoming }
    if (view === 'past') tables = { overdue: tables.overdue }

    return res.json({
      success: true,
      data: {
        kpis: {
          upcoming: upcomingCount,
          overdue: overdueCount,
          completedInPeriod,
          totalInPeriod,
          completionRate: totalInPeriod > 0 ? Math.round((completedInPeriod / totalInPeriod) * 100) : 0,
        },
        charts: {
          byAssignee: byAssignee.map((r) => ({ name: r.name, created: r.created, done: r.done })),
        },
        tables,
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── sales docs report ────────────────────────────────────────────────────────

export async function salesDocsReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId, workspaceId } = ctx
    const base = { companyId, workspaceId }
    const period = { ...base, createdAt: { [Op.between]: [from, to] } }

    const [quotesTotal, quotesInPeriod, invoicesTotal, invoicesInPeriod, quoteStatus, invoiceStatus, quoteTrend, invoiceTrend, recentQuotes, recentInvoices, convertedQuotes] = await Promise.all([
      Quotation.count({ where: base }),
      Quotation.count({ where: period }),
      Invoice.count({ where: base }),
      Invoice.count({ where: period }),
      Quotation.findAll({ where: base, attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('grand_total')), 0), 'total']], group: ['status'], raw: true }),
      Invoice.findAll({ where: base, attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('grand_total')), 0), 'total']], group: ['status'], raw: true }),
      Quotation.findAll({ where: period, attributes: [[fn('DATE', col('created_at')), 'date'], [fn('COUNT', col('id')), 'count']], group: [fn('DATE', col('created_at'))], order: [[fn('DATE', col('created_at')), 'ASC']], raw: true }),
      Invoice.findAll({ where: period, attributes: [[fn('DATE', col('created_at')), 'date'], [fn('COUNT', col('id')), 'count']], group: [fn('DATE', col('created_at'))], order: [[fn('DATE', col('created_at')), 'ASC']], raw: true }),
      Quotation.findAll({ where: period, include: [{ model: Lead, as: 'lead', attributes: ['title'], required: false }, { model: User, as: 'owner', attributes: ['name'], required: false }], order: [['createdAt', 'DESC']], limit: 50 }),
      Invoice.findAll({ where: period, include: [{ model: Lead, as: 'lead', attributes: ['title'], required: false }, { model: User, as: 'owner', attributes: ['name'], required: false }], order: [['createdAt', 'DESC']], limit: 50 }),
      Quotation.count({ where: { ...base, convertedInvoiceId: { [Op.ne]: null } } }),
    ])

    const quoteValue = await Quotation.findAll({ where: period, attributes: [[fn('COALESCE', fn('SUM', col('grand_total')), 0), 'total']], raw: true })
    const invoiceValue = await Invoice.findAll({ where: period, attributes: [[fn('COALESCE', fn('SUM', col('grand_total')), 0), 'total']], raw: true })
    const outstanding = await Invoice.findAll({
      where: { ...base, status: { [Op.notIn]: ['paid', 'cancelled', 'void'] } },
      attributes: [[fn('COALESCE', fn('SUM', literal('grand_total - amount_paid')), 0), 'total']],
      raw: true,
    })

    return res.json({
      success: true,
      data: {
        kpis: {
          quotationsTotal: quotesTotal,
          quotationsInPeriod: quotesInPeriod,
          quotationsValue: Number(quoteValue[0]?.total || 0),
          invoicesTotal: invoicesTotal,
          invoicesInPeriod: invoicesInPeriod,
          invoicesValue: Number(invoiceValue[0]?.total || 0),
          outstandingAR: Number(outstanding[0]?.total || 0),
          conversionRate: quotesTotal > 0 ? Math.round((convertedQuotes / quotesTotal) * 100) : 0,
        },
        charts: {
          quoteStatus: quoteStatus.map((r) => ({ name: capitalize(r.status), count: Number(r.count), value: Number(r.total) })),
          invoiceStatus: invoiceStatus.map((r) => ({ name: capitalize(r.status), count: Number(r.count), value: Number(r.total) })),
          quoteTrend: quoteTrend.map((r) => ({ date: r.date, count: Number(r.count) })),
          invoiceTrend: invoiceTrend.map((r) => ({ date: r.date, count: Number(r.count) })),
        },
        tables: {
          recentQuotations: recentQuotes.map((q) => ({
            id: q.id, number: q.quotationNumber, lead: q.lead?.title || '—', status: q.status,
            value: Number(q.grandTotal), currency: q.currency, owner: q.owner?.name || '—', createdAt: q.createdAt,
          })),
          recentInvoices: recentInvoices.map((i) => ({
            id: i.id, number: i.invoiceNumber, lead: i.lead?.title || '—', status: i.status,
            value: Number(i.grandTotal), paid: Number(i.amountPaid), currency: i.currency,
            owner: i.owner?.name || '—', createdAt: i.createdAt,
          })),
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── payments report ──────────────────────────────────────────────────────────

export async function paymentsReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId, workspaceId } = ctx

    const dealPayWhere = { companyId, workspaceId, created_at: { [Op.between]: [from, to] } }
    if (req.query.userId) dealPayWhere.createdByUserId = req.query.userId

    const [dealPayments, invoicePayments, dealByMode, dealByStatus] = await Promise.all([
      DealPayment.findAll({
        where: dealPayWhere,
        include: [{ model: Deal, as: 'deal', attributes: ['id', 'name', 'leadId'], required: true }],
        order: [['paymentDate', 'DESC']],
        limit: 200,
      }),
      InvoicePayment.findAll({
        where: { paidAt: { [Op.between]: [from, to] } },
        include: [{
          model: Invoice,
          as: 'invoice',
          attributes: ['id', 'invoiceNumber', 'leadId', 'workspaceId', 'companyId'],
          where: { workspaceId, companyId },
          required: true,
          include: [{ model: Lead, as: 'lead', attributes: ['title'], required: false }],
        }],
        order: [['paidAt', 'DESC']],
        limit: 200,
      }),
      DealPayment.findAll({
        where: { companyId, workspaceId, status: 'received' },
        attributes: ['mode', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
        group: ['mode'],
        raw: true,
      }),
      DealPayment.findAll({
        where: { companyId, workspaceId },
        attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
        group: ['status'],
        raw: true,
      }),
    ])

    const dealTotal = dealPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const invoiceTotal = invoicePayments.reduce((s, p) => s + Number(p.amount || 0), 0)

    const ledger = [
      ...dealPayments.map((p) => ({
        id: p.id,
        source: 'deal',
        lead: '—',
        deal: p.deal?.name || '—',
        amount: Number(p.amount),
        currency: p.currency,
        mode: p.mode,
        status: p.status,
        date: p.paymentDate,
      })),
      ...invoicePayments.map((p) => ({
        id: p.id,
        source: 'invoice',
        lead: p.invoice?.lead?.title || '—',
        deal: p.invoice?.invoiceNumber || '—',
        amount: Number(p.amount),
        currency: '—',
        mode: p.mode || '—',
        status: 'received',
        date: p.paidAt,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    // Enrich deal payments with lead names
    const leadIds = [...new Set(dealPayments.map((p) => p.deal?.leadId).filter(Boolean))]
    const leads = leadIds.length ? await Lead.findAll({ where: { id: { [Op.in]: leadIds } }, attributes: ['id', 'title'], raw: true }) : []
    const leadMap = Object.fromEntries(leads.map((l) => [l.id, l.title]))
    for (const row of ledger) {
      if (row.source === 'deal') {
        const dp = dealPayments.find((p) => p.id === row.id)
        if (dp?.deal?.leadId) row.lead = leadMap[dp.deal.leadId] || '—'
      }
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          totalReceived: dealTotal + invoiceTotal,
          dealPayments: dealTotal,
          invoicePayments: invoiceTotal,
          dealPaymentCount: dealPayments.length,
          invoicePaymentCount: invoicePayments.length,
        },
        charts: {
          byMode: dealByMode.map((r) => ({ mode: capitalize(r.mode), count: Number(r.count), value: Number(r.total) })),
          byStatus: dealByStatus.map((r) => ({ status: capitalize(r.status), count: Number(r.count), value: Number(r.total) })),
        },
        tables: { ledger },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── leave report ─────────────────────────────────────────────────────────────

export async function leaveReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId } = ctx
    const where = { companyId, fromDate: { [Op.lte]: to }, toDate: { [Op.gte]: from } }
    if (req.query.userId) where.userId = req.query.userId
    if (req.query.status) where.status = req.query.status

    const [requests, byTypeRaw, byUserRaw] = await Promise.all([
      LeaveRequest.findAll({
        where,
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: true },
          { model: LeaveType, as: 'leaveType', attributes: ['id', 'name', 'color'], required: true },
        ],
        order: [['fromDate', 'DESC']],
        limit: 200,
      }),
      LeaveRequest.findAll({
        where: { ...where, status: 'approved' },
        attributes: ['leaveTypeId', [fn('SUM', col('days')), 'totalDays'], [fn('COUNT', col('id')), 'count']],
        group: ['leaveTypeId'],
        raw: true,
      }),
      LeaveRequest.findAll({
        where,
        attributes: ['userId', 'leaveTypeId', 'status', [fn('SUM', col('days')), 'totalDays']],
        group: ['userId', 'leaveTypeId', 'status'],
        raw: true,
      }),
    ])

    const typeIds = [...new Set(byTypeRaw.map((r) => r.leaveTypeId))]
    const types = typeIds.length ? await LeaveType.findAll({ where: { id: { [Op.in]: typeIds } }, attributes: ['id', 'name'], raw: true }) : []
    const typeMap = Object.fromEntries(types.map((t) => [t.id, t.name]))

    const userIds = [...new Set(byUserRaw.map((r) => r.userId))]
    const users = userIds.length ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name'], raw: true }) : []
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

    const approved = requests.filter((r) => r.status === 'approved')
    const pending = requests.filter((r) => r.status === 'pending')

    return res.json({
      success: true,
      data: {
        kpis: {
          totalRequests: requests.length,
          approvedDays: approved.reduce((s, r) => s + Number(r.days), 0),
          pendingRequests: pending.length,
          rejected: requests.filter((r) => r.status === 'rejected').length,
        },
        charts: {
          byType: byTypeRaw.map((r) => ({ name: typeMap[r.leaveTypeId] || 'Unknown', days: Number(r.totalDays), count: Number(r.count) })),
          byEmployee: Object.values(
            byUserRaw.reduce((acc, r) => {
              const key = r.userId
              if (!acc[key]) acc[key] = { name: userMap[r.userId] || 'Unknown', approved: 0, pending: 0 }
              if (r.status === 'approved') acc[key].approved += Number(r.totalDays)
              if (r.status === 'pending') acc[key].pending += Number(r.totalDays)
              return acc
            }, {}),
          ),
        },
        tables: {
          requests: requests.map((r) => ({
            id: r.id,
            employee: r.user?.name || '—',
            leaveType: r.leaveType?.name || '—',
            fromDate: r.fromDate,
            toDate: r.toDate,
            days: Number(r.days),
            status: r.status,
            reason: r.reason,
          })),
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── employee monthly report ──────────────────────────────────────────────────

export async function employeeMonthlyReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const year = Number(req.query.year) || new Date().getFullYear()
    const month = Number(req.query.month) || new Date().getMonth() + 1
    const from = new Date(year, month - 1, 1)
    const to = new Date(year, month, 0, 23, 59, 59, 999)
    const { companyId, workspaceId } = ctx
    const filterUserId = req.query.userId || null

    const members = await UserWorkspace.findAll({
      where: { workspaceId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: true }],
    })
    let userIds = members.map((m) => m.user.id)
    if (filterUserId) userIds = userIds.filter((id) => id === filterUserId)
    if (!userIds.length) {
      return res.json({ success: true, data: { kpis: {}, charts: {}, tables: { employees: [] } } })
    }

    const period = { [Op.between]: [from, to] }

    const [leadsCreated, activities, tasksCompleted, meetings, followupsDone, dealsWon] = await Promise.all([
      Lead.findAll({
        where: { companyId, workspaceId, isDeleted: false, ownerUserId: { [Op.in]: userIds }, createdAt: period },
        attributes: ['ownerUserId', [fn('COUNT', col('id')), 'count']],
        group: ['ownerUserId'],
        raw: true,
      }),
      Activity.findAll({
        where: { userId: { [Op.in]: userIds }, createdAt: period },
        attributes: ['userId', 'type', [fn('COUNT', col('id')), 'count']],
        group: ['userId', 'type'],
        raw: true,
      }),
      LeadTask.findAll({
        where: { companyId, workspaceId, assignedTo: { [Op.in]: userIds }, status: 'completed', completedAt: period },
        attributes: ['assignedTo', [fn('COUNT', col('id')), 'count']],
        group: ['assignedTo'],
        raw: true,
      }),
      Meeting.findAll({
        where: { workspaceId, ownerUserId: { [Op.in]: userIds }, scheduledStart: period, status: 'completed' },
        attributes: ['ownerUserId', [fn('COUNT', col('id')), 'count']],
        group: ['ownerUserId'],
        raw: true,
      }),
      LeadFollowup.findAll({
        where: { companyId, workspaceId, createdBy: { [Op.in]: userIds }, status: 'done', completedAt: period },
        attributes: ['createdBy', [fn('COUNT', col('id')), 'count']],
        group: ['createdBy'],
        raw: true,
      }),
      Deal.findAll({
        where: { companyId, workspaceId, isDeleted: false, assignedTo: { [Op.in]: userIds }, stage: { [Op.in]: ['Won', 'won'] }, updatedAt: period },
        attributes: ['assignedTo', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('value')), 0), 'value']],
        group: ['assignedTo'],
        raw: true,
      }),
    ])

    const leadsMap = Object.fromEntries(leadsCreated.map((r) => [r.ownerUserId, Number(r.count)]))
    const tasksMap = Object.fromEntries(tasksCompleted.map((r) => [r.assignedTo, Number(r.count)]))
    const meetingsMap = Object.fromEntries(meetings.map((r) => [r.ownerUserId, Number(r.count)]))
    const followupsMap = Object.fromEntries(followupsDone.map((r) => [r.createdBy, Number(r.count)]))
    const dealsMap = Object.fromEntries(dealsWon.map((r) => [r.assignedTo, { count: Number(r.count), value: Number(r.value) }]))

    const actMap = {}
    const typeKey = { call: 'calls', email: 'emails', meeting: 'meetings', note: 'notes' }
    for (const r of activities) {
      if (!actMap[r.userId]) actMap[r.userId] = { calls: 0, emails: 0, meetings: 0, notes: 0, total: 0 }
      const key = typeKey[r.type] || r.type
      actMap[r.userId][key] = (actMap[r.userId][key] || 0) + Number(r.count)
      actMap[r.userId].total += Number(r.count)
    }

    const employees = members
      .filter((m) => userIds.includes(m.user.id))
      .map((m) => {
        const u = m.user
        const acts = actMap[u.id] || { calls: 0, emails: 0, meetings: 0, notes: 0, total: 0 }
        const deals = dealsMap[u.id] || { count: 0, value: 0 }
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          leadsCreated: leadsMap[u.id] || 0,
          calls: acts.calls || 0,
          emails: acts.emails || 0,
          meetingActivities: acts.meetings || 0,
          notes: acts.notes || 0,
          totalActivities: acts.total || 0,
          tasksCompleted: tasksMap[u.id] || 0,
          meetingsHeld: meetingsMap[u.id] || 0,
          followupsDone: followupsMap[u.id] || 0,
          dealsWon: deals.count,
          dealsWonValue: deals.value,
        }
      })
      .sort((a, b) => b.totalActivities - a.totalActivities)

    return res.json({
      success: true,
      data: {
        kpis: {
          month,
          year,
          employees: employees.length,
          totalActivities: employees.reduce((s, e) => s + e.totalActivities, 0),
          totalTasksCompleted: employees.reduce((s, e) => s + e.tasksCompleted, 0),
          totalDealsWon: employees.reduce((s, e) => s + e.dealsWon, 0),
        },
        charts: {
          activitiesByEmployee: employees.map((e) => ({ name: e.name, count: e.totalActivities })),
          tasksByEmployee: employees.map((e) => ({ name: e.name, count: e.tasksCompleted })),
        },
        tables: { employees },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── data health report ───────────────────────────────────────────────────────

export async function dataHealthReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const scope = leadScope(ctx, { isOpportunity: false })
    const now = new Date()
    const staleThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [unassigned, noEmail, openLeads, duplicateCount] = await Promise.all([
      Lead.findAll({
        where: { ...scope, assignedTo: null },
        include: [{ model: User, as: 'owner', attributes: ['name'], required: false }],
        order: [['createdAt', 'DESC']],
        limit: 100,
      }),
      Lead.findAll({
        where: { ...scope, [Op.or]: [{ email: null }, { email: '' }] },
        attributes: ['id', 'title', 'company', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 100,
        raw: true,
      }),
      Lead.findAll({
        where: { ...scope, status: { [Op.notIn]: ['won', 'lost', 'junk'] } },
        attributes: ['id'],
        raw: true,
      }),
      DuplicateLead.count({ where: { companyId: ctx.companyId, workspaceId: ctx.workspaceId } }),
    ])

    const openIds = openLeads.map((r) => r.id)
    let untouchedRows = []
    if (openIds.length) {
      const recentIds = await Activity.findAll({
        where: { leadId: { [Op.in]: openIds }, createdAt: { [Op.gte]: staleThreshold } },
        attributes: [[fn('DISTINCT', col('lead_id')), 'leadId']],
        raw: true,
      }).then((rows) => new Set(rows.map((r) => r.leadId)))

      const staleLeads = await Lead.findAll({
        where: { id: { [Op.in]: openIds.filter((id) => !recentIds.has(id)) } },
        include: [
          { model: User, as: 'owner', attributes: ['name'], required: false },
          { model: User, as: 'assignee', attributes: ['name'], required: false },
        ],
        order: [['updatedAt', 'ASC']],
        limit: 100,
      })

      untouchedRows = staleLeads.map((l) => {
        const daysSince = Math.floor((now - new Date(l.updatedAt || l.createdAt)) / 86400000)
        return {
          id: l.id,
          title: l.title,
          company: l.company,
          status: l.status,
          owner: l.owner?.name || '—',
          assignee: l.assignee?.name || 'Unassigned',
          daysSinceActivity: daysSince,
          createdAt: l.createdAt,
        }
      })
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          unassigned: unassigned.length,
          untouched: untouchedRows.length,
          noEmail: noEmail.length,
          duplicates: duplicateCount,
        },
        charts: {},
        tables: {
          unassigned: unassigned.map((l) => ({
            id: l.id, title: l.title, company: l.company, status: l.status,
            owner: l.owner?.name || '—', createdAt: l.createdAt,
          })),
          untouched: untouchedRows,
          noEmail,
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}

// ─── campaigns report ─────────────────────────────────────────────────────────

export async function campaignsReport(req, res, next) {
  try {
    const ctx = getContext(req)
    const { from, to } = parseRange(req.query)
    const { companyId, workspaceId } = ctx

    const campaigns = await Campaign.findAll({
      where: { companyId, workspaceId },
      attributes: ['id', 'name', 'status', 'leadTarget', 'endDate'],
      order: [['createdAt', 'DESC']],
      limit: 50,
    })
    const campaignIds = campaigns.map((c) => c.id)

    const [activeCampaigns, campaignLeads, leadsByCampaign] = await Promise.all([
      Campaign.count({ where: { companyId, workspaceId, status: 'active' } }),
      campaignIds.length
        ? CampaignLead.count({ where: { campaignId: { [Op.in]: campaignIds }, createdAt: { [Op.between]: [from, to] } } })
        : 0,
      campaignIds.length
        ? CampaignLead.findAll({
          where: { campaignId: { [Op.in]: campaignIds } },
          attributes: ['campaignId', [fn('COUNT', col('id')), 'count']],
          group: ['campaignId'],
          raw: true,
        })
        : [],
    ])

    const campMap = Object.fromEntries(campaigns.map((c) => [c.id, c.name]))
    const staged = leadsByCampaign.reduce((s, r) => s + Number(r.count), 0)

    return res.json({
      success: true,
      data: {
        kpis: { activeCampaigns, leadsStagedInPeriod: campaignLeads, totalStaged: staged },
        charts: {
          byCampaign: leadsByCampaign.map((r) => ({
            name: campMap[r.campaignId] || 'Unknown',
            count: Number(r.count),
          })),
        },
        tables: {
          campaigns: campaigns.map((c) => ({
            id: c.id, name: c.name, status: c.status, target: c.leadTarget, endDate: c.endDate,
            leadsStaged: Number(leadsByCampaign.find((r) => r.campaignId === c.id)?.count || 0),
          })),
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}
