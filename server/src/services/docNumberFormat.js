/**
 * @param {string} issueDateIso YYYY-MM-DD
 * @returns {string} DDMMYYYY e.g. 11052026 for 2026-05-11
 */
export function issueDateToDdMmYyyy(issueDateIso) {
  const s = String(issueDateIso || '').slice(0, 10)
  const parts = s.split('-')
  if (parts.length !== 3) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${d}${m}${y}`
  }
  const [y, m, d] = parts
  return `${String(d).padStart(2, '0')}${String(m).padStart(2, '0')}${y}`
}

/** Next quotation: QT/DDMMYYYY/{seq} */
export function buildQuotationNumber(issueDateIso, nextSeq) {
  return `QT/${issueDateToDdMmYyyy(issueDateIso)}/${nextSeq}`
}

/** Next invoice (workspace default): INV/DDMMYYYY/{seq} */
export function buildInvoiceNumber(issueDateIso, nextSeq) {
  return `INV/${issueDateToDdMmYyyy(issueDateIso)}/${nextSeq}`
}
