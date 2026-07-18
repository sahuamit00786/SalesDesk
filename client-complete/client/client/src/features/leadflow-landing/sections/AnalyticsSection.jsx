import { ANALYTICS } from '@/features/leadflow-landing/landingContent'
import { SectionHeading } from '@/features/leadflow-landing/components/primitives/SectionHeading'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'
import { Counter } from '@/features/leadflow-landing/components/primitives/Counter'

/** Analytics — dashboard reused but cropped to charts so it reads fresh. */
export function AnalyticsSection() {
  return (
    <section className="bg-ln-bg2 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={ANALYTICS.eyebrow} title={ANALYTICS.title} sub={ANALYTICS.sub} />

        <FadeUp blur={false} className="mx-auto mt-14 max-w-5xl">
          <div className="overflow-hidden rounded-frame border border-ln-line bg-white p-1.5 shadow-soft">
            <div className="h-[260px] overflow-hidden rounded-[18px] sm:h-[360px] md:h-[420px]">
              <img
                src={ANALYTICS.src}
                alt={ANALYTICS.alt}
                width={1024}
                height={545}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full object-cover object-bottom"
              />
            </div>
          </div>
        </FadeUp>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {ANALYTICS.stats.map(({ to, suffix, label, icon: Icon }, i) => (
            <FadeUp
              key={label}
              delay={i * 0.08}
              className="rounded-card border border-ln-line bg-white p-6 text-center shadow-soft"
            >
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-ln-bg2">
                <Icon size={17} strokeWidth={1.75} className="text-ln-ink" aria-hidden />
              </span>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-ln-ink">
                <Counter to={to} suffix={suffix} />
              </p>
              <p className="mt-1.5 text-[13px] text-ln-mut">{label}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}
