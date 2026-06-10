export const STATUS_STYLES = {
  new: 'bg-brand-50 text-brand-700 border-brand-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-slate-50 text-brand-700 border-brand-200',
  proposal: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  won: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-red-50 text-red-700 border-red-200',
  junk: 'bg-gray-100 text-gray-500 border-gray-200',
}

export const SOURCE_LABELS = {
  web_form: 'Web Form',
  manual: 'Manual',
  csv_import: 'CSV Import',
  api: 'API',
  referral: 'Referral',
  campaign: 'Campaign',
  linkedin: 'LinkedIn',
  cold_email: 'Cold Email',
  other: 'Other',
}

export const STATUS_OPTIONS = Object.keys(STATUS_STYLES)
export const SOURCE_OPTIONS = Object.keys(SOURCE_LABELS)
