import { PIPELINE } from '@/features/leadflow-landing/landingContent'
import { SectionHeading } from '@/features/leadflow-landing/components/primitives/SectionHeading'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'
import { ScreenshotFrame } from '@/features/leadflow-landing/components/primitives/ScreenshotFrame'
import { Counter } from '@/features/leadflow-landing/components/primitives/Counter'

/** Full-width pipeline showcase — layered boards + outcome stats. */
export function PipelineSection() {
  return (
    <section className="overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={PIPELINE.eyebrow} title={PIPELINE.title} sub={PIPELINE.sub} />

        <div className="relative mt-14">
          <FadeUp
            blur={false}
            delay={0.15}
            className="absolute -right-10 top-10 hidden w-2/3 opacity-60 lg:block"
          >
            <ScreenshotFrame src="/landing/pipeline.png" alt="Pipeline list view" />
          </FadeUp>
          <FadeUp blur={false} className="relative mx-auto max-w-4xl">
            <ScreenshotFrame
              src="/landing/deals-pipeline.png"
              alt="LeadNest kanban deal board from qualification to won"
              chrome
              glow
            />
          </FadeUp>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {PIPELINE.stats.map((stat, i) => (
            <FadeUp key={stat.label} delay={i * 0.1} className="text-center">
              <p className="text-4xl font-semibold tracking-tight text-ln-ink">
                <Counter to={stat.to} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
              </p>
              <p className="mt-2 text-sm text-ln-mut">{stat.label}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}
