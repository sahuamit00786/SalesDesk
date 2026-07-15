import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowUp, Check, PenLine, Sparkles } from 'lucide-react'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

const CHIPS = ['Draft follow-up', 'Score my pipeline', 'Find stalled deals']
const SUMMARY = [
  'Demo completed on May 12 — strong interest in automations',
  'Quotation #218 sent; awaiting sign-off from finance',
  'Next step: follow up before Friday to close this quarter',
]
const SPARK = [34, 58, 42, 70, 52, 84, 66]

function Reveal({ children, delay, animate }) {
  if (!animate) return children
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

/** Coded LeadNest AI panel — no screenshot exists for this yet. */
export function AiAssistantMockup() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduced = usePrefersReducedMotion()
  const animate = inView && !reduced

  return (
    <div ref={ref} className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-card border border-ln-line bg-white shadow-soft">
        <div className="flex items-center gap-2.5 border-b border-ln-line px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ln-accent/10">
            <Sparkles size={16} strokeWidth={1.75} className="text-ln-accent" />
          </span>
          <p className="text-[15px] font-semibold text-ln-ink">LeadNest AI</p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Reveal delay={0.1} animate={animate}>
            <div className="rounded-field border border-ln-line bg-ln-bg2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-ln-ink">Summarize this lead's activity</p>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ln-btn text-white">
                  <ArrowUp size={13} strokeWidth={1.75} />
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.25} animate={animate}>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-ln-line bg-white px-3 py-1.5 text-xs font-medium text-ln-mut"
                >
                  {chip}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.45} animate={animate}>
            <div className="rounded-field border border-ln-line bg-white p-4 shadow-soft">
              <p className="text-[13px] leading-relaxed text-ln-ink">
                Priya has had <span className="font-semibold">9 touchpoints</span> in 3 weeks and
                is trending toward close:
              </p>
              <ul className="mt-3 space-y-2">
                {SUMMARY.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[13px] leading-snug text-ln-mut">
                    <Check size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald-600" />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-end justify-between gap-4 border-t border-ln-line pt-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ln-mut">
                    Engagement trend
                  </p>
                  <div className="mt-2 flex h-10 items-end gap-1" aria-hidden>
                    {SPARK.map((h, i) => (
                      <span
                        key={i}
                        className="w-2 rounded-sm bg-ln-accent/50"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-btn border border-ln-line bg-white px-3.5 py-2 text-xs font-semibold text-ln-ink">
                  <PenLine size={13} strokeWidth={1.75} />
                  Draft email
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
