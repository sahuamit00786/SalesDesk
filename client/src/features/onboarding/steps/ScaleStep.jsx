import { BarChart2, Users } from 'lucide-react'
import { ChoiceCard } from '@/features/onboarding/components/ChoiceCard'
import { OnboardingFieldSection } from '@/features/onboarding/components/OnboardingFieldSection'
import { OnboardingStepHeader } from '@/features/onboarding/components/OnboardingStepHeader'
import { EMPLOYEE_OPTIONS, LEADS_OPTIONS } from '@/features/onboarding/constants/onboardingOptions'

export function ScaleStep({
  employeeRange,
  setEmployeeRange,
  monthlyLeadsBand,
  setMonthlyLeadsBand,
  errors,
}) {
  return (
    <div className="space-y-10">
      <OnboardingStepHeader
        title="Organisation scale"
        subtitle="Team size and lead volume help us suggest routing, SLAs, and capacity defaults."
      />

      <OnboardingFieldSection title="Team size" icon={Users}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {EMPLOYEE_OPTIONS.map((opt) => (
            <ChoiceCard
              key={opt.value}
              dataChoice
              label={opt.label}
              sub={opt.sub}
              selected={employeeRange === opt.value}
              onClick={() => setEmployeeRange(opt.value)}
            />
          ))}
        </div>
        {errors.employeeRange ? <p className="text-xs text-red-600">{errors.employeeRange}</p> : null}
      </OnboardingFieldSection>

      <OnboardingFieldSection title="Inbound leads (monthly)" icon={BarChart2}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
          {LEADS_OPTIONS.map((opt) => (
            <ChoiceCard
              key={opt.value}
              dataChoice
              label={opt.label}
              sub={opt.sub}
              selected={monthlyLeadsBand === opt.value}
              onClick={() => setMonthlyLeadsBand(opt.value)}
            />
          ))}
        </div>
        {errors.monthlyLeadsBand ? <p className="text-xs text-red-600">{errors.monthlyLeadsBand}</p> : null}
      </OnboardingFieldSection>
    </div>
  )
}
