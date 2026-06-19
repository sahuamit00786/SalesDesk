const ISO_CURRENCY = /^[A-Z]{3}$/

export function normalizeCurrencyCode(value, fallback = 'USD') {
  const c = String(value ?? fallback)
    .trim()
    .toUpperCase()
  return ISO_CURRENCY.test(c) ? c : fallback
}
