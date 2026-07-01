import { useEffect, useRef } from 'react'
import { Zap, Network, Clock, Bell } from 'lucide-react'
import { animate } from 'animejs'
import { Section } from '@/features/leadflow-landing/components/Section'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

const AUTOMATION_IMAGE = '/landing/workflow-editor.png'

const features = [
  { icon: Zap, text: 'Triggers: lead created, updated, and custom conditions', color: 'text-violet-600', bg: 'bg-violet-100' },
  { icon: Network, text: 'Actions: assign owner, create follow-up task, round-robin rotation', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { icon: Clock, text: 'Delays, time-based nudges, and SLA guardrails', color: 'text-amber-600', bg: 'bg-amber-100' },
  { icon: Bell, text: 'Audit trail for every workflow run with step-level history', color: 'text-sky-600', bg: 'bg-sky-100' },
]

export function AutomationSection() {
  const reduced = usePrefersReducedMotion()
  const rootRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    if (reduced || !rootRef.current || !imageRef.current) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        animate(imageRef.current, {
          opacity: [0, 1],
          translateY: [40, 0],
          scale: [0.97, 1],
          duration: 900,
          ease: 'outExpo',
        })
      },
      { threshold: 0.2 },
    )
    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [reduced])

  return (
    <Section ref={rootRef} id="automation" className="relative bg-white py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Text side */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">Automation</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.025em] text-[#0a0714] sm:text-4xl">
            Visual workflows that run on lead events
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-500 sm:text-base">
            No-code workflow rules — trigger actions automatically when conditions are met. Build flows
            with lead created, assign owner, create task, delays, and branches in the visual editor.
          </p>

          <ul className="mt-7 space-y-3.5">
            {features.map(({ icon: Icon, text, color, bg }) => (
              <li key={text} className="flex items-start gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                  <Icon size={16} className={color} aria-hidden />
                </span>
                <span className="pt-1 text-sm text-zinc-600">{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              See the workflow editor
            </a>
          </div>
        </div>

        {/* Image side */}
        <div ref={imageRef} className="relative" style={reduced ? undefined : { opacity: 0 }}>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-[10px] text-zinc-400">Workflow editor</span>
            </div>
            <img
              src={AUTOMATION_IMAGE}
              alt="LeadFlow visual workflow editor"
              className="w-full"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </Section>
  )
}
