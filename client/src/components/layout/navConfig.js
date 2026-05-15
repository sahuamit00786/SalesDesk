import {
  BarChart2,
  Briefcase,
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
  Megaphone,
  MessageCircle,
  Phone,
  Puzzle,
  Receipt,
  ScrollText,
  SlidersHorizontal,
  Settings2,
  Shuffle,
  TrendingUp,
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
  '/contacts': {
    title: 'Contacts',
    sub: 'Individual people — buyers, decision makers, influencers — linked to companies and leads',
  },
  '/companies': {
    title: 'Companies',
    sub: 'Account-level view — the organizations your team sells into',
  },
  '/pipeline': {
    title: 'Pipeline',
    sub: 'Deals by pipeline status — list and board; stage columns reflect each opportunity’s current status',
  },
  '/deals': {
    title: 'Deals Pipeline',
    sub: '',
  },
  '/quotations': {
    title: 'Quotations',
    sub: 'Structured quotes with templates, totals, and PDF-ready layouts.',
  },
  '/quotations/templates': {
    title: 'Quotation templates',
    sub: 'Reusable quotation defaults and visual presets for your workspace.',
  },
  '/invoices': {
    title: 'Invoices',
    sub: 'Tax-ready invoices, payments, and print layouts.',
  },
  '/invoices/templates': {
    title: 'Invoice templates',
    sub: 'Numbering, tax profile, and invoice layout presets.',
  },
  '/opportunities': {
    title: 'Opportunities',
    sub: 'Pipeline deals — leads marked as opportunities, same tools as Leads with pipeline status front and center',
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
    title: 'Calls & meetings',
    sub: 'Log, record, and analyse every phone call and meeting — full call intelligence',
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
  '/whatsapp': {
    title: 'WhatsApp / SMS',
    sub: 'Reach leads on their preferred channel — messages logged just like emails',
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
    sub: 'Coordinate multi-step outreach to segments — email, SMS, WhatsApp in one flow',
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
    sub: 'Pre-built and custom reports — understand where revenue comes from and where it stalls',
  },
  '/forecasting': {
    title: 'Forecasting',
    sub: 'Predict end-of-month and end-of-quarter revenue — data-driven, not gut-feel',
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
}

const DEFAULT_META = {
  title: 'LeadFlow CRM',
  sub: 'Acme Corp workspace',
}

export function getRouteMeta(pathname) {
  const key = pathname === '/' ? '/dashboard' : pathname
  if (ROUTE_META[key]) return ROUTE_META[key]
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
      { to: '/leads', label: 'Leads', icon: Users, badge: '48' },
      { to: '/lead-distribution', label: 'Lead distribution', icon: Shuffle },
      { to: '/opportunities', label: 'Opportunities', icon: Briefcase },
      { to: '/pipeline', label: 'Pipeline', icon: Kanban },
      { to: '/deals', label: 'Deals', icon: CircleDollarSign },
    ],
  },
  {
    label: 'HR',
    items: [
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/leave', label: 'Leave', icon: Umbrella },
      { to: '/leave/requests', label: 'Leave requests', icon: ScrollText },
      { to: '/leave/approval', label: 'Leave approval', icon: ClipboardList },
      { to: '/leave/config', label: 'Leave settings', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'Engage',
    items: [
      { to: '/activities', label: 'Activities', icon: CheckSquare },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/calendar', label: 'Calendar & Reminders', icon: CalendarDays },
      { to: '/meetings', label: 'Calls & meetings', icon: Phone },
      { to: '/email', label: 'Email', icon: Mail },
      { to: '/templates', label: 'Templates', icon: FileStack },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/documents', label: 'Documents', icon: FileStack },
      { to: '/quotations', label: 'Quotations', icon: FileText, end: true },
      { to: '/quotations/templates', label: 'Quotation templates', icon: ClipboardList },
      { to: '/invoices', label: 'Invoices', icon: Receipt, end: true },
      { to: '/invoices/templates', label: 'Invoice templates', icon: Banknote },
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
      { to: '/forecasting', label: 'Forecasting', icon: TrendingUp },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/workspace', label: 'Workspace settings', icon: Settings2 },
      { to: '/lead-configuration', label: 'Lead configuration', icon: SlidersHorizontal },
      { to: '/team', label: 'Team & roles', icon: Users },
      { to: '/integrations', label: 'Integrations & API', icon: Puzzle },
    ],
  },
]
