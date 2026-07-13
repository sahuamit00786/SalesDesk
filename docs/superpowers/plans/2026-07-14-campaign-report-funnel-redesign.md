# Campaign Report Funnel & Insights Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the campaign report's funnel real trend arrows, a computed insight banner, and 3 sparkline insight cards — all date-range-scoped — without touching the existing all-time KPI/table sections.

**Architecture:** Backend adds `from`/`to` query params to the existing `getCampaignReport` endpoint and returns period-over-period trend fields computed in-memory (same style already used in that function) from two tables that already exist: `CampaignLeadStageHistory` (stage entries) and `CampaignPayment` (received amounts). Frontend adds a date-range picker, an Export button (wiring an already-built-but-unused-here CSV endpoint), a rule-based insight banner, and 3 reusable insight cards — all pure-presentational, fed by the extended API response.

**Tech Stack:** Express 5 + Sequelize (backend), React 18 + Recharts + RTK Query + Tailwind (frontend). No new dependencies.

## Global Constraints

- No new database migrations or tables — trend data derives from `CampaignLeadStageHistory` and `CampaignPayment`, both already exist.
- Existing all-time KPI strip / stage table / team table / payments-by-mode section must NOT change their numbers when the date range changes — only the funnel arrows, insight banner, and 3 new cards are range-scoped.
- `CampaignDetailPage.jsx`'s existing funnel widget must render pixel-identical after these changes (it never passes `entriesDeltaPct`, so new trend badges must not appear there).
- No automated test runner exists in this repo for `client/` or `server/` (confirmed: no `vitest`/`jest` config or dependency in either workspace, no `*.test.js` files anywhere outside the unrelated `ConnexifyNative/` app). Each task's verification step is therefore a manual check (curl / browser) with an exact expected result, not an automated test — this matches actual repo convention rather than introducing a new test framework as unrelated scope.
- Sales-only users (`isSalesOnlyUser`) must see trend data scoped to only their own leads/payments, matching the existing all-time scoping already applied in `getCampaignReport`.

---

### Task 1: Backend — period/trend aggregation in `getCampaignReport`

**Files:**
- Modify: `server/src/controllers/campaignsController.js:1030-1219` (function `getCampaignReport`) and the module scope just above it (new helper functions)

**Interfaces:**
- Consumes: existing `campaignLeads`, `payments`, `stageMap`, `stages`, `reportSalesOnly` locals already computed inside `getCampaignReport` (lines 1052-1073); existing `CampaignLeadStageHistory`, `Op` imports (already imported at top of file, no new imports needed)
- Produces: response JSON gains `period: {from,to,prevFrom,prevTo}`, `paymentsSummary: {receivedInPeriod,receivedPrevPeriod,receivedDeltaPct}`, `dailySeries: [{date,transitions,receivedAmount}]`; each `stageBreakdown[]` entry gains `entriesInPeriod`, `entriesPrevPeriod`, `entriesDeltaPct` (number, or `null` meaning "no previous-period data / show a New badge", or `0` meaning "no change")

- [ ] **Step 1: Add `isoDate` + `resolveReportPeriod` helpers above `getCampaignReport`**

Find this line (currently right before the function, `campaignsController.js:1029-1030`):
```javascript
export async function getCampaignReport(req, res, next) {
```

Insert immediately above it:
```javascript
function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

/** Resolves from/to query params into current + previous (equal-length) comparison windows. */
function resolveReportPeriod(query) {
  const parseDate = (str) => {
    if (!str) return null
    const d = new Date(`${str}T00:00:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const defaultTo = today
  const defaultFrom = new Date(today.getTime() - 29 * 86400000)

  let to = parseDate(query.to) || defaultTo
  let from = parseDate(query.from) || defaultFrom
  if (from > to) { const t = from; from = to; to = t }

  const spanMs = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 86400000)
  const prevFrom = new Date(prevTo.getTime() - spanMs)
  const endOfDay = (d) => new Date(d.getTime() + 86400000 - 1)

  return {
    from: isoDate(from), to: isoDate(to), prevFrom: isoDate(prevFrom), prevTo: isoDate(prevTo),
    curStart: from, curEnd: endOfDay(to),
    prevStart: prevFrom, prevEnd: endOfDay(prevTo),
  }
}

```

- [ ] **Step 2: Fetch stage-history rows for the comparison window**

Find (`campaignsController.js`, right after the `payments` fetch):
```javascript
    const payments = await CampaignPayment.findAll({
      where: paymentWhere,
      order: [[literal('payment_date'), 'DESC'], [literal('created_at'), 'DESC']],
    })
```

Replace with:
```javascript
    const payments = await CampaignPayment.findAll({
      where: paymentWhere,
      order: [[literal('payment_date'), 'DESC'], [literal('created_at'), 'DESC']],
    })

    const period = resolveReportPeriod(req.query)
    const historyWhere = {
      campaignId: campaign.id,
      createdAt: { [Op.gte]: period.prevStart, [Op.lte]: period.curEnd },
    }
    if (reportSalesOnly) {
      const ownClIds = campaignLeads.map((cl) => cl.id)
      historyWhere.campaignLeadId = ownClIds.length ? ownClIds : [null]
    }
    const historyRows = await CampaignLeadStageHistory.findAll({
      where: historyWhere,
      attributes: ['toStageKey', 'createdAt'],
    })
```

- [ ] **Step 3: Add per-stage entry counts + deltas to `stageMap`**

Find (`campaignsController.js`, the stage-map initialization loop):
```javascript
    const stages = Array.isArray(campaign.stages) ? campaign.stages : DEFAULT_CAMPAIGN_STAGES
    const stageMap = {}
    for (const s of stages) {
      stageMap[s.key] = { key: s.key, label: s.label, leadCount: 0, receivedAmount: 0, pendingAmount: 0 }
    }
```

Replace with:
```javascript
    const stages = Array.isArray(campaign.stages) ? campaign.stages : DEFAULT_CAMPAIGN_STAGES
    const stageMap = {}
    for (const s of stages) {
      stageMap[s.key] = { key: s.key, label: s.label, leadCount: 0, receivedAmount: 0, pendingAmount: 0 }
    }

    const firstStageKey = stages[0]?.key
    for (const s of stages) {
      const isFirst = s.key === firstStageKey
      const countInWindow = (start, end) => (isFirst
        ? campaignLeads.filter((cl) => cl.createdAt >= start && cl.createdAt <= end).length
        : historyRows.filter((h) => h.toStageKey === s.key && h.createdAt >= start && h.createdAt <= end).length)
      const entriesInPeriod = countInWindow(period.curStart, period.curEnd)
      const entriesPrevPeriod = countInWindow(period.prevStart, period.prevEnd)
      const entriesDeltaPct = entriesPrevPeriod > 0
        ? Math.round(((entriesInPeriod - entriesPrevPeriod) / entriesPrevPeriod) * 100)
        : (entriesInPeriod > 0 ? null : 0)
      if (stageMap[s.key]) {
        stageMap[s.key].entriesInPeriod = entriesInPeriod
        stageMap[s.key].entriesPrevPeriod = entriesPrevPeriod
        stageMap[s.key].entriesDeltaPct = entriesDeltaPct
      }
    }
```

- [ ] **Step 4: Compute payments-period summary + daily series**

Find (`campaignsController.js`, right after the existing payment-aggregation `for (const p of payments)` loop that computes `totalReceived`/`modeAgg`/etc. — this loop ends just before the `// Paginated + filtered payments list` comment):
```javascript
      } else if (p.status === 'refunded') {
        totalRefunded += amt
      }
    }

    // Paginated + filtered payments list
```

Replace with:
```javascript
      } else if (p.status === 'refunded') {
        totalRefunded += amt
      }
    }

    let receivedInPeriod = 0
    let receivedPrevPeriod = 0
    for (const p of payments) {
      if (p.status !== 'received') continue
      const amt = Number(p.amount) || 0
      if (p.paymentDate >= period.from && p.paymentDate <= period.to) receivedInPeriod += amt
      else if (p.paymentDate >= period.prevFrom && p.paymentDate <= period.prevTo) receivedPrevPeriod += amt
    }
    const receivedDeltaPct = receivedPrevPeriod > 0
      ? Math.round(((receivedInPeriod - receivedPrevPeriod) / receivedPrevPeriod) * 100)
      : (receivedInPeriod > 0 ? null : 0)

    const dailyMap = new Map()
    for (let d = new Date(period.curStart); d <= period.curEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = isoDate(d)
      dailyMap.set(key, { date: key, transitions: 0, receivedAmount: 0 })
    }
    for (const h of historyRows) {
      if (h.createdAt < period.curStart || h.createdAt > period.curEnd) continue
      const bucket = dailyMap.get(isoDate(h.createdAt))
      if (bucket) bucket.transitions += 1
    }
    for (const p of payments) {
      if (p.status !== 'received') continue
      if (p.paymentDate < period.from || p.paymentDate > period.to) continue
      const bucket = dailyMap.get(p.paymentDate)
      if (bucket) bucket.receivedAmount += Number(p.amount) || 0
    }
    const dailySeries = Array.from(dailyMap.values())

    // Paginated + filtered payments list
```

- [ ] **Step 5: Add the new fields to the JSON response**

Find (`campaignsController.js`, the response object):
```javascript
    return res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          currency: campaign.currency || 'USD',
          leadTarget,
          endDate: campaign.endDate,
          createdAt: campaign.createdAt,
        },
        summary: {
```

Replace with:
```javascript
    return res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          currency: campaign.currency || 'USD',
          leadTarget,
          endDate: campaign.endDate,
          createdAt: campaign.createdAt,
        },
        period: { from: period.from, to: period.to, prevFrom: period.prevFrom, prevTo: period.prevTo },
        paymentsSummary: { receivedInPeriod, receivedPrevPeriod, receivedDeltaPct },
        dailySeries,
        summary: {
```

(`stageBreakdown: Object.values(stageMap)` further down needs no edit — it already picks up the `entriesInPeriod`/`entriesPrevPeriod`/`entriesDeltaPct` fields added to `stageMap` entries in Step 3.)

- [ ] **Step 6: Verify manually**

Restart the server (`npm run dev:server`), log into the app in a browser, open DevTools Network tab, and load `/campaigns/:id/report` for a campaign that has payments and at least one stage change in its history. Find the `report?...` XHR request, check the response JSON contains:
```json
{
  "data": {
    "period": { "from": "...", "to": "...", "prevFrom": "...", "prevTo": "..." },
    "paymentsSummary": { "receivedInPeriod": 0, "receivedPrevPeriod": 0, "receivedDeltaPct": 0 },
    "dailySeries": [{ "date": "...", "transitions": 0, "receivedAmount": 0 }],
    "stageBreakdown": [{ "key": "new", "label": "New", "leadCount": 0, "entriesInPeriod": 0, "entriesPrevPeriod": 0, "entriesDeltaPct": 0 }]
  }
}
```
Confirm `dailySeries.length` equals the number of days between `period.from` and `period.to` inclusive (30 for the default range). Manually re-query the DB (or count in the leads/payments UI) for one stage to confirm `entriesInPeriod` matches reality.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/campaignsController.js
git commit -m "feat(campaigns): add period trend aggregation to campaign report endpoint"
```

---

### Task 2: Frontend — `CampaignFunnelChart.jsx` trend badge + exported pure calc

**Files:**
- Modify: `client/src/features/campaigns/components/CampaignFunnelChart.jsx` (full file, 115 lines)

**Interfaces:**
- Consumes: nothing new — same `stages` prop shape (`{key,label,count}[]`), now optionally carrying `entriesDeltaPct` per item
- Produces: new named export `computeFunnelStageData(stages)` returning `{key,label,count,pct,dropPct,entriesDeltaPct}[]` — Task 6 (CampaignReport.jsx) imports this to build the insight banner and Card #1's stats without duplicating the drop-off math

- [ ] **Step 1: Extract the drop-off calc into an exported function, add `entriesDeltaPct` passthrough**

Find (top of file through the start of the `data` useMemo):
```javascript
import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Horizontal funnel ribbon + stage headers, with stage-to-stage drop-off %. */
export function CampaignFunnelChart({ stages, activeStageKey, onStageClick, title, subtitle }) {
  const data = useMemo(() => {
    if (!stages?.length) return []
    const counts = stages.map((s) => Number(s.count) || 0)
    const base = counts[0] > 0 ? counts[0] : 1
    return stages.map((s, i) => ({
      key: s.key,
      label: s.label,
      count: counts[i],
      pct: Math.min(100, Math.round((counts[i] / base) * 100)),
      dropPct: i === 0 ? null : (counts[i - 1] > 0 ? Math.round((counts[i] / counts[i - 1]) * 100) : 0),
    }))
  }, [stages])
```

Replace with:
```javascript
import { useMemo } from 'react'
import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Pure calc, exported so CampaignReport can reuse the same drop-off math for its insight banner/cards. */
export function computeFunnelStageData(stages) {
  if (!stages?.length) return []
  const counts = stages.map((s) => Number(s.count) || 0)
  const base = counts[0] > 0 ? counts[0] : 1
  return stages.map((s, i) => ({
    key: s.key,
    label: s.label,
    count: counts[i],
    pct: Math.min(100, Math.round((counts[i] / base) * 100)),
    dropPct: i === 0 ? null : (counts[i - 1] > 0 ? Math.round((counts[i] / counts[i - 1]) * 100) : 0),
    entriesDeltaPct: s.entriesDeltaPct,
  }))
}

function TrendBadge({ deltaPct }) {
  if (deltaPct === undefined) return null
  if (deltaPct === null) {
    return (
      <span className="mt-1 inline-flex rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
        New
      </span>
    )
  }
  if (deltaPct === 0) return null
  const positive = deltaPct > 0
  const Icon = positive ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        'mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(deltaPct)}%
    </span>
  )
}

/** Horizontal funnel ribbon + stage headers, with stage-to-stage drop-off % and optional period trend. */
export function CampaignFunnelChart({ stages, activeStageKey, onStageClick, title, subtitle }) {
  const data = useMemo(() => computeFunnelStageData(stages), [stages])
```

- [ ] **Step 2: Render the trend badge in each funnel column**

Find:
```javascript
              <div className="text-[11px] font-medium leading-tight text-neutral-500 sm:text-xs">{d.label}</div>
              <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-neutral-900 sm:text-3xl">
                {d.count.toLocaleString()}
              </div>
              <span className="mt-2 inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 ring-1 ring-neutral-200/80">
                {d.pct}% of total
              </span>
            </button>
```

Replace with:
```javascript
              <div className="text-[11px] font-medium leading-tight text-neutral-500 sm:text-xs">{d.label}</div>
              <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-neutral-900 sm:text-3xl">
                {d.count.toLocaleString()}
              </div>
              <TrendBadge deltaPct={d.entriesDeltaPct} />
              <span className="mt-2 inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 ring-1 ring-neutral-200/80">
                {d.pct}% of total
              </span>
            </button>
```

- [ ] **Step 3: Verify manually**

Run `npx eslint client/src/features/campaigns/components/CampaignFunnelChart.jsx` from the `client/` directory — expect no errors. Then open `/campaigns/:id` (the detail page, NOT the report page) in the browser — confirm the funnel widget there looks exactly as before (no "New"/arrow badges appear, since `CampaignDetailPage.jsx` never sets `entriesDeltaPct` on its stage objects).

- [ ] **Step 4: Commit**

```bash
git add client/src/features/campaigns/components/CampaignFunnelChart.jsx
git commit -m "feat(campaigns): add optional trend badge to funnel chart, export drop-off calc"
```

---

### Task 3: Frontend — `DateRangePicker.jsx` (new component)

**Files:**
- Create: `client/src/features/campaigns/components/DateRangePicker.jsx`

**Interfaces:**
- Consumes: nothing (self-contained)
- Produces: named exports `defaultDateRange(days)` → `{from,to}` ISO date strings, and `DateRangePicker({ value, onChange })` component. Task 6 imports both.

- [ ] **Step 1: Create the component**

```javascript
import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

export function defaultDateRange(days = 30) {
  const to = new Date()
  to.setUTCHours(0, 0, 0, 0)
  const from = new Date(to.getTime() - (days - 1) * 86400000)
  return { from: isoDate(from), to: isoDate(to) }
}

export function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const activePreset = PRESETS.find((p) => {
    const r = defaultDateRange(p.days)
    return r.from === value.from && r.to === value.to
  })

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 shadow-sm hover:border-brand-300"
      >
        <Calendar className="h-3.5 w-3.5 text-neutral-400" />
        {activePreset ? `Last ${activePreset.label}` : `${value.from} – ${value.to}`}
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <div className="flex gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { onChange(defaultDateRange(p.days)); setOpen(false) }}
                className={cn(
                  'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
                  activePreset?.label === p.label ? 'bg-brand-600 text-white' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100',
                )}
              >
                Last {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold text-neutral-500">
              From
              <input
                type="date"
                value={value.from}
                max={value.to}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-neutral-200 px-1.5 py-1 text-xs"
              />
            </label>
            <label className="text-[10px] font-semibold text-neutral-500">
              To
              <input
                type="date"
                value={value.to}
                min={value.from}
                max={isoDate(new Date())}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-neutral-200 px-1.5 py-1 text-xs"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify manually**

Run `npx eslint client/src/features/campaigns/components/DateRangePicker.jsx` from `client/` — expect no errors. (Visual check happens in Task 6 once it's wired into the page.)

- [ ] **Step 3: Commit**

```bash
git add client/src/features/campaigns/components/DateRangePicker.jsx
git commit -m "feat(campaigns): add DateRangePicker component for report date filtering"
```

---

### Task 4: Frontend — `CampaignInsightBanner.jsx` (new component)

**Files:**
- Create: `client/src/features/campaigns/components/CampaignInsightBanner.jsx`

**Interfaces:**
- Consumes: `funnelStageData` (the array shape produced by `computeFunnelStageData` from Task 2 — `{key,label,count,pct,dropPct,entriesDeltaPct}[]`), `paymentsSummary` (`{receivedInPeriod,receivedPrevPeriod,receivedDeltaPct}` from the Task 1 API response)
- Produces: default behavior — renders `null` if there's nothing meaningful to say (e.g. single-stage funnel, no trend data yet)

- [ ] **Step 1: Create the component**

```javascript
import { Sparkles } from 'lucide-react'

export function CampaignInsightBanner({ funnelStageData, paymentsSummary }) {
  const data = funnelStageData || []
  const transitions = data.filter((d) => d.dropPct !== null)
  if (!transitions.length) return null

  const worst = transitions.reduce((a, b) => (b.dropPct < a.dropPct ? b : a))
  const worstIndex = data.findIndex((d) => d.key === worst.key)
  const worstFrom = data[worstIndex - 1]

  const trending = data.filter((d) => typeof d.entriesDeltaPct === 'number' && d.entriesDeltaPct !== 0)
  const best = trending.length ? trending.reduce((a, b) => (b.entriesDeltaPct > a.entriesDeltaPct ? b : a)) : null

  const lines = []
  if (worstFrom) {
    lines.push(`Biggest drop-off: ${worstFrom.label} → ${worst.label} (${worst.dropPct}% retained).`)
  }
  if (best) {
    const verb = best.entriesDeltaPct > 0 ? 'up' : 'down'
    lines.push(`${best.label} entries ${verb} ${Math.abs(best.entriesDeltaPct)}% vs last period.`)
  }
  if (typeof paymentsSummary?.receivedDeltaPct === 'number' && Math.abs(paymentsSummary.receivedDeltaPct) >= 10) {
    const verb = paymentsSummary.receivedDeltaPct > 0 ? 'up' : 'down'
    lines.push(`Received payments ${verb} ${Math.abs(paymentsSummary.receivedDeltaPct)}% vs last period.`)
  }
  if (!lines.length) return null

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-bold text-neutral-900">Campaign insight</p>
        <ul className="mt-1 space-y-0.5 text-xs text-neutral-600">
          {lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify manually**

Run `npx eslint client/src/features/campaigns/components/CampaignInsightBanner.jsx` from `client/` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/features/campaigns/components/CampaignInsightBanner.jsx
git commit -m "feat(campaigns): add rule-based campaign insight banner"
```

---

### Task 5: Frontend — `CampaignInsightCard.jsx` (new reusable component)

**Files:**
- Create: `client/src/features/campaigns/components/CampaignInsightCard.jsx`

**Interfaces:**
- Consumes: `label` (string), `stat` (string, pre-formatted), `sub` (optional string), `sparklineData` (array of objects), `sparklineKey` (string — which field in each `sparklineData` item to plot), `items` (array of `{key,label,value}` — already formatted for display), `emptyText` (optional string)
- Produces: nothing else consumes this — it's a leaf presentational component used 3× by Task 6

- [ ] **Step 1: Create the component**

```javascript
import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'

export function CampaignInsightCard({ label, stat, sub, sparklineData, sparklineKey, items, emptyText }) {
  const gradId = `insight-spark-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const hasData = Array.isArray(sparklineData) && sparklineData.some((d) => Number(d[sparklineKey]) > 0)

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-neutral-900">{stat}</p>
      {sub && <p className="text-[11px] text-neutral-500">{sub}</p>}

      <div className="mt-2 h-12">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={sparklineKey}
                stroke={CHART_COLORS.primary}
                fill={`url(#${gradId})`}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
            {emptyText || 'Not enough data in this period'}
          </div>
        )}
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-neutral-100 pt-2.5">
        {items.length === 0 ? (
          <li className="text-[11px] text-neutral-400">No data yet</li>
        ) : items.map((it) => (
          <li key={it.key} className="flex items-center justify-between text-xs">
            <span className="truncate text-neutral-600">{it.label}</span>
            <span className="font-semibold tabular-nums text-neutral-800">{it.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verify manually**

Run `npx eslint client/src/features/campaigns/components/CampaignInsightCard.jsx` from `client/` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/features/campaigns/components/CampaignInsightCard.jsx
git commit -m "feat(campaigns): add reusable insight card (stat + sparkline + top-3 list)"
```

---

### Task 6: Frontend — wire date range, export, banner, funnel trend, and 3 cards into `CampaignReport.jsx`

**Files:**
- Modify: `client/src/features/campaigns/components/CampaignReport.jsx` (full file, 587 lines as of the previous pass)

**Interfaces:**
- Consumes: `computeFunnelStageData` (Task 2), `defaultDateRange`/`DateRangePicker` (Task 3), `CampaignInsightBanner` (Task 4), `CampaignInsightCard` (Task 5), `useLazyExportCampaignPaymentsCsvQuery` (existing, from `campaignsApi.js`), the extended `getCampaignReport` response (`period`, `paymentsSummary`, `dailySeries`, and per-stage `entriesDeltaPct` — all from Task 1)
- Produces: nothing else consumes `CampaignReport.jsx` beyond `CampaignReportPage.jsx`, which passes `campaignId`/`currency` unchanged — no interface change there

- [ ] **Step 1: Add new imports**

Find:
```javascript
import { useMemo, useState, useEffect } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Target,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useGetCampaignReportQuery } from '@/features/campaigns/campaignsApi'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { CampaignFunnelChart } from '@/features/campaigns/components/CampaignFunnelChart'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'

const SLICES = CHART_COLORS.slices
```

Replace with:
```javascript
import { useMemo, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Search,
  Target,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useGetCampaignReportQuery, useLazyExportCampaignPaymentsCsvQuery } from '@/features/campaigns/campaignsApi'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { CampaignFunnelChart, computeFunnelStageData } from '@/features/campaigns/components/CampaignFunnelChart'
import { CampaignInsightBanner } from '@/features/campaigns/components/CampaignInsightBanner'
import { CampaignInsightCard } from '@/features/campaigns/components/CampaignInsightCard'
import { DateRangePicker, defaultDateRange } from '@/features/campaigns/components/DateRangePicker'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'

const SLICES = CHART_COLORS.slices

function downloadCsvText(csvText, filename) {
  const blob = new Blob([csvText], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Add date-range state and wire it into the query params**

Find:
```javascript
export function CampaignReport({ campaignId, currency }) {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMode, setFilterMode] = useState('')
```

Replace with:
```javascript
export function CampaignReport({ campaignId, currency }) {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [dateRange, setDateRange] = useState(() => defaultDateRange(30))
```

Find:
```javascript
  const queryParams = useMemo(() => ({
    id: campaignId,
    page,
    limit: PAGE_SIZE,
    ...(debouncedQ ? { q: debouncedQ } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterMode ? { mode: filterMode } : {}),
  }), [campaignId, page, debouncedQ, filterStatus, filterMode])
```

Replace with:
```javascript
  const queryParams = useMemo(() => ({
    id: campaignId,
    page,
    limit: PAGE_SIZE,
    from: dateRange.from,
    to: dateRange.to,
    ...(debouncedQ ? { q: debouncedQ } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterMode ? { mode: filterMode } : {}),
  }), [campaignId, page, debouncedQ, filterStatus, filterMode, dateRange])
```

- [ ] **Step 3: Add the CSV export hook + handler**

Find:
```javascript
  const { data: res, isLoading, isFetching, isError } = useGetCampaignReportQuery(queryParams, { skip: !campaignId })
  const report = res?.data
```

Replace with:
```javascript
  const { data: res, isLoading, isFetching, isError } = useGetCampaignReportQuery(queryParams, { skip: !campaignId })
  const report = res?.data

  const [triggerExportPayments, { isFetching: exportingPayments }] = useLazyExportCampaignPaymentsCsvQuery()
  const onExportPayments = async () => {
    try {
      const csv = await triggerExportPayments({
        campaignId,
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterMode ? { mode: filterMode } : {}),
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      }).unwrap()
      downloadCsvText(csv, `campaign-${campaignId}-payments.csv`)
      toast.success('Payments exported')
    } catch {
      toast.error('Export failed')
    }
  }
```

- [ ] **Step 4: Add trend-aware derived data (funnel stages with delta, funnel stage calc, insight-card inputs)**

Find:
```javascript
  const funnelStages = useMemo(
    () => (report?.stageBreakdown ?? []).map((s) => ({ key: s.key, label: s.label, count: s.leadCount })),
    [report?.stageBreakdown],
  )
  const paymentsPieData = useMemo(
    () => (report?.paymentsByMode ?? []).map((m) => ({ name: MODE_LABEL[m.mode] || m.mode, value: m.amount })),
    [report?.paymentsByMode],
  )
  const topTeamByReceived = useMemo(
    () => [...(report?.teamPerformance ?? [])]
      .sort((a, b) => b.receivedAmount - a.receivedAmount)
      .slice(0, 8)
      .map((m) => ({ name: m.name, value: m.receivedAmount })),
    [report?.teamPerformance],
  )
```

Replace with:
```javascript
  const funnelStages = useMemo(
    () => (report?.stageBreakdown ?? []).map((s) => ({
      key: s.key,
      label: s.label,
      count: s.leadCount,
      entriesDeltaPct: s.entriesDeltaPct,
    })),
    [report?.stageBreakdown],
  )
  const funnelStageData = useMemo(() => computeFunnelStageData(funnelStages), [funnelStages])
  const paymentsPieData = useMemo(
    () => (report?.paymentsByMode ?? []).map((m) => ({ name: MODE_LABEL[m.mode] || m.mode, value: m.amount })),
    [report?.paymentsByMode],
  )
  const topTeamByReceived = useMemo(
    () => [...(report?.teamPerformance ?? [])]
      .sort((a, b) => b.receivedAmount - a.receivedAmount)
      .slice(0, 8)
      .map((m) => ({ name: m.name, value: m.receivedAmount })),
    [report?.teamPerformance],
  )
  const avgDropoffPct = useMemo(() => {
    const transitions = funnelStageData.filter((d) => d.dropPct !== null)
    if (!transitions.length) return null
    const avgRetained = transitions.reduce((sum, d) => sum + d.dropPct, 0) / transitions.length
    return Math.round(100 - avgRetained)
  }, [funnelStageData])
  const worstTransitionItems = useMemo(() => {
    const withFrom = funnelStageData
      .map((d, i) => (d.dropPct !== null ? { ...d, fromLabel: funnelStageData[i - 1]?.label } : null))
      .filter(Boolean)
    return [...withFrom]
      .sort((a, b) => a.dropPct - b.dropPct)
      .slice(0, 3)
      .map((t) => ({ key: t.key, label: `${t.fromLabel} → ${t.label}`, value: `${t.dropPct}%` }))
  }, [funnelStageData])
```

- [ ] **Step 5: Update the `report` destructure to include the new fields**

Find:
```javascript
  const { summary, stageBreakdown, teamPerformance, paymentsByMode, recentPayments, paymentsMeta } = report
```

Replace with:
```javascript
  const { summary, stageBreakdown, teamPerformance, paymentsByMode, recentPayments, paymentsMeta, paymentsSummary, dailySeries } = report
```

- [ ] **Step 6: Build the remaining two cards' items/stats (after the destructure, before the `return`)**

Find:
```javascript
  const totalPages = paymentsMeta?.totalPages ?? 1
  const totalPayments = paymentsMeta?.total ?? 0
```

Replace with:
```javascript
  const totalPages = paymentsMeta?.totalPages ?? 1
  const totalPayments = paymentsMeta?.total ?? 0

  const topPaymentMethodItems = paymentsByMode.slice(0, 3).map((m) => ({
    key: m.mode, label: MODE_LABEL[m.mode] || m.mode, value: fmt(m.amount, cur),
  }))
  const topPerformerItems = teamPerformance.slice(0, 3).map((m) => ({
    key: m.userId, label: m.name, value: fmt(m.receivedAmount, cur),
  }))
  const topPerformersTotal = teamPerformance.slice(0, 3).reduce((sum, m) => sum + (m.receivedAmount || 0), 0)
```

- [ ] **Step 7: Render the header row (date range + export) and the insight banner**

Find:
```javascript
  return (
    <div className="mt-6 space-y-6">

      {/* Summary KPIs */}
```

Replace with:
```javascript
  return (
    <div className="mt-6 space-y-6">

      {/* Report controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <button
          type="button"
          onClick={onExportPayments}
          disabled={exportingPayments}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {exportingPayments ? 'Exporting…' : 'Export'}
        </button>
      </div>

      <CampaignInsightBanner funnelStageData={funnelStageData} paymentsSummary={paymentsSummary} />

      {/* Summary KPIs */}
```

- [ ] **Step 8: Insert the 3 insight cards after the Stage Breakdown section**

Find (end of the Stage Breakdown `<section>`, right before Team Performance):
```javascript
          </table>
        </div>
      </section>

      {/* Team Performance */}
```

Replace with:
```javascript
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CampaignInsightCard
            label="Stage Drop-off Overview"
            stat={avgDropoffPct !== null ? `${avgDropoffPct}% avg drop-off` : '—'}
            sub="Across all stage transitions"
            sparklineData={dailySeries}
            sparklineKey="transitions"
            items={worstTransitionItems}
            emptyText="No stage movement in this period"
          />
          <CampaignInsightCard
            label="Top Payment Methods"
            stat={fmt(paymentsSummary?.receivedInPeriod ?? 0, cur)}
            sub="Received this period"
            sparklineData={dailySeries}
            sparklineKey="receivedAmount"
            items={topPaymentMethodItems}
            emptyText="No payments in this period"
          />
          <CampaignInsightCard
            label="Top Team Performers"
            stat={fmt(topPerformersTotal, cur)}
            sub="Top 3 by amount received"
            sparklineData={dailySeries}
            sparklineKey="receivedAmount"
            items={topPerformerItems}
            emptyText="No team activity in this period"
          />
        </div>
      </section>

      {/* Team Performance */}
```

- [ ] **Step 9: Verify manually**

1. From `client/`, run `npx eslint src/features/campaigns/components/CampaignReport.jsx` — expect no new errors (the 3 pre-existing `no-unused-vars` warnings for `TrendUp`/`UserCheck`/`UserMinus` predate this change and are out of scope).
2. Start both dev servers (`npm run dev:client`, `npm run dev:server`), log in, open `/campaigns/:id/report` for a campaign with real payment/stage-history data.
3. Confirm: date-range picker shows "Last 30d" by default; switching to 7d/90d changes the funnel arrows, insight banner text, and all 3 cards; the KPI strip, stage table, team table, and payments-by-mode donut do NOT change when the date range changes.
4. Click **Export** — confirm a CSV file downloads named `campaign-<id>-payments.csv`.
5. Open `/campaigns/:id` (detail page) — confirm its funnel widget is unchanged from before this whole plan (no trend badges).
6. Test with a brand-new/empty campaign — confirm the 3 cards show their `emptyText` states instead of crashing, and the insight banner doesn't render (returns `null`) rather than showing an empty box.

- [ ] **Step 10: Commit**

```bash
git add client/src/features/campaigns/components/CampaignReport.jsx
git commit -m "feat(campaigns): wire date range, export, insight banner, and insight cards into report"
```

## Self-Review Notes

- **Spec coverage:** date-range picker (Task 3+6), Export button (Task 6), backend trend/period aggregation (Task 1), funnel trend badges (Task 2), insight banner (Task 4), 3 insight cards (Task 5+6), scope boundary preserved (existing all-time sections untouched — verified no edits touch the KPI/stage-table/team-table/payments-by-mode code), sales-only scoping (Task 1 Step 2 mirrors existing `paymentWhere.campaignLeadId` pattern) — all covered.
- **Placeholder scan:** no TBD/TODO; every step has complete, exact code.
- **Type/name consistency:** `computeFunnelStageData` (Task 2) is the exact name imported in Task 6; `defaultDateRange`/`DateRangePicker` (Task 3) match Task 6's imports; `CampaignInsightBanner` props (`funnelStageData`, `paymentsSummary`) match what Task 6 passes; `CampaignInsightCard` props (`label,stat,sub,sparklineData,sparklineKey,items,emptyText`) match all 3 usages in Task 6 Step 8.
