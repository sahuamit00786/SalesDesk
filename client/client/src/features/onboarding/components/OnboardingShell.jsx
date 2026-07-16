import { OnboardingFloatingBg } from '@/features/onboarding/components/OnboardingFloatingBg'
import { OnboardingSidebar } from '@/features/onboarding/components/OnboardingSidebar'

export function OnboardingShell({ activeStep, furthestStep, lastStep, onSelectStep, children, footer }) {
  const progressPct = Math.round(((activeStep + 1) / (lastStep + 1)) * 100)

  return (
    <div className="relative flex min-h-screen flex-col bg-lf-page font-sans text-ink lg:flex-row">
      <OnboardingFloatingBg className="fixed inset-0" />
      <OnboardingSidebar
        activeStep={activeStep}
        furthestStep={furthestStep}
        onSelectStep={onSelectStep}
        progressPct={progressPct}
      />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-10 xl:px-16">
          <div className="flex w-full flex-1 flex-col">
            <div className="flex-1">{children}</div>
            {footer ? <div className="mt-10 border-t border-brand-200/40 pt-8">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  )
}
