/** Common ISO 4217 codes for deal / opportunity value. */
export const DEAL_CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British pound' },
  { value: 'INR', label: 'INR — Indian rupee' },
  { value: 'CAD', label: 'CAD — Canadian dollar' },
  { value: 'AUD', label: 'AUD — Australian dollar' },
  { value: 'AED', label: 'AED — UAE dirham' },
  { value: 'SGD', label: 'SGD — Singapore dollar' },
  { value: 'JPY', label: 'JPY — Japanese yen' },
  { value: 'CHF', label: 'CHF — Swiss franc' },
  { value: 'NZD', label: 'NZD — New Zealand dollar' },
  { value: 'SEK', label: 'SEK — Swedish krona' },
  { value: 'NOK', label: 'NOK — Norwegian krone' },
  { value: 'MXN', label: 'MXN — Mexican peso' },
  { value: 'ZAR', label: 'ZAR — South African rand' },
]

export function normalizeDealCurrency(code) {
  const c = String(code ?? 'USD')
    .trim()
    .toUpperCase()
  return /^[A-Z]{3}$/.test(c) ? c : 'USD'
}

export function formatDealMoney(value, currency = 'USD') {
  const code = normalizeDealCurrency(currency)
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'JPY' ? 0 : 2,
      maximumFractionDigits: code === 'JPY' ? 0 : 2,
    }).format(n)
  } catch {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n)
    } catch {
      return `${code} ${n.toFixed(2)}`
    }
  }
}

/** Sum or average of rows that may use different ISO codes — only formats as currency when a single code is present. */
export function formatAggregatedDealAmount(rows, amount) {
  const n = Number(amount ?? 0)
  if (!Number.isFinite(n)) return '—'
  if (!rows?.length) return formatDealMoney(0, 'USD')
  const codes = [...new Set(rows.map((r) => normalizeDealCurrency(r.dealCurrency)))]
  if (codes.length === 1) return formatDealMoney(n, codes[0])
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} · mixed`
}
