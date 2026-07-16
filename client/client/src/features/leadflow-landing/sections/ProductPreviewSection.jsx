import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { PRODUCT_TABS } from '@/features/leadflow-landing/landingContent'
import { SectionHeading } from '@/features/leadflow-landing/components/primitives/SectionHeading'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'
import { ScreenshotFrame } from '@/features/leadflow-landing/components/primitives/ScreenshotFrame'

/** Tabbed tour of the real product — one screenshot per core surface. */
export function ProductPreviewSection() {
  const [active, setActive] = useState(PRODUCT_TABS[0].id)
  const reduced = usePrefersReducedMotion()
  const current = PRODUCT_TABS.find((t) => t.id === active) ?? PRODUCT_TABS[0]

  return (
    <section id="product" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Product"
          title="One workspace for your entire sales motion."
          sub="Real screens from LeadNest — not illustrations. This is exactly what your team gets on day one."
        />

        <FadeUp delay={0.1} className="mt-12">
          <div
            className="flex justify-start gap-2 overflow-x-auto pb-2 scrollbar-none sm:justify-center"
            role="tablist"
            aria-label="Product areas"
          >
            {PRODUCT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active === tab.id}
                onClick={() => setActive(tab.id)}
                className={cn(
                  'shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
                  active === tab.id
                    ? 'bg-ln-btn text-white'
                    : 'border border-ln-line bg-white text-ln-mut hover:text-ln-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.15} blur={false} className="mt-8">
          <div className="relative mx-auto max-w-5xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <ScreenshotFrame src={current.src} alt={`LeadNest ${current.label}`} chrome />
                <p className="mx-auto mt-5 max-w-xl text-center text-[15px] leading-relaxed text-ln-mut">
                  {current.caption}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}
