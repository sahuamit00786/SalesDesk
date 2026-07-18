import { CRM_FEATURES } from '@/features/leadflow-landing/landingContent'
import { FeatureSplitSection } from '@/features/leadflow-landing/components/primitives/FeatureSplitSection'
import { ScreenshotFrame } from '@/features/leadflow-landing/components/primitives/ScreenshotFrame'
import { SectionHeading } from '@/features/leadflow-landing/components/primitives/SectionHeading'

/** Core CRM capabilities — alternating screenshot/copy rows. */
export function CrmFeaturesSection() {
  return (
    <div id="features" className="bg-ln-bg2">
      <div className="mx-auto max-w-6xl px-6 pt-24 md:pt-32">
        <SectionHeading
          eyebrow="CRM features"
          title="Everything a sales team needs. Nothing it doesn't."
          sub="LeadNest replaces the spreadsheet, the shared inbox, and the billing tool — with one system your team will actually enjoy using."
        />
      </div>
      {CRM_FEATURES.map((feature, i) => (
        <FeatureSplitSection
          key={feature.eyebrow}
          eyebrow={feature.eyebrow}
          title={feature.title}
          body={feature.body}
          bullets={feature.bullets}
          reverse={Boolean(feature.reverse)}
          className={i === CRM_FEATURES.length - 1 ? 'pb-24 md:pb-32' : 'pb-0 md:pb-0'}
          media={<ScreenshotFrame src={feature.src} alt={feature.alt} glow={i === 0} />}
        />
      ))}
    </div>
  )
}
