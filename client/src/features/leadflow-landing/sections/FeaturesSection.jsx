import { useRef } from 'react'
import {
  Building2,
  Calendar,
  BarChart2,
  FileText,
  Zap,
  LayoutDashboard,
  Users,
  Receipt,
  GitBranch,
  Shuffle,
  Mail,
  Megaphone,
  CheckSquare,
  Timer,
} from 'lucide-react'
import { use3DTilt } from '@/features/leadflow-landing/hooks/use3DTilt'
import { useAnimeReveal } from '@/features/leadflow-landing/hooks/useAnimeReveal'
import { Section } from '@/features/leadflow-landing/components/Section'
import { FloatingBg } from '@/features/leadflow-landing/components/FloatingBg'
import { cn } from '@/utils/cn'

const FEATURES = [
  {
    title: 'Leads',
    summary: 'Full lifecycle from raw prospect to qualified opportunity — every touchpoint tracked',
    icon: Users,
    tag: 'Core',
    span: 'lg:col-span-2',
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
    accent: 'violet',
    r: '124,58,237',
  },
  {
    title: 'Lead Distribution',
    summary: 'Fairly assign unassigned leads using round-robin rotation across your calling team',
    icon: Shuffle,
    span: '',
    iconColor: 'text-fuchsia-600',
    iconBg: 'bg-fuchsia-100',
    accent: 'fuchsia',
    r: '192,38,211',
  },
  {
    title: 'Pipeline',
    summary: 'Deals by pipeline status — list and board views with stage-by-stage revenue totals',
    icon: LayoutDashboard,
    span: '',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    accent: 'blue',
    r: '37,99,235',
  },
  {
    title: 'Deals & Payments',
    summary: 'Pipeline stages from Qualification to Won — with deal payment tracking built in',
    icon: Receipt,
    tag: 'Sales',
    span: 'lg:col-span-2',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    accent: 'emerald',
    r: '5,150,105',
  },
  {
    title: 'Email Inbox',
    summary: 'Send, receive, and track emails without leaving the CRM — full inbox inside the app',
    icon: Mail,
    tag: 'Engage',
    span: 'lg:col-span-2',
    iconColor: 'text-cyan-600',
    iconBg: 'bg-cyan-100',
    accent: 'cyan',
    r: '8,145,178',
  },
  {
    title: 'Tasks & Calendar',
    summary: 'Follow-up tasks with list and calendar views — all linked to leads with due dates',
    icon: CheckSquare,
    span: '',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    accent: 'amber',
    r: '180,83,9',
  },
  {
    title: 'Calls & Meetings',
    summary: 'Log, record, and analyse every call and meeting — full call intelligence in one place',
    icon: Calendar,
    span: '',
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100',
    accent: 'rose',
    r: '225,29,72',
  },
  {
    title: 'Automation',
    summary: 'No-code workflow rules — trigger email, tasks, or assignment automatically on events',
    icon: Zap,
    tag: 'AI',
    span: '',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    accent: 'purple',
    r: '126,34,206',
  },
  {
    title: 'Campaigns',
    summary: 'Coordinate multi-step outreach — assign leads to campaigns and track every stage',
    icon: Megaphone,
    span: '',
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
    accent: 'orange',
    r: '194,65,12',
  },
  {
    title: 'Quotations & Invoices',
    summary: 'Structured quotes and tax-ready invoices with PDF export — linked to deals',
    icon: Timer,
    tag: 'Finance',
    span: 'lg:col-span-2',
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-100',
    accent: 'teal',
    r: '15,118,110',
  },
  {
    title: 'Reports & Analytics',
    summary: 'Admin analytics across leads, deals, tasks, payments, leave, and team activity',
    icon: BarChart2,
    span: '',
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    accent: 'indigo',
    r: '67,56,202',
  },
  {
    title: 'HR & Attendance',
    summary: 'Check-in/out, leave requests, approval queue, and HR reports — same workspace',
    icon: Building2,
    tag: 'HR',
    span: '',
    iconColor: 'text-pink-600',
    iconBg: 'bg-pink-100',
    accent: 'pink',
    r: '219,39,119',
  },
  {
    title: 'Documents',
    summary: 'Central file store for contracts, presentations, and NDAs — linked to leads or deals',
    icon: FileText,
    span: 'lg:col-span-2',
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100',
    accent: 'slate',
    r: '71,85,105',
  },
]

function FeatureCard({ item }) {
  const Icon = item.icon
  const { ref, onMove, onLeave } = use3DTilt({ max: 8, lift: 16 })
  const r = item.r

  return (
    <article
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 40px rgba(${r},0.14), 0 2px 8px rgba(0,0,0,0.05)`
        e.currentTarget.style.borderColor = `rgba(${r},0.25)`
      }}
      onMouseLeave={(e) => {
        onLeave()
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'
      }}
      data-reveal
      className={cn('group relative overflow-hidden rounded-2xl border border-black/[0.07] bg-white p-6', item.span)}
      style={{
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
      }}
    >
      {/* Subtle top radial accent on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse 80% 55% at 20% 0%, rgba(${r},0.07), transparent 65%)` }}
        aria-hidden
      />

      {/* Cursor glare */}
      <div
        data-glare
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0"
        style={{ transition: 'opacity 0.2s' }}
        aria-hidden
      />

      <div style={{ transformStyle: 'preserve-3d' }}>
        {/* Icon row + tag */}
        <div className="flex items-start justify-between">
          {/* Floating icon — Z+28 */}
          <span
            className={cn('flex h-12 w-12 items-center justify-center rounded-xl', item.iconBg)}
            style={{
              transform: 'translateZ(28px)',
              boxShadow: `0 4px 16px rgba(${r},0.20)`,
            }}
          >
            <Icon size={22} className={item.iconColor} aria-hidden />
          </span>

          {item.tag && (
            <span
              className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] uppercase', item.iconColor)}
              style={{
                transform: 'translateZ(14px)',
                background: `rgba(${r},0.09)`,
                border: `1px solid rgba(${r},0.18)`,
              }}
            >
              {item.tag}
            </span>
          )}
        </div>

        {/* Title — Z+8 */}
        <h3
          className="mt-5 text-[0.9375rem] font-semibold leading-snug text-[#0a0714]"
          style={{ transform: 'translateZ(8px)' }}
        >
          {item.title}
        </h3>

        {/* Description — Z+0 */}
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {item.summary}
        </p>
      </div>
    </article>
  )
}

export function FeaturesSection() {
  const scopeRef = useRef(null)
  useAnimeReveal(scopeRef, '[data-reveal]', { y: 24, rotateX: 10 })

  return (
    <Section id="features" ref={scopeRef} className="relative bg-[#faf9ff] py-28">
      <FloatingBg />
      {/* Faint top glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(124,58,237,0.06), transparent 55%)' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl" data-reveal>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">Platform</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.025em] text-[#0a0714] sm:text-4xl">
            Everything in one workspace
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-base">
            Lead capture to quotation, invoice, and team HR — all modules fully integrated.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item) => (
            <FeatureCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </Section>
  )
}
