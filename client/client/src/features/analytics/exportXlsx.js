import * as XLSX from 'xlsx'

function toDate(label) {
  return typeof label === 'string' ? label.slice(0, 10) : String(label ?? '')
}

function fmtMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildSheet(headers, rows) {
  const data = [headers, ...rows]
  return XLSX.utils.aoa_to_sheet(data)
}

function saveWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}

function kpiSheet(kpis) {
  const rows = Object.entries(kpis).map(([k, v]) => [
    k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
    v,
  ])
  return buildSheet(['Metric', 'Value'], rows)
}

// ─── Overview ───────────────────────────────────────────────────────────────

export function exportOverview({ leads, pipeline, act, tasks, team, from, to }) {
  const wb = XLSX.utils.book_new()

  const kpis = {
    'Total Leads': leads?.kpis?.total ?? 0,
    'New Leads (period)': leads?.kpis?.newInPeriod ?? 0,
    'Won Leads': leads?.kpis?.won ?? 0,
    'Lost Leads': leads?.kpis?.lost ?? 0,
    'Pipeline Value': fmtMoney(pipeline?.kpis?.totalValue),
    'Won Value': fmtMoney(pipeline?.kpis?.wonValue),
    'Win Rate %': pipeline?.kpis?.winRate ?? 0,
    'Total Activities': act?.kpis?.total ?? 0,
    'Open Tasks': tasks?.kpis?.openTotal ?? 0,
    'Overdue Tasks': tasks?.kpis?.overdue ?? 0,
    'Tasks Done (period)': tasks?.kpis?.completed ?? 0,
    'Team Members': team?.kpis?.total ?? 0,
  }
  XLSX.utils.book_append_sheet(wb, kpiSheet(kpis), 'KPIs')

  const workload = tasks?.tables?.assigneeWorkload || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Name', 'Open', 'Pending', 'In Progress', 'Overdue', 'Assigned (period)', 'Completed (period)'],
    workload.map((r) => [r.name, r.open, r.pending, r.inProgress, r.overdue, r.assignedInPeriod, r.completedInPeriod]),
  ), 'Task Workload')

  saveWorkbook(wb, `connexify-overview-${from}-${to}.xlsx`)
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export function exportLeads({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  const kpis = data?.kpis || {}
  XLSX.utils.book_append_sheet(wb, kpiSheet({
    'Total Leads': kpis.total ?? 0,
    'New (period)': kpis.newInPeriod ?? 0,
    'Won': kpis.won ?? 0,
    'Lost': kpis.lost ?? 0,
    'Junk': kpis.junk ?? 0,
    'Assigned': kpis.assigned ?? 0,
    'Unassigned': kpis.unassigned ?? 0,
    'Stale (no activity 14d)': kpis.staleLeads ?? 0,
    'Conversion Rate %': kpis.conversionRate ?? 0,
  }), 'KPIs')

  const charts = data?.charts || {}
  XLSX.utils.book_append_sheet(wb, buildSheet(['Status', 'Count'], (charts.statusDist || []).map((r) => [r.name, r.value])), 'Status Dist')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Source', 'Count'], (charts.sourceDist || []).map((r) => [r.name, r.value])), 'Source Dist')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Stage', 'Count', 'Total Value'], (charts.stageDist || []).map((r) => [r.name, r.count, fmtMoney(r.value)])), 'Stage Dist')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Date', 'New Leads'], (charts.trend || []).map((r) => [toDate(r.date), r.count])), 'Daily Trend')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Score Range', 'Count'], (charts.scoreDist || []).map((r) => [r.range, r.count])), 'Score Dist')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Stage', 'Count'], (charts.conversionFunnel || []).map((r) => [r.stage, r.count])), 'Funnel')

  const top10 = data?.tables?.top10 || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Name', 'Company', 'Status', 'Source', 'Value', 'Owner', 'Created'],
    top10.map((r) => [r.title, r.company, r.status, r.source, fmtMoney(r.value), r.owner, toDate(r.createdAt)]),
  ), 'Top Leads')

  const untouched = data?.tables?.untouchedLeads || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Name', 'Company', 'Assignee', 'Owner', 'Status', 'Days idle'],
    untouched.map((r) => [r.title, r.company, r.assignee, r.owner, r.status, r.daysSinceActivity]),
  ), 'Untouched Leads')

  saveWorkbook(wb, `connexify-leads-${from}-${to}.xlsx`)
}

// ─── Pipeline / Deals ────────────────────────────────────────────────────────

export function exportDeals({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  const kpis = data?.kpis || {}
  XLSX.utils.book_append_sheet(wb, kpiSheet({
    'Total Deals': kpis.totalDeals ?? 0,
    'Open Deals': kpis.openDeals ?? 0,
    'Pipeline Value': fmtMoney(kpis.pipelineValue),
    'Won Value': fmtMoney(kpis.wonValue),
    'Win Rate %': kpis.winRate ?? 0,
    'Payments Received': fmtMoney(kpis.paymentsReceived),
    'Payments Pending': fmtMoney(kpis.paymentsPending),
  }), 'KPIs')

  const charts = data?.charts || {}
  XLSX.utils.book_append_sheet(wb, buildSheet(['Stage', 'Count', 'Total Value'], (charts.stageDist || []).map((r) => [r.name, r.count, fmtMoney(r.value)])), 'Stage Dist')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Value Range', 'Count', 'Total Value'], (charts.valueDist || []).map((r) => [r.range, r.count, fmtMoney(r.value)])), 'Value Dist')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Month', 'Deals Created', 'Total Value'], (charts.monthlyTrend || []).map((r) => [r.month, r.created, fmtMoney(r.createdValue)])), 'Monthly Trend')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Mode', 'Count', 'Total Received'], (charts.paymentsByMode || []).map((r) => [r.mode, r.count, fmtMoney(r.value)])), 'Payments by Mode')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Month', 'Received', 'Pending'], (charts.paymentsTrend || []).map((r) => [r.month, fmtMoney(r.received), fmtMoney(r.pending)])), 'Payments Trend')

  const tables = data?.tables || {}
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Deal Name', 'Stage', 'Value', 'Owner', 'Created', 'Updated'],
    (tables.recentDeals || []).map((r) => [r.name, r.stage, fmtMoney(r.value), r.owner, toDate(r.createdAt), toDate(r.updatedAt)]),
  ), 'Recent Deals')
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Owner', 'Email', 'Deals', 'Pipeline Value'],
    (tables.dealsByOwner || []).map((r) => [r.name, r.email, r.deals, fmtMoney(r.value)]),
  ), 'Deals by Owner')

  saveWorkbook(wb, `connexify-deals-${from}-${to}.xlsx`)
}

// ─── Activities ───────────────────────────────────────────────────────────────

export function exportActivities({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  const kpis = data?.kpis || {}
  XLSX.utils.book_append_sheet(wb, kpiSheet({
    'Total Activities': kpis.total ?? 0,
    'Calls': kpis.calls ?? 0,
    'Emails': kpis.emails ?? 0,
    'Meetings': kpis.meetings ?? 0,
    'Notes': kpis.notes ?? 0,
    'Tasks': kpis.tasks ?? 0,
    'Follow-ups Created': kpis.followupsCreated ?? 0,
    'Follow-ups Done': kpis.followupsDone ?? 0,
    'Follow-up Rate %': kpis.followupRate ?? 0,
  }), 'KPIs')

  const charts = data?.charts || {}
  XLSX.utils.book_append_sheet(wb, buildSheet(['Type', 'Count'], (charts.typeDist || []).map((r) => [r.name, r.value])), 'By Type')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Date', 'Count'], (charts.trend || []).map((r) => [toDate(r.date), r.count])), 'Daily Trend')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Team Member', 'Count'], (charts.byUser || []).map((r) => [r.name, r.count])), 'By Member')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Lead', 'Count'], (charts.byLead || []).map((r) => [r.name, r.count])), 'By Lead')

  saveWorkbook(wb, `connexify-activities-${from}-${to}.xlsx`)
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export function exportMeetings({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  const kpis = data?.kpis || {}
  XLSX.utils.book_append_sheet(wb, kpiSheet({
    'Total': kpis.total ?? 0,
    'Completed': kpis.completed ?? 0,
    'Cancelled': kpis.cancelled ?? 0,
    'Missed': kpis.missed ?? 0,
    'Avg Duration (min)': kpis.avgDuration ?? 0,
    'With Recording': kpis.recorded ?? 0,
    'With Summary': kpis.withSummary ?? 0,
    'Show-up Rate %': kpis.showUpRate ?? 0,
    'Video / Google Meet': kpis.videoCount ?? 0,
    'Phone / Offline': kpis.phoneCount ?? 0,
  }), 'KPIs')

  const charts = data?.charts || {}
  XLSX.utils.book_append_sheet(wb, buildSheet(['Type', 'Count'], (charts.typeDist || []).map((r) => [r.name, r.value])), 'By Type')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Status', 'Count'], (charts.statusDist || []).map((r) => [r.name, r.count])), 'By Status')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Date', 'Count'], (charts.trend || []).map((r) => [toDate(r.date), r.count])), 'Daily Trend')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Duration', 'Count'], (charts.durationDist || []).map((r) => [r.range, r.count])), 'Duration Dist')
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Host', 'Total', 'Completed', 'Cancelled', 'Missed', 'Show-up Rate %'],
    (charts.byOwner || []).map((r) => [r.name, r.total, r.completed, r.cancelled, r.missed, r.showUpRate]),
  ), 'By Host')

  const recent = data?.tables?.recent || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Title', 'Type', 'Status', 'Duration (min)', 'Host', 'Date'],
    recent.map((r) => [r.title, r.type, r.status, r.duration ?? '—', r.owner, toDate(r.date)]),
  ), 'Meeting Log')

  saveWorkbook(wb, `connexify-meetings-${from}-${to}.xlsx`)
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function exportTasks({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  const kpis = data?.kpis || {}
  XLSX.utils.book_append_sheet(wb, kpiSheet({
    'Created (period)': kpis.total ?? 0,
    'Open Now': kpis.openTotal ?? 0,
    'Completed (period)': kpis.completed ?? 0,
    'Overdue': kpis.overdue ?? 0,
    'Due Today': kpis.dueToday ?? 0,
    'Unassigned Open': kpis.unassignedOpen ?? 0,
    'Completion Rate %': kpis.completionRate ?? 0,
  }), 'KPIs')

  const tables = data?.tables || {}
  const taskCols = ['Title', 'Type', 'Priority', 'Status', 'Assignee', 'Lead', 'Due Date', 'Created']
  const taskRow = (t) => [t.title, t.taskType, t.priority, t.status, t.assignee ?? 'Unassigned', t.lead ?? '—', t.dueAt ? toDate(t.dueAt) : '—', toDate(t.createdAt)]

  XLSX.utils.book_append_sheet(wb, buildSheet([...taskCols, 'Days Overdue'], (tables.overdue || []).map((t) => [...taskRow(t), t.daysOverdue ?? 0])), 'Overdue Tasks')
  XLSX.utils.book_append_sheet(wb, buildSheet(taskCols, (tables.openTasks || []).map(taskRow)), 'Open Tasks')
  XLSX.utils.book_append_sheet(wb, buildSheet(taskCols, (tables.createdInPeriod || []).map(taskRow)), 'Created in Period')
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Name', 'Open', 'Pending', 'In Progress', 'Overdue', 'Assigned (period)', 'Completed (period)'],
    (tables.assigneeWorkload || []).map((r) => [r.name, r.open, r.pending, r.inProgress, r.overdue, r.assignedInPeriod, r.completedInPeriod]),
  ), 'By Assignee')

  saveWorkbook(wb, `connexify-tasks-${from}-${to}.xlsx`)
}

// ─── Team ────────────────────────────────────────────────────────────────────

export function exportTeam({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  const kpis = data?.kpis || {}
  XLSX.utils.book_append_sheet(wb, kpiSheet({
    'Total Members': kpis.total ?? 0,
    'Active': kpis.active ?? 0,
    'Admins': kpis.admins ?? 0,
    'Avg Leads per Member': kpis.avgLeadsPerUser ?? 0,
  }), 'KPIs')

  const team = data?.tables?.team || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Name', 'Email', 'Role', 'Active', 'Leads Owned', 'Leads Assigned', 'Deals', 'Pipeline Value', 'Won Value', 'Tasks Open', 'Overdue Tasks', 'Tasks Done (period)', 'Meetings', 'Activities'],
    team.map((r) => [
      r.name, r.email, r.isAdmin ? 'Admin' : 'Member', r.isActive ? 'Yes' : 'No',
      r.leadsOwned, r.leadsAssigned, r.deals ?? 0,
      fmtMoney(r.pipelineValue), fmtMoney(r.wonValue),
      r.tasksOpen, r.tasksOverdue, r.tasksCompleted, r.meetings, r.activities,
    ]),
  ), 'Team Performance')

  saveWorkbook(wb, `connexify-team-${from}-${to}.xlsx`)
}

// ─── Extended reports ─────────────────────────────────────────────────────────

export function exportOpportunities({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  const kpis = data?.kpis || {}
  XLSX.utils.book_append_sheet(wb, kpiSheet(kpis), 'KPIs')
  const rows = data?.tables?.byStage || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Opportunity', 'Company', 'Stage', 'Status', 'Value', 'Owner', 'Assignee', 'Closing'],
    rows.map((r) => [r.title, r.company, r.stage, r.status, r.value, r.owner, r.assignee, r.closingDate]),
  ), 'By Stage')
  saveWorkbook(wb, `connexify-opportunities-${from}-${to}.xlsx`)
}

export function exportFollowups({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, kpiSheet(data?.kpis || {}), 'KPIs')
  const ser = (rows) => rows.map((r) => [r.lead, r.scheduledAt, r.assignee, r.remark, r.status, r.daysOverdue ?? ''])
  XLSX.utils.book_append_sheet(wb, buildSheet(['Lead', 'Scheduled', 'Assignee', 'Note', 'Status', 'Days overdue'], ser(data?.tables?.upcoming || [])), 'Upcoming')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Lead', 'Scheduled', 'Assignee', 'Note', 'Status', 'Days overdue'], ser(data?.tables?.overdue || [])), 'Overdue')
  saveWorkbook(wb, `connexify-followups-${from}-${to}.xlsx`)
}

export function exportSalesDocs({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, kpiSheet(data?.kpis || {}), 'KPIs')
  const q = data?.tables?.recentQuotations || []
  const i = data?.tables?.recentInvoices || []
  XLSX.utils.book_append_sheet(wb, buildSheet(['Number', 'Lead', 'Status', 'Value', 'Owner', 'Created'], q.map((r) => [r.number, r.lead, r.status, r.value, r.owner, r.createdAt])), 'Quotations')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Number', 'Lead', 'Status', 'Value', 'Paid', 'Owner', 'Created'], i.map((r) => [r.number, r.lead, r.status, r.value, r.paid, r.owner, r.createdAt])), 'Invoices')
  saveWorkbook(wb, `connexify-sales-docs-${from}-${to}.xlsx`)
}

export function exportPayments({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, kpiSheet(data?.kpis || {}), 'KPIs')
  const ledger = data?.tables?.ledger || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Lead', 'Source', 'Deal/Invoice', 'Amount', 'Mode', 'Status', 'Date'],
    ledger.map((r) => [r.lead, r.source, r.deal, r.amount, r.mode, r.status, r.date]),
  ), 'Ledger')
  saveWorkbook(wb, `connexify-payments-${from}-${to}.xlsx`)
}

export function exportLeave({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, kpiSheet(data?.kpis || {}), 'KPIs')
  const rows = data?.tables?.requests || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Employee', 'Leave type', 'From', 'To', 'Days', 'Status'],
    rows.map((r) => [r.employee, r.leaveType, r.fromDate, r.toDate, r.days, r.status]),
  ), 'Requests')
  saveWorkbook(wb, `connexify-leave-${from}-${to}.xlsx`)
}

export function exportEmployeeMonthly({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, kpiSheet(data?.kpis || {}), 'KPIs')
  const rows = data?.tables?.employees || []
  XLSX.utils.book_append_sheet(wb, buildSheet(
    ['Employee', 'Leads', 'Calls', 'Emails', 'Activities', 'Tasks', 'Meetings', 'Follow-ups', 'Deals won', 'Won value'],
    rows.map((r) => [r.name, r.leadsCreated, r.calls, r.emails, r.totalActivities, r.tasksCompleted, r.meetingsHeld, r.followupsDone, r.dealsWon, r.dealsWonValue]),
  ), 'Employees')
  saveWorkbook(wb, `connexify-employee-monthly-${from}-${to}.xlsx`)
}

export function exportDataHealth({ data, from, to }) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, kpiSheet(data?.kpis || {}), 'KPIs')
  const u = data?.tables?.unassigned || []
  const t = data?.tables?.untouched || []
  XLSX.utils.book_append_sheet(wb, buildSheet(['Lead', 'Company', 'Status', 'Owner', 'Created'], u.map((r) => [r.title, r.company, r.status, r.owner, r.createdAt])), 'Unassigned')
  XLSX.utils.book_append_sheet(wb, buildSheet(['Lead', 'Assignee', 'Owner', 'Status', 'Days idle'], t.map((r) => [r.title, r.assignee, r.owner, r.status, r.daysSinceActivity])), 'Untouched')
  saveWorkbook(wb, `connexify-data-health-${from}-${to}.xlsx`)
}
