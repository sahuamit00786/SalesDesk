import { SOURCE_LABELS } from '@/features/leads/constants'

export const LEAD_FILTER_SCHEMA = {
  title: { type: 'text', label: 'Title' },
  contactName: { type: 'text', label: 'Contact name' },
  company: { type: 'text', label: 'Company' },
  email: { type: 'text', label: 'Email' },
  phone: { type: 'text', label: 'Phone' },
  status: {
    type: 'enum',
    label: 'Status',
    options: [
      { value: 'new', label: 'New' },
      { value: 'contacted', label: 'Contacted' },
      { value: 'qualified', label: 'Qualified' },
      { value: 'proposal', label: 'Proposal' },
      { value: 'won', label: 'Won' },
      { value: 'lost', label: 'Lost' },
      { value: 'junk', label: 'Junk' },
    ],
  },
  source: {
    type: 'enum',
    label: 'Source',
    options: Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
  },
  assignedTo: { type: 'uuid', label: 'Owner' },
  ownerUserId: { type: 'uuid', label: 'Record owner' },
  score: { type: 'number', label: 'Health score' },
  value: { type: 'number', label: 'Deal value' },
  opportunityStage: { type: 'text', label: 'Stage' },
  city: { type: 'text', label: 'City' },
  state: { type: 'text', label: 'State' },
  country: { type: 'text', label: 'Country' },
  createdAt: { type: 'date', label: 'Created date' },
  closingDate: { type: 'date', label: 'Closing date' },
  isOpportunity: {
    type: 'boolean',
    label: 'Is opportunity',
    options: [
      { value: true, label: 'Yes' },
      { value: false, label: 'No' },
    ],
  },
}

export const LEAD_FILTER_FIELD_LIST = Object.entries(LEAD_FILTER_SCHEMA).map(([id, def]) => ({
  id,
  ...def,
}))
