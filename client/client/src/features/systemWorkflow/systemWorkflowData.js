/**
 * Static map of LeadNest's modules for the /systemworkflow diagram.
 * Positions are hand-placed in seven horizontal lanes (top → bottom):
 * Access, Acquire, Core, Engage, Fulfill, Automation, Insights.
 * Edges encode real data flow pulled from server/src/routes/v1/index.js —
 * "flow" = a record is created/converted, "ref" = logged/linked against
 * another record or triggers it, "insight" = read-only into Reports.
 */

export const LANES = [
  { id: 'access', label: 'Access & Setup', accent: '#475569', tint: '#F1F5F9' },
  { id: 'acquire', label: 'Acquire', accent: '#B45309', tint: '#FFFBEB' },
  { id: 'core', label: 'Core pipeline', accent: '#5B21B6', tint: '#F5F3FF' },
  { id: 'engage', label: 'Engage', accent: '#0369A1', tint: '#F0F9FF' },
  { id: 'fulfill', label: 'Fulfill', accent: '#15803D', tint: '#F0FDF4' },
  { id: 'automation', label: 'Automation', accent: '#7C3AED', tint: '#F5F3FF' },
  { id: 'insights', label: 'Insights', accent: '#334155', tint: '#F8FAFC' },
]

export const NODES = [
  // -- Access & Setup --------------------------------------------------
  {
    id: 'auth',
    lane: 'access',
    label: 'Auth & Onboarding',
    x: 40,
    y: 20,
    description: 'Register, verify email, log in, accept invite, first-run company/workspace setup.',
    routes: ['/login', '/register', '/onboarding'],
    permission: null,
    context: 'Issues the JWT access/refresh pair every other request depends on. Nothing below is reachable without it.',
    flow: [
      { step: 'Register or accept invite', note: 'company + user created' },
      { step: 'Verify email', note: 'OTP, resend available' },
      { step: 'Onboarding', note: 'first-login workspace setup' },
      { step: 'Dashboard', note: 'landing screen' },
    ],
  },
  {
    id: 'team',
    lane: 'access',
    label: 'Team & Roles',
    x: 300,
    y: 20,
    description: 'Invite teammates, assign roles, and grant per-menu permissions.',
    routes: ['/team', '/team/:userId/permissions'],
    permission: 'settings.team',
    context: 'Every permission key seen on nodes below (main.*, engage.*, automate.*…) is granted or withheld here, per role.',
  },
  {
    id: 'integrations',
    lane: 'access',
    label: 'Integrations',
    x: 560,
    y: 20,
    description: 'Google OAuth connect points — Calendar, Meet, Gmail.',
    routes: ['/integrations'],
    permission: null,
    context: 'Feeds Meetings (Meet links) and Email (Gmail sync) below — if the connection drops, both go stale silently.',
  },
  {
    id: 'config',
    lane: 'access',
    label: 'Lead Configuration',
    x: 820,
    y: 20,
    description: 'Sources, tags, deal/opportunity statuses, custom fields — the vocabulary Leads is built from.',
    routes: ['/lead-configuration'],
    permission: 'main.leads (admin)',
  },

  // -- Acquire -----------------------------------------------------------
  {
    id: 'webforms',
    lane: 'acquire',
    label: 'Web Forms',
    x: 150,
    y: 190,
    description: 'Public, no-login form builder — embed on an external site, submissions flow straight in.',
    routes: ['/forms', '/forms/:id/builder'],
    permission: 'automate.forms',
    flow: [
      { step: 'Build', note: 'drag-drop fields' },
      { step: 'Publish & embed', note: 'snippet on external site' },
      { step: 'Visitor submits', note: 'public endpoint, no auth' },
    ],
  },
  {
    id: 'campaigns',
    lane: 'acquire',
    label: 'Campaigns',
    x: 470,
    y: 190,
    description: 'Multi-step outreach to a lead segment, tracked as its own mini-funnel with stage history.',
    routes: ['/campaigns/new', '/campaigns/:id', '/campaigns/:id/report'],
    permission: 'automate.campaigns',
    flow: [
      { step: 'Create', note: 'pick leads, team, assignment rule' },
      { step: 'Stage leads', note: 'into the campaign funnel' },
      { step: 'Move across stages', note: 'each move logged to history' },
      { step: 'Review report', note: 'conversion by stage' },
    ],
  },

  // -- Core pipeline -------------------------------------------------------
  {
    id: 'leads',
    lane: 'core',
    label: 'Leads',
    x: 150,
    y: 360,
    description: 'The longest-lived record in the system — everything else eventually points back to a lead.',
    routes: ['/leads', '/leads/:id', '/lead-distribution'],
    permission: 'main.leads',
    flow: [
      { step: 'Capture', note: 'manual, import, form, or campaign' },
      { step: 'Assign', note: 'manually or round-robin' },
      { step: 'Work', note: 'notes, tasks, follow-ups, threads' },
      { step: 'Qualify', note: 'status moves through categories' },
    ],
  },
  {
    id: 'opportunities',
    lane: 'core',
    label: 'Opportunities',
    x: 430,
    y: 360,
    description: 'Holding area for prospects not yet worth a full deal — qualify here, then convert.',
    routes: ['/opportunities', '/opportunities/:id'],
    permission: 'main.opportunities',
  },
  {
    id: 'deals',
    lane: 'core',
    label: 'Deals & Pipeline',
    x: 710,
    y: 360,
    description: 'Board or list, by stage. Each deal accumulates activities and payments on the way to close.',
    routes: ['/pipeline', '/deals', '/deals/:id'],
    permission: 'main.deals',
  },

  // -- Engage --------------------------------------------------------------
  {
    id: 'activities',
    lane: 'engage',
    label: 'Activities',
    x: 20,
    y: 530,
    description: 'Unified timeline — every call, email, meeting, and note, filterable. Includes the public booking-link page.',
    routes: ['/activities'],
    permission: 'engage.activities',
  },
  {
    id: 'tasks',
    lane: 'engage',
    label: 'Tasks',
    x: 230,
    y: 530,
    description: 'Cross-lead task list with comments and a per-task timeline.',
    routes: ['/tasks'],
    permission: 'engage.tasks',
  },
  {
    id: 'meetings',
    lane: 'engage',
    label: 'Meetings & Calendar',
    x: 440,
    y: 530,
    description: 'The one flow with a real AI pipeline behind it — plus the day-digest calendar of meetings, tasks and reminders.',
    routes: ['/meetings', '/calendar'],
    permission: 'engage.meetings',
    flow: [
      { step: 'Schedule', note: 'Google Meet link generated' },
      { step: 'Meet', note: 'session auto-recorded' },
      { step: 'Transcribe', note: 'Groq Whisper-compatible job' },
      { step: 'Summarize', note: 'AI summary + action items' },
    ],
  },
  {
    id: 'calls',
    lane: 'engage',
    label: 'Calls',
    x: 660,
    y: 530,
    description: 'Logged manually or synced from a mobile call log; any call can be converted straight into a lead.',
    routes: ['/calls'],
    permission: 'engage.meetings',
  },
  {
    id: 'email',
    lane: 'engage',
    label: 'Email',
    x: 870,
    y: 530,
    description: 'Full mailbox inside the CRM — Gmail-synced threads, send/reply, attachments, save-to-lead. Templates live alongside it.',
    routes: ['/email', '/templates'],
    permission: 'engage.email',
  },

  // -- Fulfill ---------------------------------------------------------------
  {
    id: 'documents',
    lane: 'fulfill',
    label: 'Documents',
    x: 20,
    y: 700,
    description: 'Central file store — contracts, presentations, NDAs — each file linked back to a lead or deal.',
    routes: ['/documents'],
    permission: 'manage.documents',
  },
  {
    id: 'quotations',
    lane: 'fulfill',
    label: 'Quotations',
    x: 270,
    y: 700,
    description: 'Structured quotes from a template, PDF-ready print layout.',
    routes: ['/quotations/new', '/sales-docs/templates'],
    permission: 'manage.quotations',
  },
  {
    id: 'invoices',
    lane: 'fulfill',
    label: 'Invoices',
    x: 510,
    y: 700,
    description: 'Tax-ready invoices; line items carry over from a converted quotation.',
    routes: ['/invoices/new'],
    permission: 'manage.invoices',
  },
  {
    id: 'payments',
    lane: 'fulfill',
    label: 'Deal Payments',
    x: 750,
    y: 700,
    description: 'Cross-deal and cross-invoice payment ledger — filter by status, mode, date, rep.',
    routes: ['/deal-payments'],
    permission: 'main.deal_payments',
  },

  // -- Automation --------------------------------------------------------------
  {
    id: 'workflows',
    lane: 'automation',
    label: 'Automation (Workflows)',
    x: 400,
    y: 870,
    description: 'No-code DAG builder — trigger, conditions, delays, actions. Runs alongside every stage above, not a stage of its own.',
    routes: ['/automation', '/automation/:id'],
    permission: null,
    flow: [
      { step: 'Define trigger', note: 'lead/email event' },
      { step: 'Build the graph', note: 'conditions, delays, actions' },
      { step: 'Test run', note: 'dry run before publish' },
      { step: 'Publish', note: 'version goes live' },
      { step: 'Runs', note: 'every firing logged, step by step' },
    ],
  },

  // -- Insights --------------------------------------------------------------
  {
    id: 'reports',
    lane: 'insights',
    label: 'Reports & Analytics',
    x: 400,
    y: 1040,
    description: 'One page, many tabs — each reads from the module it is named after. Data-health is admin-gated.',
    routes: ['/reports', '/reports/:type'],
    permission: null,
  },
]

/**
 * kind: 'flow' = a record is created/converted (solid, animated, source-lane colored)
 *       'ref'  = logged/linked against, or triggers (dashed, neutral)
 *       'insight' = read-only rollup into Reports (dotted, faint)
 */
export const EDGES = [
  { id: 'e-webforms-leads', source: 'webforms', target: 'leads', label: 'submission creates lead', kind: 'flow' },
  { id: 'e-campaigns-leads', source: 'campaigns', target: 'leads', label: 'stages & assigns', kind: 'flow' },
  { id: 'e-leads-opportunities', source: 'leads', target: 'opportunities', label: 'qualify', kind: 'flow' },
  { id: 'e-opportunities-deals', source: 'opportunities', target: 'deals', label: 'convert', kind: 'flow' },
  { id: 'e-leads-deals', source: 'leads', target: 'deals', label: 'convert directly (alt path)', kind: 'flow' },
  { id: 'e-deals-quotations', source: 'deals', target: 'quotations', label: 'raise quote', kind: 'flow' },
  { id: 'e-quotations-invoices', source: 'quotations', target: 'invoices', label: 'convert to invoice', kind: 'flow' },
  { id: 'e-invoices-payments', source: 'invoices', target: 'payments', label: 'record payment', kind: 'flow' },
  { id: 'e-deals-payments', source: 'deals', target: 'payments', label: 'record payment', kind: 'flow' },
  { id: 'e-workflows-tasks', source: 'workflows', target: 'tasks', label: 'creates task', kind: 'flow' },
  { id: 'e-workflows-email', source: 'workflows', target: 'email', label: 'sends email', kind: 'flow' },
  { id: 'e-workflows-leads', source: 'workflows', target: 'leads', label: 'assigns / updates status', kind: 'flow' },

  { id: 'e-activities-leads', source: 'activities', target: 'leads', label: 'logged against', kind: 'ref' },
  { id: 'e-tasks-leads', source: 'tasks', target: 'leads', label: 'logged against', kind: 'ref' },
  { id: 'e-meetings-leads', source: 'meetings', target: 'leads', label: 'logged against', kind: 'ref' },
  { id: 'e-calls-leads', source: 'calls', target: 'leads', label: 'logged against / can convert', kind: 'ref' },
  { id: 'e-email-leads', source: 'email', target: 'leads', label: 'thread synced to', kind: 'ref' },
  { id: 'e-documents-leads', source: 'documents', target: 'leads', label: 'attached to', kind: 'ref' },
  { id: 'e-documents-deals', source: 'documents', target: 'deals', label: 'attached to', kind: 'ref' },
  { id: 'e-leads-workflows', source: 'leads', target: 'workflows', label: 'triggers', kind: 'ref' },
  { id: 'e-campaigns-workflows', source: 'campaigns', target: 'workflows', label: 'triggers', kind: 'ref' },
  { id: 'e-email-workflows', source: 'email', target: 'workflows', label: 'triggers (reply received)', kind: 'ref' },
  { id: 'e-integrations-meetings', source: 'integrations', target: 'meetings', label: 'Meet link', kind: 'ref' },
  { id: 'e-integrations-email', source: 'integrations', target: 'email', label: 'Gmail sync', kind: 'ref' },
  { id: 'e-team-leads', source: 'team', target: 'leads', label: 'role scopes access', kind: 'ref' },
  { id: 'e-config-leads', source: 'config', target: 'leads', label: 'defines sources/tags/statuses', kind: 'ref' },

  { id: 'e-leads-reports', source: 'leads', target: 'reports', label: 'reports on', kind: 'insight' },
  { id: 'e-deals-reports', source: 'deals', target: 'reports', label: 'reports on', kind: 'insight' },
  { id: 'e-campaigns-reports', source: 'campaigns', target: 'reports', label: 'reports on', kind: 'insight' },
  { id: 'e-payments-reports', source: 'payments', target: 'reports', label: 'reports on', kind: 'insight' },
  { id: 'e-meetings-reports', source: 'meetings', target: 'reports', label: 'reports on', kind: 'insight' },
  { id: 'e-workflows-reports', source: 'workflows', target: 'reports', label: 'reports on', kind: 'insight' },
]

export function laneOf(id) {
  return LANES.find((l) => l.id === id)
}
