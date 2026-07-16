/** Default workspace brand until changed in workspace settings. */
export const DEFAULT_WORKSPACE_THEME_COLOR = '#6D29D9'
export const DEFAULT_WORKSPACE_SIDEBAR_TEXT_COLOR = '#FFFFFF'

export const DEFAULT_LEAD_SOURCES = ['Web Form', 'Manual', 'Referral', 'Campaign', 'LinkedIn', 'Cold Email']

/** Pipeline stages (lead_status / opportunity_stages table). */
export const DEFAULT_OPPORTUNITY_STAGES = [
  { name: 'open', isDefault: true, isDealStatus: false, sortOrder: 0 },
  { name: 'discovery', sortOrder: 1 },
  { name: 'demo_scheduled', sortOrder: 2 },
  { name: 'demo_completed', sortOrder: 3 },
  { name: 'solution_fit_confirmed', sortOrder: 4 },
  { name: 'proposal_in_progress', sortOrder: 5 },
  { name: 'proposal_sent', isDealStatus: true, sortOrder: 6 },
  { name: 'on_hold', sortOrder: 7 },
]

export const DEFAULT_DEAL_STATUSES = [
  { name: 'qualification', isDealCompleteStatus: false, isInitial: true, sortOrder: 0 },
  { name: 'proposal', isDealCompleteStatus: false, isInitial: false, sortOrder: 1 },
  { name: 'negotiation', isDealCompleteStatus: false, isInitial: false, sortOrder: 2 },
  { name: 'contract_sent', isDealCompleteStatus: false, isInitial: false, sortOrder: 3 },
  { name: 'won', isDealCompleteStatus: true, isInitial: false, sortOrder: 4 },
  { name: 'lost', isDealCompleteStatus: false, isInitial: false, sortOrder: 5 },
]

export const DEFAULT_OPPORTUNITY_STATUSES = [
  { name: 'New', isInitial: true, sortOrder: 0 },
  { name: 'Contacted', isInitial: false, sortOrder: 1 },
  { name: 'Qualified', isInitial: false, sortOrder: 2 },
  { name: 'Proposal Sent', isInitial: false, sortOrder: 3 },
  { name: 'Negotiation', isInitial: false, sortOrder: 4 },
  { name: 'Won', isInitial: false, sortOrder: 5 },
  { name: 'Lost', isInitial: false, sortOrder: 6 },
]
