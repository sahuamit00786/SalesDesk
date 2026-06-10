import { QueryTypes } from 'sequelize'
import { sequelize } from '../models/index.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'

function parseDate(str, fallback) {
  if (!str) return fallback
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function groupByExpr(groupBy, field) {
  if (groupBy === 'month') return `DATE_FORMAT(${field}, '%Y-%m')`
  if (groupBy === 'week') return `DATE_FORMAT(${field}, '%Y-%u')`
  return `DATE_FORMAT(${field}, '%Y-%m-%d')`
}

export async function getEmailTrackingReport(req, res, next) {
  try {
    const companyId = req.user.companyId
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const dateFrom = parseDate(req.query.dateFrom, thirtyDaysAgo)
    const dateTo = parseDate(req.query.dateTo, now)
    const source = req.query.source || 'all' // 'direct' | 'bulk' | 'workflow' | 'all'
    const groupBy = req.query.groupBy || 'day' // 'day' | 'week' | 'month' | 'source' | 'none'

    // Resolve workspace scope
    const workspaceParam = req.query.workspaceId || req.headers['x-workspace-id'] || null
    let workspaceIds = await allowedWorkspaceIdsForUser(req.user)
    if (workspaceParam && workspaceIds.includes(workspaceParam)) {
      workspaceIds = [workspaceParam]
    }
    if (!workspaceIds.length) {
      return res.json({ success: true, data: { summary: emptySummary(), rows: [] } })
    }

    const wsInClause = workspaceIds.map(() => '?').join(',')
    const replacements = [companyId, ...workspaceIds, dateFrom, dateTo]

    // ── Direct emails (LeadEmail) ──────────────────────────────────────────────
    const directRows = []
    if (source === 'all' || source === 'direct') {
      const directGroupExpr = groupBy === 'source'
        ? `'direct'`
        : groupBy === 'none'
          ? `'all'`
          : groupByExpr(groupBy, 'sent_at')

      const directSql = `
        SELECT
          ${directGroupExpr} AS period,
          'direct' AS source,
          COUNT(*) AS sent,
          SUM(opened_at IS NOT NULL) AS opened,
          SUM(clicked_at IS NOT NULL) AS clicked,
          0 AS replied,
          CAST(SUM(COALESCE(open_count, 0)) AS UNSIGNED) AS total_opens,
          CAST(SUM(COALESCE(click_count, 0)) AS UNSIGNED) AS total_clicks
        FROM lead_emails
        WHERE company_id = ?
          AND workspace_id IN (${wsInClause})
          AND direction = 'outbound'
          AND status = 'sent'
          AND deleted_at IS NULL
          AND sent_at BETWEEN ? AND ?
        ${groupBy !== 'none' ? `GROUP BY ${directGroupExpr}` : ''}
        ORDER BY period ASC
      `
      const rows = await sequelize.query(directSql, {
        replacements,
        type: QueryTypes.SELECT,
      })
      directRows.push(...rows)
    }

    // ── Template emails (LeadEmailLog) ────────────────────────────────────────
    const logRows = []
    if (source === 'all' || source === 'bulk' || source === 'workflow') {
      const sourceCond = source === 'all' ? '' : `AND source = '${source}'`
      const logGroupExpr = groupBy === 'source'
        ? 'source'
        : groupBy === 'none'
          ? `'all'`
          : groupByExpr(groupBy, 'sent_at')

      const logReplacements = [companyId, ...workspaceIds, dateFrom, dateTo]
      const logSql = `
        SELECT
          ${logGroupExpr} AS period,
          ${groupBy === 'source' ? 'source' : `'${source === 'all' ? 'bulk/workflow' : source}'`} AS source,
          COUNT(*) AS sent,
          SUM(opened_at IS NOT NULL) AS opened,
          SUM(clicked_at IS NOT NULL) AS clicked,
          SUM(replied_at IS NOT NULL) AS replied,
          CAST(SUM(COALESCE(open_count, 0)) AS UNSIGNED) AS total_opens,
          CAST(SUM(COALESCE(click_count, 0)) AS UNSIGNED) AS total_clicks
        FROM lead_email_logs
        WHERE company_id = ?
          AND workspace_id IN (${wsInClause})
          AND status IN ('sent','opened','clicked','replied')
          AND deleted_at IS NULL
          AND sent_at BETWEEN ? AND ?
          ${sourceCond}
        ${groupBy !== 'none' ? `GROUP BY ${logGroupExpr}${groupBy === 'source' ? ', source' : ''}` : ''}
        ORDER BY period ASC
      `
      const rows = await sequelize.query(logSql, {
        replacements: logReplacements,
        type: QueryTypes.SELECT,
      })
      logRows.push(...rows)
    }

    // Merge rows
    const allRows = [...directRows, ...logRows].map((r) => ({
      period: r.period,
      source: r.source,
      sent: Number(r.sent || 0),
      opened: Number(r.opened || 0),
      clicked: Number(r.clicked || 0),
      replied: Number(r.replied || 0),
      totalOpens: Number(r.total_opens || 0),
      totalClicks: Number(r.total_clicks || 0),
    }))

    // Compute summary
    const summary = allRows.reduce(
      (acc, r) => {
        acc.sent += r.sent
        acc.opened += r.opened
        acc.clicked += r.clicked
        acc.replied += r.replied
        acc.totalOpens += r.totalOpens
        acc.totalClicks += r.totalClicks
        return acc
      },
      { sent: 0, opened: 0, clicked: 0, replied: 0, totalOpens: 0, totalClicks: 0 },
    )
    summary.openRate = summary.sent > 0 ? +(summary.opened / summary.sent).toFixed(4) : 0
    summary.clickRate = summary.sent > 0 ? +(summary.clicked / summary.sent).toFixed(4) : 0
    summary.replyRate = summary.sent > 0 ? +(summary.replied / summary.sent).toFixed(4) : 0

    return res.json({ success: true, data: { summary, rows: allRows } })
  } catch (err) {
    return next(err)
  }
}

function emptySummary() {
  return { sent: 0, opened: 0, clicked: 0, replied: 0, totalOpens: 0, totalClicks: 0, openRate: 0, clickRate: 0, replyRate: 0 }
}
