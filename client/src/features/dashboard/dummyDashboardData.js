/**
 * Sample chart payloads for dashboard visuals.
 * TODO: Replace with analytics/time-series API when available.
 */

export const CHART_COLORS = {
  primary: '#3b73f5',
  primaryDark: '#2451eb',
  secondary: '#90bdff',
  muted: '#8b93a8',
  ink: '#4b5263',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0891b2',
  slices: ['#2451eb', '#5c98ff', '#90bdff', '#bdd8ff', '#4b5263', '#d97706'],
}

import { formatCompactMoney } from '@/utils/money'

function formatCurrency(n, currency = 'USD') {
  return formatCompactMoney(n, currency)
}

export function formatChartCurrency(n, currency = 'USD') {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return formatCompactMoney(n, currency)
}

function round(n) {
  return Math.max(0, Math.round(n))
}

function scaleRecord(obj, keys, factor) {
  const out = { ...obj }
  for (const k of keys) {
    if (typeof out[k] === 'number') out[k] = round(out[k] * factor)
  }
  return out
}

export function buildDummyDashboard(opts = {}) {
  const { datePreset = '30d', scope = 'all' } = opts
  const dateFactor = datePreset === '7d' ? 0.32 : datePreset === '90d' ? 2.65 : 1
  const scopeFactor = scope === 'mine' ? 0.38 : 1
  const f = dateFactor * scopeFactor

  const kpis = {
    openLeads: round(186 * f),
    newLeadsPeriod: round(42 * f),
    pipelineValue: formatCurrency(2_420_000 * f),
    pipelineRaw: round(2_420_000 * f),
    openOpportunities: round(64 * f),
    weightedForecast: formatCurrency(980_000 * f),
    weightedRaw: round(980_000 * f),
    tasksDue: round(28 * f),
    tasksOverdue: round(7 * f),
    activitiesWeek: round(312 * f),
    formSubmissions: round(96 * f),
    emailsSent: round(428 * f),
    emailsReceived: round(1156 * f),
    documentsUploaded: round(36 * f),
    activeAutomations: round(12),
    campaignTouches: round(2150 * f),
    callsLogged: round(118 * f),
  }

  const deltaHint =
    datePreset === '7d'
      ? 'vs prior 7 days'
      : datePreset === '90d'
        ? 'vs prior quarter'
        : 'vs prior 30 days'

  const leadFunnel = [
    scaleRecord({ stage: 'New', count: 420 }, ['count'], f),
    scaleRecord({ stage: 'Working', count: 268 }, ['count'], f),
    scaleRecord({ stage: 'Qualified', count: 142 }, ['count'], f),
    scaleRecord({ stage: 'Opportunity', count: 64 }, ['count'], f),
  ]

  const pipelineByStage = [
    scaleRecord({ stage: 'Discovery', value: 480000, deals: 22 }, ['value', 'deals'], f),
    scaleRecord({ stage: 'Proposal', value: 920000, deals: 18 }, ['value', 'deals'], f),
    scaleRecord({ stage: 'Negotiation', value: 610000, deals: 14 }, ['value', 'deals'], f),
    scaleRecord({ stage: 'Verbal', value: 410000, deals: 10 }, ['value', 'deals'], f),
  ]

  const pipelineTrend = [
    { month: 'Jun', created: round(680000 * f), closed: round(210000 * f) },
    { month: 'Jul', created: round(720000 * f), closed: round(380000 * f) },
    { month: 'Aug', created: round(810000 * f), closed: round(290000 * f) },
    { month: 'Sep', created: round(690000 * f), closed: round(440000 * f) },
    { month: 'Oct', created: round(920000 * f), closed: round(510000 * f) },
    { month: 'Nov', created: round(880000 * f), closed: round(620000 * f) },
  ]

  const activitiesByType = [
    scaleRecord({ name: 'Email', value: 124 }, ['value'], f),
    scaleRecord({ name: 'Call', value: 118 }, ['value'], f),
    scaleRecord({ name: 'Meeting', value: 42 }, ['value'], f),
    scaleRecord({ name: 'Task', value: 28 }, ['value'], f),
  ]

  const tasksThroughput = [
    { week: 'W1', completed: round(52 * f), created: round(48 * f) },
    { week: 'W2', completed: round(61 * f), created: round(55 * f) },
    { week: 'W3', completed: round(48 * f), created: round(62 * f) },
    { week: 'W4', completed: round(72 * f), created: round(58 * f) },
  ]

  const leadSources = [
    scaleRecord({ name: 'Web form', value: 38 }, ['value'], f),
    scaleRecord({ name: 'Referral', value: 24 }, ['value'], f),
    scaleRecord({ name: 'Outbound', value: 18 }, ['value'], f),
    scaleRecord({ name: 'Import', value: 12 }, ['value'], f),
    scaleRecord({ name: 'Other', value: 8 }, ['value'], f),
  ]

  const campaignForms = [
    { name: 'Spring outbound', sends: round(2150 * f), submissions: round(42 * f) },
    { name: 'Product webinar', sends: round(980 * f), submissions: round(28 * f) },
    { name: 'Retargeting', sends: round(3120 * f), submissions: round(18 * f) },
    { name: 'Partner blast', sends: round(740 * f), submissions: round(8 * f) },
  ]

  const forecastVsActual = [
    { month: 'Jul', forecast: round(410000 * f), actual: round(380000 * f) },
    { month: 'Aug', forecast: round(450000 * f), actual: round(420000 * f) },
    { month: 'Sep', forecast: round(520000 * f), actual: round(440000 * f) },
    { month: 'Oct', forecast: round(580000 * f), actual: round(510000 * f) },
    { month: 'Nov', forecast: round(620000 * f), actual: round(590000 * f) },
    { month: 'Dec', forecast: round(710000 * f), actual: round(640000 * f) },
  ]

  return {
    kpis,
    deltaHint,
    leadFunnel,
    pipelineByStage,
    pipelineTrend,
    activitiesByType,
    tasksThroughput,
    leadSources,
    campaignForms,
    forecastVsActual,
  }
}
