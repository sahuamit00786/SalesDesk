import { cn } from '@/utils/cn'
import { FadeUp } from './FadeUp'

/**
 * Standard section header: violet eyebrow, large ink heading, muted sub copy.
 * `align` = 'center' | 'left'.
 */
export function SectionHeading({ eyebrow, title, sub, align = 'center', className }) {
  const centered = align === 'center'
  return (
    <FadeUp
      className={cn(
        'flex flex-col gap-4',
        centered ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ln-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.02em] text-ln-ink md:text-[44px] md:leading-[1.1]">
        {title}
      </h2>
      {sub ? <p className="max-w-2xl text-lg leading-relaxed text-ln-mut">{sub}</p> : null}
    </FadeUp>
  )
}
