import { Flag, Settings } from 'lucide-react'
import { ChoiceChip } from '@/features/onboarding/components/ChoiceChipGrid'
import { OnboardingFieldSection } from '@/features/onboarding/components/OnboardingFieldSection'
import { OnboardingStepHeader } from '@/features/onboarding/components/OnboardingStepHeader'
import { OtherInput } from '@/features/onboarding/components/OtherInput'
import { GOAL_OPTIONS, TOOL_OPTIONS } from '@/features/onboarding/constants/onboardingOptions'

export function GoalsToolsStep({
  goalTags,
  toggleGoal,
  goalOther,
  setGoalOther,
  toolTags,
  toggleTool,
  toolOther,
  setToolOther,
  errors,
}) {
  return (
    <div className="space-y-10">
      <OnboardingStepHeader
        title="Goals & current stack"
        subtitle="What matters most right now, and what tools are you replacing or using alongside LeadNest?"
      />

      <OnboardingFieldSection
        title="Primary goals"
        hint="Select all that apply"
        icon={Flag}
      >
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <ChoiceChip
              key={opt.id}
              dataChoice
              icon={opt.icon}
              label={opt.label}
              selected={goalTags.includes(opt.id)}
              onClick={() => toggleGoal(opt.id)}
            />
          ))}
        </div>
        {goalTags.includes('other') ? (
          <OtherInput
            id="ob-goal-other"
            label="Other goal"
            value={goalOther}
            onChange={setGoalOther}
            placeholder="What are you trying to improve?"
          />
        ) : null}
        {errors.goals ? <p className="text-xs text-red-600">{errors.goals}</p> : null}
      </OnboardingFieldSection>

      <OnboardingFieldSection title="Current tools" hint="Optional" icon={Settings}>
        <div className="flex flex-wrap gap-2">
          {TOOL_OPTIONS.map((opt) => (
            <ChoiceChip
              key={opt.id}
              dataChoice
              label={opt.label}
              selected={toolTags.includes(opt.id)}
              onClick={() => toggleTool(opt.id)}
            />
          ))}
        </div>
        {toolTags.includes('other') ? (
          <OtherInput
            id="ob-tool-other"
            label="Other tools"
            value={toolOther}
            onChange={setToolOther}
            placeholder="e.g. Custom CRM, internal tools"
          />
        ) : null}
      </OnboardingFieldSection>
    </div>
  )
}
