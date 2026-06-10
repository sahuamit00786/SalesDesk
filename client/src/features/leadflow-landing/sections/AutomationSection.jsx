import { useEffect, useRef } from 'react'
import { Zap, GitBranch, Clock, Bell } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Section } from '@/features/leadflow-landing/components/Section'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const AUTOMATION_IMAGE = '/landing/workflow-editor.png'

const features = [
  { icon: Zap, text: 'Triggers: lead created, updated, and custom conditions' },
  { icon: GitBranch, text: 'Actions: assign owner, create follow-up task, round-robin rotation' },
  { icon: Clock, text: 'Delays, time-based nudges, and SLA guardrails' },
  { icon: Bell, text: 'Audit trail for every workflow run with step-level history' },
]

export function AutomationSection() {
  const reduced = usePrefersReducedMotion()
  const rootRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    if (reduced || !rootRef.current || !imageRef.current) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo(
        imageRef.current,
        { opacity: 0, y: 40, scale: 0.97 },
        {
          opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 70%', once: true },
        },
      )
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <Section ref={rootRef} id="automation" className="relative bg-[#050510] py-24">
      {/* BG atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 55% 60% at 80% 50%, rgba(139,92,246,0.07), transparent 65%)' }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Text side */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">Automation</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
            Visual workflows that run on lead events
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/45 sm:text-base">
            No-code workflow rules — trigger actions automatically when conditions are met. Build flows
            with lead created, assign owner, create task, delays, and branches in the visual editor.
          </p>

          <ul className="mt-7 space-y-3.5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                  <Icon className="h-3.5 w-3.5 text-violet-400" aria-hidden />
                </span>
                <span className="text-sm text-white/55">{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/75 backdrop-blur-sm transition hover:border-violet-500/40 hover:bg-white/[0.07] hover:text-white"
            >
              See the workflow editor
            </a>
          </div>
        </div>

        {/* Image side */}
        <div ref={imageRef} className="relative" style={reduced ? undefined : { opacity: 0 }}>
          {/* Glow */}
          <div
            className="pointer-events-none absolute -inset-4 rounded-[2rem] opacity-40"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.25), transparent 70%)' }}
            aria-hidden
          />
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0820] shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.05] bg-[#07071a] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
              <span className="ml-3 text-[10px] text-white/20">Workflow editor</span>
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
