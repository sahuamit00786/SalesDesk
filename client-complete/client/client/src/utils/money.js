import { formatDealMoney, normalizeDealCurrency } from '@/features/deals/dealCurrencies'

export { formatDealMoney, normalizeDealCurrency }

/** @typedef {{ totals: Record<string, number>, isMixed: boolean, codes: string[] }} MoneyAggregate */

/**
 * @param {Array<unknown>} rows
 * @param {(row: unknown) => number} getAmount
 * @param {(row: unknown) => string} getCurrency
 * @param {'sum' | 'avg'} [mode]
 * @returns {MoneyAggregate}
 */
export function aggregateMoneyByCurrency(rows, getAmount, getCurrency, mode = 'sum') {
  const buckets = {}
  for (const row of rows || []) {
    const amount = Number(getAmount(row) ?? 0)
    if (!Number.isFinite(amount)) continue
    const code = normalizeDealCurrency(getCurrency(row))
    if (!buckets[code]) buckets[code] = { sum: 0, count: 0 }
    buckets[code].sum += amount
    buckets[code].count += 1
  }
  const totals = {}
  for (const [code, { sum, count }] of Object.entries(buckets)) {
    totals[code] = mode === 'avg' && count ? sum / count : sum
  }
  const codes = Object.keys(totals)
  return { totals, isMixed: codes.length > 1, codes }
}

export function formatMoneyAggregate(aggregate) {
  if (!aggregate?.codes?.length) return formatDealMoney(0, 'USD')
  if (!aggregate.isMixed) {
    const code = aggregate.codes[0]
    return formatDealMoney(aggregate.totals[code], code)
  }
  return 'mixed'
}

export function moneyAggregateTooltip(aggregate) {
  if (!aggregate?.isMixed) return ''
  return aggregate.codes
    .sort()
    .map((code) => formatDealMoney(aggregate.totals[code], code))
    .join('\n')
}

/**
 * @param {{ workspace?: { defaultCurrency?: string | null }, company?: { baseCurrency?: string | null }, campaign?: { currency?: string | null } }} ctx
 */
export function getEffectiveCurrency(ctx = {}) {
  const { campaign, workspace, company } = ctx
  if (campaign?.currency) return normalizeDealCurrency(campaign.currency)
  if (workspace?.defaultCurrency) return normalizeDealCurrency(workspace.defaultCurrency)
  if (company?.baseCurrency) return normalizeDealCurrency(company.baseCurrency)
  return 'USD'
}

export const COUNTRY_CURRENCY_HINTS = {
  US: 'USD',
  GB: 'GBP',
  IN: 'INR',
  MY: 'MYR',
  SG: 'SGD',
  AE: 'AED',
  AU: 'AUD',
  CA: 'CAD',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  JP: 'JPY',
  CH: 'CHF',
  NZ: 'NZD',
  ZA: 'ZAR',
}

export { currencyFromCountryCode } from '@/constants/geo'

/** Compact axis / KPI formatter (e.g. RM 1.2M, $50k). */
export function formatCompactMoney(value, currency = 'USD') {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  const code = normalizeDealCurrency(currency)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      notation: 'compact',
      maximumFractionDigits: n >= 1_000_000 ? 1 : 0,
    }).format(n)
  } catch {
    return formatDealMoney(n, code)
  }
}
