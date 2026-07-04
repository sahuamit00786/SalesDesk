// Port of web client/src/features/leads/constants.js — terminology parity.
export const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
  junk: 'Junk',
};

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
};

export const STATUS_OPTIONS = Object.keys(STATUS_LABELS);
export const SOURCE_OPTIONS = Object.keys(SOURCE_LABELS);

export const LEAD_SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest first' },
  { value: 'updatedAt', label: 'Recently updated' },
  { value: 'contactName', label: 'Name' },
  { value: 'company', label: 'Company' },
  { value: 'value', label: 'Value' },
  { value: 'score', label: 'Score' },
  { value: 'status', label: 'Status' },
];
