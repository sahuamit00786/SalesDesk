import { useEffect, useState } from 'react'
import { CheckCircle } from '@/components/ui/icons'
import { cn } from '@/utils/cn'

const DEFAULT_STEPS = [
  { id: 'theme', label: 'Setting up your workspace' },
  { id: 'sources', label: 'Configuring lead sources' },
  { id: 'pipeline', label: 'Setting up pipeline stages' },
  { id: 'deals', label: 'Setting up deal statuses' },
  { id: 'opportunities', label: 'Setting up opportunity statuses' },
  { id: 'finalize', label: 'Almost ready…' },
]

export function OnboardingProvisioningOverlay({ open, serverSteps }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const steps = serverSteps?.length
    ? serverSteps.map((s) => ({ id: s.id, label: s.label }))
    : DEFAULT_STEPS

  useEffect(() => {
    if (!open) {
      setActiveIndex(0)
      return undefined
    }
    if (activeIndex >= steps.length - 1) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((i) => Math.min(i + 1, steps.length - 1))
    }, 720)
    return () => window.clearInterval(timer)
  }, [open, activeIndex, steps.length])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b0714]/55 px-4 backdrop-blur-md">
      <div
        className="w-full max-w-md rounded-3xl border border-brand-200/40 bg-white/95 p-8 shadow-2xl shadow-brand-900/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ob-provision-title"
      >
        <div className="mb-6 text-center">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            LeadNest
          </p>
          <h2 id="ob-provision-title" className="mt-2 font-display text-xl font-bold text-ink">
            Preparing your workspace
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Default theme, statuses, and sources — you can customize everything later in Settings.
          </p>
        </div>

        <ul className="space-y-3">
          {steps.map((step, i) => {
            const done = i < activeIndex
            const current = i === activeIndex
            return (
              <li
                key={step.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-300',
                  current && 'border-brand-300 bg-brand-50/80',
                  done && 'border-brand-100 bg-brand-50/40',
                  !done && !current && 'border-transparent bg-surface-muted/40 opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                    done && 'border-emerald-500 bg-emerald-500 cx-icon-inherit text-white',
                    current && 'border-brand-600 bg-white text-brand-700',
                    !done && !current && 'border-surface-border bg-white text-ink-faint',
                  )}
                >
                  {done ? <CheckCircle size={16} /> : i + 1}
                </span>
                <span className={cn('text-sm font-medium', current ? 'text-ink' : 'text-ink-muted')}>
                  {step.label}
                </span>
                {current ? (
                  <span className="ml-auto h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                ) : null}
              </li>
            )
          })}
        </ul>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6D29D9] to-brand-400 transition-all duration-500"
            style={{ width: `${Math.round(((activeIndex + 1) / steps.length) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
