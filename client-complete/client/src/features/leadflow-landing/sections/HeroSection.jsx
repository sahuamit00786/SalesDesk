import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, CheckCircle2, Star, TrendingUp } from 'lucide-react'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { HERO } from '@/features/leadflow-landing/landingContent'
import { HERO_SCREENSHOT } from '@/features/leadflow-landing/landingScreenshots'
import { CtaButton } from '@/features/leadflow-landing/components/primitives/CtaButton'
import { ScreenshotFrame } from '@/features/leadflow-landing/components/primitives/ScreenshotFrame'

const EASE = [0.21, 0.47, 0.32, 0.98]

function Reveal({ children, delay = 0, blur = true, className }) {
  const reduced = usePrefersReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, ...(blur ? { filter: 'blur(6px)' } : {}) }}
      animate={{ opacity: 1, y: 0, ...(blur ? { filter: 'blur(0px)' } : {}) }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Coded floating chips that overlap the hero screenshot edges. */
function FloatingChips() {
  return (
    <>
      <div
        className="absolute -left-3 top-10 hidden animate-ln-float rounded-2xl border border-ln-line bg-white px-4 py-3 shadow-soft md:block lg:-left-10"
        aria-hidden
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={16} strokeWidth={1.75} className="text-emerald-600" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ln-ink">Deal won — ₹4.2L</p>
            <p className="text-xs text-ln-mut">Enterprise plan · just now</p>
          </div>
        </div>
      </div>
      <div
        className="absolute -right-3 bottom-14 hidden animate-ln-float rounded-2xl border border-ln-line bg-white px-4 py-3 shadow-soft [animation-delay:1.6s] md:block lg:-right-10"
        aria-hidden
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ln-accent/10">
            <TrendingUp size={16} strokeWidth={1.75} className="text-ln-accent" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ln-ink">Pipeline up 32%</p>
            <p className="text-xs text-ln-mut">vs. last quarter</p>
          </div>
        </div>
      </div>
    </>
  )
}

export function HeroSection() {
  const reduced = usePrefersReducedMotion()
  const frameRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start end', 'start center'],
  })
  const rotateX = useTransform(scrollYProgress, [0, 1], [4, 0])

  return (
    <section className="relative overflow-hidden pb-20 pt-36 md:pb-28 md:pt-44">
      {/* Very subtle warm radial backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(124,58,237,0.06),transparent_60%),radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(250,250,251,1),transparent_70%)]"
      />

      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center text-center">
          <Reveal>
            <a
              href="#ai"
              onClick={(e) => {
                const t = document.getElementById('ai')
                if (t) {
                  e.preventDefault()
                  t.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-ln-line bg-white px-4 py-1.5 text-[13px] font-medium text-ln-mut transition-colors hover:text-ln-ink"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ln-accent" />
              {HERO.eyebrow}
              <ArrowRight size={13} strokeWidth={1.75} />
            </a>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-ln-ink md:text-5xl lg:text-[72px]">
              {HERO.titleLine1}
              <br />
              {HERO.titleLine2}
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-ln-mut md:text-xl">
              {HERO.sub}
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <CtaButton to="/register" variant="primary" size="lg">
                Start Free
                <ArrowRight size={17} strokeWidth={1.75} />
              </CtaButton>
              <CtaButton href="#cta" variant="ghost" size="lg">
                Book Demo
              </CtaButton>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-ln-mut">
              {HERO.trust.map((item, i) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  {i === 0 ? (
                    <Star size={13} strokeWidth={1.75} className="fill-amber-400 text-amber-400" />
                  ) : (
                    <CheckCircle2 size={13} strokeWidth={1.75} className="text-ln-mut" />
                  )}
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.5} blur={false} className="relative mt-16 md:mt-20">
          <div ref={frameRef} className="relative mx-auto max-w-5xl [perspective:1200px]">
            <motion.div style={reduced ? undefined : { rotateX }}>
              <ScreenshotFrame
                src={HERO_SCREENSHOT}
                alt="LeadNest dashboard — pipeline health, tasks due, and key metrics"
                eager
                chrome
                glow
                float={!reduced}
              />
            </motion.div>
            <FloatingChips />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
