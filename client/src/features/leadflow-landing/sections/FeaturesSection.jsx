import { useRef } from 'react'
import {
  BarChart2,
  Briefcase,
  Building2,
  CalendarDays,
  CheckSquare,
  FileText,
  Inbox,
  Kanban,
  Megaphone,
  Receipt,
  Shuffle,
  Users,
  Workflow,
} from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { useScrollReveal } from '@/features/leadflow-landing/hooks/useScrollReveal'
import { cn } from '@/utils/cn'

const FEATURES = [
  {
    title: 'Leads',
    summary: 'Full lifecycle from raw prospect to qualified opportunity — every touchpoint in one place',
    icon: Users,
    span: 'lg:col-span-2',
    accent: 'from-violet-500/20 to-purple-600/10',
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10 ring-violet-500/20',
  },
  {
    title: 'Lead distribution',
    summary: 'Fairly assign unassigned leads to your calling team using round-robin rotation',
    icon: Shuffle,
    span: '',
    accent: 'from-fuchsia-500/15 to-pink-600/10',
    iconColor: 'text-fuchsia-400',
    iconBg: 'bg-fuchsia-500/10 ring-fuchsia-500/20',
  },
  {
    title: 'Pipeline',
    summary: 'Deals by pipeline status — list and board; stage columns reflect each opportunity's status',
    icon: Kanban,
    span: '',
    accent: 'from-blue-500/15 to-indigo-600/10',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 ring-blue-500/20',
  },
  {
    title: 'Deals & payments',
    summary: 'Deals pipeline with stages from Qualification to Won, plus deal payment tracking',
    icon: Briefcase,
    span: 'lg:col-span-2',
    accent: 'from-emerald-500/15 to-teal-600/10',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 ring-emerald-500/20',
  },
  {
    title: 'Email inbox',
    summary: 'Send, receive, and track emails without leaving the CRM — full inbox inside the app',
    icon: Inbox,
    span: 'lg:col-span-2',
    accent: 'from-cyan-500/15 to-sky-600/10',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 ring-cyan-500/20',
  },
  {
    title: 'Tasks & calendar',
    summary: 'My Task with list and calendar views — follow-ups linked to leads with due dates',
    icon: CheckSquare,
    span: '',
    accent: 'from-amber-500/15 to-yellow-600/10',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 ring-amber-500/20',
  },
  {
    title: 'Calls & meetings',
    summary: 'Log, record, and analyse every phone call and meeting — full call intelligence',
    icon: CalendarDays,
    span: '',
    accent: 'from-rose-500/15 to-red-600/10',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 ring-rose-500/20',
  },
  {
    title: 'Automation',
    summary: 'No-code workflow rules — trigger actions automatically when conditions are met',
    icon: Workflow,
    span: '',
    accent: 'from-purple-500/15 to-violet-600/10',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 ring-purple-500/20',
  },
  {
    title: 'Campaigns',
    summary: 'Coordinate multi-step outreach to segments — assign leads and track campaign progress',
    icon: Megaphone,
    span: '',
    accent: 'from-orange-500/15 to-amber-600/10',
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10 ring-orange-500/20',
  },
  {
    title: 'Quotations & invoices',
    summary: 'Structured quotes and tax-ready invoices with templates and PDF-ready layouts',
    icon: Receipt,
    span: 'lg:col-span-2',
    accent: 'from-teal-500/15 to-green-600/10',
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10 ring-teal-500/20',
  },
  {
    title: 'Reports',
    summary: 'One-stop admin analytics — leads, deals, tasks, follow-ups, payments, leave, and more',
    icon: BarChart2,
    span: '',
    accent: 'from-indigo-500/15 to-blue-600/10',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10 ring-indigo-500/20',
  },
  {
    title: 'HR & attendance',
    summary: 'Attendance check-in, leave requests, approval queue, and HR reports in the same workspace',
    icon: Building2,
    span: '',
    accent: 'from-pink-500/15 to-rose-600/10',
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10 ring-pink-500/20',
  },
  {
    title: 'Documents',
    summary: 'Central file store — contracts, presentations, NDAs — all linked to leads or deals',
    icon: FileText,
    span: 'lg:col-span-2',
    accent: 'from-slate-400/10 to-gray-500/5',
    iconColor: 'text-slate-400',
    iconBg: 'bg-slate-500/10 ring-slate-500/20',
  },
]

function FeatureCard({ item }) {
  const Icon = item.icon
  return (
    <article
      data-reveal
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04]',
        item.span,
      )}
    >
      {/* Per-card accent gradient on hover */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          item.accent,
        )}
      />
      {/* Top edge line on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start gap-4">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-300 group-hover:scale-105',
            item.iconBg,
            item.iconColor,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white/85">{item.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-white/40">{item.summary}</p>
        </div>
      </div>
    </article>
  )
}

export function FeaturesSection() {
  const reduced = usePrefersReducedMotion()
  const scopeRef = useRef(null)
  useScrollReveal(scopeRef, '[data-reveal]', { y: 20 })

  return (
    <Section id="features" ref={scopeRef} className="relative bg-[#050510] py-24">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,92,246,0.06), transparent 60%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-2xl"
          data-reveal
          style={reduced ? undefined : { opacity: 0 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">Platform</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
            Everything in one workspace
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/45 sm:text-base">
            From lead capture to quotation, invoice, and team HR — all the modules your sales team needs,
            fully integrated.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item) => (
            <FeatureCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </Section>
  )
}
