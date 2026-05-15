import { useLayoutEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'
import { Section } from '@/features/leadflow-landing/components/Section'
import { GlassPanel } from '@/features/leadflow-landing/components/GlassPanel'
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
  'WhatsApp · Instagram · Facebook · Email',
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
    <Section ref={rootRef} className="relative overflow-hidden bg-gradient-to-br from-rose-50/90 via-violet-50/50 to-cyan-50/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(244,114,182,0.15),transparent_50%)]" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-600">Story</p>
            <h2 className="mt-2 bg-gradient-to-r from-violet-900 via-fuchsia-800 to-indigo-900 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
              From chaos to clarity — on one canvas.
            </h2>
            <ul className="mt-8 space-y-3" style={{ opacity: pOpacity }}>
              {problems.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50/80 px-4 py-3 text-sm font-medium text-rose-950 shadow-sm"
                >
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 shadow-sm shadow-rose-400/50" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-[320px] lg:min-h-[420px]">
            <GlassPanel
              className="absolute inset-0 flex flex-col justify-center p-6 sm:p-8"
              style={{ opacity: sOpacity }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">LeadFlow AI</p>
              <h3 className="mt-2 bg-gradient-to-r from-emerald-800 to-teal-800 bg-clip-text text-2xl font-semibold text-transparent">
                What changes when you switch
              </h3>
              <ul className="mt-6 space-y-3">
                {solutions.map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-4 py-3 text-sm font-medium text-emerald-950 shadow-sm"
                  >
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-sm shadow-emerald-400/50" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="pointer-events-none absolute inset-x-8 bottom-6 h-px bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent opacity-80" />
            </GlassPanel>
          </div>
        </div>
      </div>
    </Section>
  )
}
