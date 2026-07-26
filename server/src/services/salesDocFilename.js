function slug(value, fallback) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned || fallback
}

/** "{Lead/company name}_{doc number}.pdf" — e.g. Erin_Carter_QT_26072026_1001.pdf */
export function buildSalesDocFilename({ customerSnapshot, docNumber }) {
  const name = customerSnapshot?.contactName || customerSnapshot?.companyName || 'Customer'
  return `${slug(name, 'Customer')}_${slug(docNumber, 'Document')}.pdf`
}
