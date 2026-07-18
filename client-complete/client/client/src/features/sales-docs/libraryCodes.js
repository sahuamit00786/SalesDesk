/** Matches server `defaultSalesDocTemplates.js` library seeds — for “System default” badges in the UI. */
export const LIB_QUOTATION_CODES = [
  'LIB_Q_01',
  'LIB_Q_02',
  'LIB_Q_03',
  'LIB_Q_04',
  'LIB_Q_05',
  'LIB_Q_06',
  'LIB_Q_07',
  'LIB_Q_08',
]

export const LIB_INVOICE_CODES = [
  'LIB_INV_01',
  'LIB_INV_02',
  'LIB_INV_03',
  'LIB_INV_04',
  'LIB_INV_05',
  'LIB_INV_06',
  'LIB_INV_07',
  'LIB_INV_08',
]

export function isLibraryQuotationCode(code) {
  return Boolean(code && LIB_QUOTATION_CODES.includes(code))
}

export function isLibraryInvoiceCode(code) {
  return Boolean(code && LIB_INVOICE_CODES.includes(code))
}
