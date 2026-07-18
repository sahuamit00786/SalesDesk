import { COLLABORATION } from '@/features/leadflow-landing/landingContent'
import { FeatureSplitSection } from '@/features/leadflow-landing/components/primitives/FeatureSplitSection'
import { ScreenshotFrame } from '@/features/leadflow-landing/components/primitives/ScreenshotFrame'

/** Team collaboration — roles screenshot with activity timeline overlay. */
export function CollaborationSection() {
  return (
    <FeatureSplitSection
      eyebrow={COLLABORATION.eyebrow}
      title={COLLABORATION.title}
      body={COLLABORATION.body}
      bullets={COLLABORATION.bullets}
      media={
        <div className="relative pb-10 pr-0 lg:pr-10">
          <ScreenshotFrame src={COLLABORATION.src} alt={COLLABORATION.alt} />
          <div className="absolute -bottom-2 right-0 hidden w-1/2 lg:block">
            <ScreenshotFrame
              src={COLLABORATION.overlaySrc}
              alt={COLLABORATION.overlayAlt}
              className="shadow-soft-lg"
            />
          </div>
        </div>
      }
    />
  )
}
