import { MotionConfig } from 'framer-motion'
import { ArrowRight, Compass, Gauge, Hammer, HeartHandshake } from '@/components/ui/icons'
import { useDocumentMeta } from '@/features/leadflow-landing/hooks/useDocumentMeta'
import { SubPageNav } from '@/features/leadflow-landing/components/SubPageNav'
import { FooterSection } from '@/features/leadflow-landing/sections/FooterSection'
import { SectionHeading } from '@/features/leadflow-landing/components/primitives/SectionHeading'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'
import { CtaButton } from '@/features/leadflow-landing/components/primitives/CtaButton'
import { UPGROW } from '@/features/leadflow-landing/landingContent'

const VALUES = [
  {
    icon: Hammer,
    title: 'Built to be used',
    text: 'Every screen is designed for the person who has to use it forty hours a week — not for a demo.',
  },
  {
    icon: Gauge,
    title: 'Fast, by default',
    text: 'Snappy pages, instant search, no spinners you have to wait out. Speed is a feature.',
  },
  {
    icon: Compass,
    title: 'Opinionated, not bloated',
    text: 'We would rather ship the right ten features well than a hundred nobody asked for.',
  },
  {
    icon: HeartHandshake,
    title: 'Close to our customers',
    text: 'Feedback goes straight to the people building the product — no ticket queue in between.',
  },
]

export function AboutPage() {
  useDocumentMeta(
    'About — LeadNest',
    `LeadNest is built by ${UPGROW.companyName}, a software studio building fast, no-nonsense tools for sales teams.`,
  )

  return (
    <MotionConfig reducedMotion="user">
      <div className="leadflow-landing min-h-screen bg-white">
        <SubPageNav />
        <main>
          <section className="relative overflow-hidden pb-20 pt-40 md:pb-28 md:pt-48">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(124,58,237,0.06),transparent_60%)]"
            />
            <div className="mx-auto max-w-4xl px-6 text-center">
              <FadeUp>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ln-accent">
                  About us
                </p>
                <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-ln-ink md:text-5xl">
                  We build tools we&rsquo;d want to use ourselves.
                </h1>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ln-mut">
                  LeadNest is built by {UPGROW.companyName}, a software studio focused on
                  practical, fast, no-nonsense business tools.
                </p>
              </FadeUp>
            </div>
          </section>

          <section className="border-y border-ln-line bg-ln-bg2 py-20 md:py-28">
            <div className="mx-auto max-w-3xl px-6">
              <FadeUp className="space-y-6 text-[17px] leading-relaxed text-ln-ink">
                <p>
                  We started {UPGROW.companyName} to build software for teams who need it to just
                  work — no bloated setup, no six-week onboarding, no feature you have to hunt for
                  in a settings menu three levels deep.
                </p>
                <p>
                  LeadNest came out of watching sales teams stitch together spreadsheets, a shared
                  inbox, and a notes app to run their pipeline. We thought that deserved one fast,
                  well-designed workspace instead — so we built it, and we use the same product to
                  run our own sales process today.
                </p>
                <p>
                  We&rsquo;re a small, focused team. That means every piece of feedback reaches the
                  people actually building the product, and every release is something we&rsquo;d
                  put our own name on.
                </p>
              </FadeUp>
            </div>
          </section>

          <section className="py-20 md:py-28">
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeading eyebrow="What we believe" title="The principles behind LeadNest." />
              <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {VALUES.map(({ icon: Icon, title, text }, i) => (
                  <FadeUp
                    key={title}
                    delay={i * 0.08}
                    className="rounded-card border border-ln-line bg-white p-6 shadow-soft"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ln-bg2">
                      <Icon size={18} strokeWidth={1.75} className="text-ln-ink" aria-hidden />
                    </span>
                    <p className="mt-4 text-[15px] font-semibold text-ln-ink">{title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-ln-mut">{text}</p>
                  </FadeUp>
                ))}
              </div>
            </div>
          </section>

          <section className="pb-24 md:pb-32">
            <div className="mx-auto max-w-6xl px-6">
              <FadeUp blur={false}>
                <div className="rounded-frame bg-ln-btn px-6 py-14 text-center md:px-12 md:py-20">
                  <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-[-0.02em] text-white md:text-3xl">
                    Want to talk to the team behind LeadNest?
                  </h2>
                  <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <CtaButton to="/contact" variant="inverted" size="lg">
                      Contact us
                      <ArrowRight size={17} strokeWidth={1.75} />
                    </CtaButton>
                    <CtaButton to="/register" variant="ghost-dark" size="lg">
                      Start Free
                    </CtaButton>
                  </div>
                </div>
              </FadeUp>
            </div>
          </section>
        </main>
        <FooterSection />
      </div>
    </MotionConfig>
  )
}
