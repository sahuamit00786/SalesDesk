import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const STATS = [
  { label: 'Leads tracked', value: 515, suffix: '' },
  { label: 'Lead distribution', value: 132, suffix: '' },
  { label: 'Opportunities', value: 41, suffix: '' },
  { label: 'Email threads', value: 100, suffix: '+' },
]

export function StatsStripSection() {
  const reduced = usePrefersReducedMotion()
  const rootRef = useRef(null)

  useLayoutEffect(() => {
    if (reduced || !rootRef.current) return undefined
    const ctx = gsap.context(() => {
      rootRef.current.querySelectorAll('[data-stat-value]').forEach((el) => {
        const target = Number(el.dataset.statValue)
        const suffix = el.dataset.statSuffix ?? ''
        const obj = { val: 0 }
        gsap.to(obj, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 85%', once: true },
          onUpdate: () => { el.textContent = `${Math.round(obj.val)}${suffix}` },
        })
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={rootRef} className="relative border-y border-white/[0.05] bg-[#080820] py-16">
      {/* Subtle center glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(139,92,246,0.05), transparent 70%)' }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4 px-4 sm:px-6 lg:px-8">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-col items-center px-6 py-8"
            style={i > 0 ? { borderLeft: '1px solid rgba(255,255,255,0.04)' } : undefined}
          >
            <p
              data-stat-value={stat.value}
              data-stat-suffix={stat.suffix}
              className="font-display text-4xl font-bold tabular-nums text-violet-300 sm:text-5xl"
              style={{ textShadow: '0 0 40px rgba(139,92,246,0.45)' }}
            >
              {reduced ? `${stat.value}${stat.suffix}` : `0${stat.suffix}`}
            </p>
            <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
