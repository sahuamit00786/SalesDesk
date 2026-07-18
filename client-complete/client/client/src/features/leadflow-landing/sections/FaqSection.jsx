import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { FAQ_ITEMS } from '@/features/leadflow-landing/landingContent'
import { SectionHeading } from '@/features/leadflow-landing/components/primitives/SectionHeading'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'

function FaqRow({ item, open, onToggle, reduced }) {
  return (
    <div className="border-b border-ln-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-semibold text-ln-ink md:text-base">{item.q}</span>
        <Plus
          size={18}
          strokeWidth={1.75}
          className={cn(
            'shrink-0 text-ln-mut transition-transform duration-300',
            open && 'rotate-45',
          )}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden"
          >
            <p className="pb-6 pr-8 text-[15px] leading-relaxed text-ln-mut">{item.a}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0)
  const reduced = usePrefersReducedMotion()

  return (
    <section id="faq" className="bg-ln-bg2 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered."
          sub="Everything you need to know before getting started."
        />
        <FadeUp delay={0.1} className="mt-12 border-t border-ln-line">
          {FAQ_ITEMS.map((item, i) => (
            <FaqRow
              key={item.q}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              reduced={reduced}
            />
          ))}
        </FadeUp>
      </div>
    </section>
  )
}
