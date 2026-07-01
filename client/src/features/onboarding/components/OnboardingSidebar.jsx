import { CheckCircle } from 'lucide-react'
import { ONBOARDING_STEPS } from '@/features/onboarding/constants/onboardingOptions'
import { cn } from '@/utils/cn'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'

export function OnboardingSidebar({ activeStep, furthestStep, onSelectStep, progressPct }) {
  return (
    <aside className="relative z-10 flex w-full shrink-0 flex-col overflow-hidden border-b border-brand-200/40 bg-white/90 px-5 py-6 backdrop-blur-md lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
      <div className="mb-8">
        <LeadNestLogo className="h-12 w-auto max-w-[15rem]" />
        <p className="mt-2 text-xs text-ink-muted">Set up your workspace</p>
      </div>

      <div className="mb-6 lg:hidden">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-muted">
          <span>Progress</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <nav className="relative grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-0" aria-label="Onboarding progress">
        <span className="absolute bottom-2 left-[19px] top-2 hidden w-px bg-surface-border lg:block" aria-hidden />
        {ONBOARDING_STEPS.map((s, i) => {
          const locked = i > furthestStep
          const current = i === activeStep
          const completed = i < activeStep || (i > activeStep && i <= furthestStep)
          const reachable = !locked
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectStep(i)}
              disabled={!reachable}
              className={cn(
                'relative z-[1] flex gap-3 rounded-xl py-2.5 pl-1 pr-2 text-left transition-colors lg:min-w-0 lg:py-3 lg:pr-3',
                reachable && 'hover:bg-surface-muted/80',
                !reachable && 'cursor-not-allowed opacity-45',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  completed && 'border-emerald-500 bg-emerald-500 text-white',
                  current && !completed && 'border-brand-600 bg-white text-brand-700 ring-4 ring-brand-500/15',
                  !completed && !current && 'border-surface-border bg-white text-ink-muted',
                )}
              >
                {completed ? (
                  <CheckCircle size={18} />
                ) : (
                  <Icon size={16} />
                )}
              </span>
              <span className="min-w-0 pt-0.5">
                <span className={cn('block text-sm font-semibold', current ? 'text-ink' : 'text-ink-muted')}>
                  {s.label}
                </span>
                <span className="mt-0.5 hidden text-xs text-ink-faint lg:block">{s.description}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto hidden pt-10 lg:block">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-muted">
          <span>Setup progress</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </aside>
  )
}
