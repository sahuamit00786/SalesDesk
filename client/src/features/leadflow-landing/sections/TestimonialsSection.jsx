import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Quote } from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { GlassPanel } from '@/features/leadflow-landing/components/GlassPanel'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

const ITEMS = [
  {
    quote: 'LeadFlow AI cut our response time in half — and finally gave execs a forecast we trust.',
    name: 'Sarah Chen',
    role: 'VP Revenue, Vertex Labs',
    rating: 5,
  },
  {
    quote: 'The omnichannel inbox alone paid for the pilot. Everything else feels like bonus.',
    name: 'Marcus Reid',
    role: 'Head of Growth, Northwind',
    rating: 5,
  },
  {
    quote: 'Enterprise-ready without enterprise drag — rare combo.',
    name: 'Elena Kostova',
    role: 'COO, Blue Ocean Group',
    rating: 5,
  },
]

export function TestimonialsSection() {
  const [i, setI] = useState(0)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return undefined
    const id = window.setInterval(() => setI((v) => (v + 1) % ITEMS.length), 5200)
    return () => window.clearInterval(id)
  }, [reduced])

  return (
    <Section className="relative overflow-hidden bg-gradient-to-br from-violet-100/40 via-white to-cyan-100/35">
      <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[min(100%,480px)] -translate-x-1/2 rounded-full bg-fuchsia-300/25 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-600">Proof</p>
          <h2 className="mt-2 bg-gradient-to-r from-violet-800 via-fuchsia-700 to-cyan-800 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Teams ship faster on LeadFlow AI.
          </h2>
        </div>
        <div className="relative mt-12">
          <div className="grid gap-4 md:grid-cols-3">
            {ITEMS.map((t, idx) => (
              <motion.div
                key={t.name}
                animate={{ scale: idx === i ? 1.02 : 0.98, opacity: idx === i ? 1 : 0.72 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className="h-full"
              >
                <GlassPanel className="relative h-full p-5">
                  <Quote className="absolute right-4 top-4 h-8 w-8 text-fuchsia-300" aria-hidden />
                  <p className="text-sm leading-relaxed text-lf-ink">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lf-purple-100 text-xs font-bold text-lf-purple-800">
                      {t.name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-lf-ink">{t.name}</p>
                      <p className="text-xs text-lf-muted">{t.role}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-amber-500 drop-shadow-sm">{'★'.repeat(t.rating)}</p>
                </GlassPanel>
              </motion.div>
            ))}
          </div>
          <AnimatePresence>
            <motion.div
              key={ITEMS[i].name}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-tr from-lf-purple-400/10 to-sky-400/10 blur-3xl"
            />
          </AnimatePresence>
        </div>
      </div>
    </Section>
  )
}
