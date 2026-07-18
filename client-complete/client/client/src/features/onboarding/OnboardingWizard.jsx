import { useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from '@/components/ui/icons'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/Button'
import { OnboardingProvisioningOverlay } from '@/features/onboarding/components/OnboardingProvisioningOverlay'
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell'
import { useOnboardingStepAnimation } from '@/features/onboarding/hooks/useOnboardingStepAnimation'
import { useOnboardingWizard } from '@/features/onboarding/hooks/useOnboardingWizard'
import { ActivateStep } from '@/features/onboarding/steps/ActivateStep'
import { CompanyStep } from '@/features/onboarding/steps/CompanyStep'
import { GoalsToolsStep } from '@/features/onboarding/steps/GoalsToolsStep'
import { ScaleStep } from '@/features/onboarding/steps/ScaleStep'

export function OnboardingWizard() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const location = useLocation()
  const panelRef = useRef(null)

  const wizard = useOnboardingWizard(user)
  useOnboardingStepAnimation(wizard.activeStep, panelRef)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user?.isCompanyAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (!user?.needsOnboarding) {
    return <Navigate to="/dashboard" replace />
  }

  const onCompleteSetup = async () => {
    const ok = await wizard.completeOnboarding()
    if (!ok) return
    const dest = location.state?.from?.pathname
    navigate(dest && dest !== '/onboarding' ? dest : '/dashboard', { replace: true })
  }

  return (
    <>
      <OnboardingProvisioningOverlay open={wizard.provisioning} serverSteps={wizard.provisionSteps} />
      <OnboardingShell
      activeStep={wizard.activeStep}
      furthestStep={wizard.furthestStep}
      lastStep={wizard.lastStep}
      onSelectStep={wizard.selectStep}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {wizard.activeStep > 0 ? (
              <Button type="button" variant="secondary" onClick={wizard.goBack} disabled={wizard.isLoading}>
                <span className="inline-flex items-center gap-1.5">
                  <ChevronLeft size={16} />
                  Back
                </span>
              </Button>
            ) : null}
          </div>
          <div className="flex justify-end">
            {wizard.activeStep < wizard.lastStep ? (
              <Button
                type="button"
                variant="primary"
                className="min-w-[148px]"
                disabled={wizard.isLoading}
                onClick={wizard.goNext}
              >
                <span className="inline-flex items-center gap-1.5">
                  {wizard.isLoading ? 'Saving…' : 'Continue'}
                  {!wizard.isLoading ? <ChevronRight size={16} /> : null}
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                className="min-w-[168px]"
                disabled={wizard.isLoading}
                onClick={onCompleteSetup}
              >
                {wizard.isLoading ? 'Finishing…' : 'Complete setup'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div ref={panelRef}>
        {wizard.activeStep === 0 ? (
          <CompanyStep
            name={wizard.name}
            setName={wizard.setName}
            industryId={wizard.industryId}
            setIndustryId={wizard.setIndustryId}
            industryOther={wizard.industryOther}
            setIndustryOther={wizard.setIndustryOther}
            countryCode={wizard.countryCode}
            setCountryCode={wizard.setCountryCode}
            countryOther={wizard.countryOther}
            setCountryOther={wizard.setCountryOther}
            websiteUrl={wizard.websiteUrl}
            setWebsiteUrl={wizard.setWebsiteUrl}
            websiteLater={wizard.websiteLater}
            setWebsiteLater={wizard.setWebsiteLater}
            baseCurrency={wizard.baseCurrency}
            setBaseCurrency={wizard.setBaseCurrency}
            errors={wizard.errors}
          />
        ) : null}

        {wizard.activeStep === 1 ? (
          <ScaleStep
            employeeRange={wizard.employeeRange}
            setEmployeeRange={wizard.setEmployeeRange}
            monthlyLeadsBand={wizard.monthlyLeadsBand}
            setMonthlyLeadsBand={wizard.setMonthlyLeadsBand}
            errors={wizard.errors}
          />
        ) : null}

        {wizard.activeStep === 2 ? (
          <GoalsToolsStep
            goalTags={wizard.goalTags}
            toggleGoal={wizard.toggleGoal}
            goalOther={wizard.goalOther}
            setGoalOther={wizard.setGoalOther}
            toolTags={wizard.toolTags}
            toggleTool={wizard.toggleTool}
            toolOther={wizard.toolOther}
            setToolOther={wizard.setToolOther}
            errors={wizard.errors}
          />
        ) : null}

        {wizard.activeStep === 3 ? <ActivateStep user={user} /> : null}
      </div>
    </OnboardingShell>
    </>
  )
}
