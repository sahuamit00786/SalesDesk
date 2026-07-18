import { MOBILE } from '@/features/leadflow-landing/landingContent'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { FeatureSplitSection } from '@/features/leadflow-landing/components/primitives/FeatureSplitSection'
import { MobileAppMockup } from '@/features/leadflow-landing/components/mockups/MobileAppMockup'

// PLACEHOLDER store badges — swap for official badges once the apps are listed
function StoreBadges() {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {['App Store', 'Google Play'].map((store) => (
        <span
          key={store}
          className="inline-flex items-center gap-2 rounded-btn border border-ln-line bg-white px-4 py-2.5 text-sm font-medium text-ln-mut"
        >
          Coming soon on <span className="font-semibold text-ln-ink">{store}</span>
        </span>
      ))}
    </div>
  )
}

export function MobileAppSection() {
  const reduced = usePrefersReducedMotion()
  return (
    <FeatureSplitSection
      eyebrow={MOBILE.eyebrow}
      title={MOBILE.title}
      body={MOBILE.body}
      bullets={MOBILE.bullets}
      reverse
      extra={<StoreBadges />}
      media={
        <div className="flex justify-center py-6">
          <div className={reduced ? undefined : 'animate-ln-float'}>
            <MobileAppMockup className="-rotate-3" />
          </div>
        </div>
      }
    />
  )
}
