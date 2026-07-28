function qs(params) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  const search = new URLSearchParams(clean).toString()
  return search ? `?${search}` : ''
}

/** Builds the role-aware KPI card configs for the dashboard's stat rows. */
export function buildDashboardKpiCards({ authUser, kpis, chartDateRange }) {
  const isCompanyAdmin = Boolean(authUser?.isCompanyAdmin)
  const kind = authUser?.companyRole?.userRoleKind
  const isElevatedTier = isCompanyAdmin || kind === 'workspace_admin' || kind === 'manager'
  const uid = authUser?.id
  const mine = isElevatedTier ? {} : { assignedTo: uid }

  const topRow = [
    { key: 'totalLeads', label: 'Total leads', value: kpis?.totalLeads, hint: 'All leads you can access', href: `/leads${qs(mine)}` },
    { key: 'totalOpps', label: 'Total opportunities', value: kpis?.totalOpps, hint: 'Open pipeline records', href: `/opportunities${qs(mine)}` },
    { key: 'newLeads', label: 'New leads', value: kpis?.newLeadsPeriod, hint: 'In selected range', href: `/leads${qs({ ...mine, createdFrom: chartDateRange?.from, createdTo: chartDateRange?.to })}` },
    { key: 'calls', label: 'Calls', value: kpis?.callsTotal, hint: 'All-time activity', href: '/calls' },
    { key: 'meetings', label: 'Meetings', value: kpis?.meetingsTotal, hint: 'All-time activity', href: '/meetings' },
    { key: 'emails', label: 'Emails', value: kpis?.emailsTotal, hint: 'All-time activity', href: '/activities' },
  ]

  const secondRow = [
    { key: 'openTasks', label: 'Open tasks', value: kpis?.openTasks, hint: 'Pending + in progress', href: '/tasks' },
    { key: 'dueToday', label: 'Tasks due today', value: kpis?.tasksDueToday, hint: 'Act on these first', href: `/tasks${qs({ due: 'due_today' })}` },
    { key: 'overdue', label: 'Overdue tasks', value: kpis?.overdueTasks, hint: 'Past due date', href: `/tasks${qs({ due: 'overdue' })}` },
    { key: 'followupsToday', label: 'Followups today', value: kpis?.followupsToday, hint: 'Pending, scheduled today', href: '/followups' },
    { key: 'meetingsToday', label: "Today's meetings", value: kpis?.meetingsToday, hint: 'Scheduled today', href: '/meetings' },
  ]

  return { topRow, secondRow }
}
