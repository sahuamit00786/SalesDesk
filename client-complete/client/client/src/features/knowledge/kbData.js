import leadsDeals from './content/01-leads-deals.md?raw'
import engage from './content/02-engage.md?raw'
import documents from './content/03-documents-billing.md?raw'
import automation from './content/04-automation.md?raw'
import accountTeam from './content/05-account-team.md?raw'
import hr from './content/06-hr.md?raw'
import analytics from './content/07-analytics.md?raw'

export const KB_SECTIONS = [
  {
    id: 'leads-deals',
    label: 'Leads, Opportunities & Deals',
    icon: 'Users',
    description: 'Leads, opportunities, pipeline, deals, payments, lead config & distribution',
    content: leadsDeals,
  },
  {
    id: 'engage',
    label: 'Engage',
    icon: 'MessageCircle',
    description: 'Activities, tasks, calendar & reminders, meetings, calls, email & templates',
    content: engage,
  },
  {
    id: 'documents',
    label: 'Documents & Billing',
    icon: 'FileText',
    description: 'Documents, quotations, invoices, doc templates & billing profile',
    content: documents,
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: 'Workflow',
    description: 'Workflows, campaigns and web forms / lead capture',
    content: automation,
  },
  {
    id: 'account-team',
    label: 'Account, Workspaces & Team',
    icon: 'Building2',
    description: 'Getting started, workspaces, team & roles, company settings, integrations, onboarding',
    content: accountTeam,
  },
  {
    id: 'hr',
    label: 'HR: Attendance & Leave',
    icon: 'CalendarCheck',
    description: 'Attendance, leave requests, approvals, leave settings, HR reports',
    content: hr,
  },
  {
    id: 'analytics',
    label: 'Dashboard, Reports & Search',
    icon: 'BarChart2',
    description: 'Dashboard, reports & analytics, notifications, search',
    content: analytics,
  },
]
