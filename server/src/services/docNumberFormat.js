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

function issueDateToYyyy(issueDateIso) {
  const s = String(issueDateIso || '').slice(0, 10)
  const parts = s.split('-')
  if (parts.length === 3 && /^\d{4}$/.test(parts[0])) return parts[0]
  return String(new Date().getFullYear())
}

export const DOC_NUMBER_FORMATS = ['PREFIX/DDMMYYYY/SEQ', 'PREFIX-SEQ', 'PREFIX/YYYY/SEQ']
export const DEFAULT_DOC_NUMBER_FORMAT = 'PREFIX/DDMMYYYY/SEQ'

/**
 * Build a document number from workspace numbering settings.
 * Unknown/missing format falls back to PREFIX/DDMMYYYY/SEQ.
 */
export function buildDocNumber({ prefix, format, seq, issueDate }) {
  const p = String(prefix || '').trim() || 'DOC'
  const fmt = DOC_NUMBER_FORMATS.includes(format) ? format : DEFAULT_DOC_NUMBER_FORMAT
  if (fmt === 'PREFIX-SEQ') return `${p}-${seq}`
  if (fmt === 'PREFIX/YYYY/SEQ') return `${p}/${issueDateToYyyy(issueDate)}/${seq}`
  return `${p}/${issueDateToDdMmYyyy(issueDate)}/${seq}`
}

/**
 * Allocate the next invoice number inside an open transaction.
 * A template with autoNumbering takes precedence over workspace settings.
 * Increments the corresponding counter as a side effect.
 */
export async function allocateInvoiceNumber({ billing, template, issueDate, transaction }) {
  if (template?.autoNumbering) {
    const number = `${template.numberPrefix || 'INV'}-${template.nextNumber}`
    await template.increment('nextNumber', { by: 1, transaction })
    return number
  }
  const number = buildDocNumber({
    prefix: billing.invoicePrefix || 'INV',
    format: billing.invoiceNumberFormat,
    seq: billing.invoiceNextSeq,
    issueDate,
  })
  await billing.increment('invoiceNextSeq', { by: 1, transaction })
  return number
}
