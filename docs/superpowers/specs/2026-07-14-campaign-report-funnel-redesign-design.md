# Campaign Report — Funnel & Insights Visual Redesign

**Date:** 2026-07-14
**Feature:** Redesign `/campaigns/:id/report` funnel section with trend arrows, a computed insight banner, and 3 date-range-scoped insight cards, modeled on a reference e-commerce funnel dashboard, adapted to our sales-campaign data.
**Scope:** `CampaignReport.jsx`, `CampaignFunnelChart.jsx`, `getCampaignReport` backend endpoint. No new tables/migrations.

## Problem

The user wants the campaign report's funnel to look like a polished reference dashboard: big stage numbers with trend arrows ("↓3% vs last period"), a purple insight-banner summarizing what's working, and 3 supporting mini-cards with sparklines (in the reference: Top Exit Pages, Top Purchased Product, Products Most Added to Cart).

That reference is an e-commerce visit funnel. Our domain is sales campaigns (leads moving through custom stages, payments, team assignment) — there is no "product," "cart," or "page" concept. This spec adapts the reference's *visual language and information density* to metrics that actually exist in our data, rather than copying its literal content.

The current report (`CampaignReport.jsx`) already has: a live-snapshot funnel (`CampaignFunnelChart`, added in the previous pass, with drop-off % between stages), a KPI strip, stage/team/payments tables, and — as of the previous pass — a payments donut and a team bar chart. All of that is **all-time snapshot data**; there is no date-range concept or trend-over-time anywhere in the report today.

## Solution Overview

1. Add a **date-range picker** to the report header (presets: 7d / 30d / 90d, default 30d) plus an **Export** button (reusing the existing, currently-unused-here `useLazyExportCampaignPaymentsCsvQuery`).
2. Extend `getCampaignReport` to accept `from`/`to` and return period-over-period trend data, computed from tables that already exist (`CampaignLeadStageHistory`, `CampaignPayment`) — no migrations needed.
3. Add trend-arrow badges to `CampaignFunnelChart` (optional prop, backward compatible with `CampaignDetailPage`'s existing usage).
4. Add a rule-based **insight banner** (no AI call — deterministic, instant, computed from the same trend numbers).
5. Add **3 insight cards** with sparklines, each a sales-campaign analog of the reference's cards.

**Non-goal / explicit scope boundary:** the existing all-time KPI strip, stage table, team table, and payments-by-mode section are *not* changed to be date-range-scoped. Only the new funnel arrows / banner / 3 cards respond to the date-range picker. This avoids silently redefining numbers users already rely on elsewhere on the page.

## Detailed Design

### 1. Backend — `getCampaignReport` (`server/src/controllers/campaignsController.js:1030`)

**New query params:** `from`, `to` (ISO date strings, `YYYY-MM-DD`). Default: `to` = today, `from` = 29 days before `to` (30-day window). Validate with the same ad-hoc parsing style already used for `page`/`limit` in this function (lines 1140-1144) — clamp invalid/missing values to the default rather than erroring, since this is a report view, not a mutation.

**Previous period** = the immediately preceding window of equal length (`prevTo = from - 1 day`, `prevFrom = prevTo - (to-from) days`).

**New data fetched** (same in-memory aggregation style already used for `payments`/`campaignLeads` in this function — no raw SQL, just `findAll` + JS reduce, consistent with the rest of the function):

```javascript
const historyRows = await CampaignLeadStageHistory.findAll({
  where: { campaignId: campaign.id, createdAt: { [Op.gte]: prevFrom, [Op.lte]: to } },
  attributes: ['toStageKey', 'createdAt'],
})
```

`CampaignLead.createdAt` is already available on the `campaignLeads` result set fetched at line 1052 (add `createdAt` to the existing `attributes` list — currently the query doesn't restrict attributes on `CampaignLead` itself, only on the `include`d associations, so `createdAt` is already present on each row).

**Per-stage entry counts** (stage 0 = first stage in `stages` array is special-cased since new leads never get a `CampaignLeadStageHistory` row for their initial stage — confirmed: history rows are only created in `patchCampaignLeadStage`, campaignsController.js:1250, on stage *change*, not on initial assignment):

```javascript
function countEntries(stageKey, isFirstStage, fromDate, toDate) {
  if (isFirstStage) {
    // Every campaign lead starts at stage 0 regardless of where it is now,
    // so count ALL campaignLeads created in the window (not filtered by current stageKey).
    return campaignLeads.filter(cl => cl.createdAt >= fromDate && cl.createdAt <= toDate).length
  }
  return historyRows.filter(h => h.toStageKey === stageKey && h.createdAt >= fromDate && h.createdAt <= toDate).length
}
```

For each stage, compute `entriesInPeriod` (window = `from`..`to`) and `entriesPrevPeriod` (window = `prevFrom`..`prevTo`), then:
```javascript
entriesDeltaPct = entriesPrevPeriod > 0
  ? Math.round(((entriesInPeriod - entriesPrevPeriod) / entriesPrevPeriod) * 100)
  : (entriesInPeriod > 0 ? null /* show "New" badge */ : 0)
```

**Payments trend:** reuse the already-fetched `payments` array (line 1065), filter by `paymentDate` (a `DATEONLY` field — safe for string/date comparison) into current vs previous window, sum `status === 'received'` amounts, same delta formula as above.

**Daily series** (`dailySeries: {date, transitions, receivedAmount}[]`, one entry per calendar day from `from` to `to`):
- `transitions` = count of `historyRows` (current-window subset) whose `createdAt` falls on that day.
- `receivedAmount` = sum of received `payments` whose `paymentDate` equals that day.

Build via a date-keyed map initialized with every day in range (so days with zero activity still appear as 0, not missing — needed for a continuous sparkline).

**Response additions** (alongside existing `summary`/`stageBreakdown`/etc., not replacing them):
```javascript
period: { from, to, prevFrom, prevTo },
stageBreakdown: [...existing fields, entriesInPeriod, entriesPrevPeriod, entriesDeltaPct],
paymentsSummary: { receivedInPeriod, receivedPrevPeriod, receivedDeltaPct },
dailySeries: [{ date, transitions, receivedAmount }],
```

`stageBreakdown` gains fields rather than becoming a separate structure — the frontend already maps this array in `CampaignReport.jsx:141` (`funnelStages`), so adding fields is additive and non-breaking.

### 2. Frontend — `CampaignFunnelChart.jsx`

Add optional props `entriesDeltaPct` (map or per-stage field) — when present, render a small trend badge (↑ green / ↓ red / "New" gray) near the existing count, distinct from the existing "% of total" and "drop-off vs previous stage" badges already built. When absent (as in `CampaignDetailPage`'s usage), render nothing extra — fully backward compatible, no prop changes needed on that page.

### 3. Frontend — `CampaignReport.jsx`

**Header row (new):** title/subtitle (unchanged, lives in `CampaignReportPage.jsx`) gets a sibling row with:
- New `<DateRangePicker>` component (presets 7d/30d/90d + custom via two date inputs), local state, feeds `from`/`to` into the existing `queryParams` memo (`CampaignReport.jsx:114`).
- **Export** button — wire up the existing `useLazyExportCampaignPaymentsCsvQuery` (already implemented and used on `CampaignDetailPage.jsx`, just not exposed on this page) to export the current filtered payments.

**Insight banner (new component, e.g. `CampaignInsightBanner.jsx`):** pure function of `stageBreakdown` (with the new trend fields) + `paymentsSummary`. Rule-based sentence generation:
- Find the stage-to-stage transition with the lowest `dropPct` (from the funnel's existing calculation) → "Biggest drop-off: {StageA} → {StageB} ({X}% retained)."
- Find the stage with the highest positive `entriesDeltaPct` → "{Stage} entries up {X}% vs last period."
- If `paymentsSummary.receivedDeltaPct` is strongly positive/negative, add a third line.
- Styled with the app's existing `brand-*` Tailwind palette (not the reference's purple) — stays visually consistent with the rest of the app (`bg-brand-600` headers used throughout this page already).

**Funnel section:** pass `entriesDeltaPct` per stage into `CampaignFunnelChart` (already rendered here since the previous pass) — this is additive to the existing call.

**3 new insight cards** (new shared component `CampaignInsightCard.jsx`, used 3×, each: label, big stat, small `AreaChart` sparkline with no axes/gridlines, top-3 list):

1. **Stage Drop-off Overview** — big stat = average drop-off rate across all transitions (computed client-side from the funnel's own `dropPct` values, no backend change needed for this number); sparkline = `dailySeries.transitions`; list = worst 3 stage-to-stage transitions sorted ascending by retention %.
2. **Top Payment Methods** — big stat = `paymentsSummary.receivedInPeriod`; sparkline = `dailySeries.receivedAmount`; list = top 3 `paymentsByMode` entries (existing field, already fetched all-time — acceptable since payment-mode mix rarely needs date-scoping to be useful, and avoids a second backend aggregation).
3. **Top Team Performers** — big stat = sum of top-3 members' `receivedAmount`; sparkline = same `dailySeries.receivedAmount` series (deliberate reuse — team performance in this context *is* money received, a second per-member-daily query would be backend complexity disproportionate to a sparkline's job); list = top 3 `teamPerformance` entries (existing field).

### Edge Cases & Behavior

- **Zero activity in period** (new campaign, or narrow custom range): cards show an empty-state ("Not enough data in this period") rather than a broken chart — same pattern as `CampaignFunnelChart`'s existing "No funnel stages configured" empty state.
- **`entriesPrevPeriod === 0` and `entriesInPeriod > 0`:** show a "New" badge instead of computing a nonsensical infinite percentage.
- **`entriesPrevPeriod === 0` and `entriesInPeriod === 0`:** no badge at all (nothing changed, nothing to report).
- **Custom range where `from > to`:** swap them server-side rather than erroring.
- **Sales-only users** (`isSalesOnlyUser`, existing scoping at line 1047): the new trend/daily-series data must respect the same lead/payment scoping already applied to `campaignLeads`/`payments` in this function — since `historyRows` should be filtered to the same lead set, join through `campaignLeads` IDs the same way `paymentWhere.campaignLeadId` already does at line 1063.

### Testing / Verification

No existing automated test suite covers this controller or these components (none found under `server/` or `client/` for campaigns during exploration). Verify manually:
1. Load `/campaigns/:id/report` for a campaign with stage-history and payment activity spanning >30 days.
2. Switch date-range presets (7d/30d/90d) — confirm funnel arrows, banner text, and all 3 cards update; confirm the KPI strip / stage table / team table / payments-by-mode section do *not* change (per the scope boundary above).
3. Confirm trend math by hand for one stage (count history rows in range manually via DB query, compare to displayed %).
4. Test a brand-new campaign (no history, no payments) — confirm empty states render, no crashes.
5. Test as a sales-only user — confirm trend numbers only reflect that user's own leads/payments, matching the existing all-time scoping behavior.
6. Confirm `CampaignDetailPage`'s funnel widget is visually unchanged (no `entriesDeltaPct` passed there → no new badges appear).

## Implementation Files

| File | Change |
|------|--------|
| `server/src/controllers/campaignsController.js` | `getCampaignReport`: add `from`/`to` params, period/prev-period calc, `entriesInPeriod`/`entriesDeltaPct` per stage, `paymentsSummary`, `dailySeries` |
| `client/src/features/campaigns/components/CampaignFunnelChart.jsx` | Add optional `entriesDeltaPct` prop → trend badge |
| `client/src/features/campaigns/components/CampaignReport.jsx` | Date-range picker + Export button in header; wire trend data into funnel; render insight banner + 3 insight cards |
| `client/src/features/campaigns/components/CampaignInsightBanner.jsx` | **New** — rule-based summary sentences |
| `client/src/features/campaigns/components/CampaignInsightCard.jsx` | **New** — reusable stat + sparkline + top-3-list card |
| `client/src/features/campaigns/components/DateRangePicker.jsx` | **New** — presets + custom range, reusable if other reports need it later |
| `client/src/features/campaigns/campaignsApi.js` | `getCampaignReport` query: pass through `from`/`to` params |

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| In-memory JS aggregation over `historyRows` gets slow for very high-volume campaigns | Matches existing pattern already used for `payments`/`campaignLeads` in this same function (no precedent for SQL-side aggregation here); acceptable unless a campaign has tens of thousands of stage changes, which is out of scope to optimize preemptively |
| Stage-0 entry proxy (`CampaignLead.createdAt`) slightly over/under-counts if a campaign's first stage is reconfigured mid-campaign (`patchStages`) | Documented as a known approximation; stage *keys* persist across reconfiguration so existing history rows remain valid, only the "first stage = signup" assumption could drift — acceptable, matches how the rest of the app already treats `stages[0]` as the entry point |
| Reusing `dailySeries.receivedAmount` for both the payments card and the team card sparkline could look identical/redundant if there's only one team member | Acceptable trade-off per YAGNI — flagged explicitly here so it's not mistaken for a bug in review |
| Sales-only scoping bug in new `historyRows` query (easy to forget, since it's a new query added to a function with existing scoping logic) | Explicitly called out in Edge Cases above; verification step 5 exists specifically to catch this |

## Success Criteria

1. ✅ Funnel stages show a real trend arrow (↑/↓ or "New") sourced from actual historical data, not fabricated
2. ✅ Date-range picker (7d/30d/90d) changes funnel arrows, banner, and all 3 cards consistently
3. ✅ Insight banner reads as a coherent 2-3 line summary, not a generic template
4. ✅ 3 cards each show a stat + sparkline + top-3 list, no e-commerce terminology leaking into a sales-CRM UI
5. ✅ `CampaignDetailPage`'s existing funnel widget is pixel-identical to before this change (no regressions from the shared-component change in the previous pass)
6. ✅ Sales-only users see correctly scoped trend numbers
7. ✅ No new database migrations required

## Open Questions

None — all major decisions (scope, trend-delta approach, banner generation, card content mapping) were confirmed with the user before this doc was written.
