import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Section } from '@/features/leadflow-landing/components/Section'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import {
  LANDING_SCREENSHOTS,
  SCREENSHOT_CATEGORIES,
} from '@/features/leadflow-landing/landingScreenshots'
import { cn } from '@/utils/cn'

export function ScreenshotShowcaseSection() {
  const reduced = usePrefersReducedMotion()
  const [category, setCategory] = useState('sales')
  const [activeIdx, setActiveIdx] = useState(0)
  const mainImageRef = useRef(null)
  const captionRef = useRef(null)

  const filtered = useMemo(
    () => LANDING_SCREENSHOTS.filter((s) => s.category === category),
    [category],
  )

  const active = filtered[activeIdx] ?? filtered[0]

  useEffect(() => { setActiveIdx(0) }, [category])

  useEffect(() => {
    if (reduced || !mainImageRef.current) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo(
        mainImageRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out' },
      )
      if (captionRef.current) {
        gsap.fromTo(
          captionRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.35, delay: 0.1, ease: 'power2.out' },
        )
      }
    })
    return () => ctx.revert()
  }, [active?.id, reduced])

  return (
    <Section id="showcase" className="relative bg-[#080820] py-24">
      {/* BG atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(139,92,246,0.07), transparent 60%)' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">Product tour</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
            See Connexify CRM in action
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/45 sm:text-base">
            Real screens from the app — sales pipeline, email inbox, workflows, documents, and team
            settings.
          </p>
        </div>

        {/* Category tabs */}
        {SCREENSHOT_CATEGORIES?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {SCREENSHOT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition',
                  category === cat.id
                    ? 'bg-violet-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.45)]'
                    : 'border border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/[0.14] hover:text-white/70',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Main screenshot */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0820] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
          {/* Browser bar */}
          <div className="flex items-center gap-2 border-b border-white/[0.05] bg-[#07071a] px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
          </div>
          <img
            ref={mainImageRef}
            src={active?.src}
            alt={active?.caption ?? 'LeadFlow CRM screen'}
            className="w-full"
            loading="lazy"
          />
        </div>

        {active?.caption && (
          <p ref={captionRef} className="mt-3 text-center text-sm text-white/35">
            {active.caption}
          </p>
        )}

        {/* Thumbnail strip */}
        {filtered.length > 1 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filtered.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  'shrink-0 overflow-hidden rounded-lg border transition',
                  i === activeIdx
                    ? 'border-violet-500/60 ring-1 ring-violet-500/30'
                    : 'border-white/[0.06] opacity-50 hover:opacity-80',
                )}
              >
                <img src={s.src} alt={s.caption} className="h-14 w-24 object-cover object-top" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Section>
  )
}
