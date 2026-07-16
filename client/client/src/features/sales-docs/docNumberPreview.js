// Client mirror of server/src/services/docNumberFormat.js buildDocNumber()
export const DOC_NUMBER_FORMATS = [
  { value: 'PREFIX/DDMMYYYY/SEQ', label: 'Prefix / date / sequence' },
  { value: 'PREFIX-SEQ', label: 'Prefix - sequence' },
  { value: 'PREFIX/YYYY/SEQ', label: 'Prefix / year / sequence' },
]

export function buildDocNumberPreview({ prefix, format, seq, date = new Date() }) {
  const p = String(prefix || '').trim() || 'DOC'
  const n = Number(seq) >= 1 ? Number(seq) : 1
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  if (format === 'PREFIX-SEQ') return `${p}-${n}`
  if (format === 'PREFIX/YYYY/SEQ') return `${p}/${yyyy}/${n}`
  return `${p}/${dd}${mm}${yyyy}/${n}`
}
