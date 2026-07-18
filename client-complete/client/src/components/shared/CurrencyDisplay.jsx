/**
 * Formats a currency amount using Intl.NumberFormat
 */
export function CurrencyDisplay({ amount, currency = 'USD', className = '', compact = false }) {
  if (amount === null || amount === undefined || isNaN(amount)) return null

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: compact ? 0 : 2,
    minimumFractionDigits: 0,
    notation: compact && Math.abs(amount) >= 100000 ? 'compact' : 'standard',
  }).format(amount)

  return <span className={className}>{formatted}</span>
}

export default CurrencyDisplay
