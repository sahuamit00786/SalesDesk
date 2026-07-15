import { ArrowRight } from 'lucide-react'
import { FINAL_CTA } from '@/features/leadflow-landing/landingContent'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'
import { CtaButton } from '@/features/leadflow-landing/components/primitives/CtaButton'

/** The single dark moment on the page — full-bleed ink card. */
export function FinalCtaSection() {
  return (
    <section id="cta" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <FadeUp blur={false}>
          <div className="relative overflow-hidden rounded-frame bg-ln-btn px-6 py-16 text-center md:px-12 md:py-24">
            {/* faint violet glow in the dark card */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,58,237,0.25),transparent_65%)]"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-white md:text-5xl md:leading-[1.1]">
                {FINAL_CTA.title}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                {FINAL_CTA.sub}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <CtaButton to="/register" variant="inverted" size="lg">
                  Start Free
                  <ArrowRight size={17} strokeWidth={1.75} />
                </CtaButton>
                <CtaButton href={FINAL_CTA.demoHref} variant="ghost-dark" size="lg">
                  Book a demo
                </CtaButton>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}
