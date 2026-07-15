/**
 * All landing page copy in one place. Anything marked PLACEHOLDER is
 * marketing filler awaiting real data — swap it here without touching layout.
 */
import {
  BarChart3,
  CalendarCheck,
  FileText,
  Filter,
  GitBranch,
  Inbox,
  Layers,
  MailCheck,
  PenLine,
  PhoneCall,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'

export const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Features', href: '#features' },
  { label: 'AI', href: '#ai' },
  { label: 'Customers', href: '#customers' },
  { label: 'FAQ', href: '#faq' },
]

export const HERO = {
  eyebrow: 'Now with AI lead scoring',
  titleLine1: 'The AI-powered CRM built',
  titleLine2: 'for modern sales teams.',
  sub: 'LeadNest brings your leads, pipeline, conversations, and automations into one fast, beautifully simple workspace — so your team spends less time updating records and more time closing.',
  // PLACEHOLDER trust metrics — replace with real numbers
  trust: ['4.9 average rating', '2,000+ sales teams', 'No credit card required'],
}

// PLACEHOLDER logos — replace with real customer wordmarks
export const TRUSTED_WORDMARKS = [
  'NORTHWIND',
  'meridian',
  'Acme Labs',
  'BRIGHTSTONE',
  'quantia',
  'Fernhill & Co',
  'OAKLINE',
  'vantage',
]

export const PRODUCT_TABS = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    src: '/landing/deals-pipeline.png',
    caption: 'A visual kanban board from qualification through won — deal value and revenue totals at a glance.',
  },
  {
    id: 'leads',
    label: 'Leads',
    src: '/landing/leads.png',
    caption: 'Every prospect, every touchpoint — the full lifecycle from raw lead to qualified opportunity.',
  },
  {
    id: 'email',
    label: 'Email',
    src: '/landing/email-inbox.png',
    caption: 'Send, receive, and track email without leaving the CRM — a full inbox inside the app.',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    src: '/landing/my-task-list.png',
    caption: 'Follow-ups, due dates, and lead-linked tasks — stay focused and never drop a deal.',
  },
  {
    id: 'automation',
    label: 'Automation',
    src: '/landing/workflow-editor.png',
    caption: 'No-code workflows that trigger actions automatically the moment conditions are met.',
  },
]

export const CRM_FEATURES = [
  {
    eyebrow: 'Lead management',
    title: 'Every lead, from first touch to closed deal.',
    body: 'Capture, qualify, and track leads through their entire lifecycle with custom fields, smart filters, and instant import.',
    src: '/landing/leads.png',
    alt: 'LeadNest leads list with lifecycle stages and filters',
    bullets: [
      { icon: Filter, text: 'Segment with saved views, custom fields, and advanced filters' },
      { icon: UserCheck, text: 'Assign owners automatically with round-robin distribution' },
      { icon: Zap, text: 'Import thousands of leads in seconds — mapping handled for you' },
    ],
  },
  {
    eyebrow: 'Deal workspace',
    title: 'Everything about a deal, on one screen.',
    body: 'Activity, notes, tasks, payments, quotations, and invoices live on every deal record — no tab-hopping, no lost context.',
    src: '/landing/deals-detail-tasks.png',
    alt: 'LeadNest deal workspace with tasks, notes, and activity',
    reverse: true,
    bullets: [
      { icon: CalendarCheck, text: 'Tasks and follow-ups scheduled right on the deal' },
      { icon: FileText, text: 'Quotations and invoices generated from the same record' },
      { icon: Layers, text: 'A complete timeline of every interaction, automatically' },
    ],
  },
  {
    eyebrow: 'Built-in email',
    title: 'Your inbox, inside your CRM.',
    body: 'Threads sync to the right lead automatically. Reply, track opens and clicks, and turn conversations into deals without switching apps.',
    src: '/landing/email-thread.png',
    alt: 'LeadNest email thread linked to a contact',
    bullets: [
      { icon: Inbox, text: 'Two-way Gmail sync with real-time inbox updates' },
      { icon: MailCheck, text: 'Open and click tracking on every message you send' },
      { icon: PenLine, text: 'Templates with merge tags and delivery safeguards' },
    ],
  },
  {
    eyebrow: 'Quotes & billing',
    title: 'From quote to invoice in a few clicks.',
    body: 'Build structured, PDF-ready quotations with templates and totals — then convert them to invoices the moment a deal closes.',
    src: '/landing/edit-quotation.png',
    alt: 'LeadNest quotation editor with line items and totals',
    reverse: true,
    bullets: [
      { icon: FileText, text: 'Branded, PDF-ready quotes with line items and taxes' },
      { icon: Target, text: 'Convert accepted quotes to invoices in one step' },
      { icon: ShieldCheck, text: 'Every document linked to its deal and customer' },
    ],
  },
]

export const AI_FEATURES = {
  eyebrow: 'LeadNest AI',
  title: 'An assistant that actually knows your pipeline.',
  body: 'LeadNest AI reads the context you already have — activity, emails, call notes — and turns it into summaries, drafts, and scores you can act on.',
  bullets: [
    { icon: Sparkles, text: 'One-click summaries of any lead’s full history' },
    { icon: PenLine, text: 'Follow-up emails drafted in your tone, ready to send' },
    { icon: Target, text: 'AI lead scoring that surfaces your hottest prospects first' },
  ],
}

export const PIPELINE = {
  eyebrow: 'Sales pipeline',
  title: 'See every deal. Miss nothing.',
  sub: 'A pipeline that stays current on its own — drag deals between stages, watch revenue totals update live, and always know exactly where to focus.',
  // PLACEHOLDER stats — replace with real outcomes
  stats: [
    { to: 32, suffix: '%', label: 'faster deal cycles' },
    { to: 2.4, decimals: 1, suffix: 'x', label: 'more pipeline visibility' },
    { to: 98, suffix: '%', label: 'forecast accuracy' },
  ],
}

export const AUTOMATION = {
  eyebrow: 'Lead automation',
  title: 'Put your busywork on autopilot.',
  body: 'Visual, no-code workflows trigger on lead events and email activity — routing, follow-ups, and updates happen while your team sells.',
  src: '/landing/workflow-editor.png',
  alt: 'LeadNest visual workflow editor',
  smallShots: [
    { src: '/landing/lead-distribution.png', alt: 'Round-robin lead distribution' },
    { src: '/landing/webforms.png', alt: 'Web form builder for lead capture' },
  ],
  bullets: [
    { icon: Workflow, text: 'Drag-and-drop workflow builder — no code, no consultants' },
    { icon: Route, text: 'Round-robin routing so every rep gets a fair share' },
    { icon: GitBranch, text: 'Web forms that feed leads straight into your pipeline' },
  ],
}

export const COLLABORATION = {
  eyebrow: 'Team collaboration',
  title: 'One workspace. Everyone on the same page.',
  body: 'Roles and permissions keep data safe, shared timelines keep everyone informed, and workspaces keep teams focused on their own book of business.',
  src: '/landing/team-roles.png',
  alt: 'LeadNest team roles and permissions settings',
  overlaySrc: '/landing/activities.png',
  overlayAlt: 'Shared activity timeline',
  bullets: [
    { icon: ShieldCheck, text: 'Granular role-based permissions per team' },
    { icon: Users, text: 'Workspaces that scope leads, deals, and reports' },
    { icon: Layers, text: 'A shared timeline of every call, email, and note' },
  ],
}

export const MOBILE = {
  eyebrow: 'Mobile app',
  title: 'Your pipeline, in your pocket.',
  body: 'Check tasks, update deals, and reply to leads from anywhere. The LeadNest mobile app keeps field teams as connected as the office.',
  bullets: [
    { icon: CalendarCheck, text: 'Today’s tasks and follow-ups, front and center' },
    { icon: PhoneCall, text: 'Call leads and log outcomes in two taps' },
    { icon: Zap, text: 'Real-time notifications the moment a lead acts' },
  ],
}

export const ANALYTICS = {
  eyebrow: 'Analytics',
  title: 'Know what’s working. Double down.',
  sub: 'Dashboards that answer the questions you actually ask — pipeline health, team performance, and where every lead came from.',
  src: '/landing/dashboard.png',
  alt: 'LeadNest analytics dashboard with pipeline metrics',
  // PLACEHOLDER stats — replace with real outcomes
  stats: [
    { to: 12, suffix: 'k+', label: 'leads captured monthly', icon: Users },
    { to: 41, suffix: '%', label: 'faster first response', icon: Zap },
    { to: 27, suffix: '%', label: 'higher win rate', icon: Target },
    { to: 9, suffix: 'h', label: 'saved per rep, weekly', icon: BarChart3 },
  ],
}

// PLACEHOLDER testimonials — fictional customers, replace with real quotes
export const TESTIMONIALS = {
  featured: {
    quote:
      'We moved off a patchwork of spreadsheets and three different tools. LeadNest gave us one place for leads, calls, and follow-ups — our close rate went up within the first quarter.',
    name: 'Ananya Rao',
    role: 'Head of Sales, Meridian Labs',
  },
  items: [
    {
      quote: 'The pipeline board is the first thing our whole team opens every morning.',
      name: 'Daniel Okafor',
      role: 'Sales Director, Northwind & Co',
    },
    {
      quote: 'Round-robin distribution ended the “who owns this lead” argument forever.',
      name: 'Priya Sharma',
      role: 'Revenue Ops, Brightstone',
    },
    {
      quote: 'AI call summaries mean reps actually log their calls now. Game changer.',
      name: 'Marcus Chen',
      role: 'VP Sales, Quantia',
    },
    {
      quote: 'Quotes to invoices in one flow. Our finance team finally stopped chasing us.',
      name: 'Sofia Almeida',
      role: 'Founder, Fernhill & Co',
    },
    {
      quote: 'We onboarded 14 reps in a week. Nobody needed a training manual.',
      name: 'James Whitfield',
      role: 'COO, Oakline',
    },
  ],
}

export const FAQ_ITEMS = [
  {
    q: 'What is LeadNest?',
    a: 'LeadNest is an all-in-one CRM for modern sales teams — lead management, visual pipelines, built-in email, call intelligence, WhatsApp conversations, automations, and analytics in a single workspace.',
  },
  {
    q: 'Can I import my existing leads and deals?',
    a: 'Yes. Import leads from CSV in minutes with automatic field mapping, including your custom fields. Your pipeline stages and owners come across intact.',
  },
  {
    q: 'How does the email integration work?',
    a: 'Connect Gmail and your inbox syncs both ways in real time. Threads attach to the right lead automatically, and every send supports open and click tracking.',
  },
  {
    q: 'Can I control what each teammate sees?',
    a: 'Fully. Role-based permissions control access feature by feature, and workspaces scope leads, deals, and reports to the right team.',
  },
  {
    q: 'Is my data secure?',
    a: 'Your workspace is isolated per company, access is enforced by role on every request, and data is encrypted in transit. You can export your data at any time.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Yes — the LeadNest mobile app keeps tasks, deals, and lead conversations in your pocket, with real-time notifications when leads act.',
  },
]

export const CONTACT = {
  email: 'sahuamit00786@gmail.com',
  phone: '+91 63869 23401',
  phoneTel: '+916386923401',
}

// Upgrow Ventures — the company behind LeadNest; used on the Contact page
export const UPGROW = {
  companyName: 'Upgrow Ventures',
  email: 'upgrowventures.co@gmail.com',
  phone: '+91 83685 55482',
  phoneTel: '+918368555482',
}

export const FINAL_CTA = {
  title: 'Start closing more deals today.',
  sub: 'Set up your workspace in minutes. Free to start — no credit card required.',
  // Swap mailto for a Calendly / booking link when available
  demoHref: `mailto:${CONTACT.email}?subject=Demo%20request`,
}

export const FOOTER = {
  tagline: 'The AI-powered CRM built for modern sales teams.',
  columns: [
    {
      heading: 'Product',
      links: [
        { label: 'Product tour', href: '#product' },
        { label: 'Features', href: '#features' },
        { label: 'LeadNest AI', href: '#ai' },
        { label: 'Customers', href: '#customers' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
        { label: 'Privacy', to: '/privacy' },
        { label: 'Terms', to: '/terms' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'FAQ', href: '#faq' },
        { label: 'Book a demo', href: 'mailto:sahuamit00786@gmail.com?subject=Demo%20request' },
        { label: 'Create account', to: '/register' },
      ],
    },
  ],
}
