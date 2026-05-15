import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Section } from '@/features/leadflow-landing/components/Section'
import { GradientMesh } from '@/features/leadflow-landing/components/GradientMesh'
import { ParticleField } from '@/features/leadflow-landing/components/ParticleField'
import { MagneticWrap } from '@/features/leadflow-landing/components/MagneticWrap'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

export function FinalCtaSection() {
  const reduced = usePrefersReducedMotion()
  return (
    <Section id="demo" className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 py-24 text-white">
      <GradientMesh tone="dark" />
      <ParticleField count={reduced ? 0 : 36} tone="dark" />
      <div className="pointer-events-none absolute inset-0 bg-lf-cta-mesh opacity-80" />
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.h2
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="bg-gradient-to-r from-white via-fuchsia-200 to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl lg:text-5xl"
        >
          Stop losing leads. Start closing faster.
        </motion.h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-violet-100/90 sm:text-base">
          Join teams who replaced duct-taped tools with one premium workspace — from first touch to signed order.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <MagneticWrap>
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-white to-violet-100 px-6 text-sm font-semibold text-violet-950 shadow-xl shadow-fuchsia-500/30 transition hover:brightness-105"
            >
              Start free trial
            </Link>
          </MagneticWrap>
          <MagneticWrap>
            <a
              href="mailto:hello@leadflow.ai?subject=Demo%20request"
              className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-fuchsia-400/50 bg-fuchsia-500/10 px-6 text-sm font-semibold text-fuchsia-100 backdrop-blur transition hover:bg-fuchsia-500/20"
            >
              Schedule demo
            </a>
          </MagneticWrap>
        </div>
      </div>
    </Section>
  )
}
