import {
  BarChart2,
  Building2,
  CheckSquare,
  CircleDollarSign,
  ClipboardList,
  Contact,
  FileStack,
  Kanban,
  LayoutGrid,
  ListTodo,
  Mail,
  Megaphone,
  MessageCircle,
  Phone,
  Puzzle,
  SlidersHorizontal,
  Settings2,
  TrendingUp,
  Users,
  Workflow,
} from 'lucide-react'

/** Route → header title + subtitle (module overview copy). */
export const ROUTE_META = {
  '/': {
    title: 'Dashboard',
    sub: 'Home screen — overview of all key metrics, tasks due today, and pipeline health',
  },
  '/leads': {
    title: 'Leads',
    sub: 'Full lifecycle from raw prospect to qualified opportunity — every touchpoint in one place',
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
    sub: "Visual drag-and-drop board — see every deal's position in your sales funnel at a glance",
  },
  '/deals': {
    title: 'Deals',
    sub: 'Revenue opportunities — track value, close date, probability, and products',
  },
  '/activities': {
    title: 'Activities',
    sub: 'Everything that happened — calls, emails, meetings, notes — in a filterable timeline',
  },
  '/tasks': {
    title: 'Tasks',
    sub: 'Action items with owners, due dates, and priorities — never let a follow-up slip',
  },
  '/calls': {
    title: 'Calls & meetings',
    sub: 'Log, record, and analyse every phone call and meeting — full call intelligence',
  },
  '/email': {
    title: 'Email',
    sub: 'Send, receive, and track emails without leaving the CRM — full inbox inside the app',
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
  '/campaigns': {
    title: 'Campaigns',
    sub: 'Coordinate multi-step outreach to segments — email, SMS, WhatsApp in one flow',
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
    sub: 'Configure everything specific to this workspace — your brand, currency, fields, stages',
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
}

const DEFAULT_META = {
  title: 'LeadFlow CRM',
  sub: 'Acme Corp workspace',
}

export function getRouteMeta(pathname) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname]
  return DEFAULT_META
}

export const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
      { to: '/leads', label: 'Leads', icon: Users, badge: '48' },
      { to: '/contacts', label: 'Contacts', icon: Contact },
      { to: '/companies', label: 'Companies', icon: Building2 },
      { to: '/pipeline', label: 'Pipeline', icon: Kanban },
      { to: '/deals', label: 'Deals', icon: CircleDollarSign },
    ],
  },
  {
    label: 'Engage',
    items: [
      { to: '/activities', label: 'Activities', icon: CheckSquare, badge: '7', badgeVariant: 'info' },
      { to: '/tasks', label: 'Tasks', icon: ListTodo, badge: '12' },
      { to: '/calls', label: 'Calls & meetings', icon: Phone },
      { to: '/email', label: 'Email', icon: Mail },
      { to: '/whatsapp', label: 'WhatsApp / SMS', icon: MessageCircle },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/documents', label: 'Documents', icon: FileStack },
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
