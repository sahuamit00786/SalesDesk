import { useLayoutEffect, useRef } from 'react'
import { animate } from 'animejs'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        rootRef.current.querySelectorAll('[data-stat-value]').forEach((el) => {
          const target = Number(el.dataset.statValue)
          const suffix = el.dataset.statSuffix ?? ''
          const obj = { val: 0 }
          animate(obj, {
            val: target,
            duration: 1800,
            ease: 'outQuart',
            onUpdate: () => { el.textContent = `${Math.round(obj.val)}${suffix}` },
          })
        })
      },
      { threshold: 0.4 },
    )
    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [reduced])

  return (
    <section ref={rootRef} className="relative border-y border-violet-100 bg-[#f5f3ff] py-16">
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4 px-4 sm:px-6 lg:px-8">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-col items-center px-6 py-8"
            style={i > 0 ? { borderLeft: '1px solid rgba(124,58,237,0.1)' } : undefined}
          >
            <p
              data-stat-value={stat.value}
              data-stat-suffix={stat.suffix}
              className="font-display text-4xl font-bold tabular-nums text-violet-700 sm:text-5xl"
            >
              {reduced ? `${stat.value}${stat.suffix}` : `0${stat.suffix}`}
            </p>
            <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
