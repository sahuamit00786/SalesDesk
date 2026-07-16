import { cn } from '@/utils/cn'
import { FadeUp } from './FadeUp'
import { CtaButton } from './CtaButton'

/**
 * Two-column feature row: copy on one side, media (screenshot frame or coded
 * mockup) on the other. `reverse` flips the columns on desktop; on mobile the
 * copy always comes first.
 */
export function FeatureSplitSection({
  id,
  eyebrow,
  title,
  body,
  bullets = [],
  cta,
  extra,
  media,
  reverse = false,
  className,
}) {
  return (
    <section id={id} className={cn('py-24 md:py-32', className)}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16">
        <FadeUp className={cn('lg:col-span-5', reverse && 'lg:order-2')}>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ln-accent">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-ln-ink md:text-4xl md:leading-[1.15]">
            {title}
          </h2>
          {body ? <p className="mt-5 text-lg leading-relaxed text-ln-mut">{body}</p> : null}
          {bullets.length > 0 ? (
            <ul className="mt-8 space-y-4">
              {bullets.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  {Icon ? (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-ln-line bg-ln-bg2">
                      <Icon size={15} strokeWidth={1.75} className="text-ln-ink" aria-hidden />
                    </span>
                  ) : null}
                  <span className="text-[15px] leading-relaxed text-ln-mut">{text}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {cta ? (
            <div className="mt-9">
              <CtaButton to={cta.to} href={cta.href} variant={cta.variant ?? 'ghost'}>
                {cta.label}
              </CtaButton>
            </div>
          ) : null}
          {extra}
        </FadeUp>
        <FadeUp
          blur={false}
          delay={0.1}
          className={cn('lg:col-span-7', reverse && 'lg:order-1')}
        >
          {media}
        </FadeUp>
      </div>
    </section>
  )
}
