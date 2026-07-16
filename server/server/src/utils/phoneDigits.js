/** Last-10-digit key so "+91 63940-15647" and "6394015647" match the same lead. */
export function phoneDigitsKey(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits ? digits.slice(-10) : ''
}
