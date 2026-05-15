import { Fragment, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ChevronDown,
  ChevronRight,
  Filter,
  GitBranch,
  ListChecks,
  Mail,
  MessageCircle,
  Zap,
} from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { GlassPanel } from '@/features/leadflow-landing/components/GlassPanel'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  {
    label: 'Lead',
    sub: 'Inbound capture & intent',
    icon: Zap,
    shell: 'from-amber-400 to-orange-500 shadow-amber-500/25',
  },
  {
    label: 'Filter',
    sub: 'Score, segment, enrich',
    icon: Filter,
    shell: 'from-violet-400 to-fuchsia-500 shadow-fuchsia-500/25',
  },
  {
    label: 'Branch',
    sub: 'Route by rules & SLA',
    icon: GitBranch,
    shell: 'from-cyan-400 to-sky-500 shadow-cyan-500/25',
  },
  {
    label: 'Email',
    sub: 'Sequences & templates',
    icon: Mail,
    shell: 'from-indigo-400 to-violet-600 shadow-violet-500/25',
  },
  {
    label: 'WA',
    sub: 'WhatsApp follow-ups',
    icon: MessageCircle,
    shell: 'from-emerald-400 to-teal-500 shadow-emerald-500/25',
  },
  {
    label: 'Task',
    sub: 'Owner + due reminders',
    icon: ListChecks,
    shell: 'from-rose-400 to-pink-600 shadow-rose-500/25',
  },
]

export function AutomationSection() {
  const reduced = usePrefersReducedMotion()
  const rootRef = useRef(null)
  const pathRef = useRef(null)

  useLayoutEffect(() => {
    if (reduced || !pathRef.current) return undefined
    const path = pathRef.current
    const len = path.getTotalLength()
    path.style.strokeDasharray = `${len}`
    path.style.strokeDashoffset = `${len}`
    const ctx = gsap.context(() => {
      gsap.to(path, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top 75%',
          end: 'bottom 35%',
          scrub: true,
        },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <Section ref={rootRef} className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0 bg-lf-cta-mesh opacity-90" />
      <div className="pointer-events-none absolute -left-20 top-1/2 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">Automation</p>
          <h2 className="mt-2 bg-gradient-to-r from-white via-fuchsia-200 to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Visual workflows that feel alive.
          </h2>
          <p className="mt-3 text-sm text-white/70 sm:text-base">
            Triggers, branches, and channel actions — drawn as a living system, not a diagram buried in a deck.
          </p>
        </div>

        <GlassPanel className="relative mt-12 overflow-hidden border-white/20 bg-gradient-to-br from-white/10 via-violet-500/10 to-cyan-500/5 p-6 shadow-2xl shadow-fuchsia-900/20 sm:p-8">
          {/* Decorative flow line (scroll-scrubbed) — sits behind content */}
          <svg
            viewBox="0 0 800 100"
            className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-24 w-[min(100%,56rem)] -translate-x-1/2 opacity-[0.35] sm:h-28"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="lf-auto-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="45%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
            <path
              ref={pathRef}
              d="M 24 72 C 140 20 260 96 400 52 S 620 88 776 36"
              fill="none"
              stroke="url(#lf-auto-flow)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(168,85,247,0.22),transparent_55%)]" />

          <div className="relative z-10">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">Live canvas</p>
                <p className="mt-1 text-base font-semibold text-white sm:text-lg">Multi-channel nurture path</p>
                <p className="mt-1 max-w-md text-xs text-white/55 sm:text-sm">
                  One published flow: qualify inbound leads, branch by fit, then fan out to email, WhatsApp, and rep tasks
                  without losing context.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/35">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                  Published
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/70 ring-1 ring-white/15">
                  v3.2 · prod
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-stretch lg:justify-between lg:gap-1">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <Fragment key={step.label}>
                    <div
                      className={cn(
                        'group relative flex min-h-[112px] min-w-0 flex-1 flex-col gap-2.5 rounded-2xl border border-white/18 bg-gradient-to-b from-white/[0.12] to-white/[0.03] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-white/28 hover:from-white/[0.16]',
                      )}
                    >
                      <div
                        className={cn(
                          'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ring-1 ring-white/20',
                          step.shell,
                        )}
                      >
                        <Icon className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-white">{step.label}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-white/55">{step.sub}</p>
                      </div>
                      <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/40">
                        step {i + 1}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <>
                        <div className="flex justify-center py-0.5 lg:hidden" aria-hidden>
                          <ChevronDown className="size-5 text-cyan-400/45" strokeWidth={2} />
                        </div>
                        <div className="hidden items-center self-center px-0.5 lg:flex" aria-hidden>
                          <ChevronRight className="size-5 shrink-0 text-fuchsia-400/40" strokeWidth={2} />
                        </div>
                      </>
                    )}
                  </Fragment>
                )
              })}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 text-[11px] text-white/50 sm:flex-row sm:text-xs">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-start">
                <span>
                  <span className="text-white/35">Last run</span>{' '}
                  <span className="font-medium text-white/75">2m ago</span>
                </span>
                <span className="hidden text-white/25 sm:inline">·</span>
                <span>
                  <span className="text-white/35">Branches</span>{' '}
                  <span className="font-medium text-cyan-200/90">12 active</span>
                </span>
                <span className="hidden text-white/25 sm:inline">·</span>
                <span>
                  <span className="text-white/35">Errors (24h)</span>{' '}
                  <span className="font-medium text-emerald-300/90">0</span>
                </span>
              </div>
              <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-violet-200/80 ring-1 ring-white/10">
                id_flow_nurture_prod
              </span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </Section>
  )
}
