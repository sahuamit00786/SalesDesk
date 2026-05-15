import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { GlassPanel } from '@/features/leadflow-landing/components/GlassPanel'

export function TourSection() {
  return (
    <Section id="tour" className="bg-gradient-to-b from-white via-violet-50/40 to-white pb-4 pt-2">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <GlassPanel className="flex flex-col items-start justify-between gap-6 border-violet-200/60 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-600">Product tour</p>
            <h2 className="mt-1 bg-gradient-to-r from-violet-900 via-fuchsia-800 to-cyan-800 bg-clip-text text-xl font-semibold text-transparent sm:text-2xl">
              See LeadFlow AI in under three minutes.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-lf-muted">
              A guided walkthrough of pipeline, inbox, automation, and analytics — no signup required for the preview
              cut.
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30"
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Play className="h-4 w-4 fill-current" aria-hidden />
            </span>
            Play overview
          </motion.button>
        </GlassPanel>
      </div>
    </Section>
  )
}
