import { useLayoutEffect, useRef, useState } from 'react'
import { X, Check } from 'lucide-react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'
import { Section } from '@/features/leadflow-landing/components/Section'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const problems = [
  'Leads slip through the cracks',
  'Follow-ups live in spreadsheets',
  'Channels scattered across tabs',
  'Meetings never tie back to revenue',
  'Reporting takes days, not seconds',
  'Manual busywork burns quota',
  'Automation is brittle or missing',
]

const solutions = [
  'Unified timeline & ownership',
  'Cadences & SLA-aware nudges',
  'Gmail sync · Templates · Lead threads',
  'Calendar sync + AI summaries',
  'Live dashboards & forecasting',
  'Workflow builder with guardrails',
  'Triggers, branches, and audit trails',
]

export function ProblemSolutionSection() {
  const reduced = usePrefersReducedMotion()
  const rootRef = useRef(null)
  const [progress, setProgress] = useState(0)

  useLayoutEffect(() => {
    if (reduced || !rootRef.current) return undefined
    const el = rootRef.current
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: '+=130%',
      pin: true,
      scrub: 0.45,
      onUpdate: (self) => setProgress(self.progress),
    })
    return () => st.kill()
  }, [reduced])

  const pOpacity = reduced ? 1 : 1 - Math.min(1, progress * 1.35)
  const sOpacity = reduced ? 1 : Math.min(1, Math.max(0, (progress - 0.15) * 1.4))

  return (
    <Section ref={rootRef} className="relative overflow-hidden bg-[#080820]">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-rose-900/[0.1] blur-[120px]" />
        <div className="absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-emerald-900/[0.08] blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">The shift</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
            From chaos to clarity — on one canvas.
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Problems */}
          <div style={{ opacity: pOpacity }}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-500/25">
                <X className="h-3.5 w-3.5 text-rose-400" />
              </span>
              <p className="text-sm font-semibold text-rose-300/80">Before LeadFlow</p>
            </div>
            <ul className="space-y-2.5">
              {problems.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-3 rounded-xl border border-rose-500/[0.12] bg-rose-500/[0.06] px-4 py-3 text-sm font-medium text-rose-200/70"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/70" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 backdrop-blur-sm sm:p-8"
            style={{ opacity: sOpacity }}
          >
            {/* Top highlight line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              </span>
              <p className="text-sm font-semibold text-emerald-300/80">After LeadFlow</p>
            </div>

            <ul className="space-y-2.5">
              {solutions.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-3 rounded-xl border border-emerald-500/[0.12] bg-emerald-500/[0.06] px-4 py-3 text-sm font-medium text-emerald-200/70"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" />
                  {t}
                </li>
              ))}
            </ul>

            {/* Bottom glow line */}
            <div className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          </div>
        </div>
      </div>
    </Section>
  )
}
