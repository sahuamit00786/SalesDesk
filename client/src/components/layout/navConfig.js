import {
  BarChart2,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
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
  Megaphone,
  Phone,
  PhoneCall,
  Puzzle,
  Receipt,
  ScrollText,
  SlidersHorizontal,
  Settings2,
  Shuffle,
  Sparkles,
  Umbrella,
  Users,
  Workflow,
} from 'lucide-react'

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
  '/email': {
    title: 'Email',
    sub: 'Send, receive, and track emails without leaving the CRM — full inbox inside the app',
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
    sub: 'One-stop admin analytics — leads, deals, tasks, follow-ups, payments, leave, and more',
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
  '/hr': {
    title: 'HR Overview',
    sub: 'Attendance status, leave balances, and pending HR actions at a glance',
  },
  '/hr/reports': {
    title: 'Leave & Attendance',
    sub: 'Leave by employee and type — now under Reports → Leave',
  },
  '/attendance': {
    title: 'Attendance',
    sub: 'Check-in, team calendar, and monthly attendance reports',
  },
  '/leave': {
    title: 'Leave',
    sub: 'Apply for leave and view your balance',
  },
  '/leave/requests': {
    title: 'Leave requests',
    sub: 'Track pending, approved, and past leave applications',
  },
  '/leave/approval': {
    title: 'Leave approval',
    sub: 'Review and approve team leave requests',
  },
  '/leave/config': {
    title: 'Leave settings',
    sub: 'Leave types, holidays, and balance adjustments',
  },
  '/knowledge-base': {
    title: 'Knowledge Base',
    sub: 'Every module explained in plain language — searchable FAQs, guides, and troubleshooting',
  },
  '/copilot': {
    title: 'AI Copilot',
    sub: 'Ask about leads, campaigns, deals, team performance, and reports for this workspace',
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

export const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
      { to: '/copilot', label: 'AI Copilot', icon: Sparkles },
      { to: '/leads', label: 'Leads', icon: Users },
      { to: '/lead-distribution', label: 'Lead distribution', icon: Shuffle },
      { to: '/opportunities', label: 'Opportunities', icon: Briefcase },
      { to: '/pipeline', label: 'Pipeline', icon: Kanban, end: true },
      { to: '/deals', label: 'Deals', icon: CircleDollarSign },
      { to: '/deal-payments', label: 'Deal Payments', icon: Banknote },
    ],
  },
  // HR modules disabled
  // {
  //   label: 'HR',
  //   items: [
  //     { to: '/hr', label: 'HR Overview', icon: Building2, end: true },
  //     { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  //     { to: '/leave', label: 'Leave', icon: Umbrella, end: true },
  //     { to: '/leave/requests', label: 'My requests', icon: ScrollText },
  //     { to: '/leave/approval', label: 'Approval queue', icon: ClipboardList },
  //     { to: '/leave/config', label: 'Leave settings', icon: SlidersHorizontal },
  //   ],
  // },
  {
    label: 'Engage',
    items: [
      { to: '/activities', label: 'Activities', icon: CheckSquare },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/calendar', label: 'Calendar & Reminders', icon: CalendarDays },
      { to: '/meetings', label: 'Meetings', icon: Phone },
      { to: '/calls', label: 'Calls', icon: PhoneCall },
      { to: '/email', label: 'Email', icon: Mail },
      { to: '/templates', label: 'Templates', icon: FileStack },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/documents', label: 'Documents', icon: FileStack },
      { to: '/quotations', label: 'Quotations', icon: FileText, end: true },
      { to: '/invoices', label: 'Invoices', icon: Receipt, end: true },
      { to: '/sales-docs/templates', label: 'Doc templates', icon: ClipboardList },
    ],
  },
  {
    label: 'Automate',
    items: [
      { to: '/automation', label: 'Automation', icon: Workflow },
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { to: '/forms', label: 'Web forms / lead capture', icon: ClipboardList },
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
      { to: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    ],
  },
]
