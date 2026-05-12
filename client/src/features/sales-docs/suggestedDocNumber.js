/** Match server `docNumberFormat.js` for draft previews. */

export function issueDateToDdMmYyyy(issueDate) {
  const s = String(issueDate || '').slice(0, 10)
  const parts = s.split('-')
  if (parts.length !== 3) {
    const now = new Date()
    return `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
  }
  const [y, m, d] = parts
  return `${String(d).padStart(2, '0')}${String(m).padStart(2, '0')}${y}`
}

export function suggestedQuotationNumber(issueDate, nextSeq) {
  return `QT/${issueDateToDdMmYyyy(issueDate)}/${nextSeq}`
}

export function suggestedInvoiceNumber(issueDate, nextSeq) {
  return `INV/${issueDateToDdMmYyyy(issueDate)}/${nextSeq}`
}
