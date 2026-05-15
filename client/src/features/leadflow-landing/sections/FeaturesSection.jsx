import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Bot,
  CalendarClock,
  GitBranch,
  Inbox,
  Kanban,
  Megaphone,
  MessagesSquare,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'

const ACCENT_SHELL = [
  'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 ring-2 ring-white/30',
  'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 ring-2 ring-white/30',
  'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 ring-2 ring-white/30',
  'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-white/30',
  'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/30 ring-2 ring-white/30',
  'bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/30',
  'bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/30 ring-2 ring-white/30',
  'bg-gradient-to-br from-fuchsia-600 to-purple-800 text-white shadow-lg shadow-fuchsia-500/35 ring-2 ring-white/30',
  'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 ring-2 ring-white/30',
  'bg-gradient-to-br from-violet-700 to-cyan-600 text-white shadow-lg shadow-violet-500/30 ring-2 ring-white/30',
]

const ACCENT_GLOW = [
  'bg-gradient-to-br from-violet-400/35 to-fuchsia-400/25',
  'bg-gradient-to-br from-sky-400/35 to-blue-500/20',
  'bg-gradient-to-br from-amber-400/30 to-orange-400/20',
  'bg-gradient-to-br from-emerald-400/30 to-teal-400/20',
  'bg-gradient-to-br from-pink-400/30 to-rose-400/20',
  'bg-gradient-to-br from-indigo-400/30 to-violet-500/20',
  'bg-gradient-to-br from-cyan-400/30 to-indigo-500/20',
  'bg-gradient-to-br from-fuchsia-400/35 to-purple-600/22',
  'bg-gradient-to-br from-orange-400/30 to-red-400/20',
  'bg-gradient-to-br from-violet-500/30 to-cyan-400/22',
]

const FEATURES = [
  {
    id: '1',
    title: 'Lead management',
    summary: 'Capture, score, assign, and track every touch.',
    icon: Users,
    bullets: ['Smart lead capture', 'Lead assignment', 'Lead scoring', 'Activity tracking'],
    span: 'lg:col-span-2',
  },
  {
    id: '2',
    title: 'Opportunities & deals',
    summary: 'Drag-drop pipelines with forecasting baked in.',
    icon: Kanban,
    bullets: ['Drag-drop pipelines', 'Deal stages', 'Revenue forecasting'],
    span: '',
  },
  {
    id: '3',
    title: 'Workflow automation',
    summary: 'Cron, reminders, and status automation without code.',
    icon: Workflow,
    bullets: ['Automated follow-ups', 'Cron jobs', 'Reminders', 'Status automation', 'Lead nurturing'],
    span: '',
  },
  {
    id: '4',
    title: 'Omnichannel messaging',
    summary: 'One inbox for every channel your buyers use.',
    icon: Inbox,
    bullets: ['WhatsApp', 'Facebook', 'Instagram', 'Unified inbox'],
    span: 'lg:col-span-2',
  },
  {
    id: '5',
    title: 'Bulk communication',
    summary: 'Broadcast with templates and deep analytics.',
    icon: Megaphone,
    bullets: ['Bulk email campaigns', 'Broadcast messaging', 'Templates', 'Analytics'],
    span: '',
  },
  {
    id: '6',
    title: 'Meeting system',
    summary: 'Built-in meetings with calendar sync and AI notes.',
    icon: CalendarClock,
    bullets: ['Built-in meetings', 'Calendar sync', 'Reminders', 'AI meeting summaries'],
    span: '',
  },
  {
    id: '7',
    title: 'Reports & forecasting',
    summary: 'Performance, revenue, and funnel clarity for leaders.',
    icon: BarChart3,
    bullets: ['Sales reports', 'Analytics', 'Team performance', 'Revenue insights'],
    span: 'lg:col-span-2',
  },
  {
    id: '8',
    title: 'AI assistant',
    summary: 'Recommendations that keep reps in flow.',
    icon: Bot,
    bullets: ['Smart recommendations', 'Follow-up suggestions', 'Lead insights', 'Task suggestions'],
    span: '',
  },
  {
    id: '9',
    title: 'Team collaboration',
    summary: 'Notes, mentions, tasks, shared pipelines.',
    icon: MessagesSquare,
    bullets: ['Notes', 'Mentions', 'Tasks', 'Shared pipelines'],
    span: '',
  },
  {
    id: '10',
    title: 'Custom workflows',
    summary: 'Visual builder with conditions, triggers, chains.',
    icon: GitBranch,
    bullets: ['Visual workflow builder', 'Conditions', 'Triggers', 'Automation chains'],
    span: 'lg:col-span-2',
  },
]

function FeatureCard({ item, reduced, accentIndex }) {
  const [open, setOpen] = useState(false)
  const Icon = item.icon
  const shell = ACCENT_SHELL[accentIndex % ACCENT_SHELL.length]
  const glow = ACCENT_GLOW[accentIndex % ACCENT_GLOW.length]

  return (
    <motion.article
      layout
      whileHover={
        reduced
          ? {}
          : {
              y: -4,
              rotateX: 2,
              rotateY: -2,
              boxShadow: '0 24px 60px -20px rgba(91,33,182,0.25)',
            }
      }
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{ transformStyle: 'preserve-3d' }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white/95 via-violet-50/20 to-cyan-50/15 p-5 shadow-md ring-1 ring-transparent transition hover:border-fuchsia-300/60 hover:shadow-xl hover:shadow-violet-500/10 hover:ring-fuchsia-300/40',
        item.span,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl transition group-hover:opacity-100',
          glow,
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', shell)}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold text-lf-ink">{item.title}</h3>
            <p className="mt-0.5 text-sm text-lf-muted">{item.summary}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 underline-offset-2 hover:text-fuchsia-700 hover:underline"
        >
          {open ? 'Less' : 'Details'}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="mt-4 space-y-2 overflow-hidden border-t border-violet-100 pt-4 text-sm text-slate-600"
          >
            {item.bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

export function FeaturesSection() {
  const reduced = usePrefersReducedMotion()
  return (
    <Section id="features" className="relative overflow-hidden bg-gradient-to-b from-white via-violet-50/30 to-cyan-50/25">
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-600">Platform</p>
          <h2 className="mt-2 bg-gradient-to-r from-violet-900 via-fuchsia-800 to-cyan-800 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Everything revenue teams expect — elevated.
          </h2>
          <p className="mt-3 text-sm text-lf-muted sm:text-base">
            Ten capability pillars designed for managers, reps, agencies, and enterprise governance.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item, idx) => (
            <FeatureCard key={item.id} item={item} reduced={reduced} accentIndex={idx} />
          ))}
        </div>
      </div>
    </Section>
  )
}
