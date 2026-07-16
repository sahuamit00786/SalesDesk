import { TRUSTED_WORDMARKS } from '@/features/leadflow-landing/landingContent'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'
import { Marquee } from '@/features/leadflow-landing/components/primitives/Marquee'

/* Neutral wordmark styles so the strip reads as distinct brands. */
const MARK_STYLES = [
  'font-bold uppercase tracking-[0.22em] text-sm',
  'font-semibold lowercase tracking-tight text-lg',
  'font-medium text-base',
  'font-bold uppercase tracking-[0.12em] text-sm',
  'font-semibold lowercase tracking-wide text-lg',
  'font-medium italic text-base',
  'font-bold uppercase tracking-[0.18em] text-sm',
  'font-semibold lowercase tracking-tight text-lg',
]

export function TrustedStripSection() {
  return (
    <section className="border-y border-ln-line bg-ln-bg2 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <FadeUp>
          <p className="text-center text-[13px] font-medium text-ln-mut">
            Trusted by fast-moving sales teams
          </p>
        </FadeUp>
        <FadeUp delay={0.1} blur={false}>
          <Marquee className="mt-8">
            {TRUSTED_WORDMARKS.map((name, i) => (
              <span
                key={name}
                className={`shrink-0 select-none text-neutral-400 ${MARK_STYLES[i % MARK_STYLES.length]}`}
              >
                {name}
              </span>
            ))}
          </Marquee>
        </FadeUp>
      </div>
    </section>
  )
}
