import {
  BarChart2,
  BellRing,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
  Banknote,
  CircleDollarSign,
  ClipboardList,
  FileStack,
  FileText,
  Kanban,
  LayoutGrid,
  ListTodo,
  Mail,
  MailOpen,
  Map,
  Megaphone,
  MessageCircle,
  Phone,
  PhoneCall,
  Puzzle,
  Receipt,
  SlidersHorizontal,
  Settings2,
  Shuffle,
  Sparkles,
  Users,
  Workflow,
} from '@/components/ui/icons'

/** Route → header title + subtitle (module overview copy). */
export const ROUTE_META = {
  '/dashboard': {
    title: 'Dashboard',
    sub: 'Home screen — overview of all key metrics, tasks due today, and pipeline health',
  },
  '/leads': {
    title: 'Leads',
    sub: 'Full lifecycle from raw prospect to qualified opportunity — every touchpoint in one place',
  },
  '/lead-distribution': {
    title: 'Lead distribution',
    sub: 'Fairly assign unassigned leads to your calling team using round-robin rotation',
  },
  '/pipeline': {
    title: 'Pipeline',
    sub: 'Deals by pipeline status — list and board; stage columns reflect each opportunity’s current status',
  },
  '/deals': {
    title: 'Deals Pipeline',
    sub: 'Active sales pipeline — track and manage committed deals through to close',
  },
  '/deal-payments': {
    title: 'Deal Payments',
    sub: 'Track and filter all payments recorded against deals — by status, mode, date, and team member',
  },
  '/quotations': {
    title: 'Quotations',
    sub: 'Structured quotes with templates, totals, and PDF-ready layouts.',
  },
  '/invoices': {
    title: 'Invoices',
    sub: 'Tax-ready invoices, payments, and print layouts.',
  },
  '/sales-docs/templates': {
    title: 'Document templates',
    sub: 'Quotation and invoice layout presets, numbering, and defaults — one place for both.',
  },
  '/document-settings': {
    title: 'Document settings',
    sub: 'Quotation and invoice numbering — prefixes, sequences, and formats',
  },
  '/opportunities': {
    title: 'Opportunities',
    sub: 'Potential prospects not yet in the active sales pipeline — qualify and convert to deals',
  },
  '/activities': {
    title: 'Activities',
    sub: 'Everything that happened — calls, emails, meetings, notes — in a filterable timeline',
  },
  '/tasks': {
    title: 'My Task',
    sub: 'You have 34 tasks ongoing. Stay focused and complete them on time.',
  },
  '/meetings': {
    title: 'Meetings',
    sub: 'Log, record, and analyse every meeting — full call intelligence',
  },
  '/calls': {
    title: 'Calls',
    sub: 'Every call logged on a lead or synced from the mobile app call log — filterable and convertible',
  },
  '/calendar': {
    title: 'Calendar & Reminders',
    sub: 'Unified view of meetings, tasks, follow-ups, and reminders — your complete schedule in one place',
  },
  '/followups': {
    title: 'Follow-ups',
    sub: 'Every follow-up scheduled across your leads — admins can filter by employee',
  },
  '/email': {
    title: 'Email',
    sub: 'Send, receive, and track emails without leaving the CRM — full inbox inside the app',
  },
  '/whatsapp': {
    title: 'WhatsApp',
    sub: 'Send, receive, and track WhatsApp messages without leaving the CRM — full inbox inside the app',
  },
  '/templates': {
    title: 'Templates',
    sub: 'Create and manage email templates with merge tags, delivery safeguards, and send history',
  },
  '/documents': {
    title: 'Documents',
    sub: 'Central file store — contracts, presentations, NDAs — all linked to leads or deals',
  },
  '/automation': {
    title: 'Automation',
    sub: 'No-code workflow rules — trigger actions automatically when conditions are met',
  },
  '/automation/new': {
    title: 'New workflow',
    sub: 'Name your workflow, then design triggers, conditions, delays, and actions in the visual editor',
  },
  '/campaigns': {
    title: 'Campaigns',
    sub: 'Coordinate multi-step outreach to segments — assign leads and track campaign progress',
  },
  '/campaigns/new': {
    title: 'New campaign',
    sub: 'Pick leads, choose team members, and set assignment rules for this campaign',
  },
  '/forms': {
    title: 'Web forms & lead capture',
    sub: 'Embed forms on your website — leads flow straight into the CRM automatically',
  },
  '/reports': {
    title: 'Reports & analytics',
    sub: 'One-stop admin analytics — leads, deals, tasks, follow-ups, payments, and more',
  },
  '/email-tracking': {
    title: 'Email tracking',
    sub: 'Open, click, and reply rates — now under Reports → Email Performance',
  },
  '/workspace': {
    title: 'Workspace settings',
    sub: 'Manage workspaces, then use Company information for legal name, GSTIN, logo, and invoice details.',
  },
  '/lead-configuration': {
    title: 'Lead configuration',
    sub: 'Manage lead sources, tags, and status categories in one place',
  },
  '/team': {
    title: 'Team & roles',
    sub: 'Invite people, assign roles, control what each role can see and do',
  },
  '/integrations': {
    title: 'Integrations & API',
    sub: 'Connect your CRM to every other tool your company uses',
  },
  '/knowledge-base': {
    title: 'Knowledge Base',
    sub: 'Every module explained in plain language — searchable FAQs, guides, and troubleshooting',
  },
  '/copilot': {
    title: 'AI Copilot',
    sub: 'Ask about leads, campaigns, deals, team performance, and reports for this workspace',
  },
  '/systemworkflow': {
    title: 'System Workflow',
    sub: 'Click a node to see its user flow and where its data comes from and goes',
  },
}

const DEFAULT_META = {
  title: 'LeadFlow CRM',
  sub: 'Acme Corp workspace',
}

export function getRouteMeta(pathname) {
  const key = pathname === '/' ? '/dashboard' : pathname
  if (ROUTE_META[key]) return ROUTE_META[key]
  if (pathname.startsWith('/reports/')) {
    return ROUTE_META['/reports']
  }
  if (/^\/automation\/[^/]+$/.test(pathname) && pathname !== '/automation/new') {
    return {
      title: 'Workflow editor',
      sub: 'Pan, connect nodes, and auto-save — publish a version when you are ready to ship',
    }
  }
  return DEFAULT_META
}

// `restricted: true` marks items visible to every role, including non-elevated ones
// (see isElevatedRole/buildAllowedRouteSet in utils/menuAccess.js). Elevated roles
// (company admin, workspace_admin, manager) always see the full NAV_SECTIONS list
// regardless of this flag — it only matters for filtering everyone else's sidebar.
export const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, end: true, restricted: true },
      { to: '/copilot', label: 'AI Copilot', icon: Sparkles },
      { to: '/leads', label: 'Leads', icon: Users, restricted: true },
      { to: '/lead-distribution', label: 'Lead distribution', icon: Shuffle },
      { to: '/opportunities', label: 'Opportunities', icon: Briefcase, restricted: true },
      { to: '/pipeline', label: 'Pipeline', icon: Kanban, end: true, restricted: true },
      { to: '/deals', label: 'Deals', icon: CircleDollarSign, restricted: true },
      { to: '/deal-payments', label: 'Deal Payments', icon: Banknote, restricted: true },
    ],
  },
  {
    label: 'Engage',
    items: [
      { to: '/activities', label: 'Activities', icon: CheckSquare, restricted: true },
      { to: '/tasks', label: 'Tasks', icon: ListTodo, restricted: true },
      { to: '/calendar', label: 'Calendar & Reminders', icon: CalendarDays, restricted: true },
      { to: '/followups', label: 'Follow-ups', icon: BellRing, restricted: true },
      { to: '/meetings', label: 'Meetings', icon: Phone, restricted: true },
      { to: '/calls', label: 'Calls', icon: PhoneCall, restricted: true },
      { to: '/email', label: 'Email', icon: Mail, restricted: true },
      { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle, restricted: true },
      { to: '/templates', label: 'Templates', icon: FileStack, restricted: true },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/documents', label: 'Documents', icon: FileStack, restricted: true },
      { to: '/quotations', label: 'Quotations', icon: FileText, end: true, restricted: true },
      { to: '/invoices', label: 'Invoices', icon: Receipt, end: true, restricted: true },
      { to: '/sales-docs/templates', label: 'Doc templates', icon: ClipboardList, restricted: true },
    ],
  },
  {
    label: 'Automate',
    items: [
      { to: '/automation', label: 'Automation', icon: Workflow, restricted: true },
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone, restricted: true },
      { to: '/forms', label: 'Web forms / lead capture', icon: ClipboardList, restricted: true },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart2 },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/workspace', label: 'Workspace settings', icon: Settings2 },
      { to: '/lead-configuration', label: 'Lead configuration', icon: SlidersHorizontal },
      { to: '/document-settings', label: 'Document settings', icon: FileText },
      { to: '/team', label: 'Team & roles', icon: Users },
      { to: '/integrations', label: 'Integrations & API', icon: Puzzle },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { to: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen, restricted: true },
      { to: '/systemworkflow', label: 'System Workflow', icon: Map, restricted: true },
    ],
  },
]
