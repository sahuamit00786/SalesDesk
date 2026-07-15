import { AUTOMATION } from '@/features/leadflow-landing/landingContent'
import { FeatureSplitSection } from '@/features/leadflow-landing/components/primitives/FeatureSplitSection'
import { ScreenshotFrame } from '@/features/leadflow-landing/components/primitives/ScreenshotFrame'

/** Lead automation — workflow editor plus supporting capture/routing shots. */
export function AutomationSection() {
  return (
    <FeatureSplitSection
      eyebrow={AUTOMATION.eyebrow}
      title={AUTOMATION.title}
      body={AUTOMATION.body}
      bullets={AUTOMATION.bullets}
      reverse
      className="bg-ln-bg2"
      media={
        <div className="space-y-4">
          <ScreenshotFrame src={AUTOMATION.src} alt={AUTOMATION.alt} glow />
          <div className="hidden grid-cols-2 gap-4 sm:grid">
            {AUTOMATION.smallShots.map((shot) => (
              <ScreenshotFrame key={shot.src} src={shot.src} alt={shot.alt} />
            ))}
          </div>
        </div>
      }
    />
  )
}
