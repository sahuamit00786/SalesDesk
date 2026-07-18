import { motion } from 'framer-motion'
import { Quote, Star } from 'lucide-react'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { TESTIMONIALS } from '@/features/leadflow-landing/landingContent'
import { SectionHeading } from '@/features/leadflow-landing/components/primitives/SectionHeading'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}

function Stars() {
  return (
    <div className="flex items-center gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} strokeWidth={1.75} className="fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

function TestimonialCard({ item, hoverLift }) {
  const card = (
    <div className="flex h-full flex-col rounded-card border border-ln-line bg-white p-6 shadow-soft transition-shadow hover:shadow-lift">
      <Stars />
      <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ln-ink">“{item.quote}”</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ln-bg2 text-[13px] font-semibold text-ln-ink">
          {initials(item.name)}
        </span>
        <div>
          <p className="text-[13px] font-semibold text-ln-ink">{item.name}</p>
          <p className="text-xs text-ln-mut">{item.role}</p>
        </div>
      </div>
    </div>
  )
  if (!hoverLift) return card
  return (
    <motion.div whileHover={{ y: -8 }} transition={{ duration: 0.25 }} className="h-full">
      {card}
    </motion.div>
  )
}

export function TestimonialsSection() {
  const reduced = usePrefersReducedMotion()
  const { featured, items } = TESTIMONIALS

  return (
    <section id="customers" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Customers"
          title="Teams close faster with LeadNest."
          sub="From five-person agencies to hundred-rep sales floors."
        />

        <FadeUp className="mx-auto mt-14 max-w-3xl">
          <div className="rounded-card border border-ln-line bg-ln-bg2 p-8 md:p-10">
            <Quote size={28} strokeWidth={1.75} className="text-ln-accent/40" aria-hidden />
            <p className="mt-4 text-xl leading-relaxed text-ln-ink md:text-2xl md:leading-relaxed">
              “{featured.quote}”
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-ln-ink shadow-soft">
                {initials(featured.name)}
              </span>
              <div>
                <p className="text-sm font-semibold text-ln-ink">{featured.name}</p>
                <p className="text-[13px] text-ln-mut">{featured.role}</p>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <FadeUp key={item.name} delay={(i % 3) * 0.08} className="h-full">
              <TestimonialCard item={item} hoverLift={!reduced} />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}
