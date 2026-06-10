import {
  Activity, AlertTriangle, BarChart2, Briefcase, CalendarCheck, CheckSquare,
  CreditCard, FileText, Mail, Megaphone, Receipt, Target, TrendingUp,
  Umbrella, UserCircle, Users, Video,
} from 'lucide-react'

export const REPORT_CATEGORIES = [
  {
    id: 'executive',
    label: 'Executive Overview',
    desc: 'Workspace health at a glance',
    reports: ['overview'],
  },
  {
    id: 'sales',
    label: 'Sales & Pipeline',
    desc: 'Leads, opportunities, deals, quotes & payments',
    reports: ['leads', 'opportunities', 'deals', 'sales-docs', 'payments'],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    desc: 'Tasks, follow-ups, activities & meetings',
    reports: ['tasks', 'followups', 'activities', 'meetings'],
  },
  {
    id: 'people',
    label: 'People & HR',
    desc: 'Team performance, monthly digest & leave',
    reports: ['employee-monthly', 'team', 'leave'],
  },
  {
    id: 'communications',
    label: 'Communications & Data',
    desc: 'Email performance, campaigns & data health',
    reports: ['email', 'campaigns', 'data-health'],
  },
]

export const REPORT_META = {
  overview: {
    label: 'Overview',
    desc: 'Complete business performance snapshot',
    icon: BarChart2,
    iconGrad: 'from-violet-500 to-indigo-600',
    category: 'executive',
  },
  leads: {
    label: 'Leads',
    desc: 'Lead pipeline, sources, untouched leads & conversion',
    icon: TrendingUp,
    iconGrad: 'from-blue-500 to-cyan-500',
    category: 'sales',
    filters: ['userId', 'status', 'source'],
  },
  opportunities: {
    label: 'Opportunities',
    desc: 'Pipeline stages — which opportunity is in which stage',
    icon: Target,
    iconGrad: 'from-indigo-500 to-blue-600',
    category: 'sales',
    filters: ['userId', 'stage', 'status'],
  },
  deals: {
    label: 'Deals',
    desc: 'Deals won/created in date range, revenue & payments',
    icon: Briefcase,
    iconGrad: 'from-emerald-500 to-teal-600',
    category: 'sales',
    filters: ['userId', 'stage', 'status'],
  },
  'sales-docs': {
    label: 'Quotations & Invoices',
    desc: 'Sales documents created, value & quote-to-invoice conversion',
    icon: FileText,
    iconGrad: 'from-sky-500 to-blue-600',
    category: 'sales',
  },
  payments: {
    label: 'Payments',
    desc: 'Payments received by leads — deal & invoice payments',
    icon: CreditCard,
    iconGrad: 'from-green-500 to-emerald-600',
    category: 'sales',
    filters: ['userId'],
  },
  tasks: {
    label: 'Tasks',
    desc: 'Pending tasks by employee & workspace workload',
    icon: CheckSquare,
    iconGrad: 'from-rose-500 to-pink-600',
    category: 'productivity',
    filters: ['userId'],
  },
  followups: {
    label: 'Follow-ups',
    desc: 'Upcoming lineup, overdue queue & completion rates',
    icon: CalendarCheck,
    iconGrad: 'from-orange-500 to-amber-500',
    category: 'productivity',
    filters: ['userId', 'view'],
  },
  activities: {
    label: 'Activities & Calls',
    desc: 'Team activity log, calls, emails & heatmap',
    icon: Activity,
    iconGrad: 'from-orange-500 to-red-500',
    category: 'productivity',
    filters: ['userId'],
  },
  meetings: {
    label: 'Meetings',
    desc: 'Upcoming & past meetings, show-up rates & recordings',
    icon: Video,
    iconGrad: 'from-purple-500 to-violet-600',
    category: 'productivity',
    filters: ['userId', 'view'],
  },
  'employee-monthly': {
    label: 'Employee Monthly Digest',
    desc: 'What each employee did in the selected month',
    icon: UserCircle,
    iconGrad: 'from-cyan-500 to-teal-500',
    category: 'people',
    filters: ['userId', 'month', 'year'],
  },
  team: {
    label: 'Team Leaderboard',
    desc: 'Team performance, revenue & activity rankings',
    icon: Users,
    iconGrad: 'from-amber-500 to-yellow-500',
    category: 'people',
  },
  leave: {
    label: 'Leave & Attendance',
    desc: 'Leave taken by employee and leave type',
    icon: Umbrella,
    iconGrad: 'from-teal-500 to-cyan-600',
    category: 'people',
    filters: ['userId'],
  },
  email: {
    label: 'Email Performance',
    desc: 'Sent, opens, clicks & reply rates',
    icon: Mail,
    iconGrad: 'from-violet-500 to-purple-600',
    category: 'communications',
  },
  campaigns: {
    label: 'Campaigns',
    desc: 'Campaign leads staged and conversion',
    icon: Megaphone,
    iconGrad: 'from-pink-500 to-rose-600',
    category: 'communications',
  },
  'data-health': {
    label: 'Data Health',
    desc: 'Unassigned, untouched & duplicate leads',
    icon: AlertTriangle,
    iconGrad: 'from-amber-500 to-orange-600',
    category: 'communications',
  },
  // Legacy alias
  pipeline: {
    label: 'Deals',
    desc: 'Deals won/created in date range',
    icon: Briefcase,
    iconGrad: 'from-emerald-500 to-teal-600',
    category: 'sales',
    aliasOf: 'deals',
  },
}

export function getReportMeta(type) {
  const meta = REPORT_META[type]
  if (!meta) return REPORT_META.leads
  if (meta.aliasOf) return REPORT_META[meta.aliasOf]
  return meta
}
