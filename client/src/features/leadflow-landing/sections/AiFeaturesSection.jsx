import { AI_FEATURES } from '@/features/leadflow-landing/landingContent'
import { FeatureSplitSection } from '@/features/leadflow-landing/components/primitives/FeatureSplitSection'
import { AiAssistantMockup } from '@/features/leadflow-landing/components/mockups/AiAssistantMockup'

export function AiFeaturesSection() {
  return (
    <FeatureSplitSection
      id="ai"
      eyebrow={AI_FEATURES.eyebrow}
      title={AI_FEATURES.title}
      body={AI_FEATURES.body}
      bullets={AI_FEATURES.bullets}
      media={<AiAssistantMockup />}
    />
  )
}
